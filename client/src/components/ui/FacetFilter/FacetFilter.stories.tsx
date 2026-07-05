import { useState } from 'react';
import { FacetFilter } from './FacetFilter';
import type { FilterOption } from './FacetFilter';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const GENRES: FilterOption[] = [
  { value: 'rock', label: 'Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'pop', label: 'Pop' },
  { value: 'alternative', label: 'Alternative' },
  { value: 'brazilian', label: 'Brazilian' },
  { value: 'metal', label: 'Metal' },
  { value: 'power-metal', label: 'Power metal' },
  { value: 'progressive', label: 'Progressive' },
];

const INSTRUMENTS: FilterOption[] = [
  { value: 'drums', label: 'Drums', icon: 'graphic_eq' },
  { value: 'guitar', label: 'Guitar', icon: 'music_note' },
  { value: 'bass', label: 'Bass' },
  { value: 'keys', label: 'Keys', icon: 'piano' },
  { value: 'vocals', label: 'Vocals', icon: 'mic' },
  { value: 'other', label: 'Other' },
];

const meta = {
  title: 'UI/FacetFilter',
  component: FacetFilter,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Roomy positioned wrapper so the open popover is captured inside #storybook-root for VR.
  decorators: [
    (Story) => (
      <div className="relative min-h-96 w-72">
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Genre',
    options: GENRES,
    value: [],
    onChange: () => {},
  },
} satisfies Meta<typeof FacetFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// Closed trigger with a multi-select count badge.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['rock', 'pop']);
    return <FacetFilter {...args} value={value} onChange={setValue} />;
  },
};

// Open multi-select genre list (in-memory filtering — the frontend-only mode).
export const Open: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['rock']);
    return <FacetFilter {...args} value={value} onChange={setValue} defaultOpen />;
  },
};

// Single-select instrument (radio list); the trigger reads "Instrument: Drums".
export const Single: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['drums']);
    return (
      <FacetFilter
        {...args}
        label="Instrument"
        options={INSTRUMENTS}
        mode="single"
        value={value}
        onChange={setValue}
        defaultOpen
      />
    );
  },
};

// Fetch mode: in-memory filtering off + a loading row (options would arrive from a request).
export const Loading: Story = {
  args: { value: [], shouldFilter: false, loading: true, defaultOpen: true },
};

// No options match — the empty message.
export const Empty: Story = {
  args: { value: [], options: [], defaultOpen: true, emptyMessage: 'No genres found' },
};
