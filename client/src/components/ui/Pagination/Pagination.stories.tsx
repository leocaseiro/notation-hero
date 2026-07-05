import { useState } from 'react';
import { fn } from 'storybook/test';
import { Pagination } from './Pagination';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Pagination',
  component: Pagination,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-fit">
        <Story />
      </div>
    ),
  ],
  // Baseline args satisfy the required controlled props; individual stories override the position.
  // `fn()` spies log to the Actions panel — interactive stories call them alongside their setter.
  args: {
    pageIndex: 0,
    pageCount: 10,
    onPageChange: fn(),
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// First page (0 of 10): Previous is disabled, the leading page is the active teal chip. Interactive
// so paging updates the canvas — the dumb component is controlled, so the story owns the index (as a
// container would); the spy fires alongside the setter to log every change.
export const FirstPage: Story = {
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(0);
    return (
      <Pagination
        {...args}
        pageIndex={pageIndex}
        onPageChange={(page) => {
          setPageIndex(page);
          args.onPageChange(page);
        }}
      />
    );
  },
};

// A middle page (5 of 20): ellipsis gaps appear on BOTH sides of the current-page window.
export const Middle: Story = {
  args: { pageCount: 20 },
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(5);
    return (
      <Pagination
        {...args}
        pageIndex={pageIndex}
        onPageChange={(page) => {
          setPageIndex(page);
          args.onPageChange(page);
        }}
      />
    );
  },
};

// Last page: Next is disabled and the trailing page is the active chip.
export const LastPage: Story = {
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(9);
    return (
      <Pagination
        {...args}
        pageIndex={pageIndex}
        onPageChange={(page) => {
          setPageIndex(page);
          args.onPageChange(page);
        }}
      />
    );
  },
};

// Few pages (1..3): the whole range fits, so there is no ellipsis at all.
export const FewPages: Story = {
  args: { pageCount: 3 },
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(0);
    return (
      <Pagination
        {...args}
        pageIndex={pageIndex}
        onPageChange={(page) => {
          setPageIndex(page);
          args.onPageChange(page);
        }}
      />
    );
  },
};

// Many pages (12 of 40): a long range with the current window mid-list and ellipsis on both sides.
export const ManyPages: Story = {
  args: { pageCount: 40 },
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(11);
    return (
      <Pagination
        {...args}
        pageIndex={pageIndex}
        onPageChange={(page) => {
          setPageIndex(page);
          args.onPageChange(page);
        }}
      />
    );
  },
};

// With the page-size selector (onPageSizeChange provided); both spies log to the Actions panel.
export const WithPageSize: Story = {
  args: { pageCount: 20, onPageSizeChange: fn() },
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(5);
    const [pageSize, setPageSize] = useState(25);
    return (
      <Pagination
        {...args}
        pageIndex={pageIndex}
        onPageChange={(page) => {
          setPageIndex(page);
          args.onPageChange(page);
        }}
        pageSize={pageSize}
        onPageSizeChange={(size) => {
          setPageSize(size);
          args.onPageSizeChange?.(size);
        }}
      />
    );
  },
};
