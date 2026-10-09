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

| File                            | Job                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `web/lib/privacy/choice.ts`     | `asksFirst()`, `savedChoice()`, `saveChoice()`, `allowed()`: the one rule both tools follow (section 2) |
| `web/lib/analytics/events.ts`   | the typed event list (section 5)                                                                        |
| `web/lib/analytics/start.ts`    | `startAnalytics()` (section 4)                                                                          |
| `web/lib/analytics/track.ts`    | `track()`: sends one event, or nothing until Google Analytics has started                               |
| `web/lib/score-facts.ts`        | `instrumentsValue()`, moved out of Sentry's `report.ts` (section 6)                                     |
| `web/app/PrivacyChoices.tsx`    | the popup (section 3)                                                                                   |
| `web/app/privacy/page.tsx`      | the privacy notice (section 7)                                                                          |
| `web/e2e/google-analytics.ts`   | the shared fixture: answers Google's hosts locally (an empty `gtag.js`) and records every request       |
| `web/e2e/privacy-choice.e2e.ts` | the consent, privacy and no-overlap cases (section 9)                                                   |

Each `lib` file and the popup has its unit test beside it.

**Changed files:**

- `web/instrumentation-client.ts` (Sentry's): starts each tool only when `allowed()`.
- `web/lib/monitoring/` (Sentry's): section 6.
- `web/app/layout.tsx`: renders `<PrivacyChoices />`.
- `web/app/page.tsx`, both `error.tsx` files and `web/app/global-error.tsx` (Sentry's): the copy
  (section 7).
- The call sites in section 5, under `web/app/play/`: one `track()` each.
- `web/playwright.e2e.config.ts`: `timezoneId: 'Australia/Sydney'` for every project, a fake Google
  Analytics ID, and Chromium's `--host-resolver-rules` launch argument, which makes Google's hosts
  unresolvable in the test browser.
- Screenshot baselines: `/` (the new note) and three new shots with the popup (section 9).
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
/** The saved answer; null when there is none, the value is corrupt, or storage is blocked. */
export function savedChoice(): PrivacyChoice | null;
export function saveChoice(choice: PrivacyChoice): void;
/** The table above: an answer, saved or kept in memory, wins in any time zone. */
export function allowed(purpose: Purpose): boolean;
```

- **Europe, by time zone:** `Intl.DateTimeFormat().resolvedOptions().timeZone`. It asks first for
  every `Europe/…` zone, including the UK, Switzerland and countries outside the EU, so it errs
  toward asking. It also asks for EU and EEA places named outside `Europe/`, such as
  `Atlantic/Canary`, `Atlantic/Madeira`, `Atlantic/Azores`, `Atlantic/Reykjavik`, `Asia/Nicosia`
  and the French overseas regions; and for `UTC`, `Etc/…` and a missing value, because
  privacy-focused browsers report `UTC`. The plan fixes the full list from the IANA time-zone
  database.
- **Kept in this browser:** the `localStorage` key `notation-hero.privacy-choice` holds
  `{"choice":"all","version":1}`. `version` lets a later change to the question ask again. Keeping
  the answer needs no consent: the CNIL lists trackers that store the user's choice as exempt.
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
  phone, the full width less the 16 px gutters, with the buttons stacked.
- **Non-blocking:** no backdrop and no focus trap. The player works while the card waits, and
  nothing is sent meanwhile. It returns on every page load until answered.
- **Equal buttons:** the design system's `Button`, one variant for all three, each at least 44 px
  tall. Refusing is as easy as allowing.
- **Answering** saves the choice, hides the card and starts what it allows at once — no reload.
- **Details** is a button with `aria-expanded`, closed by default. "How Google uses data" links to
  [Google's page for sites that use its services](https://policies.google.com/technologies/partner-sites),
  and "Privacy notice" links to `/privacy`. Both open in a new tab, so an open score is not lost,
  and say so to screen readers.
- **Screen readers:** the card is a labelled region ("Privacy choice"), announced politely when it
  appears.
- **Themes:** light and dark from the design tokens; no new colour.

The words were approved on 2026-10-08 after two rounds. Tool names in the first layer were rejected
("Musicians have no idea what Sentry means"), and leocaseiro wrote the three button labels. The one
addition is "(with a cookie)", because EU guidance expects the first layer to mention it.

## 4. Google Analytics in code

```ts
// web/lib/analytics/start.ts (sketch)
export function startAnalytics(): void {
  const id = process.env.NEXT_PUBLIC_GA_ID; // set in Vercel Production only
  if (!id || started || !allowed('analytics')) return;
  started = true;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments); // gtag.js reads an `arguments` object, never an array
  };
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'granted',
  });
  gtag('js', new Date());
  gtag('config', id, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    release: APP_VERSION,
  });
  afterLoad(() => addScript(`https://www.googletagmanager.com/gtag/js?id=${id}`));
}
```

- **The order is verified** by the 2026-10-05 spike: consent, settings, then `js` and `config`. The
  first page view carried `gcs=G101` (ad storage denied, analytics granted) and `npa=1` (no ad
  personalisation).
- **Google's script loads after the page's `load` event**, so it never competes with the first
  paint, the player or AlphaTab's downloads.
- **`track(name, fields)`** sends `gtag('event', name, fields)` once started, and nothing before —
  no console warning, unlike `sendGAEvent`.
- **Page views** come from Google's enhanced measurement: one on load, and one on each client-side
  page change ("page changes based on browser history events"). Not yet seen working: the spike's
  made-up ID could not show it (section 8, step 6). If it is missing, the fallback turns that
  setting off and sends `page_view` from our code on each route change.
- **Addresses:** Google Analytics receives the page address with its `?` part — the campaign tags
  on a link you share, which is how it reports where a visitor came from — and never the `#` part.
  Sentry cuts addresses at `?` on purpose; only Google Analytics needs to know the source. No
  address in `web/` carries anything of the visitor's.
- **The tab title:** Google Analytics sends `document.title` with every event; the spike saw
  `dt=Notation Hero`. It is fixed today, and the privacy test (section 9) fails if a score's title
  ever reaches it.

## 5. Events

Every name except Google's own `page_view` avoids Google's reserved names (`click`, `error`,
`file_download`, …). Every field comes from a fixed list or is a number, so text from the file
cannot reach Google. Sliders send their final value only; seeking and volume are not tracked.

| Event              | Sent when                                                                                         | Fields                                              | Where the control lives                              |
| ------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| `page_view`        | automatic (section 4)                                                                             | Google's own: page, referrer, country, device       | —                                                    |
| `open_file`        | the visitor picks or drops their own file                                                         | `method`, `file_type`, `file_size_kb`               | `OpenFileControl.tsx`; the drop in `PlayerShell.tsx` |
| `score_loaded`     | a score becomes the one on screen                                                                 | `source`, `file_type`, `track_count`, `instruments` | `PlayerShell.tsx`                                    |
| `score_failed`     | an open fails                                                                                     | `error_code`, `file_type`, `file_size_kb`           | the E101–E103 and E105 paths                         |
| `play`             | the visitor starts playback                                                                       | `source`                                            | `PlayerShell.tsx`                                    |
| `loop_toggle`      | Loop                                                                                              | `on`, `range`                                       | `TransportRow.tsx`                                   |
| `metronome_toggle` | Metronome                                                                                         | `on`                                                | `TransportRow.tsx`                                   |
| `count_in_toggle`  | Count-In                                                                                          | `on`                                                | `TransportRow.tsx`                                   |
| `tempo_change`     | the speed is set                                                                                  | `speed_percent`                                     | `PlayerHeader.tsx`                                   |
| `mixer_change`     | a track's show/hide, solo, mute, transpose or staff option; solo all, mute all; the layout switch | `control`, `on`, `instrument`                       | `TracksPopover.tsx`                                  |
| `setting_change`   | a row in the Settings popover changes                                                             | `setting`                                           | `SettingsPopover.tsx`                                |
| `export_score`     | MIDI or Guitar Pro export                                                                         | `format`                                            | `SettingsPopover.tsx`                                |

| Field           | Values                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`        | `picker`, `drop`                                                                                                                                                          |
| `file_type`     | an extension the open-file picker accepts (`gp` … `alphatex`) or `other` — the same function Sentry's file facts use                                                      |
| `file_size_kb`  | the size, rounded to whole KB                                                                                                                                             |
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
  mixer_change: { control: MixerControl; on: boolean; instrument: Instrument };
  // …the rest of the table
}

// web/lib/analytics/track.ts (sketch)
export function track<E extends keyof AnalyticsEvents>(event: E, fields: AnalyticsEvents[E]): void;

// a call site, such as TracksPopover.tsx
track('mixer_change', { control: 'solo', on: true, instrument: '025' }); // ✅
track('mixer_change', { control: 'solo', on: true, track: 'Lead Guitar' }); // ❌ a type error
```

`Instruments` and `Instrument` are branded strings that only `instrumentsValue()` and its one-track
twin can make, so a free string never type-checks.

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
- **Google's requests leave Sentry's breadcrumb trail.** `beforeBreadcrumb` drops fetch and xhr
  breadcrumbs to `google-analytics.com`, `analytics.google.com`, `googletagmanager.com` and
  `www.google.com/ccm`. Sentry's scrub already cuts their `?`, so this removes noise, not
  identifiers.
- **Errors thrown inside Google's script are not ours:** `denyUrls: [/googletagmanager\.com/]`.
- **`instrumentsValue()` moves to `web/lib/score-facts.ts`**, so analytics uses it without importing
  Sentry's module. `report.ts` imports it from there; nothing else changes.
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
   can carry a title) and form interactions.
4. **Custom definitions, before launch** (data shows 24–48 hours after registering):
   - dimensions: `method`, `file_type`, `source`, `instruments`, `error_code`, `on`, `range`,
     `control`, `instrument`, `setting`, `format`, `release`;
   - metrics: `file_size_kb`, `track_count`, `speed_percent`.
5. **Vercel → Environment Variables, Production only:** `NEXT_PUBLIC_GA_ID`. Public by design — it
   ships inside the page. Then redeploy: variables reach new deployments only.
6. **After the first production deploy, in the Realtime report:** a page view on `/`; **a page view
   after clicking Play** — the one thing the spike could not show (if it is missing, the fallback in
   section 4); an `open_file` and a `score_loaded` with their fields; and, with the browser's time
   zone set to Berlin, the popup, with nothing reaching Google until "Yes". **In the browser's
   Network panel:** the first `collect` request carries `gcs=G101`, `npa=1` and `dt=Notation Hero`.
   The tests answer Google's script with an empty one, so this is the only check of what it sends.

## 9. Testing

**Unit (Vitest, beside each file):**

- `asksFirst()`: `Europe/Berlin`, `Europe/London`, `Atlantic/Canary`, `Asia/Nicosia`, `UTC` and an
  empty value ask first; `Australia/Sydney`, `America/New_York` and `Asia/Tokyo` do not.
- `savedChoice()` and `saveChoice()`: each valid value; a corrupt value and blocked storage read as
  `null`; an answer that cannot be saved still holds for the visit; both failures reach `noteError()`.
- `allowed()`: the 15 cells of section 2's table, each answered row in both `Europe/Berlin` and
  `Australia/Sydney`: a saved `none` in Sydney allows nothing.
- `startAnalytics()`: nothing without an ID or without permission; the queue's order; one script
  only, added after `load`; a second call does nothing.
- `track()`: nothing before the start; `['event', name, fields]` after it.
- Types: `// @ts-expect-error` on a free-text field, checked by `typecheck`.
- `PrivacyChoices`: each button saves its answer; Details opens and closes; the card is hidden
  outside Europe, once answered, and when neither key is set.

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
- **Berlin:** the popup shows, and **no** request reaches Google or Sentry before an answer. "No,
  send nothing": still none, also after a reload. "Report errors only": a forced error reaches
  Sentry; when it arrives, Sentry's fixture has recorded no `session` envelope (the visit ping), and
  nothing reaches Google. "Yes, …": both, and a `session` envelope arrives. The answer survives a
  reload. Unlike NH-124's cases, these read session envelopes on purpose: the visit ping is the one
  thing "Report errors only" withholds from Sentry.
- **Privacy:** open a fixture with a known title and track names, and press Solo and Mute on one of
  its tracks (both buttons are named after the track). Wait until `window.dataLayer` holds the
  `score_loaded` event, with the score's `track_count`, and both `mixer_change` events. Only then
  check that no entry contains the title or a track name, that `document.title` stays
  `Notation Hero` (Google's script sends it as `dt`), and that the page address holds neither.
  Without the wait, an empty queue would pass.
- **No overlap:** the popup's box never intersects ▶ or the transport row, at desktop and phone
  width, measured the way `web/e2e/toast-occlusion.e2e.ts` measures the toaster.
- **Privacy notice:** the popup's Details and the home note both link to `/privacy`, which names who
  runs the site and how to change an answer.

**Screenshots and accessibility (the `web` job):**

- CI containers run in UTC, which `asksFirst()` treats as Europe. Without
  `timezoneId: 'Australia/Sydney'` in the config, the popup would appear in all ten existing shots.
- New shots, in `Europe/Berlin`: `/` and `/play` with the popup, and `/play` at phone width.
- An axe scan with the popup open, in both themes.
- An axe scan of `/privacy`.

## 10. Documents that change

- `docs/decisions/decision-changelog.md` — the 2026-10-08 entry.
- `docs/decisions/decision-registry.md` — a new row, `L11-analytics`, ⏳ pending. It flips to ✅ in
  the implementation.
- `web/README.md` — `NEXT_PUBLIC_GA_ID` in the Deploy section.
- **Jira:** NH-51 rewritten and NH-349 narrowed (both done on 2026-10-05); NH-349 blocks NH-51. The
  future same-origin privacy test on [NH-298](https://leocaseiro.atlassian.net/browse/NH-298) must
  allow Google's hosts as well as Sentry's.

## Extending later

- **A second destination** (NH-54's pipeline): a second sender inside `track()`; no event changes.
- **Database fields** (a catalog song ID, say): one line in `events.ts`, plus registering the field
  in Google Analytics.
- **Accounts:** a Google Analytics user ID only with consent, never an email. Out of scope.
- **NH-349's link** reuses `PrivacyChoices` and `saveChoice()`. Changing to "No" must stop Google
  Analytics (a consent update to denied, and no more events) and close Sentry for the rest of the
  visit.

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
- The time-zone list, from the IANA database.
- The popup, which appears after hydration, causes no layout shift (it is fixed-position).

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
