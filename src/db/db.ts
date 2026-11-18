import Dexie, { type Table } from 'dexie';
import type { DailyCheckIn, PainEntry } from './types';

/**
 * All data lives in the browser's IndexedDB on this device.
 * Everything goes through this module so a cloud sync can be added later
 * without touching the screens.
 */
class PaiNoDB extends Dexie {
  entries!: Table<PainEntry, string>;
  checkins!: Table<DailyCheckIn, string>;
  constructor() {
    super('paino');
    this.version(1).stores({
      entries: 'id, occurredAt, regionId, demo',
      checkins: 'date, demo',
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
  await db.transaction('rw', db.entries, db.checkins, async () => {
    await db.entries.clear();
    await db.checkins.clear();
  });
}

export async function clearDemo() {
  await db.entries.filter((e) => !!e.demo).delete();
  await db.checkins.filter((c) => !!c.demo).delete();
}

/** Ask the browser not to evict our data when storage runs low. */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}
