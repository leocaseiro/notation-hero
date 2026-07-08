import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './Breadcrumb';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Breadcrumb',
  component: Breadcrumb,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Breadcrumb trail — a faithful shadcn/ui port. Compose it from the parts:',
          '`Breadcrumb > BreadcrumbList > BreadcrumbItem`, with `BreadcrumbLink` for',
          'navigable ancestors, `BreadcrumbPage` for the current (non-link) leaf, and',
          '`BreadcrumbSeparator` between items.',
          '',
          'It is dumb/presentational — it renders whatever items you give it and holds no state.',
          'Pass `render` to `BreadcrumbLink` to render a router `<Link>` instead of a bare `<a>`.',
          'The separator defaults to a Material Symbols `chevron_right`; pass children to override',
          '(e.g. a `/`). Use `BreadcrumbEllipsis` to collapse a long trail.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Breadcrumb>;

export default meta;

type Story = StoryObj<typeof meta>;

// Catalog -> Song -> Section, mirroring the wireframe route #/song/:slug/section/:n.
export const Default: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Catalog</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Yellow</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Section 2</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

// A long trail collapsed with an ellipsis between the root and the tail.
export const Collapsed: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Catalog</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Yellow</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Section 2</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

// A text separator ("/") passed as children instead of the default chevron glyph.
export const CustomSeparator: Story = {
  render: () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Catalog</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Lessons</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>Learn Yellow</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
};

// Painted on a `bg-muted` bar (e.g. a page header) instead of the default `bg-background` — the
// link variant's dark-mode text/hover colors are only guarded on this surface by rendering it
// here; a story on `bg-background` alone wouldn't catch a regression specific to `--muted`.
export const OnMutedBar: Story = {
  render: () => (
    <div className="bg-muted rounded-md p-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="#">Catalog</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Section 2</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  ),
};
