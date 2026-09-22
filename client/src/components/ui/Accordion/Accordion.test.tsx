import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './Accordion';

// No `multiple` here: the fourth test below exists to prove multi-open is the wrapper's DEFAULT,
// so passing the prop on the fixture would make that test pass either way.
const Sample = () => (
  <Accordion defaultValue={['notation']}>
    <AccordionItem value="notation">
      <AccordionTrigger>Notation</AccordionTrigger>
      <AccordionContent>notation rows</AccordionContent>
    </AccordionItem>
    <AccordionItem value="player">
      <AccordionTrigger>Player</AccordionTrigger>
      <AccordionContent>player rows</AccordionContent>
    </AccordionItem>
  </Accordion>
);

test('each section header is a button that reports its expanded state', () => {
  render(<Sample />);
  expect(screen.getByRole('button', { name: 'Notation' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-expanded', 'false');
});

test('an open section shows its content', () => {
  render(<Sample />);
  expect(screen.getByText('notation rows')).toBeVisible();
});

test('clicking a closed header opens it', async () => {
  const user = userEvent.setup();
  render(<Sample />);

  await user.click(screen.getByRole('button', { name: 'Player' }));
  expect(screen.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('player rows')).toBeVisible();
});

// The settings popover opens several groups at once, so multiple-open is the required default —
// not an option a caller has to remember.
test('opening a second section leaves the first open', async () => {
  const user = userEvent.setup();
  render(<Sample />);

  await user.click(screen.getByRole('button', { name: 'Player' }));
  expect(screen.getByRole('button', { name: 'Notation' })).toHaveAttribute('aria-expanded', 'true');
});

// `multiple={false}` is the override: a caller who needs single-open (unlike this repo's two
// popovers) still has that shape available.
test('multiple={false} closes the first section when a second one opens', async () => {
  const user = userEvent.setup();
  render(
    <Accordion multiple={false} defaultValue={['notation']}>
      <AccordionItem value="notation">
        <AccordionTrigger>Notation</AccordionTrigger>
        <AccordionContent>notation rows</AccordionContent>
      </AccordionItem>
      <AccordionItem value="player">
        <AccordionTrigger>Player</AccordionTrigger>
        <AccordionContent>player rows</AccordionContent>
      </AccordionItem>
    </Accordion>,
  );

  await user.click(screen.getByRole('button', { name: 'Player' }));
  expect(screen.getByRole('button', { name: 'Player' })).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: 'Notation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});
