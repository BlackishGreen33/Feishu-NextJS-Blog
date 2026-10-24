import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getCareers } from '@/common/constant/careers';
import { getEducation } from '@/common/constant/education';
import type { CareerProps } from '@/common/types/careers';
import type { EducationProps } from '@/common/types/education';
import CareerList from '@/modules/about/components/CareerList';
import EducationList from '@/modules/about/components/EducationList';

jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));
jest.mock('@/common/constant/careers', () => ({ getCareers: jest.fn() }));
jest.mock('@/common/constant/education', () => ({ getEducation: jest.fn() }));

it('keeps ongoing careers first and computes current durations after mount', () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-10-22T00:00:00Z'));
  const career = (position: string, end_date: string | null): CareerProps => ({
    position,
    company: position,
    logo: null,
    location: '',
    location_type: '',
    type: '',
    start_date: '2020-01-01',
    end_date,
    industry: '',
    link: null,
  });
  jest
    .mocked(getCareers)
    .mockReturnValue([
      career('Older', '2021-01-01'),
      career('Ongoing', null),
      career('Recent', '2024-01-01'),
    ]);
  try {
    render(<CareerList />);
    expect(
      screen
        .getAllByRole('heading', { level: 4 })
        .map((item) => item.textContent),
    ).toEqual(['Ongoing', 'Recent', 'Older']);
    expect(screen.getByText('6 yr 10 mo')).toBeInTheDocument();
    expect(screen.getByText('Jan 2020 - Present')).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});

it('keeps education order, dates, links and collapsible highlights in the timeline', async () => {
  const user = userEvent.setup();
  const education = (
    school: string,
    end_year: number | null,
  ): EducationProps => ({
    school,
    end_year,
    start_year: 2020,
    logo: '',
    major: 'Software Engineering',
    location: 'Wuhan',
    degree: 'BSc',
    link: 'https://www.ccnu.edu.cn/',
    highlights: school === 'Current' ? ['Scholarship'] : [],
  });
  const entries = [
    education('Older', 2021),
    education('Current', null),
    education('Recent', 2024),
  ];
  jest.mocked(getEducation).mockReturnValue(entries);
  const { container } = render(<EducationList />);
  expect(
    screen
      .getAllByRole('heading', { level: 4 })
      .map((item) => item.textContent),
  ).toEqual(['Current', 'Recent', 'Older']);
  expect(entries.map((item) => item.school)).toEqual([
    'Older',
    'Current',
    'Recent',
  ]);
  expect(screen.getByText('2020 - Present')).toBeVisible();
  expect(screen.getByRole('link', { name: 'Current' })).toHaveAttribute(
    'href',
    'https://www.ccnu.edu.cn/',
  );
  expect(screen.getByText('Scholarship')).not.toBeVisible();
  await user.click(container.querySelector('summary')!);
  expect(screen.getByText('Scholarship')).toBeVisible();
  await user.click(container.querySelector('summary')!);
  expect(screen.getByText('Scholarship')).not.toBeVisible();
  expect(container.querySelectorAll('summary')).toHaveLength(1);
});

it('preserves empty states for both timelines', () => {
  jest.mocked(getCareers).mockReturnValue([]);
  jest.mocked(getEducation).mockReturnValue([]);
  render(
    <>
      <CareerList />
      <EducationList />
    </>,
  );
  expect(screen.getByText('No experience entries yet.')).toBeVisible();
  expect(screen.getByText('No education entries yet.')).toBeVisible();
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});
