import { useState } from 'react';
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
  args: {
    pageIndex: 0,
    pageCount: 10,
    onPageChange: () => {},
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

// First page: First + Previous are disabled. Interactive so paging updates the canvas — the dumb
// component is fully controlled, so the story owns the page index (as a container would).
export const Default: Story = {
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(0);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={setPageIndex} />;
  },
};

// A middle page: every button is enabled.
export const Middle: Story = {
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(4);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={setPageIndex} />;
  },
};

// Last page: Next + Last are disabled.
export const LastPage: Story = {
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(9);
    return <Pagination {...args} pageIndex={pageIndex} onPageChange={setPageIndex} />;
  },
};

// A single page: nothing to page through, so all navigation is disabled.
export const SinglePage: Story = {
  args: { pageIndex: 0, pageCount: 1 },
};

// With the page-size selector (onPageSizeChange provided).
export const WithPageSize: Story = {
  render: (args) => {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    return (
      <Pagination
        {...args}
        pageIndex={pageIndex}
        onPageChange={setPageIndex}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    );
  },
};
