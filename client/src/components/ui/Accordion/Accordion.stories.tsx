import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Accordion',
  component: Accordion,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

// Three settings-popover-shaped sections, Notation open — the shape Task 5's Settings popover
// composes this into.
export const Default: Story = {
  render: () => (
    <Accordion defaultValue={['notation']}>
      <AccordionItem value="notation">
        <AccordionTrigger>Notation</AccordionTrigger>
        <AccordionContent>Standard notation, tablature and slash rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="player">
        <AccordionTrigger>Player</AccordionTrigger>
        <AccordionContent>Speed, cursor and scroll-mode rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="stylesheet">
        <AccordionTrigger>Stylesheet</AccordionTrigger>
        <AccordionContent>Track name, tempo and chord-diagram rows.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

// Same three sections, none open — every chevron rests unrotated.
export const AllClosed: Story = {
  render: () => (
    <Accordion defaultValue={[]}>
      <AccordionItem value="notation">
        <AccordionTrigger>Notation</AccordionTrigger>
        <AccordionContent>Standard notation, tablature and slash rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="player">
        <AccordionTrigger>Player</AccordionTrigger>
        <AccordionContent>Speed, cursor and scroll-mode rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="stylesheet">
        <AccordionTrigger>Stylesheet</AccordionTrigger>
        <AccordionContent>Track name, tempo and chord-diagram rows.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

// The Settings popover's real group set — all eight, two open — short enough to stay well under
// the VR viewport guard.
export const ManySections: Story = {
  render: () => (
    <Accordion defaultValue={['player', 'colors']}>
      <AccordionItem value="player">
        <AccordionTrigger>Player</AccordionTrigger>
        <AccordionContent>Speed and scroll rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="display-general">
        <AccordionTrigger>Display ▸ General</AccordionTrigger>
        <AccordionContent>Layout and zoom rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="colors">
        <AccordionTrigger>Colors</AccordionTrigger>
        <AccordionContent>Staff line and note colour rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="fonts">
        <AccordionTrigger>Fonts</AccordionTrigger>
        <AccordionContent>Notation and tab font rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="paddings">
        <AccordionTrigger>Paddings</AccordionTrigger>
        <AccordionContent>Horizontal and vertical padding rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="notation">
        <AccordionTrigger>Notation</AccordionTrigger>
        <AccordionContent>Standard notation and tablature rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="stylesheet">
        <AccordionTrigger>Stylesheet</AccordionTrigger>
        <AccordionContent>Track name and tempo rows.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="export">
        <AccordionTrigger>Export</AccordionTrigger>
        <AccordionContent>The two export action rows.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
