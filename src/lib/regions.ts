import data from '../data/regions.json';
import type { Side } from '../db/types';

export interface Region {
  id: number;
  key: string;
  label: string;
}

export const REGIONS: Region[] = data.regions.map(({ id, key, label }) => ({ id, key, label }));
const byId = new Map(REGIONS.map((r) => [r.id, r]));

export function regionLabel(id: number): string {
  return byId.get(id)?.label ?? 'Unknown area';
}

export const SIDE_LABEL: Record<Side, string> = { 0: 'Both / centre', 1: 'Left', 2: 'Right' };

export function placeLabel(regionId: number, side: Side): string {
  const r = regionLabel(regionId);
  return side === 0 ? r : `${r} · ${SIDE_LABEL[side].toLowerCase()}`;
}

/** Key used for grouping: region + side. */
export function placeKey(regionId: number, side: Side) {
  return `${regionId}:${side}`;
}
