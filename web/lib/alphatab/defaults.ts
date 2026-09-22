import { resolveLogLevel } from './engine';
import type { AlphaTabEngine } from './engine';
import type * as AlphaTab from '@coderline/alphatab';

/**
 * The settings that are identical for EVERY AlphaTab instance in the app — the "shipped defaults".
 *
 * Ported from the fork's `environment.setAlphaTabDefaults`. It is a separate stage, not inlined in
 * the hook, because two later features need to read the shipped values rather than guess them: the
 * settings popover's localStorage restore merges against them, and its "reset" puts them back.
 * Buried in a closure they are reachable by neither.
 *
 * Per-instance settings — the file, the tracks, the player mode, the scroll element — belong in
 * the call site's `settingsInit` callback, which runs AFTER this.
 *
 * The fork also sets a 16-line sans/serif family stack here for AlphaTab's title, marker and
 * fingering text (`environment.ts:45-60`). That needs a product typeface decision, so it is
 * deferred to NH-302, not guessed here.
 */
export function setAlphaTabDefaults(settings: AlphaTab.Settings, engine: AlphaTabEngine): void {
  settings.core.fontDirectory = '/alphatab/font/';
  settings.core.logLevel = resolveLogLevel(engine);
  settings.player.soundFont = '/alphatab/soundfont/sonivox.sf3';
}
