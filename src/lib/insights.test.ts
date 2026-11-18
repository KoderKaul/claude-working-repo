import { describe, expect, it } from 'vitest';
import type { DailyCheckIn, PainEntry } from '../db/types';
import {
  activityStats, byDayPart, byHour, byPlace, dailySeries, filterByPeriod, lifestyleComparisons,
  placeLoad, placeTimeGrid, summary,
} from './insights';
import { dayPartOf, localDate, localHour } from './time';

let n = 0;
function entry(p: Partial<PainEntry> & { at: string }): PainEntry {
  const { at, ...rest } = p;
  return {
    id: String(n++), occurredAt: at, tzOffsetMin: 0, createdAt: at, updatedAt: at,
    regionId: 8, side: 1, intensity: 5, painTypes: [], ...rest,
  };
}

describe('time helpers', () => {
  it('uses the time zone the entry was logged in', () => {
    // 23:30 UTC logged in UTC+2 is 01:30 the next day locally
    const e = entry({ at: '2026-03-01T23:30:00Z', tzOffsetMin: 120 });
    expect(localHour(e)).toBe(1);
    expect(localDate(e)).toBe('2026-03-02');
  });
  it('buckets hours into parts of the day, night wraps past midnight', () => {
    expect(dayPartOf(6)).toBe('early');
    expect(dayPartOf(9)).toBe('morning');
    expect(dayPartOf(13)).toBe('afternoon');
    expect(dayPartOf(18)).toBe('evening');
    expect(dayPartOf(22)).toBe('night');
    expect(dayPartOf(3)).toBe('night');
  });
});

describe('insights', () => {
  const es = [
    entry({ at: '2026-03-01T08:15:00Z', regionId: 8, side: 1, intensity: 6, activity: 'Sitting / desk work', painTypes: ['Dull ache'] }),
    entry({ at: '2026-03-01T18:00:00Z', regionId: 8, side: 1, intensity: 4, activity: 'Sitting / desk work', painTypes: ['Dull ache', 'Stiffness'] }),
    entry({ at: '2026-03-02T07:00:00Z', regionId: 17, side: 2, intensity: 7, activity: 'Running', painTypes: ['Sharp'] }),
    entry({ at: '2026-03-03T09:00:00Z', regionId: 8, side: 0, intensity: 3 }),
  ];

  it('groups by body place and ranks by total pain', () => {
    const p = byPlace(es);
    expect(p[0]).toMatchObject({ regionId: 8, side: 1, count: 2, avg: 5, max: 6, sum: 10, topActivity: 'Sitting / desk work', topPainType: 'Dull ache' });
    expect(p.map((x) => `${x.regionId}:${x.side}`)).toEqual(['8:1', '17:2', '8:0']);
  });

  it('counts by hour with average intensity', () => {
    const h = byHour(es);
    expect(h).toHaveLength(24);
    expect(h[8]).toEqual({ hour: 8, count: 1, avg: 6 });
    expect(h[10]).toEqual({ hour: 10, count: 0, avg: null });
  });

  it('counts by part of day', () => {
    const d = byDayPart(es);
    expect(d.find((x) => x.key === 'morning')!.count).toBe(2);
    expect(d.find((x) => x.key === 'early')!.count).toBe(1);
  });

  it('builds a place × time-of-day grid', () => {
    const g = placeTimeGrid(es, 2);
    expect(g).toHaveLength(2);
    expect(g[0].cells.find((c) => c.dayPart === 'evening')).toEqual({ dayPart: 'evening', count: 1, avg: 4 });
  });

  it('spreads side-less entries over both sides for the heatmap', () => {
    const m = placeLoad(es);
    expect(m.get('8:1')).toBe(13);
    expect(m.get('8:2')).toBe(3);
  });

  it('produces a continuous daily series with gaps', () => {
    const s = dailySeries(es, '2026-02-28', '2026-03-03');
    expect(s.map((d) => d.count)).toEqual([0, 2, 1, 1]);
    expect(s[1]).toMatchObject({ avg: 5, max: 6 });
    expect(s[0].avg).toBeNull();
  });

  it('ranks activities', () => {
    expect(activityStats(es)[0]).toEqual({ label: 'Sitting / desk work', count: 2, avg: 5 });
  });

  it('filters by period relative to now', () => {
    const now = new Date('2026-03-03T12:00:00Z');
    expect(filterByPeriod(es, 1, now).length).toBe(1);
    expect(filterByPeriod(es, null, now).length).toBe(4);
  });

  it('summarises', () => {
    const s = summary(es);
    expect(s).toMatchObject({ count: 4, avg: 5, painDays: 3 });
    expect(s.worstPlace!.regionId).toBe(8);
    expect(s.peakDayPart!.key).toBe('morning');
  });

  it('compares worst daily pain across lifestyle groups', () => {
    const c = (date: string, x: Partial<DailyCheckIn>): DailyCheckIn => ({ date, updatedAt: '', ...x });
    const checkins = [
      c('2026-03-01', { sleepHours: 5 }), // worst 6
      c('2026-03-02', { sleepHours: 5.5 }), // worst 7
      c('2026-03-03', { sleepHours: 8 }), // worst 3
      c('2026-03-04', { sleepHours: 7.5 }), // no pain -> 0
    ];
    const r = lifestyleComparisons(es, checkins);
    expect(r).toEqual([{ factor: 'Sleep', groups: [
      { label: 'Under 6 h', days: 2, avgWorst: 6.5 },
      { label: '7 h or more', days: 2, avgWorst: 1.5 },
    ] }]);
  });
});
