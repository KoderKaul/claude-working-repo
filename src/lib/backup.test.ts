import { describe, expect, it } from 'vitest';
import { entriesToCsv, makeBackup, parseBackup } from './backup';
import type { PainEntry } from '../db/types';

const e: PainEntry = {
  id: 'a', occurredAt: '2026-03-01T08:00:00Z', tzOffsetMin: 0, createdAt: '', updatedAt: '',
  regionId: 8, side: 1, intensity: 6, painTypes: ['Dull ache'], activity: 'Sitting / desk work', notes: 'after "long" call, ugh',
  structure: { layer: 'muscles', name: 'Multifidus lumborum muscle.l' },
};

describe('backup', () => {
  it('round-trips', () => {
    const b = parseBackup(JSON.stringify(makeBackup([e], [{ date: '2026-03-01', sleepHours: 6, updatedAt: '' }])));
    expect(b.entries).toEqual([e]);
    expect(b.checkins).toHaveLength(1);
  });
  it('keeps remedy logs and plan, and still reads older v1 backups', () => {
    const log = { id: 'r1', remedyId: 'cat-cow', doneAt: '2026-03-02T08:00:00Z', tzOffsetMin: 0, regionId: 8, side: 1 as const, feeling: 'better' as const };
    const plan = { remedyId: 'cat-cow', regionId: 8, side: 1 as const, addedAt: '' };
    const b = parseBackup(JSON.stringify(makeBackup([e], [], [log], [plan])));
    expect(b.remedyLogs).toEqual([log]);
    expect(b.plan).toEqual([plan]);
    const v1 = parseBackup(JSON.stringify({ app: 'paino', schemaVersion: 1, entries: [e], checkins: [] }));
    expect(v1.remedyLogs).toEqual([]);
  });
  it('rejects other files with a readable message', () => {
    expect(() => parseBackup('hello')).toThrow(/not a PaiNo backup/);
    expect(() => parseBackup('{"foo":1}')).toThrow(/not a PaiNo backup/);
  });
  it('drops malformed rows', () => {
    const b = parseBackup(JSON.stringify({ app: 'paino', schemaVersion: 1, entries: [e, { id: 3 }], checkins: [{ date: 'x' }] }));
    expect(b.entries).toHaveLength(1);
    expect(b.checkins).toHaveLength(0);
  });
  it('exports readable CSV with escaping', () => {
    const csv = entriesToCsv([e]).split('\n');
    expect(csv[1]).toBe('2026-03-01T08:00:00Z,Lower back,Left,Multifidus lumborum muscle,6,Dull ache,Sitting / desk work,"after ""long"" call, ugh"');
  });
});
