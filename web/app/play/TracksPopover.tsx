'use client';

import {
  Button,
  MasterRow,
  Popover,
  PopoverContent,
  PopoverTrigger,
  RECORDING,
  ScrollArea,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TrackRow,
} from '@notation-hero/client';
import { useRef, useState } from 'react';

import { setStaffDisplay, setTrackTransposition } from '../../lib/alphatab/live-settings';
import { useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import type { StaffDisplayKey } from '../../lib/alphatab/live-settings';
import type * as AlphaTab from '@coderline/alphatab';
import type { TrackStaffState } from '@notation-hero/client';

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

interface MixerTrack {
  index: number;
  name: string;
  /** The level the FILE gives this track, 0-16. AlphaTab never writes playbackInfo.volume, so this stays the file's own level. It is not a denominator: the writer divides by the constant 16. */
  fileVolume: number;
  volume: number;
  solo: boolean;
  mute: boolean;
  transposeAudio: number;
  transposeFull: number;
  expanded: boolean;
  staves: TrackStaffState[];
}

// AlphaTab's Clef enum, as numbers. The web app does not import the runtime namespace.
const CLEF_BASS = 3; // F4
const CLEF_TREBLE = 4; // G2

const staffLabel = (staff: AlphaTab.model.Staff, staffIndex: number): string => {
  // The clef lives on the bar. A grand staff is named by its two clefs; everything else stays
  // "Staff N", which is the name TrackRow's own contract documents.
  const clef = staff.bars[0]?.clef;
  if (clef === CLEF_TREBLE) return 'Treble';
  if (clef === CLEF_BASS) return 'Bass';
  return `Staff ${staffIndex + 1}`;
};

// Plain data at the boundary, so nothing downstream holds an AlphaTab object in React state.
const toMixerTrack = (track: AlphaTab.model.Track): MixerTrack => ({
  index: track.index,
  name: track.name,
  fileVolume: track.playbackInfo.volume,
  volume: track.playbackInfo.volume,
  solo: false,
  mute: false,
  transposeAudio: 0,
  transposeFull: 0,
  expanded: false,
  staves: track.staves.map((staff, staffIndex) => ({
    id: `${track.index}-${staffIndex}`,
    label: staffLabel(staff, staffIndex),
    showStandardNotation: staff.showStandardNotation,
    showSlash: staff.showSlash,
    showNumbered: staff.showNumbered,
    showTablature: staff.showTablature,
    // The pinned AlphaTab forces showTablature=false on any percussion staff and requires a
    // tuning, so the toggle is offered only where it can actually do something.
    tablatureAvailable: !staff.isPercussion && staff.tuning.length > 0,
  })),
});

// The mixer. It owns solo and mute, because AlphaTab keeps those in the synth worker and nothing
// on the main thread can be read back. The component stays mounted for the life of the page —
// only PopoverContent comes and goes — so closing the popover does not lose the mix.
export function TracksPopover({
  api,
  hasBackingTrack,
  disabled,
  masterVolume,
  onMasterVolumeChange,
}: Readonly<TracksPopoverProps>) {
  const [tracks, setTracks] = useState<MixerTrack[]>([]);
  const [renderedIndexes, setRenderedIndexes] = useState<number[]>([]);
  // Written in event handlers, read in event handlers. useAlphaTabEvent only refreshes its
  // handler ref in an effect, so a playerReady that arrives in the same turn as scoreLoaded would
  // still see the previous render's rows. The ref is current the moment the score arrives.
  const tracksRef = useRef<MixerTrack[]>([]);

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
    commitTracks(score.tracks.map((track) => toMixerTrack(track)));
  });

  // What AlphaTab actually DREW, not what was asked for. It also covers the first render, which
  // picks the drum tracks without asking the mixer. renderFinished does not replay on subscribe,
  // so until the first one arrives the rows fall back to whatever the api is currently drawing.
  useAlphaTabEvent(api, 'renderFinished', () => {
    setRenderedIndexes(api?.tracks.map((track) => track.index) ?? []);
  });

  const drawnIndexes =
    renderedIndexes.length > 0 ? renderedIndexes : (api?.tracks.map((track) => track.index) ?? []);

  const trackAt = (index: number) => api?.score?.tracks[index];

  const applyRendered = (index: number, next: boolean) => {
    const score = api?.score;
    if (!api || !score) return;
    const chosen = [
      ...new Set(next ? [...drawnIndexes, index] : drawnIndexes.filter((i) => i !== index)),
    ].toSorted((a, b) => a - b);
    // AlphaTab cannot draw nothing: an empty list falls back to the first track, and the box
    // the person just cleared would untick itself a moment later. The row disables that control
    // rather than swallowing the click. Reaching here at all would be a bug.
    if (chosen.length === 0) return;
    // renderTracks takes Track OBJECTS (unlike renderScore, which takes indexes). No state is
    // set here: renderFinished reports what was really drawn.
    api.renderTracks(chosen.map((i) => score.tracks[i]));
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
    // Audio only — no re-render. This must not be fused with Transpose full.
    api.changeTrackTranspositionPitch([track], semitones);
    patch(index, { transposeAudio: semitones });
  };

  const applyTransposeFull = (index: number, semitones: number) => {
    if (!api) return;
    // Notation AND audio. The write itself lives with the other live-settings writes.
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
    const staffIndex = Number(staffId.split('-')[1]);
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

  return (
    <Popover>
      <Tooltip>
        {/* The span-wrap, not a bare stacked trigger: this button is disabled while the engine
            loads, and a disabled Button is pointer-events:none. */}
        <TooltipTrigger render={<span className="inline-flex" />}>
          <PopoverTrigger
            render={
              <Button
                data-testid="tracks-trigger"
                variant="ghost"
                size="icon"
                aria-label="Tracks"
                disabled={disabled}
                className="size-11 rounded-lg text-muted-foreground"
              >
                <span
                  className="material-symbols-outlined"
                  aria-hidden="true"
                  style={{ fontSize: 24 }}
                >
                  instant_mix
                </span>
              </Button>
            }
          />
        </TooltipTrigger>
        <TooltipContent>Tracks</TooltipContent>
      </Tooltip>
      <PopoverContent
        data-testid="tracks-popover"
        align="end"
        side="top"
        className="w-[32rem] p-0"
        aria-label="Tracks"
      >
        {/* viewportClassName, not className: a height cap on the Root computes to auto and the
            list never scrolls. Same fix the Settings popover already carries. */}
        <ScrollArea viewportClassName="max-h-[60vh]">
          {/* Said ONCE, in words, above the rows: a disabled slider has no tooltip of its own. */}
          {hasBackingTrack ? (
            <p className="px-3 pt-3 text-sm text-muted-foreground">
              This file is playing its own recording, so solo, mute, volume and audio transposition
              are not available.
            </p>
          ) : null}
          {tracks.map((track) => (
            <TrackRow
              key={track.index}
              data-testid={`track-row-${track.index}`}
              className="px-3 py-2"
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
              mixUnavailable={hasBackingTrack ? RECORDING : undefined}
            />
          ))}
          {/* Master volume is the shell's value, handed down with its existing single writer.
              Solo-all and mute-all belong to the mixer: they set every row through the same
              handlers a row click uses. An all-soloed mix sounds like an un-soloed one, which is
              why these are select-all checkboxes with a way back. Master volume stays live while
              a recording plays — unlike every per-track mix control. */}
          <MasterRow
            data-testid="master-row"
            className="px-3 py-2"
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
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
