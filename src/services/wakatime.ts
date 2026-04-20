import axios from 'axios';

const API_KEY = process.env.WAKATIME_API_KEY;
const AUTHORIZATION_HEADER = API_KEY
  ? `Basic ${Buffer.from(API_KEY).toString('base64')}`
  : '';

const STATS_ENDPOINT = 'https://wakatime.com/api/v1/users/current/stats';
const ALL_TIME_SINCE_TODAY =
  'https://wakatime.com/api/v1/users/current/all_time_since_today';

const createEmptyStats = (configured: boolean) => ({
  configured,
  last_update: null,
  start_date: null,
  end_date: null,
  categories: [],
  best_day: {
    date: null,
    text: null,
  },
  human_readable_daily_average: null,
  human_readable_total: null,
  languages: [],
  editors: [],
});

const createEmptyAllTime = (configured: boolean) => ({
  configured,
  text: null,
  total_seconds: 0,
});

export const getReadStats = async (): Promise<{
  status: number;
  data: any;
}> => {
  if (!API_KEY) {
    return { status: 200, data: createEmptyStats(false) };
  }

  try {
    const response = await axios.get(`${STATS_ENDPOINT}/last_7_days`, {
      headers: {
        Authorization: AUTHORIZATION_HEADER,
      },
    });

    const status = response.status;

    if (status >= 400) {
      return { status: 200, data: createEmptyStats(true) };
    }

    const getData = response.data;

    const start_date = getData?.data?.start;
    const end_date = getData?.data?.end;
    const last_update = getData?.data?.modified_at;

    const categories = getData?.data?.categories;

    const best_day = {
      date: getData?.data?.best_day?.date,
      text: getData?.data?.best_day?.text,
    };
    const human_readable_daily_average =
      getData?.data?.human_readable_daily_average_including_other_language;
    const human_readable_total =
      getData?.data?.human_readable_total_including_other_language;

    const languages = getData?.data?.languages?.slice(0, 3);
    const editors = getData?.data?.editors;

    return {
      status,
      data: {
        configured: true,
        last_update,
        start_date,
        end_date,
        categories,
        best_day,
        human_readable_daily_average,
        human_readable_total,
        languages,
        editors,
      },
    };
  } catch {
    return { status: 200, data: createEmptyStats(true) };
  }
};

export const getAllTimeSinceToday = async (): Promise<{
  status: number;
  data: any;
}> => {
  if (!API_KEY) {
    return { status: 200, data: createEmptyAllTime(false) };
  }

  try {
    const response = await axios.get(ALL_TIME_SINCE_TODAY, {
      headers: {
        Authorization: AUTHORIZATION_HEADER,
      },
    });

    const status = response.status;

    if (status >= 400) {
      return { status: 200, data: createEmptyAllTime(true) };
    }

    const getData = response.data;

    const data = {
      configured: true,
      text: getData?.data?.text,
      total_seconds: getData?.data?.total_seconds,
    };

    return {
      status,
      data,
    };
  } catch {
    return { status: 200, data: createEmptyAllTime(true) };
  }
};
