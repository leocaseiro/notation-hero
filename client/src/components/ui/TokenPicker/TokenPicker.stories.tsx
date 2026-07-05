import { useState } from 'react';
import { TokenPicker } from './TokenPicker';
import type { FilterOption } from '@/components/ui/FacetFilter/FacetFilter';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const TAGS: FilterOption[] = [
  { value: 'ghost-notes', label: 'Ghost notes' },
  { value: 'syncopation', label: 'Syncopation' },
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'flam', label: 'Flam' },
  { value: 'blast-beat', label: 'Blast beat' },
  { value: 'linear', label: 'Linear' },
];

const PATTERNS: FilterOption[] = [
  { value: 'rock-8th', label: 'Rock 8th' },
  { value: 'single-paradiddle', label: 'Single paradiddle' },
  { value: 'double-stroke', label: 'Double stroke roll' },
  { value: 'sixteenth', label: '16th note' },
];

const meta = {
  title: 'UI/TokenPicker',
  component: TokenPicker,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Roomy positioned wrapper so the open suggestion popover is captured inside #storybook-root.
  decorators: [
    (Story) => (
      <div className="relative min-h-80 w-72">
        <Story />
      </div>
    ),
  ],
  args: {
    label: 'Tags',
    options: TAGS,
    value: [],
    onChange: () => {},
    placeholder: 'Add tag…',
  },
} satisfies Meta<typeof TokenPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// Closed picker with two chips.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['ghost-notes', 'syncopation']);
    return <TokenPicker {...args} value={value} onChange={setValue} />;
  },
};

// Open suggestion list (in-memory filtering — the frontend-only mode).
export const Open: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['ghost-notes']);
    return <TokenPicker {...args} value={value} onChange={setValue} defaultOpen />;
  },
};

// Single-select (pattern): selecting replaces the one chip.
export const Single: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['rock-8th']);
    return (
      <TokenPicker
        {...args}
        label="Pattern"
        options={PATTERNS}
        placeholder="Add pattern…"
        mode="single"
        value={value}
        onChange={setValue}
        defaultOpen
      />
    );
  },
};

// Free-text tokens: type a value not in the list and add it (user tags).
export const Create: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    const [query, setQuery] = useState('half-time');
    return (
      <TokenPicker
        {...args}
        allowCreate
        value={value}
        onChange={setValue}
        query={query}
        onQueryChange={setQuery}
        defaultOpen
      />
    );
  },
};

// Fetch mode: in-memory filtering off + a loading row.
export const Loading: Story = {
  args: { value: ['ghost-notes'], shouldFilter: false, loading: true, defaultOpen: true },
};

// No suggestions match — the empty message.
export const Empty: Story = {
  args: { value: [], options: [], defaultOpen: true, emptyMessage: 'No tags found' },
};
