import type { DailyCheckIn, PainEntry, PlanItem, RemedyLog } from '../db/types';
import { SCHEMA_VERSION } from '../db/types';
import { regionLabel, SIDE_LABEL } from './regions';
import { structureLabel } from './anatomy';

export interface Backup {
  app: 'paino';
  schemaVersion: number;
  exportedAt: string;
  entries: PainEntry[];
  checkins: DailyCheckIn[];
  remedyLogs: RemedyLog[];
  plan: PlanItem[];
}

export function makeBackup(entries: PainEntry[], checkins: DailyCheckIn[], remedyLogs: RemedyLog[] = [], plan: PlanItem[] = []): Backup {
  return { app: 'paino', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), entries, checkins, remedyLogs, plan };
}

/** Validates an uploaded backup file. Throws a readable error if it isn't one. */
export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file is not a PaiNo backup (it is not valid JSON).');
  }
  const b = data as Partial<Backup>;
  if (!b || b.app !== 'paino' || !Array.isArray(b.entries)) throw new Error('That file is not a PaiNo backup.');
  if ((b.schemaVersion ?? 0) > SCHEMA_VERSION) throw new Error('This backup is from a newer version of PaiNo.');
  const entries = b.entries.filter(
    (e): e is PainEntry => !!e && typeof e.id === 'string' && typeof e.occurredAt === 'string'
      && typeof e.regionId === 'number' && typeof e.intensity === 'number',
  ).map((e) => ({ ...e, painTypes: Array.isArray(e.painTypes) ? e.painTypes : [], tzOffsetMin: e.tzOffsetMin ?? 0 }));
  const checkins = (Array.isArray(b.checkins) ? b.checkins : []).filter(
    (c): c is DailyCheckIn => !!c && typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date),
  );
  // remedy data arrived in schema v2; v1 backups simply have none
  const remedyLogs = (Array.isArray(b.remedyLogs) ? b.remedyLogs : []).filter(
    (l): l is RemedyLog => !!l && typeof l.id === 'string' && typeof l.remedyId === 'string' && typeof l.doneAt === 'string',
  );
  const plan = (Array.isArray(b.plan) ? b.plan : []).filter((p): p is PlanItem => !!p && typeof p.remedyId === 'string');
  return { app: 'paino', schemaVersion: SCHEMA_VERSION, exportedAt: b.exportedAt ?? '', entries, checkins, remedyLogs, plan };
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function entriesToCsv(entries: PainEntry[]): string {
  const head = ['occurred_at', 'body_area', 'side', 'structure', 'intensity', 'pain_types', 'activity', 'notes'];
  const rows = entries.map((e) => [
    e.occurredAt, regionLabel(e.regionId), SIDE_LABEL[e.side], e.structure ? structureLabel(e.structure.name) : '',
    e.intensity, e.painTypes.join('; '), e.activity ?? '', e.notes ?? '',
  ].map(csvCell).join(','));
  return [head.join(','), ...rows].join('\n');
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
