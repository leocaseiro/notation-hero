---
lap: 1
last_applied: P2
---

# Google Analytics 4 for `web/` — NH-51

Date: 2026-10-08
Status: Design approved by leocaseiro section by section (seven sections, ten decisions), 2026-10-05
to 2026-10-08. Not implemented. The plan comes next; the code waits for NH-124 to merge, and this
pull request merges only together with NH-349's (see "Known limits").
Ticket: [NH-51](https://leocaseiro.atlassian.net/browse/NH-51) — "[J-8] Google Analytics 4 — usage
and click events (client)".
Builds on: the Sentry spec, `docs/specs/2026-10-03-nh-124-sentry-error-monitoring-design.md`, on
draft PR [#191](https://github.com/leocaseiro/notation-hero/pull/191) after its lap 3. "Sentry's"
below means a file or rule that spec adds.

## Goal

Count who visits `web/` and what they do there, in Google Analytics 4 on its free tier, without
sending the score, its file name, its track names or the music — the promise Sentry keeps. Visitors
in Europe are asked first, and one answer governs both Google Analytics and Sentry.

## Non-goals

- **No advertising.** No Google Ads link, no remarketing, Google signals off, and every ad consent
  signal denied.
- **No AWS pipeline yet.** [NH-54](https://leocaseiro.atlassian.net/browse/NH-54) ("[H-6] SQS/SNS →
  S3 → Athena analytics") comes later; the typed event list is ready for a second sender.
- **No way yet to change an answer.** That is [NH-349](https://leocaseiro.atlassian.net/browse/NH-349),
  narrowed on 2026-10-05 to a "Privacy choices" link for every visitor (see "Known limits").
- **No preview deployments, no local dev.** Production only, like Sentry's D5.
- **No server code.** `web/` stays three static pages: no location headers, no Measurement
  Protocol.
- **No ad-blocker bypass**, like Sentry's D3. A blocked visitor is not counted.
- **No automatic click tracking.** Google's "enhanced measurement" keeps page views only; scrolls,
  outbound clicks, site search, video, file downloads and form interactions stay off.
- **Not `client/`.**
- **No Google filters in Sentry yet.** Sentry keeps Google's fetch and xhr breadcrumbs and any error
  thrown inside Google's script. A `beforeBreadcrumb` host drop or a `denyUrls` entry is added only
  if either appears as noise in Sentry.

## Why this exists

Nothing counts visits today. The Sentry spec keeps usage counting out of Sentry on purpose (its S2)
and says "this project counts no visits outside Sentry". leocaseiro wants to learn, from day one:

1. **Who comes** — visits, new and returning, country, device, and where they came from.
2. **What they use** — their own file or the bundled beat, play, loop, tempo, the mixer.
3. **Where they stop** — Home → Play page → file opened → pressed play. Nice to have: built in
   Google Analytics' Explore screen, with no extra code.

On the free tier only, and ready for the database: a new field or a second destination must be a
one-file change.

NH-51 was first written as "emit usage events to the pipeline" (NH-54). It was rewritten for this
work on 2026-10-05; the old text is kept in the ticket.

## Decisions

All approved by leocaseiro, 2026-10-05 to 2026-10-08. The changelog entry of 2026-10-08 records the
reasons.

| ID  | Decision                                                                                                          | Rejected                                                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Google Analytics 4, free tier, sent from the browser                                                              | Vercel Web Analytics (free plan: page views only, no custom events, a visitor ID that resets daily, one month of history, no funnel); Google Analytics through a Vercel function (Google: its Measurement Protocol only adds to the browser tag); the AWS pipeline now      |
| G2  | Our own small loader in `web/lib/analytics/`, started from `instrumentation-client.ts`                            | `@next/third-parties`' `<GoogleAnalytics>`: it works (spike, 2026-10-05), but is labelled experimental since October 2023 and has no props for consent or privacy settings, so it still needs a settings script, a Europe wrapper and a wrapper that silences `sendGAEvent` |
| G3  | Visitors in Europe are asked first; everyone else gets everything by default, with no popup                       | ask everyone first (fewer and skewed numbers); on for everyone with a notice (breaks EU law); Google's "advanced" consent mode (a small site never reaches its modelling thresholds, and EU guidance says those pings need consent too)                                     |
| G4  | Europe is decided by the browser's time zone                                                                      | Vercel's location headers (they need server code)                                                                                                                                                                                                                           |
| G5  | In Europe nothing loads — Sentry included — until the visitor answers                                             | error reports on until they answer (error reporting is not on the regulators' list of trackers exempt from consent)                                                                                                                                                         |
| G6  | Three answers: everything / error reports only / nothing                                                          | "minimal" including Sentry's visit count (two purposes behind one button)                                                                                                                                                                                                   |
| G7  | The popup is built here, as a floating card above the player's controls, with the approved words; NH-349 narrowed | NH-51 absorbs NH-349; NH-349 first; a centred dialog (blocks the demo); a strip at the top (the page jumps)                                                                                                                                                                 |
| G8  | A typed list of twelve events; every field from a fixed list or a number; `release` on every event                | automatic click tracking (button labels hold track names — the reason Sentry turned click breadcrumbs off)                                                                                                                                                                  |
| G9  | The home page names Google Analytics (its terms require it); Sentry is named only in the popup's Details          | naming Sentry on the home page                                                                                                                                                                                                                                              |
| G10 | This spec now; the code after NH-124 merges, then a rebase                                                        | waiting for NH-124 to ship; folding this into PR #191                                                                                                                                                                                                                       |

## 1. Packages and files

No new dependency: the loader is our own (G2).

**New files:**

| File                            | Job                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `web/lib/privacy/choice.ts`     | `asksFirst()`, `savedChoice()`, `saveChoice()`, `allowed()`: the one rule both tools follow (section 2)                                  |
| `web/lib/analytics/events.ts`   | the typed event list (section 5)                                                                                                         |
| `web/lib/analytics/start.ts`    | `startAnalytics()` and `gtag()` (section 4)                                                                                              |
| `web/lib/analytics/track.ts`    | `track()`: sends one event, or nothing until Google Analytics has started; and the settle step that makes one edit one event (section 5) |
| `web/lib/score-facts.ts`        | `instrumentsValue()` and `roundedSize()`, moved out of Sentry's `report.ts` (section 6), `trackInstrument()` and `SAMPLE_INSTRUMENTS`    |
| `web/app/PrivacyChoices.tsx`    | the popup (section 3)                                                                                                                    |
| `web/app/privacy/page.tsx`      | the privacy notice (section 7)                                                                                                           |
| `web/e2e/google-analytics.ts`   | the shared fixture: answers Google's hosts locally (an empty `gtag.js`) and records every request                                        |
| `web/e2e/privacy-choice.e2e.ts` | the consent, privacy, no-overlap, drop-through and keyboard cases (section 9)                                                            |

Each `lib` file and the popup has its unit test beside it.

**Changed files:**

- `web/instrumentation-client.ts` (Sentry's): starts each tool only when `allowed()`.
- `web/lib/monitoring/` (Sentry's): section 6.
- `web/app/layout.tsx`: renders `<PrivacyChoices />` first inside `<body>`, before the page
  (section 3).
- `web/app/page.tsx`, both `error.tsx` files and `web/app/global-error.tsx` (Sentry's): the copy
  (section 7).
- The call sites in section 5, under `web/app/play/`: one `track()` each.
- `web/playwright.e2e.config.ts`: `timezoneId: 'Australia/Sydney'` for every project, a fake Google
  Analytics ID, and Chromium's `--host-resolver-rules` launch argument, which makes Google's hosts
  unresolvable in the test browser.
- Screenshot baselines: `/` (the new note) and one new shot with the popup (section 9).
- `web/e2e/pages.vr.ts`: the new shot, beside the ten, so its baseline lands in
  `pages.vr.ts-snapshots/`, the one folder the shot guard pairs against; the card's computed
  `background-color` check beside it; "ten" → "eleven" where its comments count the shots.
- `tooling/workflow-guards.test.mjs`: `EXPECTED_SHOTS` 10 → 11, a fifth surface anchor for the
  card's check, and "ten" → "eleven" where its comments and messages count the shots.
- `web/README.md` (the variable), `cspell.json`, and the decision registry and changelog.

## 2. The privacy choice

| Visitor                                        | Error reports (Sentry) | Visit count (Sentry's Release Health) | Google Analytics |
| ---------------------------------------------- | ---------------------- | ------------------------------------- | ---------------- |
| Outside Europe, no answer given                | ✅                     | ✅                                    | ✅               |
| Answered "Yes, count visits and report errors" | ✅                     | ✅                                    | ✅               |
| Answered "Report errors only"                  | ✅                     | —                                     | —                |
| Answered "No, send nothing"                    | —                      | —                                     | —                |
| In Europe, before answering                    | —                      | —                                     | —                |

An answer holds in every time zone once it is given; the time zone decides only while there is
none. A "No" given in Berlin still holds when the laptop later shows New York time, and NH-349's
link can stop both tools for a visitor outside Europe.

```ts
// web/lib/privacy/choice.ts
export type PrivacyChoice = 'all' | 'errors' | 'none';
export type Purpose = 'errors' | 'visits' | 'analytics';

/** True for a time zone in Europe — and for an unknown one, to be safe. */
export function asksFirst(timeZone?: string): boolean;
/**
 * The saved answer to the current `version`; null when there is none, the value is corrupt,
 * storage is blocked, or the answer is to an older `version`.
 */
export function savedChoice(): PrivacyChoice | null;
export function saveChoice(choice: PrivacyChoice): void;
/**
 * The table above: a current answer, saved or kept in memory, wins in any time zone. An answer
 * to an older `version` never allows more than it did.
 */
export function allowed(purpose: Purpose): boolean;
```

- **Europe, by time zone:** `Intl.DateTimeFormat().resolvedOptions().timeZone`. It asks first for
  every `Europe/…` zone, including the UK, Switzerland and countries outside the EU, so it errs
  toward asking. It also asks for EU and EEA places named outside `Europe/`, such as
  `Atlantic/Canary`, `Atlantic/Madeira`, `Atlantic/Azores`, `Atlantic/Reykjavik`, `Asia/Nicosia`
  and the French overseas regions; and for `UTC`, `Etc/…` and a missing value, because
  privacy-focused browsers report `UTC`. The plan fixes the full list from IANA's `zone.tab`, which
  keeps the names browsers report: its rows for the EU and EEA country codes, plus the French
  overseas regions and Saint-Martin, which have codes of their own (`GP`, `MQ`, `GF`, `RE`, `YT`,
  `MF`). Not from `zone1970.tab`: it files Iceland, Réunion, Mayotte, Guadeloupe and Saint-Martin
  under `Africa/Abidjan`, `Asia/Dubai`, `Africa/Nairobi` and `America/Puerto_Rico`.
- **Kept in this browser:** the `localStorage` key `notation-hero.privacy-choice` holds
  `{"choice":"all","version":1}`. `version` lets a later change to the question ask again. An
  answer saved under an older `version` counts as no answer, but never allows more than it did: in
  Europe the popup asks again and nothing starts meanwhile, and elsewhere an old `none` or `errors`
  still holds until the visitor changes it. Keeping the answer needs no consent: the CNIL lists
  trackers that store the user's choice as exempt.
- **Blocked storage** (a private window) reads as "not answered", so the popup returns on each
  visit. An answer given there still holds for the rest of the visit: it is kept in memory when it
  cannot be saved. Both failures go to `noteError()`, never a silent catch (Sentry's lint rule and
  its S2b); the breadcrumb is recorded only once error reports are running.
- **Only when there is something to ask about.** The popup and the rule apply only when
  `NEXT_PUBLIC_SENTRY_DSN` or `NEXT_PUBLIC_GA_ID` is set. With neither — local dev, previews —
  nothing shows and nothing starts.

## 3. The popup

```text
Can we count visits (with a cookie) and get error reports? Your scores stay on your device.
[ Yes, count visits and report errors ]  [ Report errors only ]  [ No, send nothing ]
Details ▾
  Error reports go to Sentry, a bug-tracking service. Visit counts go to Sentry and Google
  Analytics. Neither gets your file, its name, or the music in it. How Google uses data ↗
  Who runs this site, and how to change your answer: Privacy notice
```

- **Where:** a floating card, centred at the bottom. On `/play` it sits 12 px above the 80 px
  transport row, so it never covers ▶; on `/`, 24 px from the bottom. At most 560 px wide; on a
  phone, the full width less the 16 px gutters, with the buttons stacked. At most as tall as the
  window less its bottom offset and 16 px; past that, the card scrolls inside itself, so its
  question and every answer stay reachable at 400% zoom.
- **Non-blocking:** no backdrop and no focus trap. The player works while the card waits, and
  nothing is sent meanwhile. It returns on every page load until answered.
- **Files pass through it:** the card floats over the player's drop zone but is not part of it.
  While a file is dragged over the page, the card has `pointer-events: none`, so a file dropped on
  it lands in the drop zone and opens, and "Drop to open" stays visible. A `dragenter` on the window
  that carries files starts this; the drop, `dragend` or the next `pointermove` ends it, the signals
  `PlayerShell.tsx` already uses to tell that a drag has ended. Clicks and the keyboard are
  unaffected.
- **Keyboard:** the card is the first thing in the page's order, so the first Tab press reaches
  its first answer. Until the visitor answers, it adds four Tab stops in front of the page's own
  controls.
- **Equal buttons:** the design system's `Button`, one variant for all three, each at least 44 px
  tall. Refusing is as easy as allowing.
- **Answering** saves the choice, hides the card and starts what it allows at once — no reload.
- **Details** is a button with `aria-expanded`, closed by default. "How Google uses data" links to
  [Google's page for sites that use its services](https://policies.google.com/technologies/partner-sites),
  and "Privacy notice" links to `/privacy`. Both open in a new tab, so an open score is not lost,
  and say so to screen readers.
- **44 px targets:** Details and every link (on the card, in the home note and on `/privacy`) are
  each the design system's `Button` with `min-h-11`, built like Play on `/`: a link is the link
  variant, rendered as the `<a>` itself, underlined, in the place the copy gives it. The lane's
  hit-area check (`expectHitAreas` in `web/e2e/a11y.e2e.ts`) fails any button or link under
  44 × 44 px.
- **Screen readers:** the card is a labelled region ("Privacy choice") with no `aria-live` of its
  own: it arrives with its text, and a live region that arrives with its text is generally not
  announced. `PrivacyChoices` renders an empty polite live region in the HTML the server sends and
  keeps it for the life of the page, the way `PlayerShell.tsx` keeps its `announcement` paragraph;
  when the card appears, the region receives the question.
- **Themes:** colours from the design tokens only, so the card follows dark mode on the day `web/`
  can show it (NH-302); no new colour.

The words were approved on 2026-10-08 after two rounds. Tool names in the first layer were rejected
("Musicians have no idea what Sentry means"), and leocaseiro wrote the three button labels. The one
addition is "(with a cookie)", because EU guidance expects the first layer to mention it.

## 4. Google Analytics in code

```ts
// web/lib/analytics/start.ts (sketch)
/** Not on `window`: gtag.js reads only `window.dataLayer`. track.ts imports it. */
export function gtag(..._args: unknown[]): void {
  window.dataLayer.push(arguments); // gtag.js reads an `arguments` object, never an array
}

export function startAnalytics(): void {
  const id = process.env.NEXT_PUBLIC_GA_ID; // set in Vercel Production only
  if (!id || started || !allowed('analytics')) return;
  started = true;
  window.dataLayer = window.dataLayer ?? [];
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  gtag('set', { allow_google_signals: false, allow_ad_personalization_signals: false });
  gtag('js', new Date());
  gtag('config', id, { release: APP_VERSION });
  afterLoad(() => addScript(`https://www.googletagmanager.com/gtag/js?id=${id}`));
}
```

- **The order is verified** by the 2026-10-05 spike: consent, settings, then `js` and `config`. The
  first page view carried `gcs=G101` (ad storage denied, analytics granted) and `npa=1` (no ad
  personalisation).
- **Google's script loads after the page's `load` event**, so it never competes with the first
  paint, the player or AlphaTab's downloads.
- **`track(name, fields)`** calls `gtag('event', name, …)` once started, and nothing before — no
  console warning, unlike `sendGAEvent`. It sends only the fields its event declares, copied by name
  from a key list beside `AnalyticsEvents` that `typecheck` checks against it. An object built
  elsewhere with an extra key, such as a track name, therefore sends nothing more. `gtag()` is a
  function of `start.ts`, not a global: other code reaches Google only by importing it or by pushing
  onto `window.dataLayer` by hand, and a review sees both.
- **Page views** come from Google's enhanced measurement: one on load, and one on each client-side
  page change ("page changes based on browser history events"). Not yet seen working: the spike's
  made-up ID could not show it (section 8, step 6). If it is missing, the fallback turns that
  setting off and sends `page_view` from our code on each route change.
- **Addresses:** Google Analytics receives the page address with its `?` part — the campaign tags
  on a link you share, which is how it reports where a visitor came from — and never the `#` part.
  Click IDs that other sites add (`fbclid`, `gclid`, `msclkid`) are redacted in the browser before
  sending (section 8, step 3). Sentry cuts addresses at `?` on purpose; only Google Analytics needs
  to know the source. No address in `web/` carries anything of the visitor's.
- **A late "Yes":** a visitor in Europe may click Play before answering. When the answer comes
  after a client-side page change, `startAnalytics()` first sends a page view for the address the
  visit began at, read after the answer from the browser's navigation record
  (`performance.getEntriesByType('navigation')[0].name`) without its `#` part, then the one for the
  current page. Without it, the first page view is `/play`, and the landing page and its campaign
  tags never reach Google Analytics.
- **The tab title:** Google Analytics sends `document.title` with every event; the spike saw
  `dt=Notation Hero`. It is fixed today, and the privacy test (section 9) fails if a score's title
  ever reaches it.

## 5. Events

Every name except Google's own `page_view` avoids Google's reserved names (`click`, `error`,
`file_download`, …). Every field comes from a fixed list or is a number, so text from the file
cannot reach Google. Sliders send their final value only; seeking and volume are not tracked.
`tempo_change` and `setting_change` send one event per edit: 1 second after the control's last
change (the settle time the header's tempo control already uses), or at once when the page is
hidden or left. A held button, the mouse wheel, typed digits and a colour-picker drag are each one
edit, and `tempo_change` carries the last speed. A change to the value a control already has
sends nothing. The held event goes through `track()` when it is sent, so it obeys the answer
given by then.

| Event              | Sent when                                                                                         | Fields                                              | Where the control lives                              |
| ------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `page_view`        | automatic (section 4)                                                                             | Google's own: page, referrer, country, device       | —                                                    |
| `open_file`        | the visitor picks or drops their own file                                                         | `method`, `file_type`, `file_size_kb`               | `OpenFileControl.tsx`; the drop in `PlayerShell.tsx` |
| `score_loaded`     | a score becomes the one on screen                                                                 | `source`, `file_type`, `track_count`, `instruments` | `PlayerShell.tsx`                                    |
| `score_failed`     | an open fails                                                                                     | `error_code`, `file_type`, `file_size_kb`           | the E101–E103 and E105 paths                         |
| `play`             | the visitor starts playback                                                                       | `source`                                            | `PlayerShell.tsx`                                    |
| `loop_toggle`      | Loop, on the transport row or in the Settings popover                                             | `on`, `range`                                       | `applyLooping` in `PlayerShell.tsx`, which both call |
| `metronome_toggle` | Metronome                                                                                         | `on`                                                | `TransportRow.tsx`                                   |
| `count_in_toggle`  | Count-In                                                                                          | `on`                                                | `TransportRow.tsx`                                   |
| `tempo_change`     | the speed is set, in the header or in the Settings popover                                        | `speed_percent`                                     | `applySpeed` in `PlayerShell.tsx`, which both call   |
| `mixer_change`     | a track's show/hide, solo, mute, transpose or staff option; solo all, mute all; the layout switch | `control`, `on`, `instrument`                       | `TracksPopover.tsx`                                  |
| `setting_change`   | a Settings row changes, except Playback speed, Loop (events above) and the volumes (not tracked)  | `setting`                                           | `SettingsPopover.tsx`                                |
| `export_score`     | MIDI or Guitar Pro export                                                                         | `format`                                            | `SettingsPopover.tsx`                                |

| Field           | Values                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`        | `picker`, `drop`                                                                                                                                                          |
| `file_type`     | an extension the open-file picker accepts (`gp` … `alphatex`) or `other` — the same function Sentry's file facts use                                                      |
| `file_size_kb`  | the size in KB, rounded up to a power of two by Sentry's `roundedSize()` (section 6): 0 for an empty file, 1 for one up to 1 KB. A dimension, so reports group by size    |
| `source`        | `own_file`, `sample` (the bundled beat)                                                                                                                                   |
| `track_count`   | a number                                                                                                                                                                  |
| `instruments`   | `instrumentsValue()`: `drums` first, then each General MIDI program in three digits, such as `drums,025,033`; or `sample`. Cut at a comma to Google's 100-character limit |
| `error_code`    | `E101`, `E102`, `E103` or `E105` from `shared/src/error-codes.ts`: the open failures Sentry also sends the file's type and size with                                      |
| `on`            | `true` or `false`: the control's new state; for a transpose, whether the track is now transposed at all                                                                   |
| `range`         | `score`, `selection`                                                                                                                                                      |
| `speed_percent` | a number                                                                                                                                                                  |
| `control`       | `render`, `solo`, `mute`, `transpose_audio`, `transpose_full`, `staff`, `solo_all`, `mute_all`, `layout`                                                                  |
| `instrument`    | `drums` or a three-digit program, for the one track a change applies to; absent for solo all, mute all and the layout switch                                              |
| `setting`       | the row's fixed key in `settings-schema.ts`, such as `player.enableCursor`                                                                                                |
| `format`        | `midi`, `gp`                                                                                                                                                              |
| `release`       | on every event: `APP_VERSION`, the release Sentry reports                                                                                                                 |

```ts
// web/lib/analytics/events.ts (sketch)
export interface AnalyticsEvents {
  open_file: { method: 'picker' | 'drop'; file_type: FileType; file_size_kb: number };
  score_loaded: {
    source: Source;
    file_type: FileType;
    track_count: number;
    instruments: Instruments;
  };
  mixer_change:
    | { control: OneTrackControl; on: boolean; instrument: Instrument } // one track
    | { control: 'solo_all' | 'mute_all' | 'layout'; on: boolean }; // the whole mixer
  // …the rest of the table
}

// web/lib/analytics/track.ts (sketch)
export function track<E extends keyof AnalyticsEvents>(event: E, fields: AnalyticsEvents[E]): void;

// a call site, such as TracksPopover.tsx
track('mixer_change', { control: 'solo', on: true, instrument: trackInstrument(leadGuitar) }); // ✅
track('mixer_change', { control: 'solo_all', on: true }); // ✅
track('mixer_change', { control: 'solo', on: true, track: 'Lead Guitar' }); // ❌ a type error
```

`Instruments` and `Instrument` are branded strings that only `instrumentsValue()`, its one-track
twin `trackInstrument()` and the bundled beat's `SAMPLE_INSTRUMENTS` (`sample`) can make, so a free
string never type-checks. A `mixer_change` for one track (render, solo, mute, either transpose,
staff) names that track's instrument; solo all, mute all and the layout switch act on the whole
mixer and carry none.

`score_loaded` fires once for each score that reaches the screen: the bundled beat once per player
mount, and never again after a visitor's file replaces it. AlphaTab's own score-loaded event also
fires for the bundled beat, sometimes after the visitor's file — the same reason Sentry's
`instruments` tag does not use it.

The funnel (nice to have) is built in Google Analytics' Explore screen with no code: `/` → `/play` →
`open_file` → `score_loaded` with `source` `own_file` → `play`.

A bonus for [NH-52](https://leocaseiro.atlassian.net/browse/NH-52): `open_file` and `score_failed`
together give a failure rate — the counting Sentry deliberately does not do (its S2).

## 6. Changes to Sentry's design

Made in this ticket's pull request, after NH-124 merges:

- **`Sentry.init` moves into `startErrorReporting()`** in `web/lib/monitoring/`.
  `instrumentation-client.ts` calls it when `allowed('errors')`, and the popup calls it when the
  visitor allows error reports. A second call does nothing.
- **The visit count follows its own purpose.** With "Report errors only", Sentry starts without its
  Release Health session integration, so no visit ping is sent.
- **`instrumentsValue()` and `roundedSize()` move to `web/lib/score-facts.ts`**, so analytics uses
  them without importing Sentry's module. `roundedSize()` is private in the Sentry plan's
  `report.ts`, so the move exports it; analytics calls `roundedSize(Math.ceil(bytes / 1024))`.
  `report.ts` imports both from there; nothing else changes.
- **What this changes in NH-124's decisions.** S1 ("report every error") now holds outside Europe;
  a visitor in Europe is reported only after allowing it, and nothing from before their answer. S4's
  health number likewise counts only visits that allowed it. The changelog records this.

## 7. The copy

```text
Before (NH-124 spec, web/app/page.tsx, below the Play button):
  This site counts visits and crashes anonymously, and sends an error report when something goes
  wrong. Neither includes your file, its name, or the music in it — only the file's type and size,
  and the kinds of instrument it uses.
After:
  This site counts visits with Google Analytics (it uses a cookie) and sends an error report when
  something breaks. Neither includes your file, its name, or the music in it — only facts like its
  type and size and the kinds of instrument. Visitors in Europe are asked first.
  How Google uses data ↗ · Privacy notice

Privacy notice (new page, /privacy, linked from the home note and the popup's Details):
  Notation Hero is run by <name> (<contact>). Error reports go to Sentry, which keeps them 30
  days. Visit counts go to Sentry and Google Analytics, which keeps visit-level data 14 months and
  sets a cookie (_ga). Neither gets your file, its name, or the music in it. In Europe nothing is
  sent until you answer. Change your answer at any time: <the Privacy choices link (NH-349)>.
  How Google uses data ↗

Before (NH-124 spec, both error.tsx files and global-error.tsx):
  Errors are reported automatically — without your file, its name, or the music in it. Try again,
  or reload the page.
After:
  Error reports never include your file, its name, or the music in it. Try again, or reload the
  page.
```

- "Anonymously" goes: Google Analytics' cookie is a lasting ID.
- The home page names Google Analytics because its terms require the site to disclose it and link
  to Google's page (G9). Sentry stays "an error report" (G9).
- The error pages stop claiming a report was sent: for a visitor in Europe who chose "No, send
  nothing", none was.
- The privacy notice gives what EU guidance counts as the minimum for an informed "Yes" — who runs
  the site and how to reach them, what each tool receives and keeps, the cookie, and how to change an
  answer — and is the posted privacy policy Google Analytics' terms require. leocaseiro picks the
  name and contact before go-live; the page is public.

## 8. Setup — done by leocaseiro, by hand

An agent may not create accounts.

1. Create a Google Analytics 4 property "Notation Hero" (time zone Australia/Sydney) and a **Web**
   data stream for the production address: `notationhero.com`, or `notation-hero-web.vercel.app`
   until the domain move — the same two addresses as Sentry's Allowed Domains. Copy its measurement
   ID (`G-…`).
2. Property settings:
   - **Data retention: 14 months.** The default is 2, and funnels and Explore follow it.
   - **Google signals: off.**
   - **Data-sharing settings: all off.**
   - **Reporting identity: device-based**, so thresholds do not hide small numbers.
   - **Granular location and device data: off.** Country and device category remain.
3. **Enhanced measurement:** keep page views, including "page changes based on browser history
   events". Turn off scrolls, outbound clicks, site search, video, file downloads (their link text
   can carry a title) and form interactions. In the same Events section, **Redact data**: email on,
   and the query parameters `fbclid`, `gclid` and `msclkid`.
4. **Custom definitions, before launch** (data shows 24–48 hours after registering):
   - dimensions: `method`, `file_type`, `file_size_kb`, `source`, `instruments`, `error_code`, `on`,
     `range`, `control`, `instrument`, `setting`, `format`, `release`;
   - metrics: `track_count`, `speed_percent`.
5. **Vercel → Environment Variables, Production only:** `NEXT_PUBLIC_GA_ID`. Public by design — it
   ships inside the page. Then redeploy: variables reach new deployments only.
6. **After the first production deploy, in the Realtime report:** a page view on `/`; **a page view
   after clicking Play** — the one thing the spike could not show (if it is missing, the fallback in
   section 4); an `open_file` and a `score_loaded` with their fields; and, with the browser's time
   zone set to Berlin, the popup, with nothing reaching Google until "Yes". **In the browser's
   Network panel:** the first `collect` request carries `gcs=G101`, `npa=1` and `dt=Notation Hero`,
   and opening `/?utm_source=probe&fbclid=probe123` sends one that keeps `utm_source` and has no
   `probe123`. The tests answer Google's script with an empty one, so this is the only check of
   what it sends.
7. **Then exclude your own visits.** In the web data stream: Configure tag settings → Show more →
   Define internal traffic, with your own IP addresses (`traffic_type` `internal`). Then set the
   "Internal Traffic" data filter to **Testing** for a few days, then **Active**. Only after step 6:
   an active filter drops matching visits for good, and would hide step 6's own check. On a phone,
   whose IP address changes, choose "Report errors only" through NH-349's "Privacy choices" link
   instead.

## 9. Testing

**Unit (Vitest, beside each file):**

- `asksFirst()`: `Europe/Berlin`, `Europe/London`, `Atlantic/Canary`, `Atlantic/Reykjavik`,
  `Indian/Reunion`, `Asia/Nicosia`, `UTC` and an empty value ask first; `Australia/Sydney`,
  `America/New_York`, `Asia/Tokyo` and `Asia/Dubai` do not.
- `savedChoice()` and `saveChoice()`: each valid value; a corrupt value and blocked storage read as
  `null`; an answer that cannot be saved still holds for the visit; both failures reach `noteError()`.
- `allowed()`: the 15 cells of section 2's table, each answered row in both `Europe/Berlin` and
  `Australia/Sydney`: a saved `none` in Sydney allows nothing. A `none` or `errors` saved under an
  older `version` allows nothing in Berlin, and in Sydney no more than it did.
- `startAnalytics()`: nothing without an ID or without permission; the queue's order; one script
  only, added after `load`; a second call does nothing. After a client-side page change, a page
  view for the landing address, without its `#` part, comes before the one for the current page.
- `track()`: nothing before the start; `['event', name, fields]` after it, without any key the event
  does not declare. A burst of changes to one control sends one event with its latest fields, a
  second after the last change or at once when the page is hidden; an unchanged value sends nothing.
- Types: `// @ts-expect-error` on a free-text field, checked by `typecheck`.
- `PrivacyChoices`: each button saves its answer; Details opens and closes; the card is hidden
  outside Europe, once answered, and when neither key is set; the live region is in the page before
  the card appears, and receives the question when it does.

**End to end (Playwright).** The lane's one build carries the fake Google Analytics ID and every
project runs as Sydney, so every page in every case starts Google Analytics. The config makes
`www.googletagmanager.com`, `*.google-analytics.com`, `analytics.google.com` and `www.google.com`
unresolvable in the test browser: in a case without the fixture, Google's script fails to load and
nothing is sent, as for a visitor with an ad blocker. The loader must accept that without an error
— no throw and no uncaught rejection — or `failOnUnexpectedPageErrors()` fails the case.
`web/e2e/google-analytics.ts` routes Google's hosts before any lookup, answers `gtag.js` with an
empty script and records every request. No test reaches Google. The cases check what our code
hands Google, in `window.dataLayer`; what Google's script sends is checked by hand at launch
(section 8, step 6).

- **Sydney:** no popup; one request for `gtag.js`, after `load`; the queue matches section 4 — the
  consent default first (ad signals denied, analytics granted), Google signals and ad
  personalisation off, `release` set; `open_file` and `score_loaded` with the right fields after
  opening a fixture; `play` after pressing ▶.
- **Berlin:** the popup shows, and nothing starts before an answer: `window.dataLayer` does not
  exist, and an error the test throws is seen as a page error but never reported. After "Yes", a
  sentinel error arrives and that earlier error does not (the Sentry spec's sentinel rule). "No,
  send nothing": a "No" sends nothing to wait for, so the test throws an error, reloads, throws
  another and reloads again, and only then checks that neither recorder holds a request;
  `window.dataLayer` does not exist after any load. "Report errors only": a forced error reaches
  Sentry; when it arrives, Sentry's fixture has recorded no `session` envelope (the visit ping), and
  `window.dataLayer` does not exist. "Yes, …": both, and a `session` envelope arrives. The answer
  survives a reload. Unlike NH-124's cases, these read session envelopes on purpose: the visit ping
  is the one thing "Report errors only" withholds from Sentry. Land on `/?utm_source=probe`, click
  Play, then answer "Yes": `window.dataLayer` holds a page view for `/?utm_source=probe` before the
  one for `/play`.
- **Privacy:** open a fixture with a known title and track names, and press Solo and Mute on one of
  its tracks (both buttons are named after the track). Wait until `window.dataLayer` holds the
  `score_loaded` event, with the score's `track_count`, and both `mixer_change` events. Only then
  check that no entry contains the title or a track name, that `document.title` stays
  `Notation Hero` (Google's script sends it as `dt`), and that the page address holds neither.
  Without the wait, an empty queue would pass.
- **No overlap:** the popup's box never intersects ▶ or the transport row, at desktop and phone
  width, measured the way `web/e2e/toast-occlusion.e2e.ts` measures the toaster.
- **Zoomed in:** in Berlin, on `/` at 320 × 256 (a 1280 × 1024 screen at 400% zoom), with Details
  open: the card stays inside the window, and each answer scrolls fully into view inside it.
- **Drop through the card:** in Berlin, with the card showing, drop `Punk.gp` on the card's centre
  through Chrome's own drag pipeline, as `web/e2e/player.e2e.ts` does. The file opens, and no new
  tab opens.
- **Keyboard:** in Berlin, on `/` and on `/play`, the first Tab press focuses "Yes, count visits and
  report errors".
- **Privacy notice:** the popup's Details and the home note both link to `/privacy`, which names who
  runs the site and how to change an answer.

**Screenshots and accessibility (the `web` job):**

- CI containers run in UTC, which `asksFirst()` treats as Europe. Without
  `timezoneId: 'Australia/Sydney'` in the config, the popup would appear in all ten existing shots.
- One new shot, in `Europe/Berlin`: `/play` with the popup, at the lane's 1280 × 900. It is the
  only check that sees the card itself: its colours and its three buttons over the transport row,
  as `web/`'s own CSS build draws them. The no-overlap case measures the card's box but cannot see
  it. No `/` shot (there the card sits over empty page) and no phone-width shot (the lane covers
  no width under 900 px, by design; the no-overlap case measures the phone placement). The card's
  fill is `--popover`, white on the white score, a step the comparison cannot see, so the shot
  also reads the card's computed `background-color`, as AGENTS.md asks for a new surface.
- An axe scan with the popup open and Details expanded (as the Settings case opens every group),
  in light only, like every other axe case in the lane: `web/`
  cannot show dark mode until NH-302 (see "Light only" in
  `docs/specs/2026-09-21-web-visual-regression-gate.md`).
- An axe scan of `/privacy`. Both new cases also run the hit-area check, as every case in
  `web/e2e/a11y.e2e.ts` does; the landing case already runs it over `/` and the note's links.

## 10. Documents that change

- `docs/decisions/decision-changelog.md` — the 2026-10-08 entry.
- `docs/decisions/decision-registry.md` — a new row, `L11-analytics`, ⏳ pending. It flips to ✅ in
  the implementation.
- `web/README.md` — `NEXT_PUBLIC_GA_ID` in the Deploy section.
- The screenshot count, ten → eleven: `AGENTS.md` (two lines), `web/README.md`,
  `client/README.md`, row L13 (the test harnesses) of `docs/decisions/decision-registry.md`, and
  `docs/runbooks/vr-a11y-testing.md` (its heading, two sentences and its list of shot names, which
  gains the popup shot). The runbook's "Three shots carry four assertions" becomes four shots and
  five assertions.
- **Jira:** NH-51 rewritten and NH-349 narrowed (both done on 2026-10-05); NH-349 blocks NH-51. The
  future same-origin privacy test on [NH-298](https://leocaseiro.atlassian.net/browse/NH-298) must
  allow Google's hosts as well as Sentry's.

## Extending later

- **A second destination** (NH-54's pipeline): a second sender inside `track()`; no event changes.
- **Database fields** (a catalog song ID, say): one line in `events.ts`, plus registering the field
  in Google Analytics.
- **Accounts:** a Google Analytics user ID only with consent, never an email. Out of scope.
- **NH-349's link** reuses `PrivacyChoices` and `saveChoice()`. Changing to "No" or to "Report
  errors only" must stop Google Analytics for the rest of the visit. A consent update to denied is
  not enough: the loaded tag still sends a cookieless `user_engagement` hit when the page is left
  (spike, 2026-10-08). So the link also sets `window['ga-disable-<ID>'] = true` and sends no more
  events. Google documents that switch as set before any `gtag()` call, so NH-349's test must prove
  no hit follows either answer. On a "No", the link must also close Sentry for the rest of the
  visit.
- **Auto-Speed** (a v0.2 practice feature that changes the speed by itself): `tempo_change` is sent
  from `applySpeed`, so a speed the app sets would count as the visitor's own. That feature moves
  the call into the two speed controls.

## Known limits

- **A time zone is a guess.** A visitor in Europe whose computer says `Australia/Sydney` is counted
  without being asked; a traveller from Australia in Berlin is asked.
- **Withdrawing needs NH-349.** GDPR Article 7(3) requires withdrawing to be as easy as agreeing,
  so this ticket goes live only with NH-349's "Privacy choices" link. That link's pull request is
  stacked on this branch and merged into it first, so one merge to master ships both.
- **Between NH-124's deploy and this one,** Sentry reports every visitor, in Europe too, without
  asking — the Sentry spec's "No choice popup yet". G5 holds from this ticket's deploy on.
  leocaseiro accepted this on 2026-10-09: the app has no visitors yet, and it is published only
  after this ticket is live.
- **Ad blockers** stop Google Analytics, as they stop Sentry; those visitors are not counted.
- **Safari forgets after a week.** Safari, and other browsers on an iPhone or iPad, delete cookies
  written by a script, such as Google Analytics' `_ga`, and the site's `localStorage` after seven
  days of browser use without a click, tap or key press on the site. A visitor who returns later
  counts as new, so returning visitors are undercounted. The saved answer goes too: a visitor in
  Europe is asked again, and one elsewhere who said "No" through NH-349's link is counted again.
- **The home note is on `/` only.** A visitor who opens `/play` directly does not see it; in Europe,
  the popup still asks.
- **Nothing from before an answer** is reported in Europe: an error in the first seconds is lost.
- **Client-side page views** are unverified until the real property exists (section 8, step 6).

## To verify at plan time

Each is a claim this design rests on that no one has run yet:

- Enhanced measurement sends a page view on a client-side navigation in Next.js 16 (needs the real
  property).
- `release` set in `config` reaches every event, and `release` is not a reserved parameter name.
- How gtag sends a boolean field such as `on`: as `true`/`false` text, or not at all.
- Sentry 11 can start after the page has loaded, and the name of its Release Health integration.
- Playwright's `timezoneId` changes `Intl.DateTimeFormat().resolvedOptions().timeZone` inside the
  Linux container.
- The time-zone list, from IANA's `zone.tab`, and what a real phone or laptop set to an overseas
  region reports (a test browser given `Indian/Reunion` reports that name, checked 2026-10-10).
- The popup, which appears after hydration, causes no layout shift (it is fixed-position).
- That after a late "Yes" the landing page view can come first (the `config` command's own page
  view withheld on that path), that page views on later client-side page changes still arrive, and
  that the click-ID redaction (section 8, step 3) also covers that first address.

## The spike (2026-10-05, throwaway)

`@next/third-parties` 16.3.6's `<GoogleAnalytics>` behind a time-zone check, with our settings
queued first in `instrumentation-client.ts`; a production build; a headless browser visiting as
Sydney and as Berlin; Google's collect requests answered locally, so no hit reached Google.

| Checked                     | Sydney                                         | Berlin                                    |
| --------------------------- | ---------------------------------------------- | ----------------------------------------- |
| Google's script requested   | yes                                            | no request to any Google host             |
| Page view                   | `gcs=G101`, `npa=1`                            | none                                      |
| Our settings ran first      | consent → settings → `js` → `config`           | —                                         |
| A custom event              | sent, batched a few seconds later              | not sent; a console warning on every call |
| Cookies                     | `_ga`, `_ga_<ID>`                              | none                                      |
| Build                       | passes; both pages static; the CSS check green | —                                         |
| Page view after Home → Play | not seen: it needs the real property           | —                                         |

The component removed none of our code here, which decided G2.

## Sources

Research of 2026-10-05. Not legal advice.

- Next.js 16.3.6's bundled docs, `third-party-libraries.md` line 35: "`@next/third-parties` is
  currently an **experimental** library under active development."
- Google Analytics:
  [consent mode and its modelling thresholds](https://support.google.com/analytics/answer/11161109),
  [IP addresses](https://support.google.com/analytics/answer/2763052),
  [enhanced measurement](https://support.google.com/analytics/answer/9216061),
  [collection limits](https://support.google.com/analytics/answer/9267744),
  [data retention](https://support.google.com/analytics/answer/7667196),
  [funnel exploration](https://support.google.com/analytics/answer/9327974).
- Vercel Web Analytics:
  [limits and pricing](https://vercel.com/docs/analytics/limits-and-pricing),
  [custom events](https://vercel.com/docs/analytics/custom-events).
- [EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePrivacy](https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf).
- [CNIL: trackers exempt from consent](https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi).
- [OAIC: tracking pixels and privacy obligations](https://www.oaic.gov.au/privacy/privacy-guidance-for-organisations-and-government-agencies/organisations/tracking-pixels-and-privacy-obligations).
- [VS Code telemetry levels](https://code.visualstudio.com/docs/configure/telemetry), a wording
  reference for the three answers.
