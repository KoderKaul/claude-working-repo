import { describe, expect, it } from 'vitest';
import type { PainEntry, RemedyLog } from '../db/types';
import { remedyEffect, suggestRemedies } from './relief';

let n = 0;
const now = new Date('2026-03-31T12:00:00Z');
const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();
const entry = (daysAgo: number, intensity: number, p: Partial<PainEntry> = {}): PainEntry => ({
  id: String(n++), occurredAt: at(daysAgo), tzOffsetMin: 0, createdAt: '', updatedAt: '',
  regionId: 8, side: 1, intensity, painTypes: [], ...p,
});
const log = (daysAgo: number, p: Partial<RemedyLog> = {}): RemedyLog => ({
  id: String(n++), remedyId: 'cat-cow', doneAt: at(daysAgo), tzOffsetMin: 0, regionId: 8, side: 1, ...p,
});

describe('suggestRemedies', () => {
  it('only suggests remedies for that body area, main-area remedies first', () => {
    const s = suggestRemedies(19, 1, [], [], []);
    expect(s.length).toBeGreaterThan(3);
    expect(s.every((x) => x.remedy.regions.includes(19))).toBe(true);
    expect(s[0].remedy.regions[0]).toBe(19);
  });

  it('boosts remedies that match what you were doing and how it feels, and explains why', () => {
    const es = Array.from({ length: 6 }, (_, i) => entry(i, 5, { activity: 'Just woke up', painTypes: ['Stiffness'] }));
    const s = suggestRemedies(8, 1, es, [], []);
    expect(s[0].remedy.id).toBe('cat-cow');
    expect(s[0].reasons).toEqual(['You often log this while: just woke up', 'Suits stiffness pain']);
  });

  it('learns from feedback', () => {
    const worse = suggestRemedies(8, 1, [], [log(1, { feeling: 'worse' }), log(2, { feeling: 'worse' })], []);
    expect(worse.at(-1)!.remedy.id).toBe('cat-cow');
    const better = suggestRemedies(8, 1, [], [log(1, { remedyId: 'walk', feeling: 'better' })], []);
    expect(better[0].remedy.id).toBe('walk');
    expect(better[0].reasons).toContain('You said it helped before');
  });
});

describe('remedyEffect', () => {
  it('is too early with no data', () => {
    expect(remedyEffect([], [], 'cat-cow', 8, 1, now).verdict).toBe('too-early');
  });

  it('detects improvement after starting', () => {
    // before: days 30..17, avg 6, ~2/week; after start on day 16: avg 3.5
    const es = [entry(29, 6), entry(25, 7), entry(21, 5), entry(18, 6), entry(14, 4), entry(10, 4), entry(6, 3), entry(2, 3)];
    const logs = [16, 12, 8, 4, 1].map((d) => log(d, { feeling: 'better' }));
    const r = remedyEffect(es, logs, 'cat-cow', 8, 1, now);
    expect(r).toMatchObject({ timesDone: 5, verdict: 'helping', feedback: { better: 5, same: 0, worse: 0 } });
    expect(r.before).toMatchObject({ n: 4, avg: 6 });
    expect(r.after).toMatchObject({ n: 4, avg: 3.5 });
  });

  it('reports no clear change and ignores other places', () => {
    const es = [entry(28, 5), entry(24, 5), entry(20, 5), entry(12, 5), entry(8, 5), entry(4, 5), entry(5, 9, { regionId: 17 })];
    const r = remedyEffect(es, [log(15), log(5)], 'cat-cow', 8, 1, now);
    expect(r.verdict).toBe('no-change');
  });

  it('notices when pain got worse', () => {
    const es = [entry(28, 3), entry(24, 3), entry(20, 3), entry(12, 6), entry(8, 6), entry(4, 7)];
    expect(remedyEffect(es, [log(15), log(3)], 'cat-cow', 8, 1, now).verdict).toBe('worse');
  });
});
