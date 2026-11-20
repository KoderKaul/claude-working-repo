import { db, newId } from '../db/db';
import type { DailyCheckIn, PainEntry, PlanItem, RemedyLog, Side } from '../db/types';
import { todayStr } from './time';

/** Simple seeded random so the demo looks the same each time. */
function rng(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

/**
 * Six weeks of believable sample data: desk-related lower-back and neck pain that
 * is worse after short sleep, plus right-knee pain after runs. Three weeks ago the person
 * started cat–cow and knee-to-chest stretches and their back pain eased; knee exercises
 * started two weeks ago haven't clearly helped yet.
 */
export async function loadDemoData() {
  const r = rng(42);
  const entries: PainEntry[] = [];
  const checkins: DailyCheckIn[] = [];
  const logs: RemedyLog[] = [];
  const tz = -new Date().getTimezoneOffset();
  const now = new Date();
  for (let d = 41; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    const date = todayStr(day);
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const sleep = Math.round((5 + r() * 3.5) * 2) / 2;
    const stress = Math.max(1, Math.min(5, Math.round((weekend ? 1.5 : 3) + r() * 2 - 0.5)));
    const ran = r() < 0.3;
    const sitting = weekend ? Math.round(1 + r() * 3) : Math.round(6 + r() * 4);
    checkins.push({ date, sleepHours: sleep, sleepQuality: Math.max(1, Math.min(5, Math.round(sleep - 3.5))), stress,
      workout: ran ? 'moderate' : r() < 0.2 ? 'light' : 'none', workoutType: ran ? 'Running' : undefined,
      sittingHours: sitting, updatedAt: day.toISOString(), demo: true });

    const add = (hour: number, regionId: number, side: Side, intensity: number, activity: string, painTypes: string[], structure?: PainEntry['structure']) => {
      if (d === 0 && hour > now.getHours()) return;
      const t = new Date(day);
      t.setHours(hour, Math.floor(r() * 60), 0, 0);
      const iso = t.toISOString();
      entries.push({ id: newId(), occurredAt: iso, tzOffsetMin: tz, createdAt: iso, updatedAt: iso, regionId, side,
        intensity: Math.max(1, Math.min(10, Math.round(intensity))), painTypes, activity, structure, demo: true });
    };
    const sleepPenalty = sleep < 6 ? 2 : sleep < 7 ? 1 : 0;
    const stretching = d <= 20; // started back stretches three weeks ago
    const backRelief = stretching ? 1.8 : 0;
    const remedy = (hour: number, remedyId: string, regionId: number, side: Side, feeling: RemedyLog['feeling']) => {
      if (d === 0 && hour > now.getHours()) return;
      const t = new Date(day);
      t.setHours(hour, Math.floor(r() * 60), 0, 0);
      logs.push({ id: newId(), remedyId, doneAt: t.toISOString(), tzOffsetMin: tz, regionId, side, feeling, demo: true });
    };
    if (stretching && r() < 0.8) remedy(7, 'cat-cow', 8, 1, r() < 0.75 ? 'better' : 'same');
    if (stretching && r() < 0.5) remedy(21, 'knee-to-chest', 8, 1, r() < 0.6 ? 'better' : 'same');
    if (d <= 14 && ran) remedy(20, 'straight-leg-raise', 17, 2, r() < 0.5 ? 'same' : 'better');
    if (!weekend || r() < 0.3) {
      if (r() < (stretching ? 0.4 : 0.6)) add(7, 8, 1, 3 + sleepPenalty + r() * 2 - backRelief, 'Just woke up', ['Stiffness'], { layer: 'muscles', name: 'Multifidus lumborum muscle.l' });
      if (sitting >= 7) add(15 + Math.floor(r() * 3), 8, 1, 4 + sleepPenalty + r() * 2 - backRelief, 'Sitting / desk work', ['Dull ache'], { layer: 'muscles', name: 'Quadratus lumborum muscle.l' });
      if (r() < 0.55) add(16 + Math.floor(r() * 3), 3, 2, 3 + stress * 0.6 + r() * 2, 'Phone / laptop use', ['Dull ache', 'Stiffness'], { layer: 'muscles', name: 'Descending part of trapezius muscle.r' });
      if (stress >= 4 && r() < 0.5) add(20, 1, 0, 4 + r() * 3, 'Resting', ['Throbbing']);
    }
    if (ran) add(19, 17, 2, 4 + r() * 3, 'Running', ['Sharp'], { layer: 'joints', name: 'Articular capsule of knee joint.r' });
    if (ran && r() < 0.6) add(8, 17, 2, 3 + r() * 2, 'Stairs', ['Sharp', 'Stiffness']);
    if (r() < 0.12) add(11, 4, 2, 2 + r() * 3, 'Lifting / carrying', ['Sharp']);
  }
  const added = new Date(now.getTime() - 20 * 86_400_000).toISOString();
  const plan: PlanItem[] = [
    { remedyId: 'cat-cow', regionId: 8, side: 1, addedAt: added, demo: true },
    { remedyId: 'knee-to-chest', regionId: 8, side: 1, addedAt: added, demo: true },
    { remedyId: 'straight-leg-raise', regionId: 17, side: 2, addedAt: added, demo: true },
  ];
  await db.transaction('rw', [db.entries, db.checkins, db.remedyLogs, db.plan], async () => {
    await db.entries.bulkPut(entries);
    await db.remedyLogs.bulkPut(logs);
    const planned = new Set((await db.plan.toArray()).map((p) => p.remedyId));
    await db.plan.bulkPut(plan.filter((p) => !planned.has(p.remedyId)));
    // don't overwrite real check-ins
    const existing = new Set((await db.checkins.toArray()).map((c) => c.date));
    await db.checkins.bulkPut(checkins.filter((c) => !existing.has(c.date)));
  });
  return entries.length;
}
