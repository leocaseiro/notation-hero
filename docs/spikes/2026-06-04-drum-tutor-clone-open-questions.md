# Open Questions — Drum-Tutor-Clone Founding Sessions (2026-06-02 → 2026-06-04)

> Companion to [`2026-06-04-drum-tutor-clone-sessions-spike.md`](2026-06-04-drum-tutor-clone-sessions-spike.md)
> (§4 extracted here as a standalone, trackable ledger so the one **still-live** question isn't buried).
>
> **Status as of 2026-06-20:** 10 questions surfaced in those sessions · **9 resolved · 1 still open (OQ-5).**
> **Jira:** NH-201.

---

## ⬜ Still open

### OQ-5 — Adopt XState for the game-mode FSM, or skip it?

**The question** *(raised 2026-06-03, AWS brainstorm + office-hours):* model the single game-mode
lifecycle — `idle → count-in → playing → paused → results` — as an explicit **finite-state machine
(FSM) with [XState](https://stately.ai/docs/xstate)**, for rigor plus a system-design interview
talking point — or **skip it** and keep the lifecycle as ad-hoc component state for speed.

**Why it's still open:** no later decision (DACI / ADR / `decision-registry.md`) ever resolved it.
`stack-aws-brainstorm.md` left XState marked *"optional\*"* with the note: *"skip for plumbing;
optionally model the one game-mode lifecycle as an explicit FSM for the rigor + interview story."*
It was never revisited.

**Decision framing (for whoever picks this up):**

| | Adopt XState | Skip (ad-hoc state) |
|---|---|---|
| **Rigor** | explicit, testable states + guarded transitions; invalid states unreachable | implicit; easy to slip into invalid states (e.g. scoring while paused) |
| **Interview value** | a concrete "I modeled the game loop as an FSM" story — a system-design signal, which the AWS-learning priority (spike §F1) explicitly values | none |
| **Cost** | one dependency + a little learning for a single machine | zero |
| **Fit** | the lifecycle genuinely *is* a small FSM | fine for a ~5-state flow |

**Grounding before deciding:**
- The working prototype already implements this lifecycle informally — `~/Sites/alphaTabWebsite`
  (`rhythm-game` branch: `useRhythmGameScore`, `practice-mode-settings`). Read the real states
  there first (per [[alphatab-fork-reference]]).
- It ties to the **AWS interview-prep priority** (spike §F1): XState would be a portfolio talking
  point, which is exactly what that goal optimises for — so the "rigor + story" side has extra weight here.

**Suggested home if pursued:** a small spec/ADR when the **player / game-mode** feature is actually
built (per the per-feature-spec-precision convention). It is **not** a foundation concern and does
not block anything today.

---

## ✅ Resolved (kept for the record)

Full context + current-status cross-refs for each: §4 + §5 of the main spike.

| # | Question (as of Jun 2–4) | Resolution |
|---|---|---|
| OQ-1 | Backend spine: Firebase vs Supabase? | Neither — **AWS** (catalogue-store DACI 2026-06-09). |
| OQ-2 | Sync layer: Legend-State vs RxDB? | Neither — **Dexie** (RxDB rejected; backend ADR 2026-06-17). |
| OQ-3 | Electron desktop: now or later? | **Deferred** — browser/PWA now; front-end = Vite SPA. |
| OQ-4 | First build step (deep review / iOS Capacitor / extract clean Vite app)? | Reframed — **foundation + CI/CD first**, then the catalogue (CMS) as the first real feature. |
| OQ-6 | RxDB vs Legend-State targeting AWS? | Closed — **Dexie** (duplicate of OQ-2). |
| OQ-7 | AWS local creds + region (the `pulumi up` blocker)? | **Resolved** — AWS account set up; first `pulumi up` landed (NH-150). |
| OQ-8 | Confirm defaults (public+proprietary / monorepo / IAM keys / bun)? | Public ✓, OIDC ✓; **bun → pnpm**; monorepo shape **Nx → dropped** (2026-06-17). |
| OQ-9 | Domain (`notation-hero.*` / `notationhero.*`)? | Brand domain **notationhero.com** (Namecheap, **not yet configured**); package namespace `@notation-hero/*`. |
| OQ-10 | Friendly-view visuals (tendency meter, combo glow, …)? | Evolved into the **design system** (PR #23, `docs/mockups/`). |

---

> If OQ-5 is decided, record the outcome in `docs/decisions/` and strike it here (per "strike, don't delete").
