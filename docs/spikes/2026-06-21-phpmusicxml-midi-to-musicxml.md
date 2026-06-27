# Spike — PHPMusicXML for MIDI → MusicXML (NH-205)

- **Ticket:** [NH-205](https://leocaseiro.atlassian.net/browse/NH-205) (epic [NH-178 Player & Notation](https://leocaseiro.atlassian.net/browse/NH-178))
- **Date:** 2026-06-21
- **Worktree:** `.claude/worktrees/nh-205-midi-musicxml-spike` (branch `worktree-nh-205-midi-musicxml-spike`)
- **Subject:** [kamshory/PHPMusicXML](https://github.com/kamshory/PHPMusicXML) — local checkout `~/Sites/PHPMusicXML`
- **Goal:** Ingest **MIDI** and render it as **notation** in our player (AlphaTab). Evaluate whether PHPMusicXML's MIDI→MusicXML conversion works, whether we can legally use it, and whether to port it / run it offline / build our own.

---

## TL;DR (preliminary — live conversion run still pending)

1. **The premise is validated and the need is real.** AlphaTab **cannot import MIDI** (confirmed by its maintainer). A MIDI→MusicXML (or MIDI→GuitarPro) step is **unavoidable** if AlphaTab is the renderer. MusicXML **is** a first-class AlphaTab import, so converted output should render (Q6 — to confirm with a live file).
2. **PHPMusicXML is legally unusable for the product as-is.** It has **no license → all rights reserved**. We **cannot port or ship it** without the author's written permission. Running it **locally to evaluate** is low-risk; that's the only safe use today. **(Hard blocker on Q5's "port" path — independent of effort.)**
3. **Don't port it even if licensed.** The 448-element data model is trivial to port, but the MIDI→notation **musical heuristics** (quantization, tie-splitting, chord/voice detection) are buggy and still changing upstream. Porting freezes someone else's open bugs (~10–16 dev-days).
4. **The properly-licensed, ready-made converter is `music21` (Python, BSD-3)** — run **offline / at build time** (Lambda layer or ingest step), not in the browser. **No production-ready JS/TS MIDI→MusicXML library exists** (June 2026). Build-your-own hits the genuinely hard **quantization** problem.
5. **PHPMusicXML's real value to us = a reference/oracle** for the MIDI→MusicXML mapping and a quality benchmark — not shippable code.

**Provisional recommendation:** Use AlphaTab for rendering; do MIDI→MusicXML **offline at ingest time with `music21`** (BSD-3). Keep PHPMusicXML local-only as a comparison oracle. Confirm with the live run below before finalizing.

> Status of each question: **Q3, Q4, Q5 = answered** (research). **Q1, Q2, Q6 = pending the live PHP run** (PHP compiling via `mise` as of writing).

---

## Q1 — Does the conversion actually work? _(pending live run)_

Environment note: this machine had **no PHP**. Per the chosen approach we're installing a PHP **version manager** (`mise`, since `phpenv` isn't a Homebrew formula) and compiling PHP 8.3 from source, then running:

```bash
php convert.php "<input>.mid"            # → <input>.xml / .mxl
```

Test inputs staged in `docs/spikes/nh-205-artifacts/midi-in/`:

| File                  | Why chosen                                                          |
| --------------------- | ------------------------------------------------------------------- |
| `twinkle.mid`         | Simple melodic — easy correctness check                             |
| `coldplay-yellow.mid` | Real multi-track pop (~50 KB) — "complex MIDI" claim, chords, parts |
| `16th-rock-beat.mid`  | Drums — MIDI channel-10 percussion claim                            |

Outputs will land in `docs/spikes/nh-205-artifacts/musicxml-out/`. **Result: TBD.**

## Q2 — Coverage & confidence _(pending live run)_

Upstream **claims** (README, to be verified against real output): MusicXML 4.0; "100% of 444 elements" (Oct 2023); complex-MIDI success (Apr 2026); percussion (ch10), chord detection, channel filtering, lyric `default-x` spacing; targets MuseScore/Sibelius/Finale. **Assessment: TBD** (will inspect produced XML for measures, divisions, multi-part, percussion, chords, tempo/time-sig, and obvious failures).

> Context from Q4: MIDI→notation is an **inference** problem, not a 1:1 format map. Even mature tools degrade on human-performance MIDI. So "works" must be judged as _notation quality_, not just _valid XML_.

---

## Q3 — License ⚠️ (answered: **no license → all rights reserved**)

**Verified from source, 2026-06-21.** PHPMusicXML has **no `LICENSE`, `COPYING`, `NOTICE`, or `composer.json`** locally or on upstream GitHub (no License indicator). Under the Berne Convention, code published with no license is **© the author (kamshory), all rights reserved** — a public repo / "Special Thanks" is **not** a grant. No right to copy, modify, redistribute, or make derivatives (incl. a JS port).

It's a **license patchwork** of bundled third-party files:

| File                                                            | Author                                     | License                                                                               |
| --------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `inc.lib/classes/Midi/Midi.php`                                 | **Valentin Schmidt** ("Midi Class" v1.7.x) | **"Freeware"** — "use and modify as you wish" (non-OSI; **silent on redistribution**) |
| `inc.lib/classes/Midi/MidiRttl.php`, `MidiDuration.php`         | Valentin Schmidt                           | Freeware (same family)                                                                |
| `inc.lib/classes/MusicXML/Util/ExtendedReflectionClass.php`     | Ozgur Giritli                              | **MIT** ✓ (clean)                                                                     |
| `inc.lib/classes/MusicXML/Util/BjSZipper.php`                   | NeoBurn (Bjørn Singer)                     | none stated                                                                           |
| `inc.lib/classes/MusicXML/**` (the core converter + 448 models) | kamshory                                   | **none → all rights reserved**                                                        |

**Premise correction:** the MIDI parser does **not** originate with robbie-cao — that repo is just a re-host of **Valentin Schmidt's "Midi Class" (Freeware)**. robbie-cao's repo is also unlicensed.

**Risk by path:**

- **Run locally only, nothing distributed (spike/oracle):** low _practical_ risk; the converter core is still all-rights-reserved, but private evaluation isn't distribution. The **output MusicXML files are your data**, not encumbered by the tool's copyright.
- **Port to JS / ship in Notation Hero:** **hard blocker.** A derivative of all-rights-reserved code without permission. The Schmidt "Freeware" grant doesn't clearly cover redistributing a derivative either. (No GPL anywhere → no copyleft risk; the problem is _no grant at all_.)

**If we ever wanted to use it:** open an issue / email kamshory to add an OSI license (MIT/Apache-2.0), _and_ confirm he can relicense the Schmidt MIDI portion (he likely cannot — Schmidt holds that copyright). **Cleaner:** decouple the MIDI parser (use MIT `@tonejs/midi`/`midi-file`) and don't inherit the lineage at all.

---

## Q4 — Build-our-own / alternatives (answered)

**No production-ready, general-purpose MIDI→MusicXML npm package exists (June 2026).**

| Tool                            | Lang       | Maintained?                            | License   | Node/Browser                 | Notes                                                                                                          |
| ------------------------------- | ---------- | -------------------------------------- | --------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **music21**                     | Python     | **Yes** (v10.5, 2024)                  | **BSD-3** | No (Python)                  | Most capable ready-made; MIDI→MusicXML in ~5 lines; quantization built in (degrades on human-performance MIDI) |
| **MuseScore CLI** (`mscore`)    | C++ binary | Yes (MuseScore 4)                      | **GPL-2** | No (headless binary ~200 MB) | Highest notation quality; heavy to bundle; GPL disclosure concerns                                             |
| webmscore                       | JS/WASM    | Stale (2023)                           | GPL-2     | Both                         | Input is `.mscz` only — **not MIDI**                                                                           |
| midixmljs                       | JS         | **Abandoned** ("NOT SUITABLE FOR USE") | ?         | Both                         | Prototype only                                                                                                 |
| midi2musicxml (kaibadash)       | Kotlin     | Archived (2024)                        | ?         | No                           | Vocal-synth niche                                                                                              |
| `@tonejs/midi` + custom emitter | TS         | Yes                                    | MIT       | Both                         | Parser only — **you** write the MusicXML emitter + quantizer (the hard part)                                   |
| Verovio                         | C++/WASM   | Yes (v5, 2025)                         | LGPL-3    | Both                         | MusicXML/MEI **renderer**, not a MIDI importer                                                                 |

**The quantization problem (why build-your-own is hard):** MIDI stores performance events (absolute ticks, micro-timing, no bars/spelling). MusicXML needs notated values, measures, time/key signatures, beaming, voicing, enharmonic spelling, rests. Bridging them requires **beat tracking, grid snapping, time/key-sig inference, voice separation, rest insertion** — an active research area (2024–25 papers). Not a multi-day build.

**AlphaTab input formats (sourced):** Guitar Pro 3–7, **MusicXML**, CapXML, alphaTex. **MIDI is NOT supported as input** — confirmed by maintainer Danielku15 ([discussion #1315](https://github.com/CoderLine/alphaTab/discussions/1315), [issue #150](https://github.com/CoderLine/alphaTab/issues/150)); his suggested workaround is exactly "convert MIDI → MusicXML first." AlphaTab only _emits_ MIDI for playback.

**Recommendation (Q4):** reuse over build; **music21 offline** is the pragmatic ready-made path. Build-your-own only as a last resort.

---

## Q5 — Port to JS vs offline converter (answered: **don't port — run offline**)

**Architecture** (`~/Sites/PHPMusicXML/inc.lib/classes/`, ~500 files / ~50k LOC): a hand-rolled MIDI parser (`Midi/*.php`, Schmidt's), a 1,617-line core `MusicXML/MusicXMLFromMidi.php`, **448 pure-data Model classes** (zero logic — just typed MusicXML 4.0 schema via docblock annotations), a reflection-driven XML serializer, and a `.mxl` zip util. Reverse MusicXML→MIDI is a stub.

**Port blockers (all minor/mechanical except one):**

- Reflection-driven serialization (the one real design dependency) — but the annotation vocabulary is tiny (~4 tags) and already machine-readable → becomes static TS metadata/decorators.
- `eval()` × 67 — looks scary, all the identical `eval("$n=60;")` token idiom → trivial split.
- `ext-zip` / `ext-dom` → `fflate`/`xmlbuilder2`. `ExtendedReflectionClass`, `Map/*` → mostly dead/off the write path.

**Port effort ≈ 10–16 dev-days** for a standalone npm package: the 448 models are code-gen mechanical (~2 d), serializer (~1–2 d), MIDI parser (~2–3 d, or wrap `@tonejs/midi`), **conversion heuristics ~3–5 d (the real risk)**, `.mxl`+tests ~2–3 d. **Do not merge into AlphaTab — wrong shape** (AlphaTab consumes MusicXML/MIDI; it doesn't convert between them).

**Offline converter (recommended):** PHPMusicXML is a clean black box (`php convert.php in.mid` → out.xml/.mxl, zero Composer deps). Run it at **build/ingest time** in a `php-cli` Docker step or GitHub Action, commit the resulting MusicXML, ship only static artifacts → **$0 AWS runtime**, no port risk, stays in sync with upstream. (A PHP Lambda is possible but adds a second runtime; only if users upload arbitrary MIDI for on-demand conversion.) **Note:** the license blocker (Q3) applies the moment any PHPMusicXML code is _distributed_ (e.g. baked into a shipped Docker image) — so even "offline" use should stay local/CI-internal until licensing is cleared, OR switch the offline converter to **music21 (BSD-3)**.

**Recommendation (Q5):** don't port; run an offline/ingest-time converter — and prefer **music21** over PHPMusicXML so it's properly licensed.

---

## Q6 — Can AlphaTab render the converted files? _(pending live run)_

MusicXML is a supported AlphaTab importer (Q4), so this should be **yes**. Plan: load a converted `.musicxml`/`.mxl` into a minimal AlphaTab page and screenshot it; note any fidelity gaps. Prior art to mine: `~/Sites/alphaTabWebsite`. **Result: TBD.**

---

## Sources

- AlphaTab formats: <https://alphatab.net/docs/introduction> · MIDI-import [#150](https://github.com/CoderLine/alphaTab/issues/150) · maintainer note [discussion #1315](https://github.com/CoderLine/alphaTab/discussions/1315)
- music21: <https://github.com/cuthbertLab/music21/releases> · [MIDI translate docs](https://music21.org/music21docs/moduleReference/moduleMidiTranslate.html) · [quantize issue #556](https://github.com/cuthbertLab/music21/issues/556)
- MuseScore CLI: <https://handbook.musescore.org/appendix/command-line-usage>
- Quantization research: <https://arxiv.org/pdf/2508.19262>
- PHPMusicXML: <https://github.com/kamshory/PHPMusicXML> · MIDI parser origin re-host <https://github.com/robbie-cao/midi-class-php>

---

## Open decisions for Leo (after live run)

- [ ] Converter of record: **music21 (offline)** vs MuseScore CLI vs PHPMusicXML-as-oracle-only.
- [ ] Conversion timing: **build/ingest-time** (static artifacts, $0) vs on-demand (user-uploaded MIDI).
- [ ] Whether to contact kamshory for an OSI license (only if we decide PHPMusicXML output quality is worth it).
