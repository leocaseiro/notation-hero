import { CatalogTable } from './CatalogTable';
import type { CatalogRow } from '@/components/catalog/CatalogRow';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const billieJean: CatalogRow = {
  id: '1',
  title: 'Billie Jean',
  subtitle: 'Pop · 4/4',
  kind: 'song',
  icon: 'music_note',
  level: 3,
  bpm: 117,
  best: 74,
  flags: { audio: true, video: true },
};

const sevenNationArmy: CatalogRow = {
  id: '2',
  title: 'Seven Nation Army',
  subtitle: 'Rock · 4/4',
  kind: 'song',
  icon: 'music_note',
  level: 1,
  bpm: 124,
  best: 96,
  isNew: true,
};

const takeFive: CatalogRow = {
  id: '3',
  title: 'Take Five',
  subtitle: 'Jazz · 5/4',
  kind: 'song',
  icon: 'music_note',
  level: 8,
  bpm: 174,
  best: null,
  flags: { audio: true },
};

const songs: CatalogRow[] = [billieJean, sevenNationArmy, takeFive];

const lessons: CatalogRow[] = [
  {
    id: 'l1',
    title: 'Single-stroke timing',
    subtitle: '4 steps · timing',
    kind: 'rudiment',
    isLesson: true,
    icon: 'school',
    level: 0,
    bpm: '60→120',
    best: 40,
    flags: { parts: true },
  },
  {
    id: 'l2',
    title: 'Four-on-the-floor',
    subtitle: 'House groove',
    kind: 'beat',
    isLesson: true,
    icon: 'school',
    level: 2,
    bpm: 120,
    best: 100,
  },
];

const meta: Meta<typeof CatalogTable> = {
  title: 'Catalog/CatalogTable',
  component: CatalogTable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CatalogTable>;

export const Songs: Story = { args: { data: songs, onOpen: () => {}, onPlay: () => {} } };
export const Lessons: Story = { args: { data: lessons, onOpen: () => {}, onPlay: () => {} } };
export const Empty: Story = { args: { data: [] } };
export const Mastered: Story = {
  args: { data: [{ ...sevenNationArmy, best: 100 }], onOpen: () => {}, onPlay: () => {} },
};
export const Mixed: Story = {
  args: { data: [...songs, ...lessons], onOpen: () => {}, onPlay: () => {} },
};
export const Narrow: Story = {
  render: () => (
    <div style={{ width: 480 }}>
      <CatalogTable
        data={[...songs, ...lessons]}
        columnVisibility={{ bpm: false }}
        onOpen={() => {}}
        onPlay={() => {}}
      />
    </div>
  ),
};
