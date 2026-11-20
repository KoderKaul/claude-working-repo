import type { PainEntry, PlanItem, RemedyLog, Side } from '../db/types';
import { REMEDIES, type Remedy } from '../data/remedies';

const DAY = 86_400_000;
const round1 = (n: number) => Math.round(n * 10) / 10;
const time = (iso: string) => new Date(iso).getTime();

/** Entries that belong to a place. Side-less entries count for both sides. */
export function atPlace<T extends { regionId: number; side: Side }>(xs: T[], regionId: number, side: Side): T[] {
  return xs.filter((x) => x.regionId === regionId && (side === 0 || x.side === 0 || x.side === side));
}

export interface Feedback { better: number; same: number; worse: number }

export function feedbackFor(logs: RemedyLog[], remedyId: string): Feedback {
  const f: Feedback = { better: 0, same: 0, worse: 0 };
  for (const l of logs) if (l.remedyId === remedyId && l.feeling) f[l.feeling]++;
  return f;
}

export interface Suggestion { remedy: Remedy; score: number; reasons: string[] }

/**
 * Ranks remedies for one body place using what the person has logged there:
 * what they were doing, how it feels, and how remedies went before.
 */
export function suggestRemedies(
  regionId: number,
  side: Side,
  entries: PainEntry[],
  logs: RemedyLog[],
  plan: PlanItem[],
): Suggestion[] {
  const here = atPlace(entries, regionId, side);
  const count = (pick: (e: PainEntry) => string[]) => {
    const m = new Map<string, number>();
    for (const e of here) for (const k of pick(e)) m.set(k, (m.get(k) ?? 0) + 1);
    return m;
  };
  const acts = count((e) => (e.activity ? [e.activity] : []));
  const types = count((e) => e.painTypes);
  const share = (m: Map<string, number>, k: string) => (here.length ? (m.get(k) ?? 0) / here.length : 0);
  const placeLogs = atPlace(logs, regionId, side);
  const planned = new Set(plan.map((p) => p.remedyId));

  const out: Suggestion[] = [];
  for (const r of REMEDIES) {
    const idx = r.regions.indexOf(regionId);
    if (idx < 0) continue;
    const reasons: string[] = [];
    let score = idx === 0 ? 6 : Math.max(2, 4 - idx * 0.5);

    const act = (r.activities ?? []).map((a) => [a, share(acts, a)] as const).sort((a, b) => b[1] - a[1])[0];
    if (act && act[1] >= 0.2) {
      score += 1 + 3 * act[1];
      reasons.push(`You often log this while: ${act[0].toLowerCase()}`);
    }
    const typ = (r.painTypes ?? []).map((t) => [t, share(types, t)] as const).sort((a, b) => b[1] - a[1])[0];
    if (typ && typ[1] >= 0.2) {
      score += 0.5 + 2 * typ[1];
      reasons.push(`Suits ${typ[0].toLowerCase()} pain`);
    }
    const fb = feedbackFor(placeLogs, r.id);
    if (fb.better > fb.worse && fb.better > 0) {
      score += 2 + Math.min(2, fb.better * 0.5);
      reasons.push('You said it helped before');
    } else if (fb.worse > fb.better) {
      score -= 4;
      reasons.push('You said it felt worse — maybe skip or go gentler');
    }
    if (planned.has(r.id)) score += 1;
    out.push({ remedy: r, score: round1(score), reasons });
  }
  return out.sort((a, b) => b.score - a.score || a.remedy.title.localeCompare(b.remedy.title));
}

export type Verdict = 'helping' | 'no-change' | 'worse' | 'too-early';

export interface Effect {
  timesDone: number;
  firstDone?: string;
  lastDone?: string;
  feedback: Feedback;
  before: { n: number; avg: number | null; perWeek: number };
  after: { n: number; avg: number | null; perWeek: number; days: number };
  verdict: Verdict;
}

/**
 * Did a remedy help this place? Compares pain in the 14 days before the remedy was first
 * done with pain since then (until a week after it was last done).
 */
export function remedyEffect(
  entries: PainEntry[],
  logs: RemedyLog[],
  remedyId: string,
  regionId: number,
  side: Side,
  now = new Date(),
): Effect {
  const mine = atPlace(logs.filter((l) => l.remedyId === remedyId), regionId, side).sort((a, b) => time(a.doneAt) - time(b.doneAt));
  const feedback = feedbackFor(mine, remedyId);
  const empty = { n: 0, avg: null, perWeek: 0 };
  if (!mine.length) return { timesDone: 0, feedback, before: empty, after: { ...empty, days: 0 }, verdict: 'too-early' };

  const first = time(mine[0].doneAt);
  const last = time(mine[mine.length - 1].doneAt);
  const end = Math.min(now.getTime(), last + 7 * DAY);
  const here = atPlace(entries, regionId, side);
  const before = here.filter((e) => time(e.occurredAt) >= first - 14 * DAY && time(e.occurredAt) < first);
  const after = here.filter((e) => time(e.occurredAt) >= first && time(e.occurredAt) <= end);
  const afterDays = Math.max(1, (end - first) / DAY);
  const avg = (xs: PainEntry[]) => (xs.length ? round1(xs.reduce((a, e) => a + e.intensity, 0) / xs.length) : null);
  const b = { n: before.length, avg: avg(before), perWeek: round1(before.length / 2) };
  const a = { n: after.length, avg: avg(after), perWeek: round1(after.length / (afterDays / 7)), days: Math.round(afterDays) };

  let verdict: Verdict = 'too-early';
  if (b.n >= 3 && afterDays >= 7 && (a.n >= 3 || b.perWeek >= 2)) {
    const avgDrop = (b.avg ?? 0) - (a.avg ?? 0);
    const freqDrop = b.perWeek > 0 ? (b.perWeek - a.perWeek) / b.perWeek : 0;
    if ((a.avg ?? 0) - (b.avg ?? 0) >= 1 || freqDrop <= -0.5) verdict = 'worse';
    else if (avgDrop >= 1 || (freqDrop >= 0.4 && avgDrop >= -0.3)) verdict = 'helping';
    else verdict = 'no-change';
  }
  return { timesDone: mine.length, firstDone: mine[0].doneAt, lastDone: mine[mine.length - 1].doneAt, feedback, before: b, after: a, verdict };
}

/** How many times each remedy was done in the last 7 days. */
export function doneThisWeek(logs: RemedyLog[], now = new Date()) {
  const m = new Map<string, number>();
  for (const l of logs) if (now.getTime() - time(l.doneAt) <= 7 * DAY) m.set(l.remedyId, (m.get(l.remedyId) ?? 0) + 1);
  return m;
}
