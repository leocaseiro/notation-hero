import { useArgs } from 'storybook/preview-api';

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './Sheet';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { Button } from '@/components/ui/Button/Button';

const meta = {
  title: 'UI/Sheet',
  component: Sheet,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Sheet — a shadcn/ui port over Base UI Dialog (migrated from Radix). An off-canvas panel',
          'that slides in from an edge (`side="right"` by default). Compose it from the parts:',
          '`Sheet > SheetTrigger + SheetContent`, with `SheetHeader`/`SheetFooter`, `SheetTitle`,',
          '`SheetDescription`, and `SheetClose`.',
          '',
          'It is dumb/presentational — a container owns the open state. This story is interactive:',
          'click **Open sections** to slide the panel in, and the X or **Close** to dismiss it — or',
          'flip the **`open`** control (that same control is what the visual-regression suite drives).',
          "Base UI's `modal` is tri-state (`true` | `false` | `'trap-focus'`) and defaults to `true`;",
          'this story defaults it to `false` so the isolated Storybook page is not locked around the',
          'portalled panel. The X close uses a Material Symbols `close` glyph, and a dialog needs a',
          "title for a11y, so `SheetTitle` is always present. shadcn's enter/exit animations are",
          'omitted (the repo has no animation plugin).',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  args: { open: false, modal: false },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controlled open state. Flip it here, or use the trigger / close button.',
    },
    modal: {
      control: 'radio',
      options: [true, false, 'trap-focus'],
      description:
        'Base UI tri-state. `true`: focus trap + scroll lock + outside pointer events disabled. ' +
        "`'trap-focus'`: focus trap only. `false`: page stays fully interactive. Defaults to " +
        '`true` in the component; `false` here so the story page is not locked around the panel.',
    },
  },
} satisfies Meta<typeof Sheet>;

export default meta;

type Story = StoryObj<typeof meta>;

// Player-side nav vocabulary with a Title/Description, a couple of items, and a footer. Bound to the
// `open` control (synced back on trigger/close) so the trigger works and VR can force it open.
// `modal` passes straight through to the root so the control exercises the real tri-state prop.
const OpenSheet = () => {
  const [{ open, modal }, updateArgs] = useArgs<{
    open: boolean;
    modal: boolean | 'trap-focus';
  }>();
  return (
    <Sheet open={open} onOpenChange={(next) => updateArgs({ open: next })} modal={modal}>
      <SheetTrigger
        render={
          <Button variant="secondary" className="m-4">
            Open sections
          </Button>
        }
      />
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Sections</SheetTitle>
          <SheetDescription>Jump to a section of this song.</SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4 text-sm">
          <a
            href="#intro"
            className="hover:text-primary focus-visible:ring-ring/50 rounded-md py-1.5 transition-colors outline-none focus-visible:ring-3"
          >
            Intro
          </a>
          <a
            href="#verse-1"
            className="hover:text-primary focus-visible:ring-ring/50 rounded-md py-1.5 transition-colors outline-none focus-visible:ring-3"
          >
            Verse 1
          </a>
          <a
            href="#chorus"
            className="hover:text-primary focus-visible:ring-ring/50 rounded-md py-1.5 transition-colors outline-none focus-visible:ring-3"
          >
            Chorus
          </a>
        </nav>
        <SheetFooter>
          <SheetClose render={<Button variant="outline">Close</Button>} />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export const Open: Story = { render: OpenSheet };
