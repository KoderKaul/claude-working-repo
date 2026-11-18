import { lazy, Suspense, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { addEntry, db } from '../db/db';
import type { LayerKey } from '../db/types';
import { LogForm, type LogDraft } from '../components/LogForm';
import { RegionPicker } from '../components/RegionPicker';
import { IntensityBadge, useToast } from '../components/ui';
import { EditEntryModal, CheckInModal } from '../components/Modals';
import { placeLabel } from '../lib/regions';
import { formatTime, localDate, todayStr } from '../lib/time';
import { structureLabel } from '../lib/anatomy';
import type { Pick } from '../three/layers';
import { webglAvailable } from '../three/webgl';

const BodyViewer = lazy(() => import('../three/BodyViewer'));

export default function LogPage() {
  const toast = useToast();
  const [depth, setDepth] = useState<LayerKey>('skin');
  const [pick, setPick] = useState<Pick | null>(null);
  const [draft, setDraft] = useState<LogDraft | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [listOpen, setListOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const has3d = useMemo(webglAvailable, []);

  const today = todayStr();
  const todays = useLiveQuery(
    async () => (await db.entries.orderBy('occurredAt').reverse().limit(60).toArray()).filter((e) => localDate(e) === today),
    [today],
  );
  const checkIn = useLiveQuery(() => db.checkins.get(today), [today]);

  function start(d: Omit<LogDraft, 'intensity' | 'painTypes' | 'occurredAt'>) {
    setDraft({ ...d, intensity: null, painTypes: [], occurredAt: new Date().toISOString() });
    setFormKey((k) => k + 1);
    setListOpen(false);
  }

  function onPick(p: Pick) {
    if (!p.regionId) return;
    setPick(p);
    start({
      regionId: p.regionId,
      side: p.side,
      structure: p.layer === 'skin' ? undefined : { layer: p.layer, name: p.partName },
    });
  }

  function close() {
    setDraft(null);
    setPick(null);
  }

  return (
    <div className="page">
      <div className="log-layout">
        <div>
          {has3d ? (
            <Suspense fallback={<div className="viewer" style={{ display: 'grid', placeItems: 'center' }}><div className="spinner" /></div>}>
              <BodyViewer
                depth={depth}
                onDepthChange={setDepth}
                onPick={onPick}
                selectedPart={pick && draft ? { layer: pick.layer, part: pick.part } : null}
                selectedPlace={draft ? { regionId: draft.regionId, side: draft.side } : null}
              />
            </Suspense>
          ) : (
            <div className="card">
              <h2>3D view isn't available on this device</h2>
              <p className="muted">You can still log pain by picking a body area from the list.</p>
              <RegionPicker onPick={(id) => start({ regionId: id, side: 0 })} />
            </div>
          )}
        </div>

        <div className="stack">
          {draft ? (
            <>
              <div className="sheet-backdrop" onClick={close} />
              <div className="card sheet">
                <LogForm
                  key={formKey}
                  initial={draft}
                  title="Log pain"
                  onCancel={close}
                  onSave={async (d) => {
                    await addEntry({ ...d });
                    toast(`Saved · ${placeLabel(d.regionId, d.side)}`);
                    close();
                  }}
                />
              </div>
            </>
          ) : (
            <div className="card">
              <h1>Where does it hurt?</h1>
              <p className="muted" style={{ margin: '6px 0 12px' }}>
                Tap the body. Drag to turn it, pinch or scroll to zoom. Switch to <b>Muscles</b>, <b>Ligaments</b> or{' '}
                <b>Bones</b> to point at a specific structure.
              </p>
              <button className="btn block" onClick={() => setListOpen((o) => !o)} aria-expanded={listOpen}>
                {listOpen ? 'Hide list' : 'Or pick from a list'}
              </button>
              {listOpen && (
                <div style={{ marginTop: 12 }}>
                  <RegionPicker onPick={(id) => start({ regionId: id, side: 0 })} />
                </div>
              )}
            </div>
          )}

          <div className="card">
            <div className="card-head">
              <h2>Today</h2>
              <button className="btn small" onClick={() => setCheckInOpen(true)}>
                {checkIn ? 'Edit check-in' : '+ Daily check-in'}
              </button>
            </div>
            {checkIn && (
              <p className="small muted" style={{ margin: '0 0 8px' }}>
                {[
                  checkIn.sleepHours != null && `Slept ${checkIn.sleepHours} h`,
                  checkIn.stress != null && `stress ${checkIn.stress}/5`,
                  checkIn.workout && checkIn.workout !== 'none' && `${checkIn.workout} workout`,
                  checkIn.sittingHours != null && `${checkIn.sittingHours} h sitting`,
                ].filter(Boolean).join(' · ')}
              </p>
            )}
            {!todays?.length ? (
              <p className="muted small" style={{ margin: 0 }}>Nothing logged yet today. You can log as many times as you like.</p>
            ) : (
              <div>
                {todays.map((e) => (
                  <button key={e.id} className="entry-row" onClick={() => setEditId(e.id)}>
                    <IntensityBadge value={e.intensity} />
                    <div className="grow">
                      <div className="title">{placeLabel(e.regionId, e.side)}</div>
                      <div className="sub">
                        {[formatTime(e.occurredAt), e.structure && structureLabel(e.structure.name), e.activity, e.painTypes.join(', ')].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div style={{ marginTop: 10 }}><Link to="/history" className="small">See all history →</Link></div>
          </div>

          <p className="small muted" style={{ margin: '4px 2px' }}>
            PaiNo is a tracking aid, not medical advice. If pain is severe, sudden, or comes with numbness, weakness,
            fever or loss of bladder/bowel control, see a doctor.
          </p>
        </div>
      </div>

      {editId && <EditEntryModal id={editId} onClose={() => setEditId(null)} />}
      {checkInOpen && <CheckInModal date={today} onClose={() => setCheckInOpen(false)} />}
    </div>
  );
}
