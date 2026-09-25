import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RECORDING, TrackRow } from './TrackRow';

const drumStaff = {
  id: 'staff-0',
  label: 'Staff 1',
  showStandardNotation: true,
  showSlash: false,
  showNumbered: false,
  showTablature: false,
  // 1.8.4 cannot render tablature on a percussion staff, so the toggle must not appear.
  tablatureAvailable: false,
};

// drumStaff carries only ONE enabled notation type, same as a real drum export — which is
// exactly the shape that crashed the engine (NH-291: AlphaTab cannot lay out a staff with
// nothing to draw). So Standard notation locks on by default wherever baseProps/drumStaff is
// used unmodified, and its tooltip replaces "Standard notation: on" with this reason.
const NOTATION_LOCKED = 'at least one notation type must stay shown';

const baseProps = {
  name: 'Drumkit',
  rendered: true,
  onRenderedChange: () => {},
  solo: false,
  onSoloChange: () => {},
  mute: false,
  onMuteChange: () => {},
  volume: 8,
  onVolumeChange: () => {},
  staves: [drumStaff],
  onStaffChange: () => {},
  transposeAudio: 0,
  onTransposeAudioChange: () => {},
  transposeFull: 0,
  onTransposeFullChange: () => {},
  expanded: false,
  onExpandedChange: () => {},
};

test('the primary cluster shows the name, render-select, solo, mute and volume', () => {
  render(<TrackRow {...baseProps} />);
  expect(screen.getByText('Drumkit')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /render/i })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /solo/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /volume/i })).toBeInTheDocument();
});

test("the volume slider spans AlphaTab's own 0-16 scale", () => {
  render(<TrackRow {...baseProps} />);
  const volume = screen.getByRole('slider', { name: /volume/i });
  // Base UI renders the thumb as a visually-hidden <input type="range"> carrying ONLY
  // aria-valuenow; the bounds live on the native min/max attributes. Slider.test.tsx and
  // RangeSlider.test.tsx assert them this way, and forbid adding redundant aria-* to the
  // thumb to satisfy a test.
  expect(volume).toHaveAttribute('min', '0');
  expect(volume).toHaveAttribute('max', '16');
  expect(volume).toHaveAttribute('aria-valuenow', '8');
  // The readout shows the percentage of the 0-16 scale, not the raw channel level — 12/16 means
  // nothing to a drummer.
  expect(screen.getByText('50%')).toBeInTheDocument();
});

test('the transposition sliders are hidden until expanded', () => {
  render(<TrackRow {...baseProps} />);
  expect(screen.queryByRole('slider', { name: /transpose audio/i })).not.toBeInTheDocument();
});

test('expanding reveals both transposition sliders as SEPARATE controls', () => {
  render(<TrackRow {...baseProps} expanded />);
  expect(screen.getByRole('slider', { name: /transpose audio/i })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: /transpose full/i })).toBeInTheDocument();
});

// Semitones are exact targets people aim for — "up a whole step" is +2 — so the readout must
// never drop the sign: a bare "2" could mean up OR down. Zero has no direction to lose, so it
// reads bare.
test('the transposition readouts are signed, so the direction is never ambiguous', () => {
  const { rerender } = render(
    <TrackRow {...baseProps} expanded transposeAudio={2} transposeFull={-3} />,
  );
  expect(screen.getByText('+2')).toBeInTheDocument();
  expect(screen.getByText('-3')).toBeInTheDocument();

  rerender(<TrackRow {...baseProps} expanded transposeAudio={0} transposeFull={0} />);
  expect(screen.getAllByText('0')).toHaveLength(2);
});

test('a percussion staff shows tablature disabled, not hidden', () => {
  // 1.8.4 cannot render tablature on a percussion staff. The toggle stays in the row so the
  // four buttons still line up with a stringed staff; it just cannot be turned on.
  render(<TrackRow {...baseProps} />);
  expect(screen.getByRole('button', { name: /standard notation/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tablature/i })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

test('a stringed staff with a tuning does offer the tablature toggle', () => {
  render(
    <TrackRow
      {...baseProps}
      name="Distortion Guitar"
      staves={[{ ...drumStaff, id: 'staff-1', showTablature: true, tablatureAvailable: true }]}
    />,
  );
  expect(screen.getByRole('button', { name: /tablature/i })).toBeInTheDocument();
});

test('a multi-staff track gives each staff its own labelled toggle group', () => {
  render(
    <TrackRow
      {...baseProps}
      name="Piano"
      staves={[
        { ...drumStaff, id: 'treble', label: 'Treble', tablatureAvailable: false },
        { ...drumStaff, id: 'bass', label: 'Bass', tablatureAvailable: false },
      ]}
    />,
  );
  // One line per staff: two staves render two standard-notation toggles, each named for its
  // staff so a screen-reader user can tell them apart.
  const std = screen.getAllByRole('button', { name: /standard notation/i });
  expect(std).toHaveLength(2);
  expect(std[0]).toHaveAccessibleName(/treble/i);
  expect(std[1]).toHaveAccessibleName(/bass/i);
});

test('solo and mute report through their callbacks', async () => {
  const user = userEvent.setup();
  const onSoloChange = vi.fn();
  const onMuteChange = vi.fn();
  render(<TrackRow {...baseProps} onSoloChange={onSoloChange} onMuteChange={onMuteChange} />);

  await user.click(screen.getByRole('button', { name: /solo/i }));
  await user.click(screen.getByRole('button', { name: /mute/i }));
  expect(onSoloChange).toHaveBeenCalledWith(true);
  expect(onMuteChange).toHaveBeenCalledWith(true);
});

test('solo is not exclusive — an already-soloed row still reports a toggle OFF', async () => {
  const user = userEvent.setup();
  const onSoloChange = vi.fn();
  render(<TrackRow {...baseProps} solo onSoloChange={onSoloChange} />);

  await user.click(screen.getByRole('button', { name: /solo/i }));
  expect(onSoloChange).toHaveBeenCalledWith(false);
});

// Every control on the row that shows no words: the render-select toggle, Solo, Mute, each
// per-staff display toggle and "more controls". An icon alone says neither what it is nor what
// STATE it is in, and the pressed colour means nothing to someone meeting the control for the
// first time. Keyboard focus, the way the design system's own toggle test does it: jsdom has no
// pointer geometry. The display toggles sit on the PRIMARY row, so the walk tabs through them
// too, before reaching "more controls".
test('every control without visible text has a tooltip that tells its state', async () => {
  const user = userEvent.setup();
  render(<TrackRow {...baseProps} />);

  await user.tab();
  const renderToggle = screen.getByRole('button', { name: /render/i });
  expect(renderToggle).toHaveFocus();
  expect(renderToggle).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByText('Shown in the score')).toBeInTheDocument();

  await user.tab();
  const soloToggle = screen.getByRole('button', { name: /solo/i });
  expect(soloToggle).toHaveFocus();
  expect(soloToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText('Solo: off')).toBeInTheDocument();

  await user.tab();
  const muteToggle = screen.getByRole('button', { name: /mute/i });
  expect(muteToggle).toHaveFocus();
  expect(muteToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText('Mute: off')).toBeInTheDocument();

  await user.tab(); // the volume slider — it carries no tooltip

  await user.tab();
  const standardToggle = screen.getByRole('button', { name: /standard notation/i });
  expect(standardToggle).toHaveFocus();
  expect(standardToggle).toHaveAttribute('aria-pressed', 'true');
  // drumStaff carries only this ONE notation type, so it is locked on rather than plain "on" —
  // see NOTATION_LOCKED's own comment.
  expect(standardToggle).toHaveAttribute('aria-disabled', 'true');
  expect(await screen.findByText(new RegExp(NOTATION_LOCKED, 'i'))).toBeInTheDocument();

  await user.tab();
  const slashToggle = screen.getByRole('button', { name: /slash/i });
  expect(slashToggle).toHaveFocus();
  expect(slashToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText(/slash notation: off/i)).toBeInTheDocument();

  await user.tab();
  const numberedToggle = screen.getByRole('button', { name: /numbered/i });
  expect(numberedToggle).toHaveFocus();
  expect(numberedToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText(/numbered notation: off/i)).toBeInTheDocument();

  // Percussion keeps the tablature toggle so the row lines up; it is disabled, and still a stop.
  await user.tab();
  const tabToggle = screen.getByRole('button', { name: /tablature/i });
  expect(tabToggle).toHaveFocus();
  expect(tabToggle).toHaveAttribute('aria-disabled', 'true');
  expect(await screen.findByText(/tablature: unavailable/i)).toBeInTheDocument();

  await user.tab();
  const more = screen.getByRole('button', { name: /more controls/i });
  expect(more).toHaveFocus();
  expect(more).toHaveAttribute('aria-expanded', 'false');
  expect(await screen.findByText('Show more controls')).toBeInTheDocument();
});

test('each tooltip follows the state it describes', async () => {
  const user = userEvent.setup();
  render(<TrackRow {...baseProps} rendered={false} solo mute expanded />);

  await user.tab();
  const renderToggle = screen.getByRole('button', { name: /render/i });
  expect(renderToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText('Hidden from the score')).toBeInTheDocument();

  await user.tab();
  const soloToggle = screen.getByRole('button', { name: /solo/i });
  expect(soloToggle).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByText('Solo: on')).toBeInTheDocument();

  await user.tab();
  const muteToggle = screen.getByRole('button', { name: /mute/i });
  expect(muteToggle).toHaveAttribute('aria-pressed', 'true');
  expect(await screen.findByText('Mute: on')).toBeInTheDocument();

  await user.tab(); // the volume slider — it carries no tooltip

  await user.tab();
  const standardToggle = screen.getByRole('button', { name: /standard notation/i });
  expect(standardToggle).toHaveAttribute('aria-pressed', 'true');
  // drumStaff carries only this ONE notation type, so it is locked on rather than plain "on".
  expect(standardToggle).toHaveAttribute('aria-disabled', 'true');
  expect(await screen.findByText(new RegExp(NOTATION_LOCKED, 'i'))).toBeInTheDocument();

  await user.tab();
  const slashToggle = screen.getByRole('button', { name: /slash/i });
  expect(slashToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText(/slash notation: off/i)).toBeInTheDocument();

  await user.tab();
  const numberedToggle = screen.getByRole('button', { name: /numbered/i });
  expect(numberedToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText(/numbered notation: off/i)).toBeInTheDocument();

  await user.tab();
  expect(screen.getByRole('button', { name: /tablature/i })).toHaveAttribute(
    'aria-disabled',
    'true',
  );

  await user.tab();
  const more = screen.getByRole('button', { name: /more controls/i });
  expect(more).toHaveAttribute('aria-expanded', 'true');
  expect(await screen.findByText('Hide more controls')).toBeInTheDocument();
});

// A file that plays its own recording: the engine ignores solo, mute, volume and the audio
// transposition, so they must not look live. `aria-disabled`, never toBeDisabled() — the design
// system keeps a disabled button focusable so the tooltip saying WHY can still open.
test('while the file plays its own recording, the mix controls are disabled and say why', async () => {
  const user = userEvent.setup();
  const onSoloChange = vi.fn();
  render(
    <TrackRow {...baseProps} expanded mixUnavailable={RECORDING} onSoloChange={onSoloChange} />,
  );

  const solo = screen.getByRole('button', { name: /solo/i });
  expect(solo).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('button', { name: /mute/i })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('slider', { name: /volume/i })).toBeDisabled();
  expect(screen.getByRole('slider', { name: /transpose audio/i })).toBeDisabled();

  // Keyboard focus, not hover: jsdom has no pointer geometry, and the tooltip opens for a
  // keyboard focus, not a scripted one. Tab once to the render-select toggle, once more to Solo —
  // done FIRST, from body, so the click below cannot move focus past this assertion.
  await user.tab();
  await user.tab();
  expect(solo).toHaveFocus();
  expect(await screen.findByText(new RegExp(RECORDING, 'i'))).toBeInTheDocument();

  await user.click(solo);
  expect(onSoloChange).not.toHaveBeenCalled();
});

test('the controls that change the DRAWN score stay live while a recording plays', () => {
  // A second notation type on, so Defect 1's own "last one left on" lock (NH-291) does not mask
  // what THIS test checks — that recording-unavailability, a completely different lock, leaves
  // the display toggles alone.
  render(
    <TrackRow
      {...baseProps}
      staves={[{ ...drumStaff, showSlash: true }]}
      expanded
      mixUnavailable={RECORDING}
    />,
  );
  // `aria-disabled`, not toBeDisabled(): `TransportToggle` renders the ARIA attribute and never
  // the native one, so the button keeps its focus — and toBeDisabled() would pass whatever happens.
  expect(screen.getByRole('button', { name: /render/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('button', { name: /standard notation/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('slider', { name: /transpose full/i })).not.toBeDisabled();
});

// The LAST drawn track: AlphaTab cannot draw nothing, so the caller refuses to un-draw it. The
// row must say so instead of swallowing the click — the reason replaces the state text in the
// tooltip, because "Shown in the score" would be true and useless here.
const LOCKED = 'At least one track must stay shown';

test('the last drawn track cannot be hidden, and the row says why', async () => {
  const user = userEvent.setup();
  const onRenderedChange = vi.fn();
  render(<TrackRow {...baseProps} renderLockReason={LOCKED} onRenderedChange={onRenderedChange} />);

  const render_ = screen.getByRole('button', { name: /render/i });
  expect(render_).toHaveAttribute('aria-disabled', 'true');

  // Keyboard focus FIRST, from body — render-select is the first stop — so the click below
  // cannot move focus past this assertion.
  await user.tab();
  expect(render_).toHaveFocus();
  expect(await screen.findByText(LOCKED)).toBeInTheDocument();

  // Solo, mute and volume are untouched: this lock is about what is DRAWN, not about the mix.
  expect(screen.getByRole('button', { name: /solo/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('slider', { name: /volume/i })).not.toBeDisabled();

  await user.click(render_);
  expect(onRenderedChange).not.toHaveBeenCalled();
});

// A staff down to its LAST enabled notation type: 1.8.4 cannot lay out a staff with nothing to
// draw — a crash reached in one click (NH-291: "Cannot read properties of undefined (reading
// 'staves')" on a drum staff, "reading 'beat'" on a vocal one). The toggle locks on instead of
// letting the click reach the engine, the same shape renderLockReason already uses above.
test('the last enabled notation type cannot be turned off, and the row says why', async () => {
  const user = userEvent.setup();
  const onStaffChange = vi.fn();
  render(<TrackRow {...baseProps} onStaffChange={onStaffChange} />);

  // drumStaff carries only showStandardNotation — the exact shape that crashed.
  const standard = screen.getByRole('button', { name: /standard notation/i });
  expect(standard).toHaveAttribute('aria-pressed', 'true');
  expect(standard).toHaveAttribute('aria-disabled', 'true');

  // Keyboard focus, not hover: jsdom has no pointer geometry. render, solo, mute, volume, then
  // this row's single staff toggle — 5 stops from body.
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  expect(standard).toHaveFocus();
  expect(await screen.findByText(new RegExp(NOTATION_LOCKED, 'i'))).toBeInTheDocument();

  await user.click(standard);
  expect(onStaffChange).not.toHaveBeenCalled();
});

test('a staff with two notation types on locks neither', () => {
  render(<TrackRow {...baseProps} staves={[{ ...drumStaff, showSlash: true }]} />);
  expect(screen.getByRole('button', { name: /standard notation/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('button', { name: /slash notation/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

// The lock is a property of "only one left on", not a hardcoded standard-notation special case —
// on a stringed staff it can just as easily be tablature that is the last one shown.
test('the last enabled type locks even when it is tablature', () => {
  render(
    <TrackRow
      {...baseProps}
      name="Distortion Guitar"
      staves={[
        {
          ...drumStaff,
          id: 'staff-1',
          showStandardNotation: false,
          showTablature: true,
          tablatureAvailable: true,
        },
      ]}
    />,
  );
  expect(screen.getByRole('button', { name: /tablature/i })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('button', { name: /standard notation/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
});

// A drum "pitch" is an instrument identifier, not a note, so transposing one is meaningless — and
// it also broke playback (NH-291). The two sliders are the ONLY thing behind the expand
// disclosure, so the fix locks the disclosure control itself rather than the sliders inside it.
const EXPAND_LOCKED = 'Transposition is not available for percussion tracks';

test('a percussion track locks the expand control, and the row says why', async () => {
  const user = userEvent.setup();
  const onExpandedChange = vi.fn();
  render(
    <TrackRow
      {...baseProps}
      expandUnavailable={EXPAND_LOCKED}
      onExpandedChange={onExpandedChange}
    />,
  );

  const more = screen.getByRole('button', { name: /more controls/i });
  expect(more).toHaveAttribute('aria-disabled', 'true');

  // Keyboard focus, not hover: jsdom has no pointer geometry. drumStaff's single staff puts
  // "more controls" 9 stops from body — render, solo, mute, volume, then the four staff toggles
  // (standard notation locked by Defect 1's own rule, slash/numbered/tablature not).
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  await user.tab();
  expect(more).toHaveFocus();
  expect(await screen.findByText(EXPAND_LOCKED)).toBeInTheDocument();

  await user.click(more);
  expect(onExpandedChange).not.toHaveBeenCalled();
});

test('a non-percussion track leaves the expand control live', () => {
  render(<TrackRow {...baseProps} />);
  expect(screen.getByRole('button', { name: /more controls/i })).not.toHaveAttribute(
    'aria-disabled',
    'true',
  );
});
