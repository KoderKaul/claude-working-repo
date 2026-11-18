import type { DailyCheckIn, PainEntry, Side } from '../db/types';
import { DAY_PARTS, type DayPart, dayPartOf, localDate, localHour, localWeekday } from './time';
import { placeKey } from './regions';

export interface PlaceStat {
  regionId: number;
  side: Side;
  count: number;
  avg: number;
  max: number;
  sum: number;
  lastAt: string;
  topActivity?: string;
  topPainType?: string;
  peakDayPart?: DayPart;
}

export interface HourStat { hour: number; count: number; avg: number | null }
export interface DayStat { date: string; count: number; avg: number | null; max: number | null }
export interface CountStat { label: string; count: number; avg: number }

const round1 = (n: number) => Math.round(n * 10) / 10;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

function mode<T>(xs: T[]): T | undefined {
  const m = new Map<T, number>();
  let best: T | undefined;
  let bestN = 0;
  for (const x of xs) {
    const n = (m.get(x) ?? 0) + 1;
    m.set(x, n);
    if (n > bestN) { best = x; bestN = n; }
  }
  return best;
}

/** Entries within the last `days` days (inclusive of today). `null` = all time. */
export function filterByPeriod(entries: PainEntry[], days: number | null, now = new Date()): PainEntry[] {
  if (days == null) return entries;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));
  return entries.filter((e) => new Date(e.occurredAt) >= start && new Date(e.occurredAt) <= now);
}

export function byPlace(entries: PainEntry[]): PlaceStat[] {
  const groups = new Map<string, PainEntry[]>();
  for (const e of entries) {
    const k = placeKey(e.regionId, e.side);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  const out: PlaceStat[] = [];
  for (const g of groups.values()) {
    const ints = g.map((e) => e.intensity);
    out.push({
      regionId: g[0].regionId,
      side: g[0].side,
      count: g.length,
      avg: round1(mean(ints)),
      max: Math.max(...ints),
      sum: ints.reduce((a, b) => a + b, 0),
      lastAt: g.map((e) => e.occurredAt).sort().at(-1)!,
      topActivity: mode(g.map((e) => e.activity).filter(Boolean) as string[]),
      topPainType: mode(g.flatMap((e) => e.painTypes)),
      peakDayPart: mode(g.map((e) => dayPartOf(localHour(e)))),
    });
  }
  return out.sort((a, b) => b.sum - a.sum || b.count - a.count);
}

/** Pain load per region id (both sides together): sum of intensities. */
export function regionLoad(entries: PainEntry[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const e of entries) m.set(e.regionId, (m.get(e.regionId) ?? 0) + e.intensity);
  return m;
}

/** Pain load keyed "regionId:side". Side 0 entries count towards both sides. */
export function placeLoad(entries: PainEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  const add = (k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  for (const e of entries) {
    if (e.side === 0) { add(placeKey(e.regionId, 1), e.intensity); add(placeKey(e.regionId, 2), e.intensity); }
    else add(placeKey(e.regionId, e.side), e.intensity);
  }
  return m;
}

export function byHour(entries: PainEntry[]): HourStat[] {
  const buckets: number[][] = Array.from({ length: 24 }, () => []);
  for (const e of entries) buckets[localHour(e)].push(e.intensity);
  return buckets.map((b, hour) => ({ hour, count: b.length, avg: b.length ? round1(mean(b)) : null }));
}

export function byDayPart(entries: PainEntry[]) {
  return DAY_PARTS.map((p) => {
    const xs = entries.filter((e) => dayPartOf(localHour(e)) === p.key).map((e) => e.intensity);
    return { ...p, count: xs.length, avg: xs.length ? round1(mean(xs)) : null };
  });
}

export function byWeekday(entries: PainEntry[]) {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const b: number[][] = names.map(() => []);
  for (const e of entries) b[localWeekday(e)].push(e.intensity);
  return names.map((label, i) => ({ label, count: b[i].length, avg: b[i].length ? round1(mean(b[i])) : null }));
}

/** Place × part-of-day grid for the top `limit` places. */
export function placeTimeGrid(entries: PainEntry[], limit = 6) {
  const places = byPlace(entries).slice(0, limit);
  return places.map((p) => {
    const own = entries.filter((e) => e.regionId === p.regionId && e.side === p.side);
    return {
      place: p,
      cells: DAY_PARTS.map((d) => {
        const xs = own.filter((e) => dayPartOf(localHour(e)) === d.key).map((e) => e.intensity);
        return { dayPart: d.key, count: xs.length, avg: xs.length ? round1(mean(xs)) : null };
      }),
    };
  });
}

/** One row per calendar day from `from` to `to` (YYYY-MM-DD, inclusive). */
export function dailySeries(entries: PainEntry[], from: string, to: string): DayStat[] {
  const map = new Map<string, number[]>();
  for (const e of entries) {
    const d = localDate(e);
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(e.intensity);
  }
  const out: DayStat[] = [];
  const cur = new Date(from + 'T00:00:00Z');
  const end = new Date(to + 'T00:00:00Z');
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    const xs = map.get(d) ?? [];
    out.push({ date: d, count: xs.length, avg: xs.length ? round1(mean(xs)) : null, max: xs.length ? Math.max(...xs) : null });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function activityStats(entries: PainEntry[]): CountStat[] {
  const m = new Map<string, number[]>();
  for (const e of entries) {
    if (!e.activity) continue;
    if (!m.has(e.activity)) m.set(e.activity, []);
    m.get(e.activity)!.push(e.intensity);
  }
  return [...m].map(([label, xs]) => ({ label, count: xs.length, avg: round1(mean(xs)) }))
    .sort((a, b) => b.count - a.count || b.avg - a.avg);
}

export function painTypeStats(entries: PainEntry[]): CountStat[] {
  const m = new Map<string, number[]>();
  for (const e of entries) for (const t of e.painTypes) {
    if (!m.has(t)) m.set(t, []);
    m.get(t)!.push(e.intensity);
  }
  return [...m].map(([label, xs]) => ({ label, count: xs.length, avg: round1(mean(xs)) }))
    .sort((a, b) => b.count - a.count);
}

export interface Comparison {
  factor: string;
  groups: { label: string; days: number; avgWorst: number }[];
}

/**
 * Compares the day's worst pain (0 if nothing logged) across lifestyle groups.
 * Only days with a check-in are used; a group needs >= minDays days to show.
 */
export function lifestyleComparisons(entries: PainEntry[], checkins: DailyCheckIn[], minDays = 2): Comparison[] {
  const worst = new Map<string, number>();
  for (const e of entries) {
    const d = localDate(e);
    worst.set(d, Math.max(worst.get(d) ?? 0, e.intensity));
  }
  const day = (c: DailyCheckIn) => worst.get(c.date) ?? 0;

  const factors: { factor: string; groups: { label: string; test: (c: DailyCheckIn) => boolean }[] }[] = [
    { factor: 'Sleep', groups: [
      { label: 'Under 6 h', test: (c) => c.sleepHours != null && c.sleepHours < 6 },
      { label: '6–7 h', test: (c) => c.sleepHours != null && c.sleepHours >= 6 && c.sleepHours < 7 },
      { label: '7 h or more', test: (c) => c.sleepHours != null && c.sleepHours >= 7 },
    ] },
    { factor: 'Stress', groups: [
      { label: 'Low (1–2)', test: (c) => c.stress != null && c.stress <= 2 },
      { label: 'Medium (3)', test: (c) => c.stress === 3 },
      { label: 'High (4–5)', test: (c) => c.stress != null && c.stress >= 4 },
    ] },
    { factor: 'Workout', groups: [
      { label: 'Rest day', test: (c) => c.workout === 'none' },
      { label: 'Light', test: (c) => c.workout === 'light' },
      { label: 'Moderate / hard', test: (c) => c.workout === 'moderate' || c.workout === 'hard' },
    ] },
    { factor: 'Sitting', groups: [
      { label: 'Under 4 h', test: (c) => c.sittingHours != null && c.sittingHours < 4 },
      { label: '4–7 h', test: (c) => c.sittingHours != null && c.sittingHours >= 4 && c.sittingHours < 7 },
      { label: '7 h or more', test: (c) => c.sittingHours != null && c.sittingHours >= 7 },
    ] },
  ];

  const out: Comparison[] = [];
  for (const f of factors) {
    const groups = f.groups
      .map((g) => {
        const days = checkins.filter(g.test);
        return { label: g.label, days: days.length, avgWorst: round1(mean(days.map(day))) };
      })
      .filter((g) => g.days >= minDays);
    if (groups.length >= 2) out.push({ factor: f.factor, groups });
  }
  return out;
}

export function summary(entries: PainEntry[]) {
  const places = byPlace(entries);
  const parts = byDayPart(entries).filter((p) => p.count > 0).sort((a, b) => b.count - a.count || (b.avg ?? 0) - (a.avg ?? 0));
  const days = new Set(entries.map(localDate));
  return {
    count: entries.length,
    avg: entries.length ? round1(mean(entries.map((e) => e.intensity))) : null,
    painDays: days.size,
    worstPlace: places[0],
    peakDayPart: parts[0],
  };
}
