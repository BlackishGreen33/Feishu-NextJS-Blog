import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Tabs } from '@/common/components/elements/Tabs';

it('connects Fluid Tabs to panels and supports manual keyboard selection', async () => {
  const user = userEvent.setup();
  render(
    <Tabs
      label='About'
      tabs={['Story', 'Resume', 'Experience', 'Education'].map((label) => ({
        label,
        children: <p>{label} content</p>,
      }))}
    />,
  );
  const [story, resume, experience, education] = screen.getAllByRole('tab');
  expect(screen.getByRole('tablist', { name: 'About' })).toBeVisible();
  expect(screen.getByRole('tabpanel', { name: 'Story' })).toHaveTextContent(
    'Story content',
  );
  expect(screen.queryByText('Resume content')).not.toBeInTheDocument();

  await user.tab();
  expect(story).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(resume).toHaveFocus();
  expect(story).toHaveAttribute('aria-selected', 'true');
  await user.keyboard('{Enter}');
  expect(resume).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'Resume' })).toHaveTextContent(
    'Resume content',
  );
  expect(document.getElementById(resume!.getAttribute('aria-controls')!)).toBe(
    screen.getByRole('tabpanel'),
  );

  await user.keyboard('{End}');
  expect(education).toHaveFocus();
  await user.keyboard(' ');
  expect(education).toHaveAttribute('aria-selected', 'true');
  await user.keyboard('{ArrowRight}');
  expect(story).toHaveFocus();
  await user.keyboard('{ArrowLeft}');
  expect(education).toHaveFocus();
  await user.keyboard('{Home}');
  expect(story).toHaveFocus();
  await user.click(experience!);
  expect(
    screen.getByRole('tabpanel', { name: 'Experience' }),
  ).toHaveTextContent('Experience content');
  await user.tab();
  expect(screen.getByRole('tabpanel')).toHaveFocus();
});
