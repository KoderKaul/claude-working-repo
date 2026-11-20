import { describe, expect, it } from 'vitest';
import type { PainEntry } from '../db/types';
import { entryFlags, flagsForPlace, placeFlags } from './redflags';

let n = 0;
const e = (p: Partial<PainEntry> & { at?: string } = {}): PainEntry => {
  const { at = '2026-03-10T10:00:00Z', ...rest } = p;
  return { id: String(n++), occurredAt: at, tzOffsetMin: 0, createdAt: at, updatedAt: at, regionId: 8, side: 1, intensity: 5, painTypes: [], ...rest };
};
const ids = (fs: { id: string }[]) => fs.map((f) => f.id);
const now = new Date('2026-03-10T12:00:00Z');
const daysAgo = (d: number, hour = 10) => new Date(now.getTime() - d * 86_400_000).toISOString().slice(0, 11) + `${String(hour).padStart(2, '0')}:00:00Z`;

describe('entry red flags', () => {
  it('ordinary back ache raises nothing', () => {
    expect(entryFlags(e({ painTypes: ['Dull ache'] }))).toEqual([]);
  });
  it('chest pain always points to ruling out the heart', () => {
    expect(entryFlags(e({ regionId: 5, intensity: 4 }))[0]).toMatchObject({ id: 'chest', level: 'emergency' });
  });
  it('back pain with numbness raises the urgent nerve warning', () => {
    expect(ids(entryFlags(e({ regionId: 8, painTypes: ['Numbness'] })))).toEqual(['cauda']);
  });
  it('numbness elsewhere suggests a doctor; tingling alone is a softer check', () => {
    expect(entryFlags(e({ regionId: 15, painTypes: ['Numbness'] }))[0].level).toBe('doctor');
    expect(entryFlags(e({ regionId: 15, painTypes: ['Tingling'] }))[0].level).toBe('check');
  });
  it('calf pain with swelling flags a possible clot', () => {
    expect(ids(entryFlags(e({ regionId: 18, painTypes: ['Swelling'] })))).toEqual(['calf-clot']);
  });
  it('very severe pain flags a check unless a more urgent flag already covers it', () => {
    expect(ids(entryFlags(e({ intensity: 9 })))).toEqual(['severe']);
    expect(ids(entryFlags(e({ regionId: 1, intensity: 10 })))).toEqual(['headache']);
  });
});

describe('pattern red flags', () => {
  it('flags pain that has lasted over six weeks and still recurs', () => {
    const es = [e({ at: daysAgo(60) }), ...Array.from({ length: 8 }, (_, i) => e({ at: daysAgo(i * 4) }))];
    expect(ids(placeFlags(es, now))).toContain('persistent');
  });
  it('does not flag a short episode', () => {
    const es = Array.from({ length: 8 }, (_, i) => e({ at: daysAgo(i) }));
    expect(placeFlags(es, now)).toEqual([]);
  });
  it('flags clearly worsening pain', () => {
    const es = [
      ...[10, 12, 15].map((d) => e({ at: daysAgo(d), intensity: 3 })),
      ...[1, 2, 3].map((d) => e({ at: daysAgo(d), intensity: 6 })),
    ];
    expect(ids(placeFlags(es, now))).toEqual(['worsening']);
  });
  it('flags pain that repeatedly wakes you', () => {
    const es = [1, 3, 5].map((d) => e({ at: daysAgo(d, 3), activity: 'Sleeping' }));
    expect(ids(placeFlags(es, now))).toEqual(['night']);
  });
  it('combines entry and pattern flags for a place, urgent first, without duplicates', () => {
    const es = [
      e({ at: daysAgo(1), painTypes: ['Tingling'] }),
      e({ at: daysAgo(2), painTypes: ['Tingling'] }),
      e({ at: daysAgo(3), painTypes: ['Weakness'] }),
      e({ at: daysAgo(3), regionId: 17, painTypes: ['Numbness'] }), // other place
    ];
    expect(ids(flagsForPlace(es, 8, 1, now))).toEqual(['cauda', 'tingling']);
  });
});
