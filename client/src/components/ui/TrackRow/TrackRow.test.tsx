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

test('a percussion staff offers no tablature toggle', () => {
  // No `expanded`: the four display toggles are on the always-visible primary row, not behind
  // the disclosure.
  render(<TrackRow {...baseProps} />);
  expect(screen.getByRole('button', { name: /standard notation/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /tablature/i })).not.toBeInTheDocument();
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
  // Wrap layout: two staves render two standard-notation toggles, each named for its staff so a
  // screen-reader user can tell them apart with two rows' disclosures open.
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
  expect(await screen.findByText(/standard notation: on/i)).toBeInTheDocument();

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

  // No tablature toggle for a percussion staff — straight to more-controls.
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
  expect(await screen.findByText(/standard notation: on/i)).toBeInTheDocument();

  await user.tab();
  const slashToggle = screen.getByRole('button', { name: /slash/i });
  expect(slashToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText(/slash notation: off/i)).toBeInTheDocument();

  await user.tab();
  const numberedToggle = screen.getByRole('button', { name: /numbered/i });
  expect(numberedToggle).toHaveAttribute('aria-pressed', 'false');
  expect(await screen.findByText(/numbered notation: off/i)).toBeInTheDocument();

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
  render(<TrackRow {...baseProps} expanded mixUnavailable={RECORDING} />);
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
