'use client';

import {
  Button,
  Progress,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  toast,
} from '@notation-hero/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import {
  AlphaTabEngineProvider,
  useAlphaTabEngine,
} from '../../lib/alphatab/AlphaTabEngineContext';
import { loadAlphaTabEngine } from '../../lib/alphatab/engine';
import { setAlphaTabValue, useAlphaTab, useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { PLAYER_ERROR } from '../../lib/player-errors';
import { NotationSurface } from './NotationSurface';
import { OpenFileControl, readFailureMessage, readNotation } from './OpenFileControl';
import { PlayerHeader } from './PlayerHeader';
import { TransportRow } from './TransportRow';
import { useLoadingBarPhase } from './useLoadingBarPhase';
import type * as AlphaTab from '@coderline/alphatab';

/** What the picker produces: a file read into memory, not yet parsed. */
export interface LoadedNotation {
  name: string;
  bytes: Uint8Array;
}

/** What the player holds: a name and the PARSED score. */
export interface OpenNotation {
  name: string;
  score: AlphaTab.model.Score;
}

/**
 * The score that ships with the app. The player ALWAYS has a score open (decided 2026-09-18),
 * which is why there is no empty state anywhere in the player and why the notation box is mounted
 * for the whole life of the page.
 *
 * Today this one ALWAYS loads: remembering the last score played is its own ticket (NH-303), so
 * there is no cache to consult and no branch here to choose between them.
 */
const SAMPLE_NOTATION = '/notation/1-beat.gp';

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

/**
 * Resolves once the loading toast has been painted. Sonner inserts a toast asynchronously and
 * shows it only after a second pass sets `data-mounted="true"`, so how many frames that takes
 * depends on how busy the main thread is. A fixed two-frame wait was exactly enough on an idle
 * page and not enough on a slow one: under a 20x CPU throttle the toast reached the screen only
 * after the parse had finished. Bounded, so a toast that never mounts cannot hang a file open.
 */
async function loadingToastPainted(): Promise<void> {
  for (let frame = 0; frame < 30; frame += 1) {
    await nextFrame();
    if (document.querySelector('[data-sonner-toast][data-mounted="true"]')) break;
  }
  // Mounted is a DOM fact; these two frames are what put it on the glass.
  await nextFrame();
  await nextFrame();
}

function Player() {
  const { engine, error: engineError } = useAlphaTabEngine();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [notation, setNotation] = useState<OpenNotation | null>(null);

  // The open succeeded — say so, and put focus where the person goes next. Both live on the shell
  // because the shell is what knows an open finished; the picker only hands over bytes.
  const [announcement, setAnnouncement] = useState('');
  const playRef = useRef<HTMLButtonElement | null>(null);

  // The playhead. This IS product state — the Scrubber is a controlled component over it — which is
  // why it may live here when a `data-position` DOM hook may not: the rule bans test-only
  // instrumentation, not UI state.
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [looping, setLooping] = useState(false);
  const [metronome, setMetronome] = useState(false);
  const [countIn, setCountIn] = useState(false);
  // Whether AlphaTab currently holds a bar-range selection — drives the Loop toggle's label only.
  const [hasRange, setHasRange] = useState(false);
  // Whether the open score plays its own embedded recording. Metronome and Count-In are inert then.
  const [hasBackingTrack, setHasBackingTrack] = useState(false);
  // The live score tempo, for the header's tempo control. The position handler below is what keeps
  // it current; the 120 is the pre-load placeholder only.
  const [scoreTempo, setScoreTempo] = useState(120);
  // The playback speed multiplier; 1 is the score's own tempo. A new score keeps the speed the
  // drummer chose: the BPM readout moves because the score's own tempo changed, not because the
  // multiplier was reset.
  const [speed, setSpeed] = useState(1);
  // The soundfont download: a 0-1 fraction, null when no fraction can be computed, and undefined
  // before any byte has been reported. The FRACTION measures the soundfont only — the engine
  // files arrive through a plain dynamic import, which reports no progress at all.
  const [soundFontProgress, setSoundFontProgress] = useState<number | null | undefined>();
  // AlphaTab raised an error before the player was ready: Play never enables on this page load,
  // so the bar must stop rather than pulse forever beside the error message.
  const [loadFailed, setLoadFailed] = useState(false);
  // A file is being opened. The parse is synchronous and can hold the main thread for seconds on a
  // slow machine, so this is committed and PAINTED before the parse starts.
  const [opening, setOpening] = useState(false);

  // The ONE owner of the api. There is no second apiRef and no onApiReady callback: a callback
  // prop in the hook's dependency list rebuilds the engine on an ordinary state change, throwing
  // away the loaded score, the downloaded soundfont and both workers.
  //
  // `alphaTab` is the namespace object the hook passes in — the self-hosted-ESM delivery decision
  // forbids importing it, so this is the only way a call site reaches an enum.
  const [api, hostRef] = useAlphaTab((settings, alphaTab) => {
    // No settings.core.scriptFile. AlphaTab finds its own worker and worklet relative to
    // /alphatab/esm/alphaTab.mjs — that is the entire point of self-hosting the ESM.
    // fontDirectory, logLevel and soundFont are already applied by setAlphaTabDefaults().
    settings.core.file = SAMPLE_NOTATION;
    settings.core.tracks = 'all';
    // EnabledAutomatic on purpose (2026-09-16): a Guitar Pro file that embeds an audio track plays
    // that recording, with the notation on screen — that is how this player plays along to a
    // person's own files. AlphaTab resolves EnabledAutomatic to its backing-track player whenever
    // `score.backingTrack.rawAudioFile` exists, and that player's synthesizer stubs out
    // channelSetMute, channelSetSolo, channelSetMixVolume and the metronome channel (verified in
    // 1.8.4). Nothing here drives those, but the transport's metronome and count-in and the mixer
    // rows MUST render disabled, with a tooltip saying the file is playing its own recording
    // (spec §4). A toggle between the recording and the synth is deferred (NH-298).
    //
    // It also keeps the empty page cheap: with EnabledAutomatic and no score yet, AlphaTab creates
    // no player at all — no AudioContext, no synth worker, no soundfont fetch
    // (alphaTab.core.mjs:46680-46685).
    settings.player.playerMode = alphaTab.PlayerMode.EnabledAutomatic;
    settings.player.enableCursor = true;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
    // The OUTER div scrolls — never AlphaTab's own element. This runs inside the hook's effect,
    // after both divs are committed, so the ref is filled; the `if` is for the type, and because
    // `@typescript-eslint/no-non-null-assertion` is not worth fighting over one line.
    if (viewportRef.current) settings.player.scrollElement = viewportRef.current;
    // Ten pixels of air above the cursor, so it does not sit flush against the top edge. The
    // fork sets the same (AlphaTabRhythmGame/index.tsx:151).
    settings.player.scrollOffsetY = -10;
  });

  // Both subscriptions go through the helper, so each one is removed when this component
  // unmounts or the api changes. No `.on()` by hand anywhere in the app.
  //
  // PlayerState is an AlphaTab enum and cannot be imported; read it off the namespace object
  // instead of comparing against the literal 1, which would rot if the ordering ever changed.
  useAlphaTabEvent(api, 'playerStateChanged', (args) => {
    setPlaying(args.state === engine?.synth.PlayerState.Playing);
  });
  // `playerReady`, not `soundFontLoaded`: 1.8.4 builds soundFontLoaded as a bare `new EventEmitter()`,
  // so it fires once and is never replayed — a subscription that lands one commit after the api was
  // constructed can miss it and latch Play disabled forever. `api.playerReady` returns the player
  // wrapper's `readyForPlayback`, built as `new EventEmitter(() => this.isReadyForPlayback)`, which
  // reports the current value to a late subscriber.
  useAlphaTabEvent(api, 'playerReady', () => setPlayerReady(true));

  // Guard 2's bookkeeping — see the position handler below.
  const pendingSeek = useRef<{ target: number; since: number } | null>(null);
  // A seek made while bars are selected waits for AlphaTab's reply to learn whether it landed
  // inside them; this is the timer for the one case where no reply ever comes (see `seek`).
  const rangeCheck = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Whether the score was playing when that seek was made — see `leaveRange`.
  const resumeAfterSeek = useRef(false);

  // The worklet posts one samplesPlayed message per 128-frame audio quantum, and each one triggers
  // a positionChanged — about 345 events per second at 44.1 kHz. Writing state on every one of them
  // commits React ~345 times a second for a clock that only shows whole seconds. Coalesce to one
  // commit per animation frame: stash the latest args in a ref, schedule a single frame, and let
  // the frame do the writing. The guards still run on EVERY event — dropping a stale post-seek
  // event is about correctness, not rate — so only the state write is throttled.
  const latestPosition = useRef<AlphaTab.synth.PositionChangedEventArgs | null>(null);
  const positionFrame = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (positionFrame.current !== null) cancelAnimationFrame(positionFrame.current);
      clearTimeout(rangeCheck.current);
    },
    [],
  );

  // The seek landed OUTSIDE the selected bars (or nobody can tell): let the selection go and seek
  // again. It is not optional. In AlphaTab 1.8.4 a seek outside an active playback range leaves
  // the sequencer clamped to the range's end while the reported time is the requested one: Play
  // then renders empty buffers, the engine's finish check never runs, and the player latches in
  // Playing with nothing moving; Pause falls back to the last beat the cursor had resolved. With
  // the range gone, the same seek positions the sequencer properly. The range goes FIRST: both
  // writes are messages to the same worker, handled in order.
  //
  // If the score was PLAYING, AlphaTab stopped it the moment the first seek left the range, so
  // playback is started again — leaving a selection must not cost the person their playback.
  const leaveRange = useCallback(
    (ms: number) => {
      if (!api) return;
      clearTimeout(rangeCheck.current);
      setAlphaTabValue(api, 'playbackRange', null);
      setAlphaTabValue(api, 'timePosition', ms);
      pendingSeek.current = { target: ms, since: performance.now() };
      if (resumeAfterSeek.current) {
        resumeAfterSeek.current = false;
        api.play();
      }
    },
    [api],
  );

  // Guard 1 — `endTime === 0` is the hardcoded PositionChangedEventArgs(0,0,0,0,false,120,120) stub
  // that AlphaTab replays synchronously at subscribe time. Without this the header flashes 120 BPM
  // on a 90 BPM score. It happens in a real browser too: the replay lives on the player facade the
  // api exposes, not on the worker-backed synth whose own emitters are bare.
  //
  // Guard 2 — after a seek, AlphaTab delivers a burst of STALE position events before the seek's
  // own echo. They carry `isSeek: false`, identical to every ordinary tick, so the flag cannot
  // filter them. What does: the echo carries `isSeek: true` AND exactly the requested time (clamped
  // to endTime), and MessagePort delivery is FIFO, so drop everything until that pair matches. The
  // 250 ms timeout is mandatory, not decoration — a seek issued during a count-in emits NO event at
  // all (AlphaTab gates the trigger on `isPlayingMain`), and without the bound the UI would latch
  // forever.
  useAlphaTabEvent(api, 'playerPositionChanged', (args) => {
    if (args.endTime === 0) return; // guard 1

    if (pendingSeek.current) {
      // guard 2
      const { target } = pendingSeek.current;
      const expected = Math.min(target, args.endTime);
      const matched = args.isSeek && Math.abs(args.currentTime - expected) < 1;
      if (!matched && performance.now() - pendingSeek.current.since < 250) return;
      pendingSeek.current = null;

      // The reply to a seek is also the only place that can say whether it landed inside the
      // selected bars: the selection is kept in TICKS, the seek bar works in milliseconds, and the
      // main thread cannot convert one into the other. Inside: the selection stays. Outside: it
      // goes, and the seek is made again without it.
      if (matched) {
        clearTimeout(rangeCheck.current);
        const range = api?.playbackRange;
        if (range && (args.currentTick < range.startTick || args.currentTick > range.endTick)) {
          leaveRange(target);
          return;
        }
        resumeAfterSeek.current = false;
      }
    }

    latestPosition.current = args;
    if (positionFrame.current !== null) return; // a frame is already scheduled
    positionFrame.current = requestAnimationFrame(() => {
      positionFrame.current = null;
      const next = latestPosition.current;
      if (!next) return;
      setPositionMs(next.currentTime);
      setDurationMs(next.endTime);
      setScoreTempo(next.originalTempo); // live; score.tempo is the INITIAL tempo only
    });
  });

  // No `midiLoaded` subscription, on purpose. The handler above already delivers the opening tempo
  // before a single frame has played: AlphaTab sets `tickPosition = 0` straight after every MIDI
  // load, which fires a position event carrying the real length and the tempo at tick 0 — and a
  // subscriber that arrives later than that is replayed the player's real current position. And
  // `midiLoaded` cannot be subscribed to safely in 1.8.4 at all; see `AlphaTabApiEvents`.

  // The download finished: hold the fraction at 100 %. NOT back to undefined — the worker still
  // decodes the presets for some tens of milliseconds before `playerReady`, and an undefined
  // fraction there flipped the nearly full bar to the grey indeterminate style for a few frames.
  useAlphaTabEvent(api, 'soundFontLoaded', () => setSoundFontProgress(1));
  // A failed download reaches the app as `api.error` (AlphaTab forwards the synth's
  // soundFontLoadFailed itself), which NotationSurface already reports as the engine-runtime
  // error.
  useAlphaTabEvent(api, 'error', () => setLoadFailed(true));

  // The bar means "the player is not ready yet", from the first frame: it is in the server HTML,
  // indeterminate until soundfont bytes flow, then a real fraction. It also covers opening a file.
  // A failure shows NO bar — never a "finished" one beside an error message.
  const failed = engineError !== null || loadFailed;
  const loadingPlayer = !failed && (!playerReady || opening);
  // 700 = the 400 ms hold at 100 % plus the 300 ms fade in LOADING_BAR_LEAVING below.
  const barPhase = useLoadingBarPhase(loadingPlayer, 700);
  // Held at 100 % while it fades. Opening a file has no fraction to show, and neither has the wait
  // before the first soundfont byte: both are the indeterminate style (null).
  let barValue: number | null = soundFontProgress ?? null;
  if (barPhase === 'done') barValue = 1;
  else if (opening) barValue = null;

  // The Loop toggle's label needs to know whether a bar range is selected.
  useAlphaTabEvent(api, 'playbackRangeChanged', (args) => setHasRange(args.playbackRange !== null));

  // The SAME condition AlphaTab uses to pick its backing-track player (alphaTab.core.mjs:46685,
  // `score?.backingTrack?.rawAudioFile`). `backingTrack` alone is not enough: a score can carry the
  // sync metadata without the audio, and AlphaTab then plays the synth, where both toggles work.
  useAlphaTabEvent(api, 'scoreLoaded', (score) =>
    setHasBackingTrack(Boolean(score.backingTrack?.rawAudioFile)),
  );

  // `api` is state, not a ref, so it MUST be in each dependency list: an empty list would freeze
  // the callback on the `undefined` it held before the engine arrived.
  const applyLooping = useCallback(
    (next: boolean) => {
      setLooping(next);
      if (api) setAlphaTabValue(api, 'isLooping', next);
    },
    [api],
  );

  // Metronome and Count-In are VOLUMES in AlphaTab, not booleans: 0 is off and 1 is the normal
  // level, so the toggle maps to the two ends rather than calling a method.
  const applyMetronome = useCallback(
    (next: boolean) => {
      setMetronome(next);
      if (api) setAlphaTabValue(api, 'metronomeVolume', next ? 1 : 0);
    },
    [api],
  );

  const applyCountIn = useCallback(
    (next: boolean) => {
      setCountIn(next);
      if (api) setAlphaTabValue(api, 'countInVolume', next ? 1 : 0);
    },
    [api],
  );

  // The ONLY writer of api.playbackSpeed in the app. v0 ships two controls over this one value —
  // the header BPM stepper and the Settings popover's speed slider — and both must call this.
  // `playbackSpeed` is an AlphaTabApi property, not a field in AlphaTab's Settings JSON, so a
  // settings row wired like its neighbours would write a value that never reaches the engine.
  const applySpeed = useCallback(
    (next: number) => {
      setSpeed(next);
      if (api) setAlphaTabValue(api, 'playbackSpeed', next);
    },
    [api],
  );

  const seek = useCallback(
    (ms: number) => {
      if (api) {
        setAlphaTabValue(api, 'timePosition', ms);
        // Bars are selected: whether this seek landed inside them is read off AlphaTab's reply (see
        // the position handler). ONE case gets no reply at all — a seek made during a count-in,
        // when the score is not playing yet — so a short timer stands in for it and lets the
        // selection go. Guessing "inside" there would risk the frozen player `leaveRange` exists
        // to prevent; guessing "outside" only costs selecting the bars again.
        clearTimeout(rangeCheck.current);
        if (api.playbackRange) {
          resumeAfterSeek.current = playing;
          rangeCheck.current = setTimeout(() => leaveRange(ms), 250);
        }
      }
      setPositionMs(ms); // optimistic; guard 2 above reconciles on the echo
      pendingSeek.current = { target: ms, since: performance.now() };
    },
    [api, leaveRange, playing],
  );

  // Confirm FIRST, then parse, then swap — spec §4's order. A file that does not parse never
  // becomes the open notation, so the score on screen is untouched by construction and there is
  // no rollback path to build.
  const requestNotation = useCallback(
    async (next: LoadedNotation) => {
      let at = engine;
      if (!at) {
        // Opened before the engine arrived — a very fast pick, or a stalled engine import. Wait on
        // the SAME memoised import the provider is waiting on. `notation` is still null in that
        // window, so nothing the person opened can be lost and there is nothing to confirm.
        at = await loadAlphaTabEngine().catch(() => null);
        // The engine failed; that failure is reported by the engine-error message, not by a toast.
        if (!at) return;
      }

      // Record the playing state BEFORE the prompt: globalThis.confirm blocks the main thread, so
      // the worklet drains its ~500 ms buffer and zero-fills on its own while the dialog is up,
      // and playerStateChanged cannot fire until the prompt returns.
      const wasPlaying = playing;

      // `notation !== null` means "a score the PERSON opened is on screen". It is null while the
      // bundled beat is showing, because AlphaTab loads that one itself from settings.core.file
      // and nothing ever calls setNotation for it. That is the whole condition, and it is
      // deliberate: the sample is a default, not a choice, so replacing it silently is right — a
      // dialog asking permission to close a file the person never opened would stand between
      // every new visitor and their first song. From the second open onward, the prompt behaves
      // exactly as the spec describes.
      if (notation !== null) {
        // Deliberate v0 shortcut. To be precise about what is and is not missing: the Base UI
        // Dialog PRIMITIVE is already in the repo — Sheet is a shadcn port over
        // `@base-ui/react/dialog`, with focus trap, scroll lock, overlay and a required title,
        // carrying VR and axe baselines. What does not exist is an AlertDialog COMPONENT (six
        // co-located files plus baselines). Building it is later work, and it would be a real
        // simplification here, not just a prettier dialog: a non-blocking dialog removes the
        // buffer drain and the `wasPlaying` capture, because playback simply never stops.
        const confirmed = globalThis.confirm(
          `Replace ${notation.name} with ${next.name}? The score you have open will be closed.`,
        );

        if (!confirmed) {
          // Cancel keeps the current score and discards the new file. Nothing to resume: playback
          // was never interrupted. globalThis.confirm blocks the main thread, so the player is
          // still in PlayerState.Playing when the dialog returns — AlphaSynthBase.play() would
          // return false without acting — and AlphaTab's pump refills the drained buffer itself.
          return;
        }
      }

      // Sonner ships its own spinner, so this needs no new component — and a Skeleton would hide a
      // score that is still on screen and still playable. A long, dense score takes a noticeable
      // time to parse (2,000 bars of 16ths: ~0.4 s on a fast laptop, longer on a slow one), while
      // file size barely matters. One `id` makes the loading, success and failure states share one
      // toast instead of stacking three.
      // The loading bar FIRST, committed synchronously. Sonner inserts its toast element
      // asynchronously, so on a slow machine the painted frame the wait below buys did not yet
      // contain the toast: measured under a 20x CPU throttle, the toast reached the DOM 188 ms
      // after the pick and was first PAINTED at 3.9 s, when the parse had already finished. The
      // bar is our own React state, so flushSync puts it in the DOM before that frame is painted.
      flushSync(() => setOpening(true));
      toast.loading(`Opening ${next.name}…`, { id: 'notation-load' });

      // loadScoreFromBytes is synchronous: wait until the toast is really ON SCREEN first, or it
      // would appear only once the parse had already finished.
      await loadingToastPainted();

      let score: AlphaTab.model.Score;
      try {
        score = at.importer.ScoreLoader.loadScoreFromBytes(next.bytes);
      } catch {
        setOpening(false);
        toast.error(
          `${next.name} could not be opened — it is not a score format the player reads. (Error ${PLAYER_ERROR.notAScore})`,
          { id: 'notation-load' },
        );
        // The open score was never replaced, and playback was never interrupted — the worklet
        // drained its buffer while the dialog was up and the pump refills it. Nothing to restart.
        return;
      }

      // Pause only on the confirm path, to stop the synth before renderScore swaps the score.
      if (wasPlaying) api?.pause();
      // A bar range selected in the OLD score must not outlive it. AlphaTab keeps the main-thread
      // playbackRange across a score change while the new sequencer has none: the Loop toggle
      // went on reading "Loop selection", the cursor froze at the old range's end, and Pause
      // jumped back — with no seek involved.
      if (api?.playbackRange) setAlphaTabValue(api, 'playbackRange', null);
      setNotation({ name: next.name, score });
      setOpening(false);
      toast.success(`${next.name} loaded`, { id: 'notation-load' });
      // Success only. None of this is reachable from the cancel path or the parse failure (both
      // returned above), from the read failures the picker catches, or for the bundled score —
      // nobody asked for that one, so nothing is announced and nothing is focused at page load.
      setAnnouncement(`Opened ${next.name}`);
      playRef.current?.focus();
    },
    [api, engine, notation, playing],
  );

  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const endDrag = useCallback(() => {
    depth.current = 0;
    setDragging(false);
  }, []);

  // Same boundary as OpenFileControl's `accept`: the 25 MB check, then the same failure toast
  // (E101 or E102). Without the try/catch, `void acceptDropped(...)` would hide a rejected read
  // and show nothing.
  const acceptDropped = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        await requestNotation(await readNotation(file));
      } catch {
        // Same id as requestNotation's loading toast — see OpenFileControl's `accept`.
        toast.error(readFailureMessage(file), { id: 'notation-load' });
      }
    },
    [requestNotation],
  );

  // A cancelled drag (Esc, or releasing outside the window) fires NO further drag event, so the
  // counter never unwinds and the overlay would stay up forever. Pointer events are suppressed for
  // the duration of a drag, so the first pointermove afterwards is a reliable "it is over" signal
  // and does not fire mid-drag.
  useEffect(() => {
    const onEnd = () => {
      if (depth.current !== 0) endDrag();
    };
    globalThis.addEventListener('dragend', onEnd);
    globalThis.addEventListener('pointermove', onEnd);
    return () => {
      globalThis.removeEventListener('dragend', onEnd);
      globalThis.removeEventListener('pointermove', onEnd);
    };
  }, [endDrag]);

  // A score is always on screen, so the header always has a name to show: the file the person
  // opened, or the bundled beat the page starts on. Derived from SAMPLE_NOTATION rather than typed
  // again, so renaming the file cannot leave a stale label behind.
  const openFileName = notation?.name ?? SAMPLE_NOTATION.split('/').pop() ?? '';

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <h1 className="sr-only">Player</h1>

      {/* The bar rides the header's bottom edge, out of the layout flow, so the notation below
          does not jump when it appears and again when it goes. */}
      <div className="relative">
        <PlayerHeader
          scoreTitle={notation?.score.title ?? ''}
          fileName={openFileName}
          scoreTempo={scoreTempo}
          speed={speed}
          onSpeedChange={applySpeed}
          disabled={!playerReady}
        />
        {failed || barPhase === 'gone' ? null : (
          <Progress
            value={barValue}
            label="Loading the player"
            className={
              barPhase === 'done'
                ? 'absolute inset-x-0 bottom-0 opacity-0 transition-opacity delay-[400ms] duration-300'
                : 'absolute inset-x-0 bottom-0'
            }
          />
        )}
      </div>

      {/* A dragenter/dragleave COUNTER, never a bare setDragging(false). `dragleave` also fires on
          the container whenever the pointer crosses into a CHILD, with relatedTarget set to that
          child, so the naive form cannot tell "left for a child" from "left the surface" — measured
          14 state transitions on one drag across the control, a visible strobe. Clamped at 0 so a
          stray leave cannot make the next enter a no-op. */}
      <section
        className="nh-drop-zone relative flex flex-col gap-4"
        data-testid="drop-zone"
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          setDragging(depth.current > 0);
        }}
        onDragOver={(event) => {
          // preventDefault is what makes this a drop target, and it is ALL that belongs here. Do
          // not set dropEffect: per the HTML spec, a dropEffect outside the SOURCE's effectAllowed
          // sets the drag operation to "none" and the browser then never fires `drop` at all. The
          // hard-coded 'link' here did exactly that to every copy-only source — a file dragged
          // from Photos, a screenshot, a download — silently, with no event and no error to see.
          // Left alone, the browser picks an operation the source actually offers.
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          endDrag();
          // One file, no extension filter — the same size gate and the same failure toasts
          // the picker uses. ScoreLoader sniffs content, so a filter here would buy nothing.
          void acceptDropped(event.dataTransfer.files[0]);
        }}
      >
        <div className="relative">
          {/* NotationSurface is ALWAYS mounted — it renders its own engine-error message as an
              overlay. Do not reintroduce a branch that renders something INSTEAD of it: unmounting
              the box while the api is alive leaves AlphaTab drawing into a detached node, with no
              error raised anywhere. When the engine never loaded, nothing can open or play, and the
              Play button stays where it is, disabled (spec §4). */}
          <NotationSurface
            api={api}
            hostRef={hostRef}
            viewportRef={viewportRef}
            notation={notation}
            onSoundFontProgress={setSoundFontProgress}
          />
          {dragging ? (
            /* MUST be a descendant of the drop container AND pointer-events-none. An overlay
               mounted outside the container oscillated forever: every dragleave's relatedTarget was
               the overlay, which is not a descendant, so no matching dragenter ever arrived inside
               and the counter could not balance. aria-hidden is deliberate — it is decorative
               during a pointer gesture, and the keyboard path is the labelled Open file button. */
            <div
              aria-hidden
              className="nh-drop-overlay pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                upload
              </span>
              <p className="text-lg font-semibold text-foreground">Drop to open</p>
              <p className="text-sm text-foreground opacity-75">
                Guitar Pro, MusicXML, Capella or alphaTex
              </p>
            </div>
          ) : null}
        </div>

        <div
          data-testid="player-status"
          data-playing={playing}
          data-player-ready={playerReady}
          data-duration={durationMs}
          data-looping={looping}
          data-metronome={metronome}
          data-countin={countIn}
          data-speed={speed}
        >
          {/* The whole transport is gated on `playerReady`, never on `soundFontLoaded`: that one is
              a bare emitter with no replay, so a late subscriber would latch the row disabled
              forever. */}
          <TransportRow
            positionMs={positionMs}
            durationMs={durationMs}
            onSeek={seek}
            looping={looping}
            onLoopingChange={applyLooping}
            metronome={metronome}
            onMetronomeChange={applyMetronome}
            countIn={countIn}
            onCountInChange={applyCountIn}
            hasRange={hasRange}
            hasBackingTrack={hasBackingTrack}
            disabled={!playerReady}
            playButton={
              /* The mockup's Play: a SOLID teal circle, 48 px, with a solid glyph and a soft teal
                 shadow — Button's own `default` variant, which is bg-primary with the hover
                 darken. The two glyphs are inline SVG paths (Material's play_arrow and pause):
                 the self-hosted Material Symbols face carries the weight axis only, so
                 `FILL 1` does nothing and the font can only draw them as outlines. `size-6` is
                 required, or Button sizes a bare svg to 16 px. This is NOT client/'s PlayButton —
                 that one is the catalog row's control and has no pause state.

                 `disabled` here renders `aria-disabled="true"`, never the native attribute, and
                 the design system blocks activation itself — so no guard belongs at this call
                 site. That matters because a natively disabled button cannot receive focus, and
                 opening a file moves focus to this button: while the engine is still loading, a
                 native `disabled` would make that focus call a silent no-op and strand the
                 person's focus on the control they just used. */
              <Tooltip>
                <TooltipTrigger
                  // Play/Pause is a toggle: keep the tooltip open across the press, so it says the new
                  // state at once instead of vanishing until the pointer leaves and returns.
                  closeOnClick={false}
                  render={
                    <Button
                      ref={playRef}
                      data-testid="transport-play"
                      size="icon"
                      aria-label={playing ? 'Pause' : 'Play'}
                      disabled={!playerReady}
                      onClick={() => api?.playPause()}
                      className="size-12 rounded-full shadow-lg shadow-primary/20"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="size-6"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path d={playing ? 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' : 'M8 5v14l11-7z'} />
                      </svg>
                    </Button>
                  }
                />
                {/* Lifted 8 px, or the teal arrow lies on the solid teal button and cannot be seen. */}
                <TooltipContent sideOffset={8}>{playing ? 'Pause' : 'Play'}</TooltipContent>
              </Tooltip>
            }
            leading={
              /* Permanent, never conditional. The control sits in the row for the whole life of
                 the page: a score is always open, so there is no other place for it to live, the
                 replace tests always find `open-file-input`, and the person's focus is never
                 moved by a control disappearing out from under them. It is FIRST in the row — the
                 mockup keeps Open file at the bottom-left — and `trailing` stays free for the
                 Tracks trigger Plan C adds. */
              <OpenFileControl onNotation={requestNotation} />
            }
          />
        </div>

        {/* Visually hidden, and polite so it waits for a gap rather than cutting the reader off. It
            is mounted for the whole life of the page: a live region added to the DOM at the same
            moment its text appears is not announced at all — the region has to be there first.
            Empty until the first successful open, and that open is the only thing that writes to
            it. */}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </section>
    </main>
  );
}

export function PlayerShell() {
  return (
    <AlphaTabEngineProvider>
      <Player />
    </AlphaTabEngineProvider>
  );
}
