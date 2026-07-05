import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

// The lesson-type segment control that sits above the catalog: Song vs Lessons, Song active.
// Each trigger carries a Material Symbols glyph and owns a small content panel.
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="song">
      <TabsList>
        <TabsTrigger value="song">
          <span className="material-symbols-outlined" aria-hidden="true">
            music_note
          </span>
          Song
        </TabsTrigger>
        <TabsTrigger value="lessons">
          <span className="material-symbols-outlined" aria-hidden="true">
            school
          </span>
          Lessons
        </TabsTrigger>
      </TabsList>
      <TabsContent value="song" className="pt-2 text-sm text-muted-foreground">
        Songs to play end to end.
      </TabsContent>
      <TabsContent value="lessons" className="pt-2 text-sm text-muted-foreground">
        Guided lessons and exercises.
      </TabsContent>
    </Tabs>
  ),
};

// Same control, but Lessons is the active tab from the start (defaultValue).
export const LessonsActive: Story = {
  render: () => (
    <Tabs defaultValue="lessons">
      <TabsList>
        <TabsTrigger value="song">
          <span className="material-symbols-outlined" aria-hidden="true">
            music_note
          </span>
          Song
        </TabsTrigger>
        <TabsTrigger value="lessons">
          <span className="material-symbols-outlined" aria-hidden="true">
            school
          </span>
          Lessons
        </TabsTrigger>
      </TabsList>
      <TabsContent value="song" className="pt-2 text-sm text-muted-foreground">
        Songs to play end to end.
      </TabsContent>
      <TabsContent value="lessons" className="pt-2 text-sm text-muted-foreground">
        Guided lessons and exercises.
      </TabsContent>
    </Tabs>
  ),
};

// Plain text tabs, no icons — shows the component reused as a generic three-way switch.
export const Plain: Story = {
  render: () => (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="beats">Beats</TabsTrigger>
        <TabsTrigger value="fills">Fills</TabsTrigger>
      </TabsList>
      <TabsContent value="all" className="pt-2 text-sm text-muted-foreground">
        Everything in the catalog.
      </TabsContent>
      <TabsContent value="beats" className="pt-2 text-sm text-muted-foreground">
        Beats only.
      </TabsContent>
      <TabsContent value="fills" className="pt-2 text-sm text-muted-foreground">
        Fills only.
      </TabsContent>
    </Tabs>
  ),
};

// One trigger disabled: it is skipped by keyboard navigation and cannot be selected.
export const Disabled: Story = {
  render: () => (
    <Tabs defaultValue="song">
      <TabsList>
        <TabsTrigger value="song">Song</TabsTrigger>
        <TabsTrigger value="lessons" disabled>
          Lessons
        </TabsTrigger>
      </TabsList>
      <TabsContent value="song" className="pt-2 text-sm text-muted-foreground">
        Songs to play end to end.
      </TabsContent>
      <TabsContent value="lessons" className="pt-2 text-sm text-muted-foreground">
        Guided lessons and exercises.
      </TabsContent>
    </Tabs>
  ),
};
