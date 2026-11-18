import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/db';
import type { DailyCheckIn, PainEntry } from '../db/types';
import { REGIONS, placeLabel } from '../lib/regions';
import { formatTime, localDate } from '../lib/time';
import { structureLabel } from '../lib/anatomy';
import { IntensityBadge } from '../components/ui';
import { CheckInModal, EditEntryModal } from '../components/Modals';

function checkInText(c: DailyCheckIn) {
  return [
    c.sleepHours != null && `😴 ${c.sleepHours} h`,
    c.stress != null && `stress ${c.stress}/5`,
    c.workout && (c.workout === 'none' ? 'rest day' : `${c.workout} ${c.workoutType || 'workout'}`),
    c.sittingHours != null && `${c.sittingHours} h sitting`,
  ].filter(Boolean).join(' · ');
}

export default function HistoryPage() {
  const entries = useLiveQuery(() => db.entries.orderBy('occurredAt').reverse().toArray(), []);
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const [region, setRegion] = useState<number | 0>(0);
  const [editId, setEditId] = useState<string | null>(null);
  const [checkInDate, setCheckInDate] = useState<string | null>(null);
  const [limitDays, setLimitDays] = useState(30);

  const days = useMemo(() => {
    if (!entries) return [];
    const ci = new Map((checkins ?? []).map((c) => [c.date, c]));
    const groups = new Map<string, PainEntry[]>();
    for (const e of entries) {
      if (region && e.regionId !== region) continue;
      const d = localDate(e);
      if (!groups.has(d)) groups.set(d, []);
      groups.get(d)!.push(e);
    }
    if (!region) for (const c of checkins ?? []) if (!groups.has(c.date)) groups.set(c.date, []);
    return [...groups.keys()].sort().reverse().map((d) => ({ date: d, entries: groups.get(d)!, checkIn: ci.get(d) }));
  }, [entries, checkins, region]);

  if (!entries) return <div className="page" />;

  return (
    <div className="page">
      <div className="page-head">
        <h1>History</h1>
        <select value={region} onChange={(e) => setRegion(Number(e.target.value))} style={{ width: 'auto' }} aria-label="Filter by body area">
          <option value={0}>All body areas</option>
          {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      {!days.length ? (
        <div className="card empty-state">
          <h2>No entries yet</h2>
          <p>Log your first pain on the <Link to="/">Log</Link> screen, or load sample data in <Link to="/more">More</Link> to explore.</p>
        </div>
      ) : (
        <div className="card">
          {days.slice(0, limitDays).map((day) => (
            <section key={day.date}>
              <div className="day-head">
                <h2>{new Date(day.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</h2>
                <button className="btn ghost small" onClick={() => setCheckInDate(day.date)}>
                  {day.checkIn ? 'Edit check-in' : '+ check-in'}
                </button>
              </div>
              {day.checkIn && checkInText(day.checkIn) && <p className="small muted" style={{ margin: '-4px 0 6px' }}>{checkInText(day.checkIn)}</p>}
              {day.entries.length === 0 && <p className="small muted" style={{ margin: '0 0 6px' }}>No pain logged.</p>}
              {day.entries.map((e) => (
                <button key={e.id} className="entry-row" onClick={() => setEditId(e.id)}>
                  <IntensityBadge value={e.intensity} />
                  <div className="grow">
                    <div className="title">{placeLabel(e.regionId, e.side)}</div>
                    <div className="sub">
                      {[formatTime(e.occurredAt), e.structure && structureLabel(e.structure.name), e.activity, e.painTypes.join(', '), e.notes].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  {e.demo && <span className="pill">sample</span>}
                </button>
              ))}
            </section>
          ))}
          {days.length > limitDays && (
            <button className="btn block" style={{ marginTop: 12 }} onClick={() => setLimitDays((n) => n + 30)}>Show older days</button>
          )}
        </div>
      )}

      {editId && <EditEntryModal id={editId} onClose={() => setEditId(null)} />}
      {checkInDate && <CheckInModal date={checkInDate} onClose={() => setCheckInDate(null)} />}
    </div>
  );
}
