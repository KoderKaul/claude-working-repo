import { useState } from 'react';
import type { DailyCheckIn } from '../db/types';
import { Chips, Stepper } from './ui';

const WORKOUTS = ['none', 'light', 'moderate', 'hard'] as const;
const WORKOUT_LABEL = { none: 'Rest day', light: 'Light', moderate: 'Moderate', hard: 'Hard' };
const ONE_TO_FIVE = ['1', '2', '3', '4', '5'] as const;

export function CheckInForm({
  initial, onSave, onCancel,
}: { initial: DailyCheckIn | Omit<DailyCheckIn, 'updatedAt'>; onSave: (c: Omit<DailyCheckIn, 'updatedAt'>) => void; onCancel: () => void }) {
  const [c, setC] = useState(initial);
  const set = (p: Partial<DailyCheckIn>) => setC((x) => ({ ...x, ...p }));
  return (
    <form className="stack" onSubmit={(e) => { e.preventDefault(); const { updatedAt: _u, ...rest } = c as DailyCheckIn; onSave({ ...rest, demo: false }); }}>
      <div>
        <h2>Daily check-in</h2>
        <p className="small muted" style={{ margin: '4px 0 0' }}>
          {new Date(c.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })} · all optional, helps spot patterns
        </p>
      </div>
      <div className="row spread">
        <span className="field-label" style={{ margin: 0 }}>Hours of sleep</span>
        <Stepper label="sleep" value={c.sleepHours} onChange={(v) => set({ sleepHours: v })} step={0.5} max={14} unit=" h" />
      </div>
      <div>
        <span className="field-label">Sleep quality <span className="muted">1 = poor, 5 = great</span></span>
        <Chips options={ONE_TO_FIVE} value={c.sleepQuality ? String(c.sleepQuality) as any : undefined} onChange={(v) => set({ sleepQuality: v ? Number(v) : undefined })} />
      </div>
      <div>
        <span className="field-label">Stress <span className="muted">1 = calm, 5 = very stressed</span></span>
        <Chips options={ONE_TO_FIVE} value={c.stress ? String(c.stress) as any : undefined} onChange={(v) => set({ stress: v ? Number(v) : undefined })} />
      </div>
      <div>
        <span className="field-label">Workout</span>
        <Chips options={WORKOUTS} labels={WORKOUT_LABEL} value={c.workout} onChange={(v) => set({ workout: v })} />
        {c.workout && c.workout !== 'none' && (
          <input type="text" style={{ marginTop: 8 }} placeholder="What kind? e.g. running, weights, yoga" value={c.workoutType ?? ''} onChange={(e) => set({ workoutType: e.target.value })} aria-label="Workout type" />
        )}
      </div>
      <div className="row spread">
        <span className="field-label" style={{ margin: 0 }}>Hours sitting</span>
        <Stepper label="sitting" value={c.sittingHours} onChange={(v) => set({ sittingHours: v })} step={1} max={18} unit=" h" />
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea value={c.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything unusual today?" />
      </label>
      <div className="row">
        <button type="submit" className="btn primary" style={{ flex: 1 }}>Save check-in</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
