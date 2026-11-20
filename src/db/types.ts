/** 0 = not specified / both, 1 = left, 2 = right (the person's own left/right). */
export type Side = 0 | 1 | 2;

export type LayerKey = 'skin' | 'muscles' | 'joints' | 'bones';

export interface PainEntry {
  id: string;
  /** When the pain happened (ISO, UTC). */
  occurredAt: string;
  /** Minutes east of UTC at the time of logging, so "time of day" stays correct when travelling. */
  tzOffsetMin: number;
  createdAt: string;
  updatedAt: string;
  regionId: number;
  side: Side;
  /** Optional precise anatomical structure, e.g. "Gluteus medius muscle.l". */
  structure?: { layer: LayerKey; name: string };
  /** 0 – 10 */
  intensity: number;
  painTypes: string[];
  activity?: string;
  notes?: string;
  demo?: boolean;
}

export interface DailyCheckIn {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  sleepHours?: number;
  /** 1 (poor) – 5 (great) */
  sleepQuality?: number;
  /** 1 (calm) – 5 (very stressed) */
  stress?: number;
  workout?: 'none' | 'light' | 'moderate' | 'hard';
  workoutType?: string;
  sittingHours?: number;
  notes?: string;
  updatedAt: string;
  demo?: boolean;
}

/** One time the person did a remedy. */
export interface RemedyLog {
  id: string;
  remedyId: string;
  doneAt: string;
  tzOffsetMin: number;
  /** The body place it was done for. */
  regionId: number;
  side: Side;
  /** How it felt straight after. */
  feeling?: 'better' | 'same' | 'worse';
  notes?: string;
  demo?: boolean;
}

/** A remedy the person has added to their plan. */
export interface PlanItem {
  remedyId: string;
  regionId: number;
  side: Side;
  addedAt: string;
  demo?: boolean;
}

export const SCHEMA_VERSION = 2;
