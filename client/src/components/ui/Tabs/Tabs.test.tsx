import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

// A small two-tab control mirroring the lesson-type segment: Song active, Lessons second.
const Basic = () => (
  <Tabs defaultValue="song">
    <TabsList>
      <TabsTrigger value="song">Song</TabsTrigger>
      <TabsTrigger value="lessons">Lessons</TabsTrigger>
    </TabsList>
    <TabsContent value="song">Songs panel</TabsContent>
    <TabsContent value="lessons">Lessons panel</TabsContent>
  </Tabs>
);

test('renders a tablist with tab roles', () => {
  render(<Basic />);
  expect(screen.getByRole('tablist')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Song' })).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Lessons' })).toBeInTheDocument();
});

test('marks the active tab as selected and shows its panel', () => {
  render(<Basic />);
  expect(screen.getByRole('tab', { name: 'Song' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Lessons' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByText('Songs panel')).toBeInTheDocument();
  expect(screen.queryByText('Lessons panel')).not.toBeInTheDocument();
});

test('clicking a tab switches the selected tab and shown panel', async () => {
  const user = userEvent.setup();
  render(<Basic />);
  await user.click(screen.getByRole('tab', { name: 'Lessons' }));
  expect(screen.getByRole('tab', { name: 'Lessons' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tab', { name: 'Song' })).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByText('Lessons panel')).toBeInTheDocument();
  expect(screen.queryByText('Songs panel')).not.toBeInTheDocument();
});

test('ArrowRight moves focus and selection to the next tab (Radix roving)', async () => {
  const user = userEvent.setup();
  render(<Basic />);
  await user.click(screen.getByRole('tab', { name: 'Song' }));
  await user.keyboard('{ArrowRight}');
  const lessons = screen.getByRole('tab', { name: 'Lessons' });
  expect(lessons).toHaveFocus();
  expect(lessons).toHaveAttribute('aria-selected', 'true');
});

test('a disabled tab cannot be selected', async () => {
  const user = userEvent.setup();
  render(
    <Tabs defaultValue="song">
      <TabsList>
        <TabsTrigger value="song">Song</TabsTrigger>
        <TabsTrigger value="lessons" disabled>
          Lessons
        </TabsTrigger>
      </TabsList>
      <TabsContent value="song">Songs panel</TabsContent>
      <TabsContent value="lessons">Lessons panel</TabsContent>
    </Tabs>,
  );
  const lessons = screen.getByRole('tab', { name: 'Lessons' });
  // Base UI marks a disabled tab with `aria-disabled` (accessible-disabled pattern), not the native
  // `disabled` attribute — `toBeDisabled()` checks the latter, so assert the former instead.
  expect(lessons).toHaveAttribute('aria-disabled', 'true');
  await user.click(lessons);
  expect(screen.getByRole('tab', { name: 'Song' })).toHaveAttribute('aria-selected', 'true');
  expect(lessons).toHaveAttribute('aria-selected', 'false');
  expect(screen.getByText('Songs panel')).toBeInTheDocument();
});
