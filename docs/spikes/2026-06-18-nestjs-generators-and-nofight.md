
## Does the no-fight principle hold? → **Yes, tunable in one config line.**

The "fight" is **inherent to the generators**, not a Biome problem: Biome and **Prettier make byte-identical changes** to `nest g` output (the generators emit code that isn't even Prettier-clean, despite Nest shipping a `.prettierrc` it never runs — the `format` flag defaults false and `nest g` never sets it). So **Prettier-on-server buys nothing.**

Only **2 churn points** on standard `nest g` output:
1. **Import wrap** — `nest g resource`'s controller import is **83 chars** > 80 default → wraps. **Fix: `lineWidth: 100`** → passes unchanged.
2. **Trailing comma** — incremental `nest g module` omits a comma the formatter adds (matches `trailingCommas: all` intent anyway; `nest g resource` already emits it — a generator inconsistency).

⚠️ **Critical trap:** Biome defaults to **tabs + double-quotes**. Unset → it rewrites *every* file 100%. Pin `indentStyle: space` + `quoteStyle: single`.

## The real risk is the LINTER, not the formatter

`biome format` is **DI-safe** (never touches imports). The danger is Biome's *lint* autofix `useImportType` → rewrites injected service imports to `import type` → **breaks Nest DI at runtime**. Because the project's linter is **ESLint** (decision pending re-spike), Biome would run **format-only, linter OFF** — and the DI trap **cannot fire**. Keep `biome format` separate from any lint-autofix.

## "If Biome" config (single root `biome.json`, verified Biome 2.5.0)

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.0/schema.json",
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": {
    "parser": { "unsafeParameterDecoratorsEnabled": true },
    "formatter": { "quoteStyle": "single", "trailingCommas": "all", "semicolons": "always" }
  },
  "linter": { "enabled": false }
}
```
`unsafeParameterDecoratorsEnabled: true` is required or Biome can't parse Nest `@Body`/`@Query` param decorators. Delete the vestigial `server/.prettierrc` once a formatter is locked.

## NestJS generator catalog (verified)

- **20 schematics defined; 19 surfaced** by `nest g --help` (`angular-app` hidden).
- Only **`resource`** is a multi-file *element* generator: `nest g resource <name>` (REST + CRUD) = **6 files** (controller, module, service, 2 DTOs, entity) + `.spec.ts` per controller/service when specs on. Transport variants: rest/microservice→controller, ws→gateway, graphql→resolver.
- All other generators are single-file (+ optional `.spec.ts`). `module`/`decorator`/`interface` never emit a spec.
- Alias corrections: **interceptor = `itc`** (not `in`); configuration = `config`.
- **No Storybook** anywhere in Nest schematics (Nest is backend-only).
- Disable specs with `--no-spec`; `--flat`/`--skip-import` exist; defaults vary per generator.

## Are generators useful for agents? → **Yes — more than for devs**

- **Deterministic canonical output** (no formatter pass → byte-stable), **token-cheap** (`nest g resource orders` ≈ 3 tokens → 6 wired files with the provider auto-registered), **convention-enforcing** (kebab + role-suffixes + correct DI wiring for free — the generator *is* a convention-linter matching `ARCH-NAME-1`).
- **Cautions:** (1) `nest g resource`/`controller` **prompt interactively** — an agent MUST pass `--type rest` and answer the CRUD prompt or it **silently creates zero files**; (2) boilerplate stubs add unused-param noise; (3) pair with format-only (no blind lint-autofix) so DI can't be undone.
- **Net:** keep `nest g` in the agent toolkit, always non-interactive with explicit flags.
