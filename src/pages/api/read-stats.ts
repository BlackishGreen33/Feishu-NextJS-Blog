import { NextApiRequest, NextApiResponse } from 'next';

import { getAllTimeSinceToday, getReadStats } from '@/services/wakatime';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    const readStatsResponse = await getReadStats();
    const allTimeSinceTodayResponse = await getAllTimeSinceToday();

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=30',
    );

    const data = {
      ...readStatsResponse.data,
      all_time_since_today: allTimeSinceTodayResponse.data,
    };

    res.status(200).json(data);
  } catch (_error) {
    res.status(200).json({
      configured: false,
      last_update: null,
      start_date: null,
      end_date: null,
      categories: [],
      best_day: { date: null, text: null },
      human_readable_daily_average: null,
      human_readable_total: null,
      languages: [],
      editors: [],
      all_time_since_today: { configured: false, text: null, total_seconds: 0 },
    });
  }
}
