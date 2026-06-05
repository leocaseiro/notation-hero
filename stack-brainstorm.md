# Drum Tutor — Stack Brainstorm

> **Status:** living brainstorm doc · **Last updated:** 2026-06-03
> Companion to [`scope.md`](scope.md). Captures the tech-stack exploration: the recommendation, the alternatives we ruled out (and *why*), verified free-tier facts, and the decisions still open.
> Note: a working prototype already exists (web + AlphaTab, built on a fork of CoderLine's `alphaTabWebsite` demo) and **validated that the approach works**. Most of that fork is CoderLine's code; the productionization path is a **clean app we own** with the proven logic ported over.

---

## TL;DR

Build it as **one TypeScript web app** with **[AlphaTab](https://alphatab.net/)** as the music engine, shipped as a **PWA** (desktop browsers + Android, free) plus a **Capacitor** wrapper for **iOS** (TestFlight). Persist **local-first**, add **cloud sync soon** via a BaaS (**leaning Supabase**) with a lightweight offline-sync layer (**Legend-State or RxDB**, not PowerSync). Observability = client-side **errors + usage** (Sentry / PostHog, or Firebase's built-ins). Build everything **locally on the Mac**; no CI/CD needed at this scale.

### Recommended stack

| Concern | Choice | Notes |
|---|---|---|
| Language | **TypeScript** | one language across all targets |
| Notation + playback | **AlphaTab** | Guitar Pro + drum notation + SoundFont synth + synced cursor — the anchor |
| Game clock / metronome / scoring | **Web Audio API** + look-ahead scheduler | sample-accurate; timing rides this clock, not frame rate |
| Friendly "falling notes" view | **PixiJS (WebGL)** | game-quality 2D without a game engine |
| MIDI input | **Web MIDI** + native fallback | abstraction with two backends (see gotchas) |
| UI framework / bundler | **React + Vite** | **not** Next.js (see rejections) |
| Persistence | **local-first** (IndexedDB/SQLite) → **BaaS sync** | data is per-user |
| Mobile packaging | **Capacitor** | iOS (+ CoreMIDI plugin), Android later |
| Desktop packaging | browser/PWA now; **Electron** optional later | Mac build local; Windows build needs a PC/CI |
| Browser | **PWA** | already a web app |

---

## Context & constraints

- **Ambition:** personal now, maybe product later. A few drummer friends might use it.
- **Cost:** free. No profit intent. Minimal investment in pipelines.
- **Primary platforms:** web + iOS + Android. Desktop covered by the browser for now.
- **Build:** locally on the Mac to avoid CI cost. iOS via TestFlight.
- **Priorities (in order):** ① solid/nice UI · ② performance · ③ core features · ④ iPad + Android · ⑤ Mac/Win (browser OK).

---

## Decision status at a glance

| State | Item |
|---|---|
| ✅ **Decided** | Web stack + AlphaTab · React + **Vite** (not Next.js) · PWA + Capacitor (+ optional Electron) · build locally on Mac · local-first persistence · observability = client-side errors + usage |
| 🟡 **Leaning** | **Supabase** as the backend spine · **light** offline-sync layer (Legend-State or RxDB) · iOS via Capacitor + TestFlight ($99/yr) when ready |
| ⬜ **Open** | Final spine: Firebase vs Supabase · Sync layer: Legend-State vs RxDB · Electron desktop: yes/now or later · first concrete build step |
| 💤 **Deferred (nice-to-have/later)** | File upload · Song search (Songsterr/UG) · Native low-latency Windows audio · Android native wrapper |

---

## 1. Core stack: web + AlphaTab

**The anchor insight:** nearly everything hard and unique in the scope is core functionality of **AlphaTab** (MIT/MPL, open source): reads **Guitar Pro** (GP3–GP7) + MusicXML, renders **drum/percussion notation** (clef, X-noteheads, voices), plays via a built-in **SoundFont synthesizer** with a **synced playback cursor**, exposes **note geometry** for overlay feedback, and supports an **external cursor/time provider** so visuals can ride your own audio clock. Rebuilding even half of that in any other ecosystem is a multi-month project — which is why the whole stack leans web/TypeScript.

**Rendering split:**
- **AlphaTab** → standard-notation view (the primary view + engraving-level feedback).
- **PixiJS/WebGL** → the friendly "falling notes" highway (60fps sprite animation; drum charts are sparse, so it's cheap).
- **Web Audio clock** → metronome, count-in, scheduling, and scoring (MIDI hit timestamps compared against `AudioContext.currentTime`).

---

## 2. Why not the alternatives

| Option | Verdict | Why |
|---|---|---|
| **.NET MAUI / C#** | ❌ | AlphaTab's .NET build ships **WPF/WinForms only (Windows-only)** — **no MAUI control**; you'd rebuild the integration. **Can't build the Windows app from a Mac.** MIDI ecosystem patchier (iOS CoreMIDI bindings are a known pain). |
| **Game engine (Unity)** | ❌ | No notation/Guitar-Pro ecosystem (only `ABCUnity`, a *partial* ABC renderer). MIDI input is fine (Keijiro's **Minis** covers desktop/iOS/Android/Web). But you'd throw away AlphaTab. Engines render *custom note highways*, not sheet music. |
| **Game engine (Godot)** | ❌ | Same "no notation" problem, **plus a known bug: Godot drops *simultaneous* MIDI events** — disqualifying for drums (kick+snare+hat at once). |
| **ABCUnity + MIDI→ABC** | ❌ | Clever patch, two weak links: MIDI→ABC converters are melody-oriented/lossy (bad at drums); ABCUnity is a subset renderer with **no documented drum support or note-coordinate API** (your feedback overlays need that). Still leaves Guitar Pro, synth, cursor unbuilt. |
| **Next.js** | ❌ | Capacitor needs a **static export** (`output: 'export'`), which **disables SSR / API routes / server components** — Next's whole value. Plus client-nav 404s, "pages-router only." A rhythm game has nothing to server-render. **Use Vite.** (Next *would* suit a separate marketing site.) |
| **AWS (as the backend)** | ❌ for now | Free tier **changed July 2025**: new accounts get **~$200 credits, free plan expires in 6 months** (no more 12-month tier), then you pay. Ops-heavy + surprise-bill risk. Overkill for friends' score data. A BaaS does the same with no ops. |
| **Flutter / React Native** | ❌ | No AlphaTab-equivalent notation ecosystem; desktop/canvas-notation are second-class. |

---

## 3. Platforms & delivery (lean, free, Mac-built)

One Vite build, wrapped three ways:

```
            ┌─ Browser   → static host (Cloudflare Pages / Netlify / GH Pages)   FREE
shared SPA ─┼─ Android    → same PWA (installable, Web MIDI works)               FREE
 (Vite)     ├─ iOS/iPad   → Capacitor app → TestFlight (+ CoreMIDI plugin)       $99/yr Apple
            └─ Desktop    → browser now; Electron later (Mac build local)        FREE (Win build needs a PC/CI)
```

| Target | How (now) | Cost | Build on Mac? |
|---|---|---|---|
| Desktop (Win/Mac) | Browser — **Chrome/Edge** (PWA installable) | Free | just deploy |
| Android / tablet | Browser / **PWA** | Free | just deploy |
| **iOS / iPad** | **Capacitor → TestFlight** (+ CoreMIDI plugin) | **$99/yr Apple** | ✅ |
| Web hosting | Static deploy | Free | ✅ build + push |

- **No CI/CD needed** at this scale — build locally, `npx cap run ios` from Xcode. CI is a product-phase luxury.
- **Only recurring cost = $99/yr Apple Developer** (required for TestFlight; cheapest way onto friends' iPhones).
- iOS is the **only** target needing a native wrapper + a little Swift.

---

## 4. Key technical gotchas (banked findings)

- **Web MIDI = Chromium only.** Works in Chrome/Edge/Opera (desktop **and** Android), Firefox 108+, Samsung Internet. **Not Safari (macOS or iOS)** — and *all* iOS browsers are WebKit, so none have it.
  - → On desktop, tell users to use **Chrome/Edge, not Safari**.
  - → On **iOS you must write a native CoreMIDI Capacitor plugin** (the one unavoidable native piece). No maintained off-the-shelf one exists.
- **iOS Web-MIDI shim is a dead end for production.** The "Web MIDI Browser" app + shim runs an ancient JS engine (the `Array.from`/Tone.js bug). **Capacitor's modern WKWebView removes that whole class of bug** — you outgrow the shim, you don't fix it.
- **Windows audio latency:** browsers **can't use ASIO** (Web Audio → WASAPI), and **Electron doesn't fix it** (same Chromium audio). Real fixes for our app: **latency calibration** (in scope) + **audio-clock scoring** (a constant offset calibrates out, so latency hurts *feel*, not *fairness*) + `new AudioContext({ latencyHint: 'interactive' })` + a short "Windows audio tips" note. Native ASIO = a maybe-product concern.
- **Performance on weak Android / old iPads:** fine for this genre because **timing is decoupled from rendering** — the audio clock is authoritative, so dropped frames ≠ wrong scoring. Keep the highway on **WebGL (PixiJS) not DOM**, render notation in a **Web Worker**, pool objects, keep the soundfont small. Old iPads are fast; **cheap Android is the real test target**.
- **MIDI files vs Guitar Pro:** raw `.mid` → *standard notation* is lossy (quantize/voice/map). Guitar Pro/MusicXML = notation-grade. For the **falling-notes view**, raw MIDI is easy (just timings + lanes). Parse MIDI with `@tonejs/midi`.

---

## 5. Persistence, sync & observability

**Storage ≠ a server.** Scores/streaks/history are per-user → **local-first** (IndexedDB via Dexie, or native SQLite in Capacitor) covers the MVP at $0, offline, no auth. A backend is a *product trigger* — and we hit it: **cross-device sync (iPad ↔ Mac) is wanted soon.**

### The spine: Firebase vs Supabase

| | **Firebase** | **Supabase** 🟡 leaning |
|---|---|---|
| Offline + sync | ✅ Firestore caches locally + auto-syncs (one SDK) | ⚠️ needs an added sync layer (below) |
| Observability | ✅ Analytics + Crashlytics bundled (free, unlimited) | ➕ add Sentry/PostHog separately |
| Data model | NoSQL (Firestore) | **SQL (Postgres)** ✅ |
| Free tier | Spark: Firestore 1GB + 50K reads/20K writes/day; Auth 50K MAU; Storage 1GB; **no idle pause** | 500MB DB, 50K MAU, 1GB storage, 5GB bw, 2 projects; **pauses after 7-day idle** (~30s wake; keep-alive cron fixes it) |
| Lock-in | Google | open-source, portable ✅ |

> Sync needs **identity** (one Sign-in-with-Apple/Google) to tie devices together. *App Store requires Sign in with Apple if you offer social login.*
> MVP sync = **small data** (scores, settings, song `source+id` references). Defer big **file blobs** (uploads) to Storage later.

### Offline-sync layer (if Supabase) — lightest → heaviest

| Approach | Extra infra | Cost | When |
|---|---|---|---|
| Hand-rolled (Dexie + `updated_at`) | none | free | trivial data, full control |
| **Legend-State** + Supabase | none | **free (MIT)** | small reactive per-user data — *our shape*; Supabase-endorsed |
| **RxDB** + Supabase | none | **free core** (premium = optional perf only) | want a full reactive client DB + rich queries |
| **PowerSync** + Supabase | a sync **service** | free tier / self-host (FSL→Apache) | ❌ overkill now — production-scale partial sync |

→ **Recommendation:** light end — **Legend-State** (lighter) or **RxDB** (fuller). **Skip PowerSync** until/if scale demands it.

### Observability (MVP) — client-side, not infra SRE

We run no server of our own, so this means **error tracking + usage analytics + uptime**:

| Need | Free-tier picks |
|---|---|
| Errors/crashes | **Sentry** (5K errors/mo, 30-day, great JS source maps) · Firebase **Crashlytics** (free/unlimited) · PostHog (100K exceptions/mo) |
| Usage analytics | **PostHog** (1M events/mo + 5K session replays) · Firebase **Analytics** (free/unlimited) · Plausible/Umami/Cloudflare (privacy pageviews) |
| Uptime (ping PWA) | UptimeRobot / Better Stack (free) |

→ **Recommendation:** one-platform = Firebase Analytics+Crashlytics; **best web DX** = **Sentry** for errors (+ **PostHog** if you want usage + session replay to literally watch what a friend did before it broke).

---

## 6. Friendly notation UI + feedback (design notes)

- **Primary friendly view:** **horizontal-highway-style horizontal highway** (lanes = kit pieces, rhythm reads left→right). Optional **falling-notes-style vertical waterfall** as an alternate.
- Lanes **mirror the physical kit** (cymbals/hat top, kick bottom), configurable. **Gem shape encodes articulation**: filled = normal, **X = cymbals**, halo = accent, small/dim = ghost note. Translucent band at the now-line shows the **hit window**. Velocity → brightness/size.

| Event | Standard notation (scope) | Friendly view |
|---|---|---|
| Perfect | green ring on notehead | green burst + "PERFECT" + combo tick |
| Early | orange ring | orange flash + "EARLY ←" |
| Late | purple ring | purple flash + "LATE →" |
| Miss | *(nothing)* | gem quietly greys + slides past (gentle) |
| Wrong/extra hit | red ✗ at the wrong staff position | red flash in the **wrongly-hit lane** (suppress for pedal hi-hat) |

- Add a **tendency meter** ("early ←|→ late" needle) so users learn if they rush, and a **combo/streak glow**.
- **Accessibility:** always pair color with **shape + text + position** (green/orange/purple/red is a lot of hue).

---

## 7. Nice-to-haves / later

- **File upload** → needs Storage (may nudge Firebase to Blaze; Supabase Storage on free tier). Later.
- **Song search** (Songsterr / Ultimate Guitar — the `tablatures` project approach): store a **`source + id`** per song (dovetails with sync-by-reference). **Needs a small server-side proxy** (CORS + unofficial/scraped APIs) — the first feature justifying a tiny serverless function (Cloud Function / Cloudflare Worker). ⚠️ **ToS/legal gray area** (esp. Ultimate Guitar) and **scraper fragility**. Reference repos cloned at `~/Sites/tablatures` + `~/Sites/tablatures-api` (check their license before reusing code).
- **Native low-latency Windows audio** (ASIO via Electron + native addon) → only if it becomes a product.
- **Android native wrapper** (Capacitor + Play Store, $25 once) → for native MIDI reliability later; PWA is fine for now.

---

## 8. Open decisions (need input)

1. **Spine:** Firebase (managed, sync+observability bundled) vs **Supabase** (SQL/OSS, leaning).
2. **Sync layer:** **Legend-State** (lighter) vs **RxDB** (fuller).
3. **Electron desktop:** now, or browser-only until later?
4. **First build step:** (A) deep review + plan · (B) iOS Capacitor + CoreMIDI · (C) extract clean Vite app from the fork.

---

## Suggested build order

1. **Clean Vite + React app you own** — AlphaTab as an npm dep, port the proven logic out of the fork. *(kills provenance worry, Docusaurus weight, perf overhead)*
2. **Design & build the UI** — shell + notation/feedback views. *(priority ①)*
3. **Lock the perf-critical core** — Web Audio timing loop + PixiJS highway + MIDI scoring; profile on a cheap Android. *(priority ②)*
4. **Ship as a PWA** — instantly covers desktop browsers + Android; first shareable milestone. *(priorities ③–④)*
5. **Wire persistence + sync + observability** — local-first + Supabase + chosen sync layer + Sentry/PostHog.
6. **iOS: Capacitor + CoreMIDI plugin → TestFlight** — when ready for the $99 + a little Swift.
7. **Later, only if product:** Android native · Electron · Windows audio · uploads · song search.

---

## Sources

**Engine / rendering:** [AlphaTab](https://alphatab.net/) · [AlphaTab .NET install](https://www.alphatab.net/docs/getting-started/installation-net/) · [PixiJS perf](https://pixijs.com/8.x/guides/concepts/performance-tips) · [Soundslice (web notation precedent)](https://www.soundslice.com/)
**MIDI / platforms:** [Web MIDI 2026 support](https://www.supersimplepiano.com/blog/web-midi-browser-compatibility-2026) · [caniuse: Web MIDI](https://caniuse.com/midi) · [WebMIDIAPIShim issue #11](https://github.com/mizuhiki/WebMIDIAPIShimForiOS/issues/11) · [Capacitor](https://capacitorjs.com/) · [Apple CoreMIDI](https://developer.apple.com/documentation/coremidi/) · [Godot simultaneous-MIDI bug](https://github.com/godotengine/godot/issues/77035) · [Minis (Unity MIDI)](https://github.com/keijiro/Minis)
**Frameworks rejected:** [MAUI supported platforms](https://learn.microsoft.com/en-us/dotnet/maui/supported-platforms) · [Next.js + Capacitor limits](https://capgo.app/blog/building-a-native-mobile-app-with-nextjs-and-capacitor/) · [AWS Free Tier change](https://aws.amazon.com/blogs/aws/aws-free-tier-update-new-customers-can-get-started-and-explore-aws-with-up-to-200-in-credits/)
**Backend / sync / observability:** [Supabase free tier](https://aiagencyplus.com/supabase-free-tier-limits/) · [Firebase pricing](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) · [Firestore offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline) · [RxDB Supabase replication](https://rxdb.info/replication-supabase.html) · [RxDB premium/licensing](https://rxdb.info/premium/) · [Legend-State Supabase](https://legendapp.com/open-source/state/v3/sync/supabase/) · [PowerSync pricing](https://powersync.com/pricing) · [Sentry free plan](https://sentrypricing.com/free-plan) · [PostHog pricing](https://posthog.com/pricing)
