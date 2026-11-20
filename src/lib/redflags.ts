import type { PainEntry, Side } from '../db/types';
import { localDate, localHour } from './time';

/**
 * "When to see a doctor" checks, based on widely published red-flag guidance for
 * musculoskeletal pain. They err on the side of caution and never say pain is safe.
 *
 * emergency – get help now if the listed signs are present
 * doctor    – book an appointment (soon / same day as stated)
 * check     – worth getting looked at if it continues
 */
export type FlagLevel = 'emergency' | 'doctor' | 'check';

export interface RedFlag {
  id: string;
  level: FlagLevel;
  title: string;
  message: string;
}

export const LEVEL_LABEL: Record<FlagLevel, string> = {
  emergency: 'Urgent',
  doctor: 'See a doctor',
  check: 'Worth checking',
};

const ORDER: Record<FlagLevel, number> = { emergency: 0, doctor: 1, check: 2 };
const has = (e: PainEntry, ...types: string[]) => types.some((t) => e.painTypes.includes(t));

/** Flags raised by a single entry. */
export function entryFlags(e: PainEntry): RedFlag[] {
  const out: RedFlag[] = [];
  const nerve = has(e, 'Numbness', 'Weakness');

  if (e.regionId === 5 && e.intensity >= 3) {
    out.push({
      id: 'chest', level: 'emergency', title: 'Chest pain: rule out the heart first',
      message: 'Call emergency services now if it feels crushing or tight, spreads to the arm, jaw or back, or comes with breathlessness, sweating, nausea or dizziness. Otherwise, see a doctor before treating it as a muscle strain.',
    });
  }
  if (e.regionId === 1 && e.intensity >= 8) {
    out.push({
      id: 'headache', level: 'emergency', title: 'Severe headache',
      message: 'Get emergency help for a sudden “worst ever” headache, or a headache with fever and stiff neck, confusion, weakness, drooping face, slurred speech, vision loss, or after a head injury.',
    });
  }
  if ((e.regionId === 8 || e.regionId === 11) && nerve) {
    out.push({
      id: 'cauda', level: 'emergency', title: 'Back pain with numbness or weakness',
      message: 'Go to the emergency department now if you have numbness around the groin, buttocks or inner thighs, new trouble peeing or controlling your bladder or bowels, or weakness in both legs. If it is only in one leg, see a doctor soon.',
    });
  } else if (nerve) {
    out.push({
      id: 'nerve', level: 'doctor', title: 'Numbness or weakness',
      message: 'See a doctor if numbness or weakness is new, spreading, getting worse or not settling within a few days. Get emergency help if it starts suddenly in the face, arm or leg on one side.',
    });
  } else if (has(e, 'Tingling')) {
    out.push({
      id: 'tingling', level: 'check', title: 'Tingling',
      message: 'Tingling can come from an irritated nerve. If it keeps coming back, spreads, or you start to feel numbness or weakness, see a doctor or physiotherapist.',
    });
  }
  if (e.regionId === 18 && has(e, 'Swelling')) {
    out.push({
      id: 'calf-clot', level: 'doctor', title: 'Calf pain with swelling',
      message: 'This can be a blood clot (DVT), especially after a long journey, surgery or time in bed. Get checked the same day. Call emergency services if you are also short of breath or have chest pain.',
    });
  } else if (has(e, 'Swelling') && e.intensity >= 7) {
    out.push({
      id: 'swelling', level: 'doctor', title: 'Painful swelling',
      message: 'See a doctor if a joint is hot, red and swollen, you have a fever, you can’t put weight on it, or it followed a fall or injury.',
    });
  }
  if (e.regionId === 9 && e.intensity >= 6) {
    out.push({
      id: 'abdomen', level: 'doctor', title: 'Strong belly pain',
      message: 'Belly pain is often not a muscle problem. Get urgent help if it is severe, sudden, or comes with fever, vomiting, blood, a hard swollen belly, or pain moving to the lower right side.',
    });
  }
  if (e.intensity >= 9 && !out.some((f) => f.level === 'emergency')) {
    out.push({
      id: 'severe', level: 'doctor', title: 'Very severe pain',
      message: 'Pain this strong deserves a medical check, especially after a fall or injury, if you can’t move or bear weight, or if ordinary painkillers don’t touch it.',
    });
  }
  return out;
}

/** Flags from the pattern of entries at one place (region + side). */
export function placeFlags(entries: PainEntry[], now = new Date()): RedFlag[] {
  const out: RedFlag[] = [];
  if (!entries.length) return out;
  const t = (e: PainEntry) => new Date(e.occurredAt).getTime();
  const day = 86_400_000;
  const nowT = now.getTime();
  const sorted = [...entries].sort((a, b) => t(a) - t(b));

  // Long-lasting: first seen 6+ weeks ago and still turning up regularly.
  const recentDays = new Set(sorted.filter((e) => nowT - t(e) <= 42 * day).map(localDate));
  if (nowT - t(sorted[0]) >= 42 * day && recentDays.size >= 8) {
    out.push({
      id: 'persistent', level: 'check', title: 'Ongoing for 6+ weeks',
      message: 'Pain that keeps coming back here for more than six weeks is worth showing to a GP or physiotherapist, who can find the cause and tailor exercises.',
    });
  }

  // Getting worse: last 7 days clearly worse than the 3 weeks before.
  const last = sorted.filter((e) => nowT - t(e) <= 7 * day);
  const before = sorted.filter((e) => nowT - t(e) > 7 * day && nowT - t(e) <= 28 * day);
  if (last.length >= 3 && before.length >= 3) {
    const avg = (xs: PainEntry[]) => xs.reduce((a, e) => a + e.intensity, 0) / xs.length;
    if (avg(last) - avg(before) >= 2) {
      out.push({
        id: 'worsening', level: 'doctor', title: 'Getting worse',
        message: 'Your pain here has been clearly stronger this week than in the weeks before. If it keeps rising, or self-care isn’t helping, book a check-up.',
      });
    }
  }

  // Waking at night.
  const night = sorted.filter((e) => nowT - t(e) <= 30 * day && localHour(e) < 5 && e.activity === 'Sleeping');
  if (night.length >= 3) {
    out.push({
      id: 'night', level: 'doctor', title: 'Pain that wakes you at night',
      message: 'Pain that regularly wakes you, especially if it doesn’t ease when you change position, should be checked by a doctor — particularly with fever, weight loss or feeling generally unwell.',
    });
  }
  return out;
}

/** All flags for a place: the latest entry's own flags plus pattern flags. */
export function flagsForPlace(all: PainEntry[], regionId: number, side: Side, now = new Date()): RedFlag[] {
  const here = all.filter((e) => e.regionId === regionId && (side === 0 || e.side === side || e.side === 0));
  const recent = here.filter((e) => now.getTime() - new Date(e.occurredAt).getTime() <= 14 * 86_400_000);
  return sortFlags(dedupe([...recent.flatMap(entryFlags), ...placeFlags(here, now)]));
}

export function sortFlags(flags: RedFlag[]) {
  return [...flags].sort((a, b) => ORDER[a.level] - ORDER[b.level]);
}

function dedupe(flags: RedFlag[]) {
  const seen = new Set<string>();
  return flags.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));
}

/** Always-on list shown on the relief page. */
export const GENERAL_WARNINGS = [
  'Pain after a fall, accident or sports injury, especially if you can’t bear weight or there’s a visible deformity',
  'Fever, chills, or feeling generally unwell along with the pain',
  'Unexplained weight loss, or a history of cancer',
  'A hot, red, swollen joint',
  'Numbness, weakness, or loss of bladder or bowel control',
  'Pain that is getting steadily worse, or no better after 6 weeks of self-care',
];
