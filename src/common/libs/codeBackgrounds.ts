import { z } from 'zod';

const rangesSchema = z.array(
  z.tuple([
    z.number().int().nonnegative(),
    z.number().int().nonnegative(),
    z.number().int().min(1).max(15),
  ]),
);

export type CodeBackgroundRange = z.infer<typeof rangesSchema>[number];

export const parseCodeBackgrounds = (
  value: unknown,
  length: number,
): CodeBackgroundRange[] => {
  if (typeof value !== 'string') return [];
  try {
    const parsed = rangesSchema.safeParse(JSON.parse(value) as unknown);
    if (!parsed.success) return [];
    let previousEnd = 0;
    for (const [start, end] of parsed.data) {
      if (start < previousEnd || start >= end || end > length) return [];
      previousEnd = end;
    }
    return parsed.data;
  } catch {
    return [];
  }
};
