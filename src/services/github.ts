import axios from 'axios';

import { GITHUB_ACCOUNTS } from '@/common/constant/github';

const GITHUB_USER_ENDPOINT = 'https://api.github.com/graphql';

const GITHUB_USER_QUERY = `query($username: String!) {
  user(login: $username) {
    contributionsCollection {
      contributionCalendar {
        colors
        totalContributions
        months {
          firstDay
          name
          totalWeeks
        }
        weeks {
          contributionDays {
            color
            contributionCount
            date
          }
          firstDay
        }
      }
    }
  }
}`;

const PUBLIC_GITHUB_CONTRIBUTIONS_ENDPOINT = (username: string) =>
  `https://github.com/users/${username}/contributions`;

const GITHUB_CONTRIBUTION_COLORS = [
  '#0e4429',
  '#006d32',
  '#26a641',
  '#39d353',
];

const createEmptyGithubData = (configured: boolean) => ({
  configured,
  contributionsCollection: null,
});

const parseContributionCount = (tooltip: string) => {
  if (tooltip.includes('No contributions')) {
    return 0;
  }

  const match = tooltip.match(/([\d,]+)\s+contribution/);
  return match ? Number(match[1].replace(/,/g, '')) : 0;
};

const parsePublicGithubContributions = async (username: string) => {
  const response = await axios.get(PUBLIC_GITHUB_CONTRIBUTIONS_ENDPOINT(username));
  const html = response.data as string;

  const totalContributionsMatch = html.match(
    /<h2[^>]*id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s*contributions/i,
  );
  const totalContributions = totalContributionsMatch
    ? Number(totalContributionsMatch[1].replace(/,/g, ''))
    : 0;

  const months = [...html.matchAll(
    /<td class="ContributionCalendar-label" colspan="(\d+)"[^>]*>[\s\S]*?<span aria-hidden="true"[^>]*>([^<]+)<\/span>/g,
  )].map((match) => ({
    name: match[2],
    totalWeeks: Number(match[1]),
    firstDay: '',
  }));

  const cellMatches = [...html.matchAll(
    /<td[^>]*data-date="([^"]+)"[^>]*id="contribution-day-component-(\d+)-(\d+)"[^>]*data-level="(\d+)"[^>]*class="ContributionCalendar-day"><\/td>\s*<tool-tip[^>]*>([^<]*)<\/tool-tip>/g,
  )];

  const weekMap = new Map<
    number,
    {
      firstDay: string;
      contributionDays: {
        color: string;
        contributionCount: number;
        date: string;
      }[];
    }
  >();

  for (const match of cellMatches) {
    const date = match[1];
    const rowIndex = Number(match[2]);
    const columnIndex = Number(match[3]);
    const level = Number(match[4]);
    const tooltip = match[5];
    const contributionCount = parseContributionCount(tooltip);
    const color =
      contributionCount > 0
        ? GITHUB_CONTRIBUTION_COLORS[Math.max(level - 1, 0)] ||
          GITHUB_CONTRIBUTION_COLORS[GITHUB_CONTRIBUTION_COLORS.length - 1]
        : '';

    if (!weekMap.has(columnIndex)) {
      weekMap.set(columnIndex, {
        firstDay: date,
        contributionDays: [],
      });
    }

    const week = weekMap.get(columnIndex);

    if (!week) {
      continue;
    }

    week.contributionDays[rowIndex] = {
      color,
      contributionCount,
      date,
    };
  }

  const weeks = [...weekMap.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, week]) => ({
      firstDay: week.firstDay,
      contributionDays: week.contributionDays.filter(Boolean),
    }));

  let weekCursor = 0;
  const normalizedMonths = months.map((month) => {
    const firstDay = weeks[weekCursor]?.firstDay || '';
    weekCursor += month.totalWeeks;

    return {
      ...month,
      firstDay,
    };
  });

  return {
    configured: false,
    contributionsCollection: {
      contributionCalendar: {
        colors: GITHUB_CONTRIBUTION_COLORS,
        totalContributions,
        months: normalizedMonths,
        weeks,
      },
    },
  };
};

export const fetchGithubData = async (
  username: string,
  token: string | undefined,
) => {
  if (!token) {
    return {
      status: 200,
      data: await parsePublicGithubContributions(username).catch(() =>
        createEmptyGithubData(false),
      ),
    };
  }

  try {
    const response = await axios.post(
      GITHUB_USER_ENDPOINT,
      {
        query: GITHUB_USER_QUERY,
        variables: {
          username: username,
        },
      },
      {
        headers: {
          Authorization: `bearer ${token}`,
        },
      },
    );

    const status: number = response.status;
    const responseJson = response.data;

    if (status >= 400) {
      return {
        status: 200,
        data: createEmptyGithubData(true),
      };
    }

    return {
      status: 200,
      data: {
        configured: true,
        ...responseJson?.data?.user,
      },
    };
  } catch {
    return {
      status: 200,
      data: await parsePublicGithubContributions(username).catch(() =>
        createEmptyGithubData(true),
      ),
    };
  }
};

export const getGithubUser = async (type: string) => {
  const account = GITHUB_ACCOUNTS.find(
    (account) => account?.type === type && account?.is_active,
  );

  if (!account) {
    return {
      status: 200,
      data: createEmptyGithubData(false),
    };
  }

  const { username, token } = account;
  return await fetchGithubData(username, token);
};
