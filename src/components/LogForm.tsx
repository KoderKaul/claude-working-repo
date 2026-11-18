import { useState } from 'react';
import type { LayerKey, PainEntry, Side } from '../db/types';
import { ACTIVITIES, PAIN_TYPES } from '../lib/options';
import { REGIONS, SIDE_LABEL } from '../lib/regions';
import { structureLabel, structureType, TYPE_LABEL } from '../lib/anatomy';
import { fromLocalInput, toLocalInput } from '../lib/time';
import { Chips, IntensityPicker } from './ui';

export interface LogDraft {
  regionId: number;
  side: Side;
  structure?: { layer: LayerKey; name: string };
  intensity: number | null;
  painTypes: string[];
  activity?: string;
  notes?: string;
  occurredAt: string;
}

export function draftFromEntry(e: PainEntry): LogDraft {
  return { ...e };
}

export function LogForm({
  initial, onSave, onCancel, onDelete, saving, title,
}: {
  initial: LogDraft;
  onSave: (d: LogDraft & { intensity: number }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  saving?: boolean;
  title?: string;
}) {
  const [d, setD] = useState<LogDraft>(initial);
  const [customActivity, setCustomActivity] = useState(
    initial.activity && !ACTIVITIES.includes(initial.activity) ? initial.activity : '',
  );
  const [showWhen, setShowWhen] = useState(false);
  const set = (p: Partial<LogDraft>) => setD((x) => ({ ...x, ...p }));
  const activity = customActivity.trim() || d.activity;

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (d.intensity == null) return;
        onSave({ ...d, intensity: d.intensity, activity, notes: d.notes?.trim() || undefined });
      }}
    >
      <div className="row spread" style={{ alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          {title && <h3>{title}</h3>}
          <select
            aria-label="Body area"
            value={d.regionId}
            onChange={(e) => set({ regionId: Number(e.target.value), structure: undefined })}
            className="place-title"
            style={{ border: 0, padding: 0, minHeight: 0, background: 'transparent', width: 'auto', maxWidth: '100%' }}
          >
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
          {d.structure && (
            <div className="small muted" style={{ marginTop: 2 }}>
              {structureLabel(d.structure.name)} · {TYPE_LABEL[structureType(d.structure.name, d.structure.layer)]}{' '}
              <button type="button" className="btn ghost small" style={{ minHeight: 0, padding: '0 4px' }} onClick={() => set({ structure: undefined })}>
                remove
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="seg" role="radiogroup" aria-label="Side">
        {([1, 2, 0] as Side[]).map((s) => (
          <button key={s} type="button" role="radio" aria-checked={d.side === s} onClick={() => set({ side: s })}>
            {SIDE_LABEL[s]}
          </button>
        ))}
      </div>

      <div>
        <span className="field-label">How bad is it?</span>
        <IntensityPicker value={d.intensity} onChange={(v) => set({ intensity: v })} />
      </div>

      <div>
        <span className="field-label">What does it feel like? <span className="muted">(pick any)</span></span>
        <Chips options={PAIN_TYPES} value={d.painTypes} onChange={(v) => set({ painTypes: v })} multi />
      </div>

      <div>
        <span className="field-label">What were you doing?</span>
        <Chips options={ACTIVITIES} value={customActivity ? undefined : d.activity} onChange={(v) => { setCustomActivity(''); set({ activity: v }); }} />
        <input
          type="text"
          placeholder="Something else…"
          value={customActivity}
          onChange={(e) => setCustomActivity(e.target.value)}
          style={{ marginTop: 8 }}
          aria-label="Other activity"
        />
      </div>

      <div>
        {showWhen ? (
          <label className="field">
            <span>When</span>
            <input
              type="datetime-local"
              value={toLocalInput(d.occurredAt)}
              max={toLocalInput(new Date().toISOString())}
              onChange={(e) => e.target.value && set({ occurredAt: fromLocalInput(e.target.value) })}
            />
          </label>
        ) : (
          <button type="button" className="btn ghost small" onClick={() => setShowWhen(true)}>
            🕒 {Math.abs(Date.now() - new Date(d.occurredAt).getTime()) < 5 * 60_000 ? 'Now' : new Date(d.occurredAt).toLocaleString()} · change time
          </button>
        )}
      </div>

      <label className="field">
        <span>Notes <span className="muted">(optional)</span></span>
        <textarea value={d.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. after a long call hunched over the laptop" />
      </label>

      <div className="row">
        <button type="submit" className="btn primary" disabled={d.intensity == null || saving} style={{ flex: 1 }}>
          {d.intensity == null ? 'Pick how bad it is' : 'Save'}
        </button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
      {onDelete && (
        <button type="button" className="btn danger ghost block" onClick={onDelete}>Delete this entry</button>
      )}
    </form>
  );
}
