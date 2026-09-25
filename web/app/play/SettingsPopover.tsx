'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Popover,
  PopoverContent,
  ScrollArea,
  SettingRow,
} from '@notation-hero/client';
import { useState } from 'react';

import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';
import { readStylesheetValues, setStylesheetValue } from '../../lib/alphatab/live-settings';
import {
  buildSettingGroups,
  readSettingValue,
  STYLESHEET_ENUMS,
} from '../../lib/alphatab/settings-schema';
import { useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { PopoverIconTrigger } from './PopoverIconTrigger';
import type {
  ApiValueKey,
  PlayerSettingsJson,
  SettingAction,
  SettingApply,
  SettingDescriptor,
  StylesheetKey,
} from '../../lib/alphatab/settings-schema';
import type * as AlphaTab from '@coderline/alphatab';
import type { SettingValue } from '@notation-hero/client';

interface SettingsPopoverProps {
  /** The live api, or undefined until the engine has loaded. The Stylesheet group reads the open
   *  score through it. */
  api: AlphaTab.AlphaTabApi | undefined;
  settings: PlayerSettingsJson;
  onSettingChange: (path: string, value: SettingValue, apply: SettingApply) => void;
  /**
   * The AlphaTabApi properties the Player group edits, in the unit each row shows. The shell owns
   * every one of them, because each has a second editor elsewhere in the player — the speed is
   * also the header's tempo control.
   */
  apiValues: Readonly<Partial<Record<ApiValueKey, SettingValue>>>;
  /** Routed by the shell to its single writer for that value. Never to the settings JSON. */
  onApiValueChange: (key: ApiValueKey, value: SettingValue) => void;
  onAction: (action: SettingAction) => void;
  /**
   * Set while the file plays its own recording: the reason the two rows below are unavailable.
   * It both DISABLES the metronome-volume and count-in-volume rows and becomes their description,
   * so a greyed row says why it is greyed — the same reason string the transport's Metronome and
   * Count-In buttons already show. A control must never look dead with no explanation.
   */
  mixUnavailable?: string;
}

// The header gear. A POPOVER, not a modal — it never blocks the player, so a drummer can change a
// setting while the score plays. (The fourteen sound-rebuilding rows are the exception: applying
// one stops playback and rewinds — an e2e case pins it.) That is the single reason v0 chose this
// shape, and the settings search that comes later is layered over these same rows.
//
// The playback-speed slider lives in this popover's Player group, not in the header pill: neither
// design source draws a slider there, and "two popovers, not modals" leaves no third surface.
//
// FOUR KINDS OF ROW, ONE LOOP. A row's `source` decides where its value comes from and where a
// change goes — a settings key, an api property, the open score's stylesheet, or a command. The
// panel reads like one list, but AlphaTab takes a write to the wrong place without a word. It
// matters most for the `api` rows: `playbackSpeed` and its neighbours are
// AlphaTabApi PROPERTIES, not keys in AlphaTab's settings JSON, so a row that wrote one into the
// JSON would move, show its new number, and change nothing audible — a silent failure, not an
// error. They go to the shell's single writer for that value instead, which is also what keeps
// this slider and the header's tempo control showing the same speed.
export function SettingsPopover({
  api,
  settings,
  onSettingChange,
  apiValues,
  onApiValueChange,
  onAction,
  mixUnavailable,
}: Readonly<SettingsPopoverProps>) {
  const { engine } = useAlphaTabEngine();
  // The enum options come off the loaded namespace, so the groups cannot exist before it does.
  const groups = engine ? buildSettingGroups(engine) : [];

  // The Stylesheet group belongs to the OPEN SCORE, not to the app: every score brings its own
  // stylesheet, so the values are re-read each time one loads, and they are never stored.
  const [stylesheet, setStylesheet] = useState<Partial<Record<StylesheetKey, SettingValue>>>({});
  useAlphaTabEvent(api, 'scoreLoaded', (score) => {
    if (!engine) return;
    setStylesheet(
      readStylesheetValues(score, (key, value) =>
        String(STYLESHEET_ENUMS(engine)[key]?.[value] ?? ''),
      ),
    );
  });

  // eslint-disable-next-line sonarjs/function-return-type -- intentional SettingValue union (string | number | boolean), matching every row's own value type
  const valueOf = (setting: SettingDescriptor): SettingValue => {
    if (setting.source === 'settings') return readSettingValue(settings, setting.path) ?? '';
    if (setting.source === 'api') return apiValues[setting.key] ?? '';
    if (setting.source === 'stylesheet') return stylesheet[setting.key] ?? '';
    return ''; // an action row has no value
  };

  const change = (setting: SettingDescriptor, next: SettingValue) => {
    if (setting.source === 'settings') onSettingChange(setting.path, next, setting.apply);
    else if (setting.source === 'api') onApiValueChange(setting.key, next);
    else if (setting.source === 'stylesheet' && api && engine) {
      // A select row reports the enum's NAME; the score model wants its number. The reverse
      // lookup STYLESHEET_ENUMS returns is number -> name; a TypeScript numeric enum is
      // bidirectional at runtime, so the same object also answers name -> number.
      const enumObject = STYLESHEET_ENUMS(engine)[setting.key] as
        | Record<string, number>
        | undefined;
      const raw = enumObject && typeof next === 'string' ? enumObject[next] : next;
      if (typeof raw !== 'boolean' && typeof raw !== 'number') return;
      setStylesheetValue(api, setting.key, raw);
      setStylesheet((current) => ({ ...current, [setting.key]: next }));
    }
  };

  return (
    <Popover>
      <PopoverIconTrigger
        testId="settings-trigger"
        label="Settings"
        glyph="settings"
        disabled={!engine}
        className="rounded-xl"
      />
      <PopoverContent
        data-testid="settings-popover"
        align="end"
        className="w-96 p-0"
        aria-label="Settings"
      >
        <ScrollArea viewportClassName="max-h-[70vh]">
          {/* Every group OPEN by default (maintainer, 2026-09-21): browsing is the only way to
              find a row until search lands, and a panel that opens closed hides all 90 of them.
              The heading is sticky so the group a row belongs to stays readable while it
              scrolls. The classes sit on the <h3> (headerClassName), not the button: the
              button's parent is only as tall as the button, so sticky there never holds. */}
          <Accordion className="px-3 py-2" defaultValue={groups.map((group) => group.id)}>
            {groups.map((group) => (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger
                  className="text-xl font-bold text-primary hover:text-foreground"
                  headerClassName="sticky top-0 z-10 bg-popover"
                >
                  {group.title}
                </AccordionTrigger>
                <AccordionContent>
                  {group.settings.map((setting) => {
                    // The only two rows the backing-track synthesizer ignores. A control must
                    // never look live and do nothing — and a disabled one must say why, so the
                    // reason and the disabling are derived from the SAME value and cannot drift.
                    const mixDisabled =
                      Boolean(mixUnavailable) &&
                      setting.source === 'api' &&
                      (setting.key === 'metronomeVolume' || setting.key === 'countInVolume');
                    return (
                      <SettingRow
                        key={setting.id}
                        id={setting.id}
                        label={setting.label}
                        control={setting.control}
                        description={mixDisabled ? mixUnavailable : setting.description}
                        value={valueOf(setting)}
                        onChange={(next) => change(setting, next)}
                        onAction={
                          setting.source === 'action' ? () => onAction(setting.action) : undefined
                        }
                        // The path a live e2e case checks against the real AlphaTab settings
                        // object — a static attribute, present only on the rows it can check.
                        data-setting-path={setting.source === 'settings' ? setting.path : undefined}
                        disabled={mixDisabled}
                      />
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
