import { render, screen } from '@testing-library/react';

import { getCareers } from '@/common/constant/careers';
import type { CareerProps } from '@/common/types/careers';
import CareerList from '@/modules/about/components/CareerList';

jest.mock('next/router', () => ({ useRouter: () => ({ locale: 'en' }) }));
jest.mock('@/common/constant/careers', () => ({ getCareers: jest.fn() }));

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
    const { container } = render(<CareerList />);
    expect(
      Array.from(container.querySelectorAll('h6'), (item) => item.textContent),
    ).toEqual(['Ongoing', 'Recent', 'Older']);
    expect(screen.getByText('6 yr 10 mo')).toBeInTheDocument();
    expect(screen.getByText('Jan 2020 - Present')).toBeInTheDocument();
  } finally {
    jest.useRealTimers();
  }
});
