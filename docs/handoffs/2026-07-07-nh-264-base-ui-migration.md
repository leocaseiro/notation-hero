# Prompt — Migrate NH-264 form components from Radix to Base UI

> Paste this into a fresh session to run the migration. It is self-contained.

## TL;DR

We built the 10 shadcn form components for **NH-264** on **Radix** (`radix-ui`), but the
intended primitive was **Base UI** (`@base-ui-components/react`) — the Jira ticket links to
shadcn's `/components/base/…` registry, which is the Base UI variant. **Fully remove Radix**
(including the pre-existing Button + Badge) and, in the same pass: make interactive-state
tokens consistent across all components, give Sonner per-status colors, and use the Button
component inside Card.

## Read first

- `AGENTS.md` and `client/README.md` (design-system + VR/a11y conventions).
- Jira **NH-264** (smart checklist tracks the 10 components). Ticket component links:
  `https://ui.shadcn.com/docs/components/base/{input,input-group,native-select,textarea,radio-group,checkbox,label,field,card}`.
- Prior handoff: `docs/handoffs/2026-07-05-nh-264-form-components.md`.
- Base UI docs: `https://base-ui.com/`.
- Components live in `client/src/components/ui/<Name>/` (folder-per-component: `<Name>.tsx`,
  `.stories.tsx`, `.test.tsx`, `.vr.ts`, `.a11y.ts`, `.story-ids.ts`, `.vr.ts-snapshots/`).

## Scope 1 — Radix → Base UI (remove `radix-ui` entirely)

Swap dependency `radix-ui` → `@base-ui-components/react` (vet the latest version: npm + GitHub
maintenance dates, per the repo's tool-vetting rule). Files importing Radix today:

| Component  | PR / branch                                                | Radix primitive      | Base UI target                                                    |
| ---------- | ---------------------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| Checkbox   | #104 open · `feat/nh-264-checkbox`                         | `Checkbox`           | Base UI Checkbox                                                  |
| RadioGroup | #105 merged · fixes on #116 `fix/nh-264-radiogroup-jitter` | `RadioGroup`         | Base UI Radio + RadioGroup                                        |
| Label      | #100 merged · `feat/nh-264-label`                          | `Label`              | native `<label>` (Base UI has no Label primitive)                 |
| Field      | #107 open · `feat/nh-264-field`                            | `Label` (FieldLabel) | native `<label>`                                                  |
| **Button** | pre-existing foundation                                    | `Slot`               | Base UI `render` prop / `useRender` (replaces `asChild` + `Slot`) |
| **Badge**  | pre-existing foundation                                    | `Slot`               | Base UI `render` / `useRender`                                    |

- The other six — Input #102, Textarea #103 (merged), NativeSelect #110, Card #106,
  InputGroup #111, Sonner #108 — never imported Radix. No primitive change; only the token
  pass (Scope 2). Sonner stays on the `sonner` package.
- Reference shadcn's `/base/` registry for each component's exact Base UI implementation; check
  whether `shadcn add` supports a Base UI registry via `components.json`.
- **Button `asChild` → `render`:** grep for `asChild` usages across the repo and move each to
  Base UI's `render` prop; Button is used widely, so check every consumer.
- Done: `rg "from 'radix-ui'" client/src` returns nothing and `radix-ui` is gone from
  `client/package.json` + the lockfile.

## Scope 2 — Interactive-state token consistency (every component, match Button)

Button is the reference. Standardize:

- **Focus:** `focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50`
  (3px everywhere; normalize Button's `ring-3` → `ring-[3px]`).
- **Hover:** interactive elements (buttons, clickable rows) get a hover bg; text fields do not.
- **Active/press:** buttons get `active:translate-y-px` + `transition-all`.
- **Outline:** `outline-none` + a focus ring everywhere.
- **Disabled:** fields = `disabled:cursor-not-allowed disabled:opacity-50` (no
  `pointer-events-none`); buttons = `disabled:pointer-events-none disabled:opacity-50`.
- **Invalid:** `aria-invalid:border-destructive aria-invalid:ring-destructive/20` (border when
  invalid, ring on focus) — never an always-on ring.
- Already fixed this session (carry forward, do not regress): InputGroupButton focus ring +
  press, RadioGroup baseline jitter + invalid border-only, Checkbox glyph centering + size.

## Scope 3 — Use the Button component in Card

Card's stories (footer Cancel / Practice) and any raw `<button>` in stories → replace with
`<Button>` (e.g. `variant="outline"` for Cancel, default for Practice) so focus / hover /
press match the design system. Regenerate Card VR baselines.

## Scope 4 — Sonner per-status colors

Today every toast renders on the neutral popover surface with a type icon. Give each status
its own color:

| Status  | Color                  |
| ------- | ---------------------- |
| default | `secondary`            |
| error   | `destructive` (danger) |
| success | green                  |
| warning | yellow / amber         |

- Only `--destructive` and `--secondary` exist. **Add `--success` (green) and `--warning`
  (amber) semantic tokens** (+ their `-foreground`) to `client/src/styles.css` for BOTH light
  and dark. Consult the brand palette — Okabe-Ito is already used for score colors (green
  `#009E73`, amber `#E69F00` are good candidates); confirm against the brand decisions/memory.
- Map Sonner types to these (per-type `classNames` on the Toaster, or sonner's `richColors`
  overridden to our tokens). Add/adjust Sonner stories + VR to cover the colored states.

## Constraints (MUST follow)

- **Material Symbols unlayered-CSS gotcha** (see `client/README.md` §Icons): the
  `.material-symbols-outlined` rule sets `display` AND `font-size` _unlayered_, so it beats
  layered utilities — you cannot hide an icon span with `hidden` (toggle a plain / `contents`
  wrapper) and cannot resize it with `text-*` (force with `!`). Checkbox already does this —
  mirror it in the Base UI version.
- **VR (per-OS baselines: `-chromium-darwin.png` + `-chromium-linux.png`) + a11y (axe) + unit
  (Vitest) all BLOCK CI.** After any visual change, regenerate BOTH baselines and commit them
  — linux via the Docker command in `AGENTS.md` §"VR baselines are per-OS". **Kill any stale
  Storybook on `:6006` first** (Playwright reuses it and serves out-of-sync stories).
- **lefthook** pre-commit + pre-push run the full lint/typecheck/test suite — **never use
  `--no-verify`** or skip a CI gate.
- **Commit before asking for review**; baby commits; one concern per commit; one PR per
  component.
- New cspell words → `cspell.json` at **distinct anchors** (so parallel PRs merge cleanly).
- **PR checklist:** copy the items from `.github/pull_request_template.md` **verbatim** — the
  `pr-checklist` gate reads them literally and fails on any reworded/missing item; it re-runs
  when the PR body is `edited`.
- **Always work in a git worktree; never touch `master` directly; never delete a remote
  branch.** Keep the Jira key `(NH-264)` in the PR title.

## Execution

1. **Spike Base UI**: add `@base-ui-components/react` (vetted), confirm the Checkbox /
   RadioGroup / `render`-prop APIs against shadcn's `/base/` registry.
2. **Open PRs** (edit the branch): migrate the primitive if any + apply the token pass;
   regenerate baselines; verify green (unit + a11y + VR + lint); commit; push; watch CI.
3. **Merged components** (Label #100, RadioGroup #105): new branch off `master`, migrate, open
   a new PR.
4. **Button + Badge**: migrate `Slot` → Base UI `render`; update every `asChild` consumer;
   regenerate their VR baselines.
5. **Remove `radix-ui`** from `client/package.json`, `pnpm install`, confirm no imports remain.
6. **Sonner colors + Card-uses-Button + token consistency** per Scopes 2–4.
7. Flip the NH-264 Jira smart checklist (`customfield_10041`, `~` → `+`) as each lands.

## Definition of done

- No `radix-ui` in the source or `package.json`; `@base-ui-components/react` in its place.
- Every component PR green (VR / a11y / unit / lint).
- Storybook previews show consistent focus / hover / active across all components, colored
  Sonner toasts per status, and a Button-based Card footer.
