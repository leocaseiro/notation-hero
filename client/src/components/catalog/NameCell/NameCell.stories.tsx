import { NameCell } from './NameCell';
import type { CatalogRow } from '@/components/catalog/CatalogRow';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const song: CatalogRow = {
  id: '1',
  title: 'Billie Jean',
  subtitle: 'Pop · 4/4 · drums·bass',
  kind: 'song',
  icon: 'music_note',
  level: 3,
  bpm: 117,
  best: 74,
  flags: { audio: true, video: true },
};

const meta = {
  title: 'Catalog/NameCell',
  component: NameCell,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof NameCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Song: Story = { args: { row: song } };
export const Lesson: Story = {
  args: {
    row: {
      ...song,
      title: 'Single-stroke timing',
      subtitle: '4 steps · timing',
      kind: 'rudiment',
      isLesson: true,
      icon: 'school',
      bpm: '60→120',
      flags: { parts: true },
    },
  },
};
export const Beat: Story = {
  args: {
    row: { ...song, title: 'Four-on-the-floor', subtitle: 'House · 4/4', kind: 'beat', best: null },
  },
};
export const New: Story = { args: { row: { ...song, isNew: true } } };
const narrowRow: CatalogRow = {
  ...song,
  title: 'A very long song title that should truncate',
  subtitle: 'And a long subtitle that also truncates to one line',
};
export const Narrow: Story = {
  // `args` satisfies the required-`row` Meta constraint; `render` supplies the same row
  // inside a fixed-width frame so both lines truncate to a single ellipsised line.
  args: { row: narrowRow },
  render: () => (
    <div style={{ width: 240 }}>
      <NameCell row={narrowRow} />
    </div>
  ),
};
