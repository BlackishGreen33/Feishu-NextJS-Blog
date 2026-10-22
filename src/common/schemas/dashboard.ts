import { z } from 'zod';

export const contributionCalendarSchema = z.looseObject({
  colors: z.array(z.string()),
  totalContributions: z.number(),
  months: z.array(
    z.looseObject({
      firstDay: z.string(),
      name: z.string(),
      totalWeeks: z.number(),
    }),
  ),
  weeks: z.array(
    z.looseObject({
      firstDay: z.string(),
      contributionDays: z.array(
        z.looseObject({
          color: z.string(),
          contributionCount: z.number(),
          date: z.string(),
        }),
      ),
    }),
  ),
});
const githubUserSchema = z.looseObject({
  contributionsCollection: z
    .looseObject({ contributionCalendar: contributionCalendarSchema })
    .nullish(),
});
export const githubGraphqlSchema = z.looseObject({
  data: z.looseObject({ user: githubUserSchema.nullish() }).nullish(),
});
export const githubDataSchema = githubUserSchema.extend({
  configured: z.boolean(),
});
export type ContributionCalendar = z.infer<typeof contributionCalendarSchema>;

const activitySchema = z.looseObject({
  name: z.string(),
  hours: z.number(),
  minutes: z.number(),
  percent: z.number().optional(),
});
export type WakaActivity = z.infer<typeof activitySchema>;
const bestDaySchema = z.looseObject({
  date: z.string().nullish(),
  text: z.string().nullish(),
});
const text = z.string().nullish();
const activities = z.array(activitySchema).nullish();
export const wakaStatsResponseSchema = z.looseObject({
  data: z
    .looseObject({
      start: text,
      end: text,
      modified_at: text,
      categories: activities,
      best_day: bestDaySchema.nullish(),
      human_readable_daily_average_including_other_language: text,
      human_readable_total_including_other_language: text,
      languages: activities,
      editors: activities,
    })
    .nullish(),
});
export const wakaAllTimeSchema = z.looseObject({
  configured: z.boolean(),
  text,
  total_seconds: z.number().nullish(),
});
export const wakaAllTimeResponseSchema = z.looseObject({
  data: wakaAllTimeSchema.omit({ configured: true }).nullish(),
});
export const readStatsSchema = z.looseObject({
  configured: z.boolean(),
  last_update: text,
  start_date: text,
  end_date: text,
  categories: activities,
  best_day: bestDaySchema.nullish(),
  human_readable_daily_average: text,
  human_readable_total: text,
  languages: activities,
  editors: activities,
  all_time_since_today: wakaAllTimeSchema.optional(),
});
export type ReadStats = z.infer<typeof readStatsSchema>;
