import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './Command';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Command',
  component: Command,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

// A flat searchable menu — the accessible engine behind FacetFilter / TokenPicker. Type to filter;
// ArrowUp/Down to move the highlight; Enter to run the highlighted item.
export const Default: Story = {
  render: () => (
    <Command aria-label="Commands" className="rounded-md border border-border">
      <CommandInput aria-label="Search commands" placeholder="Type a command…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandItem onSelect={() => {}}>
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            search
          </span>
          Search the catalog
        </CommandItem>
        <CommandItem onSelect={() => {}}>
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            play_arrow
          </span>
          Play a random piece
        </CommandItem>
        <CommandItem onSelect={() => {}}>
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            school
          </span>
          Open lessons
        </CommandItem>
      </CommandList>
    </Command>
  ),
};

// Plain text items, no icons.
export const Plain: Story = {
  render: () => (
    <Command aria-label="Pieces" className="rounded-md border border-border">
      <CommandInput aria-label="Search pieces" placeholder="Search pieces…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandItem onSelect={() => {}}>Bohemian Rhapsody</CommandItem>
        <CommandItem onSelect={() => {}}>Yellow</CommandItem>
        <CommandItem onSelect={() => {}}>Single stroke roll</CommandItem>
        <CommandItem onSelect={() => {}}>Paradiddle</CommandItem>
      </CommandList>
    </Command>
  ),
};
