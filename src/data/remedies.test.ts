import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { REMEDIES } from './remedies';
import regions from './regions.json';
import { ACTIVITIES, PAIN_TYPES } from '../lib/options';

/** Node names straight from the GLB's JSON chunk (no need to decode geometry). */
function partNames(layer: string): string[] {
  const buf = fs.readFileSync(`public/models/${layer}.glb`);
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  return json.nodes.map((n: { name?: string }) => n.name ?? '');
}

describe('remedy library', () => {
  const muscles = partNames('muscles').map((n) => n.toLowerCase());
  const regionIds = new Set(regions.regions.map((r) => r.id));

  it('has unique ids', () => {
    expect(new Set(REMEDIES.map((r) => r.id)).size).toBe(REMEDIES.length);
  });

  it.each(REMEDIES.filter((r) => r.targets).map((r) => [r.id, r.targets!]))('%s: every target exists on the muscle layer', (_id, targets) => {
    for (const t of targets) expect(muscles.some((n) => n.includes(t.toLowerCase())), t).toBe(true);
  });

  it('uses real regions, activities and pain types', () => {
    for (const r of REMEDIES) {
      expect(r.regions.length).toBeGreaterThan(0);
      for (const id of r.regions) expect(regionIds.has(id), `${r.id} region ${id}`).toBe(true);
      for (const a of r.activities ?? []) expect(ACTIVITIES, `${r.id} activity`).toContain(a);
      for (const p of r.painTypes ?? []) expect(PAIN_TYPES, `${r.id} pain type`).toContain(p);
    }
  });

  it('covers every body region with at least one remedy', () => {
    for (const id of regionIds) expect(REMEDIES.some((r) => r.regions.includes(id)), `region ${id}`).toBe(true);
  });
});
