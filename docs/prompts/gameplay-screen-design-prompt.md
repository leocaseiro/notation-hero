# Design prompt — Play / Practice screen (drum-practice rhythm game)

> Tool-agnostic brief for v0 / Lovable / Stitch / Gemini / etc. Copy everything below the line.

---

You are a senior product designer. Design the **main play / practice screen** of a drum-practice app and propose **3–5 distinct UI concepts**.

## What the app is

A web app (installable PWA) that teaches and drills drumming. The player reads **standard music notation** and plays along on a connected **electronic drum kit (MIDI)**. The app scores the player's **timing** in real time, note by note.

## The screen's job

This is the screen you're on while playing a song. The **standard music notation is the hero** — a horizontally scrolling staff with a moving playhead and **live per-note feedback**. Everything else (transport, tempo, mixer, settings, score) supports it and should not crowd it.

> A "friendly" scrolling-lane / falling-notes view is a planned later alternate. **Design these concepts for the standard-notation view** — just leave room for a view toggle.

## Platform & constraints

- **Tablet-first, landscape** (iPad + Android tablets); also works on desktop (mouse).
- Touch-friendly: **44px minimum** hit targets.
- Use proper, consistent **icons** (a clean, designed icon set). **Do not use emoji.**

## Live per-note feedback the screen must show (in real time)

As the player hits each note, show one of these states, glanceable at speed:

- **Perfect** — hit on time
- **Early** — rushed (hit before the beat)
- **Late** — dragged (hit after the beat)
- **Missed** — expected note not played
- **Error** — wrong pad / extra hit

**Accessibility:** these must be distinguishable for **color-blind** users — don't rely on color (hue) alone; pair it with shape, position, text, or motion. (You're free to invent the exact visual language, colors, glyphs, and where feedback appears.)

## Controls the screen must support

List of **actions** the screen needs to offer. **You decide** what is visible by default vs tucked into panels / menus / long-press, how to group them, the iconography, and where everything sits. Be inventive about the organizing pattern.

**Playback**

- Play / Pause — start or pause playback + scoring
- Back to start (stop) — return to the beginning

**Position & looping**

- Timeline / scrubber — show progress (current time / total) and seek to any point
- A–B loop — set point A and point B (either can fall mid-measure) and loop that range; clear A–B
- Loop on / off

**Tempo / speed**

- Tempo down / up (BPM − / +) — change playback speed; show the BPM number; show the percentage **only while** the user is adjusting it
- Auto-speed on / off — gradually raises the tempo as the player's accuracy improves, up to the original speed (show a small indicator when active)

**Metronome**

- Metronome on / off
- Count-in on / off — a metronome lead-in before playback starts (respects the time signature)

**Score / feedback display**

- **Show / hide score** — toggle the on-screen score display on or off
- Open score detail — a breakdown panel: counts per state (**Perfect / Early / Late / Missed / Error**), current & longest streak, max combo, accuracy %, overall score % and a star rating

**View / notation**

- View toggle — switch to the (planned) scrolling-lane / falling-notes view
- **Per-track notation style** — switch each track's staff between **staff (standard) / tablature / slash**; more than one style can be shown at once

**Tracks / mixer (panel)**

- Open Tracks — per instrument: show/hide, volume, **isolate ("only this")**, and **mute**; a quick **"play along"** (mute the player's own part so they play it live); plus a master volume.
  _(The exact solo / isolate / play-along interaction is open — propose what works best; e.g. per-track "only this" vs named shortcuts.)_

**Setup (panel / modal)**

- Open Settings — MIDI input device, which instrument the player plays (drums / keyboard), MIDI note mapping, latency calibration, timing-window tightness, theme (light / dark / system)
- Mode: **Practice vs Game** — Game mode locks tempo / A–B / loop; Practice is unrestricted
- Memory mode (armed before starting) — hide the notation, reveal it on a mistake, fade it out again after a few perfect hits

**App-level**

- Back to library (song list)
- Open / load a local song file
- Display: song title + current measure indicator

## What I want from you

- **3–5 distinct concepts** for this screen — genuinely different organizing ideas (e.g. bottom transport bar, floating controls, a side rail, a contextual toolbar, a radial menu — your call).
- Show the **playing state** with live feedback visible, plus how the **score display** looks and how **one panel** (Tracks or Settings) appears when opened.
- At least one **dark** variant (the app supports light + dark).
- Keep the standard-notation view dominant and the screen uncluttered.
- Briefly annotate the key decisions for each concept (what you surfaced vs hid, and why).

Optimize for clarity, fast scanning, and tablet ergonomics. Surprise me.
