import Dexie, { type Table } from 'dexie';
import type { DailyCheckIn, PainEntry, PlanItem, RemedyLog } from './types';

/**
 * All data lives in the browser's IndexedDB on this device.
 * Everything goes through this module so a cloud sync can be added later
 * without touching the screens.
 */
class PaiNoDB extends Dexie {
  entries!: Table<PainEntry, string>;
  checkins!: Table<DailyCheckIn, string>;
  remedyLogs!: Table<RemedyLog, string>;
  plan!: Table<PlanItem, string>;
  constructor() {
    super('paino');
    this.version(1).stores({
      entries: 'id, occurredAt, regionId, demo',
      checkins: 'date, demo',
    });
    // v2: remedies (Phase 2). Existing data is kept as-is.
    this.version(2).stores({
      remedyLogs: 'id, remedyId, doneAt, regionId, demo',
      plan: 'remedyId, demo',
    });
  }
}

export const db = new PaiNoDB();

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function addEntry(e: Omit<PainEntry, 'id' | 'createdAt' | 'updatedAt' | 'tzOffsetMin'> & { tzOffsetMin?: number }) {
  const now = new Date().toISOString();
  const entry: PainEntry = {
    tzOffsetMin: -new Date(e.occurredAt).getTimezoneOffset(),
    ...e,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  };
  await db.entries.put(entry);
  return entry;
}

export async function updateEntry(id: string, patch: Partial<PainEntry>) {
  const extra: Partial<PainEntry> = { updatedAt: new Date().toISOString() };
  if (patch.occurredAt) extra.tzOffsetMin = -new Date(patch.occurredAt).getTimezoneOffset();
  await db.entries.update(id, { ...patch, ...extra });
}

export async function deleteEntry(id: string) {
  await db.entries.delete(id);
}

export async function saveCheckIn(c: Omit<DailyCheckIn, 'updatedAt'>) {
  await db.checkins.put({ ...c, updatedAt: new Date().toISOString() });
}

export async function allEntries(): Promise<PainEntry[]> {
  return db.entries.orderBy('occurredAt').reverse().toArray();
}

export async function clearAll() {
  await db.transaction('rw', [db.entries, db.checkins, db.remedyLogs, db.plan], async () => {
    await Promise.all([db.entries.clear(), db.checkins.clear(), db.remedyLogs.clear(), db.plan.clear()]);
  });
}

export async function clearDemo() {
  await db.entries.filter((e) => !!e.demo).delete();
  await db.checkins.filter((c) => !!c.demo).delete();
  await db.remedyLogs.filter((l) => !!l.demo).delete();
  await db.plan.filter((p) => !!p.demo).delete();
}

export async function logRemedy(l: Omit<RemedyLog, 'id' | 'tzOffsetMin'>) {
  const log: RemedyLog = { ...l, id: newId(), tzOffsetMin: -new Date(l.doneAt).getTimezoneOffset() };
  await db.remedyLogs.put(log);
  return log;
}

export async function setRemedyFeeling(id: string, feeling: RemedyLog['feeling']) {
  await db.remedyLogs.update(id, { feeling });
}

export async function deleteRemedyLog(id: string) {
  await db.remedyLogs.delete(id);
}

export async function togglePlan(item: Omit<PlanItem, 'addedAt'>) {
  const existing = await db.plan.get(item.remedyId);
  if (existing) await db.plan.delete(item.remedyId);
  else await db.plan.put({ ...item, addedAt: new Date().toISOString() });
  return !existing;
}

/** Ask the browser not to evict our data when storage runs low. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}
