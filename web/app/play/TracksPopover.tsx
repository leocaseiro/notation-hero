'use client';

import {
  MIXER_BUTTON_CLASS,
  MasterRow,
  Popover,
  PopoverContent,
  RECORDING,
  ScrollArea,
  TrackRow,
  TransportToggle,
} from '@notation-hero/client';
import { memo, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';
import { setStaffDisplay, setTrackTransposition } from '../../lib/alphatab/live-settings';
import { toMixerTrack } from '../../lib/alphatab/mixer-tracks';
import { dropPlaybackSelection } from '../../lib/alphatab/playback-selection';
import { useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { PopoverIconTrigger } from './PopoverIconTrigger';
import type { StaffDisplayKey } from '../../lib/alphatab/live-settings';
import type { MixerTrack } from '../../lib/alphatab/mixer-tracks';
import type * as AlphaTab from '@coderline/alphatab';

interface TracksPopoverProps {
  /** The live api, or undefined until the engine has loaded. The mixer reads the score from its events. */
  api: AlphaTab.AlphaTabApi | undefined;
  /** Whether the open file is playing its own recording. Solo, mute, volume and audio transposition go quiet. */
  hasBackingTrack: boolean;
  /** The trigger is disabled until a player is coming. Render-select still needs no player, so this is the engine, not playback readiness. */
  disabled: boolean;
  /**
   * The shell's master volume, 0-1. The same value the Settings ▸ Player row edits.
   * This popover is a second editor, never a second owner.
   */
  masterVolume: number;
  onMasterVolumeChange: (next: number) => void;
}

// How tall the list may grow: the notation surface, which is the visible score between the
// header and the transport. Shorter than the viewport on purpose — `--available-height` reaches
// the window edge and would let the panel cover the header. The footer is subtracted in the
// viewport class so Master stays inside that same room.
function useNotationRoom(): number | null {
  const [room, setRoom] = useState<number | null>(null);
  useLayoutEffect(() => {
    const surface = document.querySelector('[data-testid="notation-surface"]');
    if (!surface) return;
    const measure = () => setRoom(Math.floor(surface.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(surface);
    return () => observer.disconnect();
  }, []);
  return room;
}

// The layout switch's TOOLTIP text — its accessible name stays the stable "Track layout" (see the
// TransportToggle below); this is what the popup says the state is.
const layoutStateLabel = (trackCount: number, single: boolean): string => {
  if (trackCount < 2) return 'Only one track';
  if (single) return 'Single track';
  return 'Multiple tracks';
};

// The mixer. It owns solo and mute, because AlphaTab keeps those in the synth worker and nothing
// on the main thread can be read back. The component stays mounted for the life of the page —
// only PopoverContent comes and goes — so closing the popover does not lose the mix.
export const TracksPopover = memo(function TracksPopover({
  api,
  hasBackingTrack,
  disabled,
  masterVolume,
  onMasterVolumeChange,
}: Readonly<TracksPopoverProps>) {
  const { engine } = useAlphaTabEngine();
  const [tracks, setTracks] = useState<MixerTrack[]>([]);
  const [renderedIndexes, setRenderedIndexes] = useState<number[]>([]);
  const notationRoom = useNotationRoom();
  // Multiple tracks is the mix the score opens in. Single track draws one staff at a time.
  // Not stored between visits — only AlphaTab's settings JSON is persisted — and a new score
  // starts from multiple again.
  const [singleTrack, setSingleTrack] = useState(false);
  // Written in event handlers, read in event handlers. useAlphaTabEvent only refreshes its
  // handler ref in an effect, so a playerReady that arrives in the same turn as scoreLoaded would
  // still see the previous render's rows. The ref is current the moment the score arrives.
  const tracksRef = useRef<MixerTrack[]>([]);
  // What was drawn just before the layout switch collapsed the score to one track — the set the
  // switch restores on its way back to multiple tracks.
  const multiDrawnRef = useRef<number[]>([]);

  const commitTracks = (next: MixerTrack[]) => {
    tracksRef.current = next;
    setTracks(next);
  };

  const patch = (index: number, change: Partial<MixerTrack>) => {
    commitTracks(
      tracksRef.current.map((track) => (track.index === index ? { ...track, ...change } : track)),
    );
  };

  // A new score starts from a clean mix. No engine call here: api.player is null at this point
  // on the first score and after every player swap, so a reset placed here never runs.
  // The transposition clear does NOT live here. It runs in renderOpenNotation, immediately
  // before api.renderScore, because the engine stamps the pitches onto the new score at the
  // top of its own render path.
  // A late bundled-beat load fires this with the sample while NotationSurface, subscribed
  // first, synchronously re-asserts the file the person opened. By the time this handler runs,
  // api.score is already that file and the argument is the sample. Keeping the sample would leave
  // the mixer on one "Drums" row beside a score that has three tracks.
  useAlphaTabEvent(api, 'scoreLoaded', (score) => {
    if (api?.score && api.score !== score) return;
    setSingleTrack(false);
    // The previous score's drawn indexes describe a score the engine no longer has open. Clear
    // them here so drawnIndexes falls back to api.tracks until the new score's renderFinished
    // reports what was really drawn — otherwise a stale index can outlive its score and reach
    // score.tracks[i] on the new one.
    setRenderedIndexes([]);
    multiDrawnRef.current = [];
    commitTracks(
      score.tracks.map((track) =>
        toMixerTrack(track, engine?.model.Clef.G2, engine?.model.Clef.F4),
      ),
    );
  });

  // What AlphaTab actually DREW, not what was asked for. It also covers the first render, which
  // picks the drum tracks without asking the mixer. renderFinished does not replay on subscribe,
  // so until the first one arrives the rows fall back to whatever the api is currently drawing.
  useAlphaTabEvent(api, 'renderFinished', () => {
    setRenderedIndexes(api?.tracks.map((track) => track.index) ?? []);
  });

  // What the rows SHOW. State, so the list re-renders when a draw finishes.
  const drawnIndexes =
    renderedIndexes.length > 0 ? renderedIndexes : (api?.tracks.map((track) => track.index) ?? []);

  // What the engine is drawing RIGHT NOW. Every handler that computes a NEW set to draw reads this,
  // never drawnIndexes: renderTracks assigns api.tracks synchronously, while renderedIndexes only
  // catches up on the async renderFinished. A second toggle inside that gap computes from the
  // pre-toggle set and puts the track just hidden straight back on screen.
  //
  // A hand almost certainly cannot reach that gap: measured at 16ms on a 3-track score and 65ms on
  // a 5-track, 160-bar one, against the ~250ms a real double-click needs to cross the ~80px between
  // two rows. It widens to 220ms only at a 20x CPU slowdown, where playback is unusable anyway.
  // This reads the engine because that is the correct source for a set the engine already holds and
  // it costs one map over a handful of tracks per click — not because the race is reachable.
  const liveDrawnIndexes = () => api?.tracks.map((track) => track.index) ?? [];

  const trackAt = (index: number) => api?.score?.tracks[index];

  // Every redraw that changes WHICH tracks are drawn can leave a bar selection pointing at a beat
  // that is no longer laid out — and the engine re-applies its own selection after EVERY render, so
  // it looks that beat up in the new bounds and dereferences undefined. Untick the track the
  // selection sits on and that was an uncaught throw nothing in the lane noticed. Drop the
  // selection first; dropPlaybackSelection explains why the clearing route is as odd as it is.
  const drawTracks = (tracks: Parameters<AlphaTab.AlphaTabApi['renderTracks']>[0]) => {
    if (!api) return;
    dropPlaybackSelection(api);
    api.renderTracks(tracks);
  };

  const applyRendered = (index: number, next: boolean) => {
    const score = api?.score;
    if (!api || !score) return;
    // Single track: the eye picks the one staff that stays drawn. Hiding it is the same lock
    // as "at least one track must stay shown" — there is nothing else on screen to fall back to.
    if (singleTrack) {
      if (!next) return;
      drawTracks([score.tracks[index]]);
      return;
    }
    const live = liveDrawnIndexes();
    const chosen = [...new Set(next ? [...live, index] : live.filter((i) => i !== index))].toSorted(
      (a, b) => a - b,
    );
    // api.tracks can still hold an index from a score that is being replaced — filter to indexes
    // the OPEN score actually has before touching the engine, or renderTracks dereferences
    // undefined.
    const picked = chosen.filter((i) => i < score.tracks.length);
    // AlphaTab cannot draw nothing: an empty list falls back to the first track, and the box
    // the person just cleared would untick itself a moment later. The row disables that control
    // rather than swallowing the click. Reaching here at all would be a bug.
    if (picked.length === 0) return;
    // renderTracks takes Track OBJECTS (unlike renderScore, which takes indexes). No state is
    // set here: renderFinished reports what was really drawn.
    drawTracks(picked.map((i) => score.tracks[i]));
  };

  const applySolo = (index: number, next: boolean) => {
    const track = trackAt(index);
    if (!api || !track) return;
    // Solo is NOT exclusive, as in AlphaTab: this sets one track's flag and leaves every other
    // track's alone.
    api.changeTrackSolo([track], next);
    patch(index, { solo: next });
  };

  const applyMute = (index: number, next: boolean) => {
    const track = trackAt(index);
    if (!api || !track) return;
    api.changeTrackMute([track], next);
    patch(index, { mute: next });
  };

  const applyVolume = (index: number, next: number) => {
    const track = trackAt(index);
    const row = tracksRef.current.find((t) => t.index === index);
    if (!api || !track || !row) return;
    // An ABSOLUTE channel level on AlphaTab's own scale, not a ratio against the file's level.
    // changeTrackVolume forwards its argument unscaled, and the engine's resting level for a
    // channel is playbackInfo.volume / 16. `next` is on that same 0-16 scale; 16 is a constant.
    api.changeTrackVolume([track], next / 16);
    patch(index, { volume: next });
  };

  const applyTransposeAudio = (index: number, semitones: number) => {
    const track = trackAt(index);
    if (!api || !track) return;
    // Audio only — no re-render. This must not be fused with Transpose notation.
    api.changeTrackTranspositionPitch([track], semitones);
    patch(index, { transposeAudio: semitones });
  };

  const applyTransposeFull = (index: number, semitones: number) => {
    if (!api) return;
    // Notation ONLY — it moves the drawn score, never the sound; see setTrackTransposition's
    // own doc for why 'render' cannot reach the synth. The slider above is the audible one.
    // The `Full` names here map to AlphaTab's whole-score transpositionPitches, as opposed to
    // the per-channel changeTrackTranspositionPitch the audio slider uses.
    setTrackTransposition(api, index, semitones);
    patch(index, { transposeFull: semitones });
  };

  const applyStaffDisplay = (
    trackIndex: number,
    staffId: string,
    key: StaffDisplayKey,
    next: boolean,
  ) => {
    if (!api) return;
    // Derived from the row data, not parsed back out of `id` — `id` is a React key only (its
    // JSDoc on TrackStaffState says so), so a track whose staves changed shape underneath it
    // bails here instead of committing state for a staff the engine never touched.
    const staffIndex =
      tracksRef.current
        .find((t) => t.index === trackIndex)
        ?.staves.findIndex((s) => s.id === staffId) ?? -1;
    if (staffIndex < 0) return;
    setStaffDisplay(api, trackIndex, staffIndex, key, next);
    commitTracks(
      tracksRef.current.map((track) =>
        track.index === trackIndex
          ? {
              ...track,
              staves: track.staves.map((staff) =>
                staff.id === staffId ? { ...staff, [key]: next } : staff,
              ),
            }
          : track,
      ),
    );
  };

  // playerReady is the first moment the player exists, and it re-fires on every MIDI reload and
  // every player swap — which is when AlphaTab re-seeds each drawn track's channel volume and
  // restores nothing else. This both clears the synth's stale mute/solo and re-asserts every row.
  // It must stay idempotent: playerReady is not once per score. AlphaTab's own listener registers
  // at construction, so ours runs after it.
  useAlphaTabEvent(api, 'playerReady', () => {
    api?.player?.resetChannelStates();
    for (const row of tracksRef.current) {
      applyVolume(row.index, row.volume);
      if (row.mute) applyMute(row.index, true);
      if (row.solo) applySolo(row.index, true);
      if (row.transposeAudio) applyTransposeAudio(row.index, row.transposeAudio);
    }
  });

  const layoutLabel = layoutStateLabel(tracks.length, singleTrack);

  const toggleLayout = () => {
    if (tracksRef.current.length < 2) return;
    const next = !singleTrack;
    setSingleTrack(next);
    const score = api?.score;
    if (!api || !score) return;
    if (next) {
      // Remember what was drawn so the way back can restore it, then collapse to one track.
      // Bound-check before indexing: api.tracks can still name a track the OPEN score does not
      // have, in the window while a new score is being swapped in.
      const validDrawn = liveDrawnIndexes().filter((i) => i < score.tracks.length);
      multiDrawnRef.current = validDrawn;
      const keep = validDrawn.length > 0 ? validDrawn[0] : 0;
      if (keep >= score.tracks.length) return;
      drawTracks([score.tracks[keep]]);
      return;
    }
    // Multiple tracks again: replay the pre-collapse selection, bound-checked against whatever
    // score is open now (it may have changed while singleTrack was on). Nothing remembered (or
    // none of it survives) falls back to drawing every track, which is what "multiple tracks"
    // means with no prior selection to restore.
    const restore = multiDrawnRef.current.filter((i) => i < score.tracks.length);
    const picked = restore.length > 0 ? restore : score.tracks.map((track) => track.index);
    if (picked.length === 0) return;
    drawTracks(picked.map((i) => score.tracks[i]));
  };

  return (
    <Popover>
      <PopoverIconTrigger
        testId="tracks-trigger"
        label="Tracks"
        glyph="instant_mix"
        disabled={disabled}
        className="rounded-lg text-muted-foreground"
        glyphStyle={{ fontSize: 24 }}
      />
      <PopoverContent
        data-testid="tracks-popover"
        align="end"
        side="top"
        className="flex max-h-(--available-height) w-[32rem] flex-col p-0"
        style={
          notationRoom === null
            ? undefined
            : ({ '--notation-room': `${notationRoom}px` } as CSSProperties)
        }
        aria-label="Tracks"
      >
        {/* The list scrolls. The footer does not: Master and the layout switch stay put when a
            score has more tracks than the score area can show. The cap is the notation surface
            (the visible score), and also the space above the trigger, whichever is smaller.
            viewportClassName, not className: a height cap on the Root computes to auto. */}
        {hasBackingTrack ? (
          <p className="px-3 pt-3 text-sm text-muted-foreground">
            This file is playing its own recording, so solo, mute, volume and audio transposition
            are not available.
          </p>
        ) : null}
        <ScrollArea viewportClassName="max-h-[calc(min(var(--available-height),var(--notation-room,var(--available-height)))-4.5rem)]">
          {tracks.map((track) => (
            <TrackRow
              key={track.index}
              data-testid={`track-row-${track.index}`}
              className="border-b border-border last:border-b-0"
              name={track.name}
              rendered={drawnIndexes.includes(track.index)}
              onRenderedChange={(next) => applyRendered(track.index, next)}
              renderLockReason={
                drawnIndexes.length === 1 && drawnIndexes.includes(track.index)
                  ? 'At least one track must stay shown'
                  : undefined
              }
              solo={track.solo}
              onSoloChange={(next) => applySolo(track.index, next)}
              mute={track.mute}
              onMuteChange={(next) => applyMute(track.index, next)}
              volume={track.volume}
              onVolumeChange={(next) => applyVolume(track.index, next)}
              staves={track.staves}
              onStaffChange={(staffId, key, next) =>
                applyStaffDisplay(track.index, staffId, key, next)
              }
              transposeAudio={track.transposeAudio}
              onTransposeAudioChange={(semitones) => applyTransposeAudio(track.index, semitones)}
              transposeFull={track.transposeFull}
              onTransposeFullChange={(semitones) => applyTransposeFull(track.index, semitones)}
              expanded={track.expanded}
              onExpandedChange={(next) => patch(track.index, { expanded: next })}
              // A drum "pitch" is an instrument identifier, not a note — transposing one is
              // meaningless, and it also broke playback (Transpose audio silenced the track,
              // Transpose notation changed nothing, and zero did not reliably restore sound). The
              // disclosure holds only those two sliders, so locking the control itself is enough.
              expandUnavailable={
                track.isPercussion
                  ? 'Transposition is not available for percussion tracks'
                  : undefined
              }
              mixUnavailable={hasBackingTrack ? RECORDING : undefined}
            />
          ))}
        </ScrollArea>
        <div className="border-t border-border bg-popover">
          {/* Master volume is the shell's value, handed down with its existing single writer.
              Solo-all and mute-all belong to the mixer: they set every row through the same
              handlers a row click uses. An all-soloed mix sounds like an un-soloed one, which is
              why these are select-all toggles with a way back. Master volume stays live while
              a recording plays — unlike every per-track mix control. */}
          <MasterRow
            data-testid="master-row"
            leading={
              // The stable name says what the control IS ("Track layout"); aria-pressed carries
              // the state, and the tooltip — the one place this button's state shows — carries
              // layoutLabel. A name that changed on every press broke voice control and read
              // oddly to a screen reader ("Multiple tracks, button, not pressed").
              <TransportToggle
                data-testid="tracks-layout"
                pressed={singleTrack}
                onPressedChange={toggleLayout}
                label="Track layout"
                tooltip={layoutLabel}
                icon={
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {singleTrack ? 'crop_16_9' : 'splitscreen'}
                  </span>
                }
                disabled={tracks.length < 2}
                // This toggle's pressed state is carried by the icon (crop_16_9 / splitscreen)
                // alone, unlike every other TransportToggle in the mixer — so the data-pressed
                // trio below overrides TransportToggle's own solid-teal fill back to the row's
                // plain resting look, keeping this button's appearance exactly as it was before
                // it read the shared component.
                className={`${MIXER_BUTTON_CLASS} border border-border data-pressed:border-border data-pressed:bg-transparent data-pressed:text-muted-foreground`}
              />
            }
            volume={masterVolume}
            onVolumeChange={onMasterVolumeChange}
            soloAll={tracks.length > 0 && tracks.every((t) => t.solo)}
            soloAllIndeterminate={tracks.some((t) => t.solo) && tracks.some((t) => !t.solo)}
            onSoloAllChange={(next) => {
              for (const track of tracks) applySolo(track.index, next);
            }}
            muteAll={tracks.length > 0 && tracks.every((t) => t.mute)}
            muteAllIndeterminate={tracks.some((t) => t.mute) && tracks.some((t) => !t.mute)}
            onMuteAllChange={(next) => {
              for (const track of tracks) applyMute(track.index, next);
            }}
            soloMuteUnavailable={hasBackingTrack ? RECORDING : undefined}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
});
