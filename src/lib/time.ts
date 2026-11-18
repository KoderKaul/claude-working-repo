import type { PainEntry } from '../db/types';

export type DayPart = 'early' | 'morning' | 'afternoon' | 'evening' | 'night';

export const DAY_PARTS: { key: DayPart; label: string; range: string; from: number; to: number }[] = [
  { key: 'early', label: 'Early morning', range: '5–8 am', from: 5, to: 8 },
  { key: 'morning', label: 'Morning', range: '8 am–12', from: 8, to: 12 },
  { key: 'afternoon', label: 'Afternoon', range: '12–5 pm', from: 12, to: 17 },
  { key: 'evening', label: 'Evening', range: '5–9 pm', from: 17, to: 21 },
  { key: 'night', label: 'Night', range: '9 pm–5 am', from: 21, to: 29 },
];

/** The wall-clock moment in the time zone the entry was logged in. */
function shifted(e: Pick<PainEntry, 'occurredAt' | 'tzOffsetMin'>): Date {
  return new Date(new Date(e.occurredAt).getTime() + e.tzOffsetMin * 60_000);
}

/** Local hour 0–23 at the place & time the pain was logged. */
export function localHour(e: Pick<PainEntry, 'occurredAt' | 'tzOffsetMin'>): number {
  return shifted(e).getUTCHours();
}

/** Local date YYYY-MM-DD at the place & time the pain was logged. */
export function localDate(e: Pick<PainEntry, 'occurredAt' | 'tzOffsetMin'>): string {
  return shifted(e).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday */
export function localWeekday(e: Pick<PainEntry, 'occurredAt' | 'tzOffsetMin'>): number {
  return (shifted(e).getUTCDay() + 6) % 7;
}

export function dayPartOf(hour: number): DayPart {
  const h = hour < 5 ? hour + 24 : hour;
  return DAY_PARTS.find((p) => h >= p.from && h < p.to)!.key;
}

export function hourLabel(h: number): string {
  if (h === 0) return '12 am';
  if (h === 12) return '12 pm';
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}

/** Today's local date as YYYY-MM-DD. */
export function todayStr(d = new Date()): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Value for <input type="datetime-local"> from an ISO string. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function fromLocalInput(v: string): string {
  return new Date(v).toISOString();
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
