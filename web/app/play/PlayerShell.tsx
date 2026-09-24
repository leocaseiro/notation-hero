'use client';

import {
  Button,
  Progress,
  RECORDING,
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
import { applySettingsJson } from '../../lib/alphatab/live-settings';
import {
  DEFAULT_PLAYER_SETTINGS,
  SETTING_OPTION_VALUES,
  writeSettingValue,
} from '../../lib/alphatab/settings-schema';
import {
  loadStoredSettings,
  serializeSettings,
  SETTINGS_STORAGE_KEY,
} from '../../lib/alphatab/settings-storage';
import { setAlphaTabValue, useAlphaTab, useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { PLAYER_ERROR } from '../../lib/player-errors';
import { NotationSurface } from './NotationSurface';
import { OpenFileControl, readFailureMessage, readNotation } from './OpenFileControl';
import { PlayerHeader } from './PlayerHeader';
import { SettingsPopover } from './SettingsPopover';
import { TracksPopover } from './TracksPopover';
import { TransportRow } from './TransportRow';
import { useLoadingBarPhase } from './useLoadingBarPhase';
import type {
  ApiValueKey,
  PlayerSettingsJson,
  SettingAction,
  SettingApply,
} from '../../lib/alphatab/settings-schema';
import type * as AlphaTab from '@coderline/alphatab';
import type { SettingValue } from '@notation-hero/client';

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
  // Metronome and Count-In are VOLUMES in AlphaTab, not booleans: 0 is off and 1 is the normal
  // level. The transport's two buttons derive their pressed state from "volume > 0", and the
  // Settings popover's two matching rows share these same values — one writer each.
  const [metronomeVolume, setMetronomeVolume] = useState(0);
  const [countInVolume, setCountInVolume] = useState(0);
  // Whether AlphaTab currently holds a bar-range selection — drives the Loop toggle's label only.
  const [hasRange, setHasRange] = useState(false);
  // Whether the open score plays its own embedded recording. Metronome and Count-In are inert then.
  const [hasBackingTrack, setHasBackingTrack] = useState(false);
  // The two modes that build no player at all, or build one nothing ever drives: the person's own
  // choice in settings, not what AlphaTab built. Disabled builds no player, so playerReady can
  // never answer for it; EnabledExternalMedia builds one with no media source in v0, so it never has
  // anything to drive. Written by readChosenMode below.
  const [playbackOff, setPlaybackOff] = useState(false);
  const [externalMedia, setExternalMedia] = useState(false);
  // The third dead mode: EnabledBackingTrack chosen on a file with no embedded recording. AlphaTab
  // still builds that player and reports it ready (measured in a real browser), but playback
  // completes instantly with nothing to play. Needs the real player and the loaded score, so it is
  // written by readPlayer, not readChosenMode.
  const [backingTrackNoRecording, setBackingTrackNoRecording] = useState(false);
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
  // Read ONCE per page visit, in a lazy initialiser rather than an effect — react-hooks/set-state-
  // in-effect is an error in this package, and reading storage in an effect and then calling
  // setSettings would trip it. The initialiser also runs for the server render, where there is no
  // storage: it yields the defaults there, and the HTML is identical either way because nothing on
  // the page renders a setting until the popover is opened.
  const [restored] = useState(() =>
    // eslint-disable-next-line sonarjs/different-types-comparison -- true at runtime during server rendering, where `window` genuinely does not exist; the DOM lib's ambient types just do not say so
    globalThis.window === undefined
      ? { settings: DEFAULT_PLAYER_SETTINGS, reset: false }
      : loadStoredSettings(
          globalThis.localStorage.getItem(SETTINGS_STORAGE_KEY),
          DEFAULT_PLAYER_SETTINGS,
          SETTING_OPTION_VALUES,
        ),
  );
  // The Settings popover's edit state: the whole document the shell pushes into the live engine on
  // every change (see applySetting below). Declared here, above useAlphaTab, so a lazily
  // initialised read of the stored value can reach it without closing over a const declared later.
  const [settings, setSettings] = useState<PlayerSettingsJson>(restored.settings);

  // A toast is not state, so an effect is the right place for it. Without it a drummer watches
  // their colours and fonts revert with no way to tell it from a bug — the same surface the
  // corrupt-file and engine-failure states already use.
  //
  // The repair write happens here too, not only inside applySetting: without it the cleaned-up
  // document is never written back, so the same corrupt value stays in storage and the warning
  // would repeat on every visit until the person happens to touch a setting.
  //
  // The toast call is deferred a tick rather than fired synchronously: the root layout renders the
  // page before the toaster with no boundary between them, and passive effects run in tree order,
  // so a synchronous call here fires before the toaster has subscribed and is never shown. The
  // cleanup cancels the deferred call on an unmount before it fires, which is what keeps React's
  // development double-mount from stacking two toasts.
  useEffect(() => {
    if (!restored.reset) return;
    try {
      globalThis.localStorage.setItem(SETTINGS_STORAGE_KEY, serializeSettings(restored.settings));
    } catch {
      // Storage is unavailable or full; the warning below is still worth showing.
    }
    const id = setTimeout(() => {
      toast.warning('Your player settings could not be read, so they were reset to the defaults.');
    }, 0);
    return () => clearTimeout(id);
  }, [restored]);

  // The ONE owner of the api. There is no second apiRef and no onApiReady callback: a callback
  // prop in the hook's dependency list rebuilds the engine on an ordinary state change, throwing
  // away the loaded score, the downloaded soundfont and both workers.
  //
  // `alphaTab` is the namespace object the hook passes in — the self-hosted-ESM delivery decision
  // forbids importing it, so this is the only way a call site reaches an enum.
  const [api, hostRef] = useAlphaTab((engineSettings, alphaTab) => {
    // No engineSettings.core.scriptFile. AlphaTab finds its own worker and worklet relative to
    // /alphatab/esm/alphaTab.mjs — that is the entire point of self-hosting the ESM.
    // fontDirectory, logLevel and soundFont are already applied by setAlphaTabDefaults().
    engineSettings.core.file = SAMPLE_NOTATION;
    engineSettings.core.tracks = 'all';
    // EnabledAutomatic on purpose (2026-09-16): a Guitar Pro file that embeds an audio track plays
    // that recording, with the notation on screen — that is how this player plays along to a
    // person's own files. AlphaTab resolves EnabledAutomatic to its backing-track player whenever
    // `score.backingTrack.rawAudioFile` exists, and that player's synthesizer stubs out
    // channelSetMute, channelSetSolo, channelSetMixVolume and the metronome channel (verified in
    // 1.8.4). The transport's metronome and count-in and the mixer rows disable only while that
    // backing-track player is the one AlphaTab actually built — choosing the synthesizer in
    // Settings leaves them live, even when the file still embeds a recording.
    //
    // It also keeps the empty page cheap: with EnabledAutomatic and no score yet, AlphaTab creates
    // no player at all — no AudioContext, no synth worker, no soundfont fetch
    // (alphaTab.core.mjs:46680-46685).
    engineSettings.player.playerMode = alphaTab.PlayerMode.EnabledAutomatic;
    engineSettings.player.enableCursor = true;
    engineSettings.player.scrollMode = alphaTab.ScrollMode.Continuous;
    // The OUTER div scrolls — never AlphaTab's own element. This runs inside the hook's effect,
    // after both divs are committed, so the ref is filled; the `if` is for the type, and because
    // `@typescript-eslint/no-non-null-assertion` is not worth fighting over one line.
    if (viewportRef.current) engineSettings.player.scrollElement = viewportRef.current;
    // Ten pixels of air above the cursor, so it does not sit flush against the top edge. The
    // fork sets the same (AlphaTabRhythmGame/index.tsx:151).
    engineSettings.player.scrollOffsetY = -10;

    // The person's stored settings, applied before the api exists, so the first draw already has
    // them — the score is drawn once, with the person's settings, instead of once with the
    // defaults and again with theirs. After the shell's own assignments on purpose: for a key both
    // set — the cursor, the scroll mode — the person's own choice is the one that must win.
    //
    // fillFromJson, never assignment: RenderingResources holds real Color and Font instances, and
    // a plain object assigned into the settings tree breaks rendering WITHOUT throwing, so a
    // try/catch around an assignment would never fire. And wrapped in try/catch here anyway,
    // because an uncaught throw would stop the player mounting at all, which is the one thing this
    // page exists to do — the per-key merge against the shipped defaults makes this unreachable in
    // practice, but the cost of being wrong is a page with no player.
    try {
      engineSettings.fillFromJson(settings as AlphaTab.json.SettingsJson);
    } catch {
      // Keep the defaults already on `engineSettings`.
    }
  });

  // Both subscriptions go through the helper, so each one is removed when this component
  // unmounts or the api changes. No `.on()` by hand anywhere in the app.
  //
  // PlayerState is an AlphaTab enum and cannot be imported; read it off the namespace object
  // instead of comparing against the literal 1, which would rot if the ordering ever changed.
  useAlphaTabEvent(api, 'playerStateChanged', (args) => {
    setPlaying(args.state === engine?.synth.PlayerState.Playing);
  });
  // The mode the PERSON chose, read from settings rather than from what AlphaTab built. Both
  // dead-on-arrival modes need it here: Disabled builds no player, so playerReady never fires for
  // it, and EnabledExternalMedia builds one with no media source, so nothing ever drives it — the
  // settings read is the only way either is known, on a reload where no playerReady is ever coming.
  //
  // Guarded and compared WITHOUT optional chaining on the comparison itself: `api?.x === engine?.y`
  // is `undefined === undefined` — true — whenever EITHER is still missing, which would report
  // every dead mode as chosen before the engine has even loaded.
  const readChosenMode = useCallback(() => {
    if (!api || !engine) return;
    const mode = api.settings.player.playerMode;
    setPlaybackOff(mode === engine.PlayerMode.Disabled);
    setExternalMedia(mode === engine.PlayerMode.EnabledExternalMedia);
  }, [api, engine]);

  // Which player AlphaTab actually built. A file that embeds a recording still plays from the
  // synthesizer when that mode is selected, and then the metronome, the count-in and the mixer
  // work. The file merely containing audio is not the signal: EnabledAutomatic resolves to the
  // backing-track player, EnabledSynthesizer does not.
  const readPlayer = useCallback(() => {
    if (!api || !engine) return;
    const isBackingTrack = api.actualPlayerMode === engine.PlayerMode.EnabledBackingTrack;
    setHasBackingTrack(isBackingTrack);
    // EnabledBackingTrack on a file with no embedded recording is a dead state, measured in a real
    // browser: AlphaTab builds the backing-track player and reports it ready right away, but
    // playback completes instantly with nothing to play.
    setBackingTrackNoRecording(isBackingTrack && !api.score?.backingTrack?.rawAudioFile);
    // Read, not latched `true`: the same soundfont reload that follows a mode switch or a file
    // replace leaves an earlier `true` stale while the new player is still loading, and Play must
    // not stay pressable through that window.
    setPlayerReady(api.isReadyForPlayback);
    // A mid-session switch INTO a dead mode settles without a reload: playerReady never fires for
    // Disabled or EnabledExternalMedia, so the settings read has to run here too, not only at
    // scoreLoaded.
    readChosenMode();
  }, [api, engine, readChosenMode]);

  // `playerReady`, not `soundFontLoaded`: 1.8.4 builds soundFontLoaded as a bare `new EventEmitter()`,
  // so it fires once and is never replayed — a subscription that lands one commit after the api was
  // constructed can miss it and latch Play disabled forever. `api.playerReady` returns the player
  // wrapper's `readyForPlayback`, built as `new EventEmitter(() => this.isReadyForPlayback)`, which
  // reports the current value to a late subscriber.
  useAlphaTabEvent(api, 'playerReady', readPlayer);
  // Also subscribed to `renderStarted`: without it, `readPlayer` runs only from `playerReady` above
  // and from the settings-change handler below, so a FILE REPLACE rebuilds the player with
  // `playerReady` still latched true from the OLD score and `hasBackingTrack` stale until the new
  // score's own `playerReady` eventually arrives. `_internalRenderTracks` runs after
  // `_onScoreLoaded` has already set the new player up, so `renderStarted` sees the right answer,
  // and the read is idempotent — safe to run on every one of the four renders per score.
  useAlphaTabEvent(api, 'renderStarted', readPlayer);

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
      // Same reason as in `seek`: this re-arms pendingSeek, so a frame still holding a pre-seek
      // sample would write it and guard 2 would then drop events until the second echo.
      latestPosition.current = null;
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
  // Three modes will NEVER become a playable player: Disabled and EnabledExternalMedia build none
  // that could ever answer playerReady (v0 wires up no external-media handler), and
  // EnabledBackingTrack on a file with no embedded recording builds one that reports ready straight
  // away with nothing to play (all three measured in a real browser). Each is a SETTLED choice, not
  // a pending one, so the bar must not wait on a playerReady that is either never coming or already
  // meaningless.
  const noPlayerComing = playbackOff || externalMedia || backingTrackNoRecording;
  const loadingPlayer = !failed && ((!playerReady && !noPlayerComing) || opening);
  // The same three modes disable every control that ACTS on the player, not only the loading bar.
  // `!playerReady` alone is not enough: EnabledExternalMedia and a recording-less
  // EnabledBackingTrack both measured `isReadyForPlayback: true` immediately, so without
  // `noPlayerComing` here, Play, Loop, the scrubber and the metronome would all look live while
  // doing nothing — the one thing a control here must never do.
  const playbackDisabled = !playerReady || noPlayerComing;
  // 700 = the 400 ms hold at 100 % plus the 300 ms fade in LOADING_BAR_LEAVING below.
  const barPhase = useLoadingBarPhase(loadingPlayer, 700);
  // Held at 100 % while it fades. Opening a file has no fraction to show, and neither has the wait
  // before the first soundfont byte: both are the indeterminate style (null).
  let barValue: number | null = soundFontProgress ?? null;
  if (barPhase === 'done') barValue = 1;
  else if (opening) barValue = null;

  // The Loop toggle's label needs to know whether a bar range is selected.
  useAlphaTabEvent(api, 'playbackRangeChanged', (args) => setHasRange(args.playbackRange !== null));

  // scoreLoaded fires BEFORE _setupOrDestroyPlayer writes actualPlayerMode, so a read in this
  // handler would still see the outgoing player (the synth, on the first file that embeds a
  // recording). The setup call is synchronous and finishes before the stack yields, so a microtask
  // sees the player this score will use — including a file opened while the synthesizer is already
  // selected, which must not lock the mixer just because the file contains audio.
  useAlphaTabEvent(api, 'scoreLoaded', () => {
    // The chosen mode comes from settings, not from the score or the player, so it needs none of
    // the wait above — and a stored Disabled or EnabledExternalMedia mode must read as settled from
    // the very first frame, on a reload where playerReady is never coming at all.
    readChosenMode();
    queueMicrotask(readPlayer);
  });

  // `api` is state, not a ref, so it MUST be in each dependency list: an empty list would freeze
  // the callback on the `undefined` it held before the engine arrived.
  const applyLooping = useCallback(
    (next: boolean) => {
      setLooping(next);
      if (api) setAlphaTabValue(api, 'isLooping', next);
    },
    [api],
  );

  // The ONE writer of api.metronomeVolume. The transport's Metronome button and the Settings
  // popover's metronome-volume row both call it.
  const applyMetronomeVolume = useCallback(
    (next: number) => {
      setMetronomeVolume(next);
      if (api) setAlphaTabValue(api, 'metronomeVolume', next);
    },
    [api],
  );

  // The ONE writer of api.countInVolume, same shape as the metronome above.
  const applyCountInVolume = useCallback(
    (next: number) => {
      setCountInVolume(next);
      if (api) setAlphaTabValue(api, 'countInVolume', next);
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

  // The one api value the transport does not already own.
  const [masterVolume, setMasterVolume] = useState(1);
  const applyMasterVolume = useCallback(
    (next: number) => {
      setMasterVolume(next);
      if (api) setAlphaTabValue(api, 'masterVolume', next);
    },
    [api],
  );

  // The Settings popover's Player group api rows, in the unit each row shows. The speed is a
  // multiplier everywhere else in the player; the row shows a percentage, rounded to one decimal,
  // because the header's BPM stepper leaves the multiplier at values like 0.8916….
  const apiValues: Partial<Record<ApiValueKey, SettingValue>> = {
    playbackSpeed: Math.round(speed * 1000) / 10,
    masterVolume,
    metronomeVolume,
    countInVolume,
    isLooping: looping,
  };

  const applyApiValue = useCallback(
    (key: ApiValueKey, value: SettingValue) => {
      // Every branch goes to the value's ONE writer. The speed row and the header's tempo control
      // are two editors of one value; so are the metronome row and the transport's Metronome
      // button.
      switch (key) {
        case 'playbackSpeed': {
          applySpeed(Number(value) / 100);
          break;
        }
        case 'masterVolume': {
          applyMasterVolume(Number(value));
          break;
        }
        case 'metronomeVolume': {
          applyMetronomeVolume(Number(value));
          break;
        }
        case 'countInVolume': {
          applyCountInVolume(Number(value));
          break;
        }
        default: {
          applyLooping(Boolean(value));
        }
      }
    },
    [applySpeed, applyMasterVolume, applyMetronomeVolume, applyCountInVolume, applyLooping],
  );

  // The Settings popover's single funnel: every `settings`-sourced row pushes through here,
  // whatever `apply` mode it declares.
  const applySetting = useCallback(
    (path: string, value: SettingValue, apply: SettingApply) => {
      // Compute, set, THEN call the engine — never call the engine inside the setState updater.
      // React may run an updater twice, which would push the settings and redraw the score twice.
      const next = writeSettingValue(settings, path, value);
      setSettings(next);
      try {
        globalThis.localStorage.setItem(SETTINGS_STORAGE_KEY, serializeSettings(next));
      } catch {
        // Private browsing and a full quota both throw here. Losing persistence is survivable;
        // losing the player is not, so swallow it rather than breaking the edit.
      }
      if (api) applySettingsJson(api, next, apply);
      // updateSettings() swaps the player synchronously, so the new mode is readable now.
      // playerReady arrives later, after the soundfont, which is too late: the metronome would
      // stay locked for the whole download after a switch to the synthesizer.
      if (path === 'player.playerMode') readPlayer();
    },
    [api, settings, readPlayer],
  );

  const runAction = useCallback(
    (action: SettingAction) => {
      if (!api?.score || !engine) return;
      if (action === 'export-midi') {
        try {
          api.downloadMidi();
        } catch {
          toast.error('That file could not be exported.');
        }
        return;
      }
      // Guitar Pro 7 bytes from AlphaTab's own exporter, handed to the browser as a download. The
      // exporter is a runtime value, so it comes off the loaded namespace, never an import.
      //
      // The SUCCESS path needs no signal — the browser's own download is the signal. A failure has
      // none at all, and every step here can throw: the export itself, the Blob, the object URL.
      try {
        const bytes = new engine.exporter.Gp7Exporter().export(api.score, api.settings);
        const url = URL.createObjectURL(new Blob([bytes as BlobPart]));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${api.score.title || 'score'}.gp`;
        link.click();
        URL.revokeObjectURL(url);
      } catch {
        toast.error('That file could not be exported.');
      }
    },
    [api, engine],
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
      // Drop the pre-seek sample the position handler has parked. During playback a frame is almost
      // always already scheduled, and it would fire a few milliseconds from now and write the OLD
      // currentTime over the optimistic value below — after which guard 2 drops every real event
      // until the echo, so the stale position is what stays on screen for the whole round trip.
      // The scheduled frame still clears `positionFrame` and then returns at its `if (!next)`.
      latestPosition.current = null;
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
      // Nor may the in-flight seek bookkeeping. `api` survives a file open — it is destroyed only
      // on unmount — so an armed `rangeCheck` would run `leaveRange` against the NEW score,
      // writing an old position into it and, if the old score was playing, starting it.
      clearTimeout(rangeCheck.current);
      pendingSeek.current = null;
      resumeAfterSeek.current = false;
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

  // Play's tooltip: one branch per dead mode, so a disabled Play never says "Play". An if-chain
  // rather than a nested ternary — the same shape `barValue` above already uses.
  let playTooltip = playing ? 'Pause' : 'Play';
  if (playbackOff) {
    playTooltip = 'Playback is turned off in Settings';
  } else if (externalMedia) {
    playTooltip =
      'This mode follows an outside video or audio player, such as a YouTube video, which this ' +
      'version does not provide yet. A recording inside the file plays fine on the other modes.';
  } else if (backingTrackNoRecording) {
    playTooltip =
      'This file has no recording to play. Choose the synthesizer in Settings to hear it.';
  }

  return (
    // The player fills the window and never scrolls as a page: the notation is the only thing that
    // scrolls, and it does so inside its own box. `h-dvh`, not `h-screen` — on a phone or tablet
    // browser `100vh` is the height WITHOUT the retracting address bar, so the transport row sat
    // below the fold until the bar hid itself. Three rows: header, notation (the one that grows),
    // transport.
    <main className="flex h-dvh flex-col overflow-hidden">
      <h1 className="sr-only">Player</h1>

      {/* The bar rides the header's bottom edge, out of the layout flow, so the notation below
          does not jump when it appears and again when it goes.
          `z-10` is what makes the header's elevation shadow VISIBLE: without it the header is an
          ordinary flex item, so the rail and the notation below — both opaque — paint straight
          over the shadow it casts, and the edge reads as a bare hairline. The class belongs here
          rather than on the <header>: the loading bar is its SIBLING inside this wrapper, sitting
          on the header's bottom edge, so lifting the header alone would hide the bar behind it. */}
      <div className="relative z-10 shrink-0">
        <PlayerHeader
          scoreTitle={notation?.score.title ?? ''}
          fileName={openFileName}
          scoreTempo={scoreTempo}
          speed={speed}
          onSpeedChange={applySpeed}
          disabled={!playerReady}
          actions={
            <SettingsPopover
              api={api}
              settings={settings}
              onSettingChange={applySetting}
              apiValues={apiValues}
              onApiValueChange={applyApiValue}
              onAction={runAction}
              mixUnavailable={hasBackingTrack ? RECORDING : undefined}
            />
          }
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
        className="nh-drop-zone relative flex min-h-0 flex-1"
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
        {/* The mockup's left rail. Open file lives at its FOOT — that is where the mockup draws
            it, and it is why the transport row no longer takes a `leading` slot. The rail's other
            occupant in the mockup, the practice/game toggle, needs scoring and is not built (spec
            §2), so the rail holds exactly one control and `mt-auto` is what pins it down there. */}
        {/* `bg-rail` is a step DOWN from the page, where the footer's `bg-panel` is a step up —
            the mockup's own two values. One token for both read as a single flat band. */}
        <aside className="flex w-20 shrink-0 flex-col items-center border-r border-border bg-rail py-6 lg:w-24">
          <div className="mt-auto">
            <OpenFileControl onNotation={requestNotation} />
          </div>
        </aside>

        {/* `min-w-0` AND `min-h-0` — both axes, for one reason. A flex item defaults to
            `min-width`/`min-height: auto`, which refuses to shrink below its own content. Without
            `min-h-0` a long score pushes the transport row off the bottom; without `min-w-0` the
            transport row keeps its full intrinsic width in a narrow window and the shell's
            `overflow-hidden` simply cuts the right-hand controls away — measured 928 px of row in
            a 700 px window, with the metronome and count-in buttons gone. Raising the browser's
            text size does the same thing, because every size here is rem-based. */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1">
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
            className="shrink-0"
            data-testid="player-status"
            data-playing={playing}
            data-player-ready={playerReady}
            data-duration={durationMs}
            data-looping={looping}
            data-metronome={metronomeVolume > 0}
            data-countin={countInVolume > 0}
            data-speed={speed}
          >
            {/* The whole transport is gated on `playerReady`, never on `soundFontLoaded`: that one is
              a bare emitter with no replay, so a late subscriber would latch the row disabled
              forever. `playbackDisabled` also covers the two dead modes that report ready with
              nothing to play (see its definition above) — otherwise Loop, the scrubber and the
              metronome would look live while doing nothing. */}
            <TransportRow
              positionMs={positionMs}
              durationMs={durationMs}
              onSeek={seek}
              looping={looping}
              onLoopingChange={applyLooping}
              metronome={metronomeVolume > 0}
              onMetronomeChange={(on) => applyMetronomeVolume(on ? 1 : 0)}
              countIn={countInVolume > 0}
              onCountInChange={(on) => applyCountInVolume(on ? 1 : 0)}
              hasRange={hasRange}
              hasBackingTrack={hasBackingTrack}
              disabled={playbackDisabled}
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
                  {/* The trigger is a span AROUND the button, never the button itself — the fix
                    TransportToggle already carries. A disabled Button is `pointer-events: none`,
                    so as its own trigger it never receives the hover that opens the tooltip, and
                    Play is disabled for the whole engine + soundfont load. Focus events bubble,
                    so focus still opens it, and `playRef` stays on the Button. */}
                  <TooltipTrigger
                    // Play/Pause is a toggle: keep the tooltip open across the press, so it says the new
                    // state at once instead of vanishing until the pointer leaves and returns.
                    closeOnClick={false}
                    render={<span className="inline-flex shrink-0" />}
                  >
                    <Button
                      ref={playRef}
                      data-testid="transport-play"
                      size="icon"
                      aria-label={playing ? 'Pause' : 'Play'}
                      disabled={playbackDisabled}
                      onClick={() => {
                        // An explicit pause cancels a seek's pending auto-resume. This CANNOT
                        // live in `playerStateChanged`: that also fires when AlphaTab stops
                        // playback as a side effect of leaving the range — the very stop
                        // `resumeAfterSeek` exists to undo.
                        if (playing) resumeAfterSeek.current = false;
                        api?.playPause();
                      }}
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
                  </TooltipTrigger>
                  {/* Lifted 8 px, or the teal arrow lies on the solid teal button and cannot be seen. */}
                  <TooltipContent sideOffset={8}>{playTooltip}</TooltipContent>
                </Tooltip>
              }
              trailing={
                <div className="flex items-center">
                  {/* Hairline between Count-in and Tracks. bg-border is the row's own line
                      token; a `bg-line` utility is not in this theme. */}
                  <div
                    aria-hidden="true"
                    className="mx-2 h-6 w-px shrink-0 bg-border dark:bg-input"
                  />
                  <TracksPopover
                    api={api}
                    hasBackingTrack={hasBackingTrack}
                    disabled={!engine}
                    // The SAME value and writer the Settings ▸ Player row uses. Two editors, one writer.
                    masterVolume={masterVolume}
                    onMasterVolumeChange={applyMasterVolume}
                  />
                </div>
              }
            />
          </div>
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
