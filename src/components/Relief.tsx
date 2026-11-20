import { lazy, Suspense, useMemo, useState } from 'react';
import type { LayerKey, RemedyLog, Side } from '../db/types';
import { KIND_LABEL, type Remedy } from '../data/remedies';
import { LEVEL_LABEL, type RedFlag } from '../lib/redflags';
import type { Effect, Verdict } from '../lib/relief';
import { logRemedy, setRemedyFeeling, togglePlan } from '../db/db';
import { placeLabel } from '../lib/regions';
import { webglAvailable } from '../three/webgl';
import { Modal, useToast } from './ui';

const BodyViewer = lazy(() => import('../three/BodyViewer'));

// ---------------------------------------------------------------- red flags

const LEVEL_ICON = { emergency: '⚠', doctor: '✚', check: 'ℹ' } as const;

export function FlagList({ flags, compact }: { flags: RedFlag[]; compact?: boolean }) {
  if (!flags.length) return null;
  return (
    <div className="flags" role="alert">
      {flags.map((f) => (
        <div key={f.id} className={`flag flag-${f.level}`}>
          <div className="flag-head">
            <span className="flag-icon" aria-hidden>{LEVEL_ICON[f.level]}</span>
            <span className="flag-level">{LEVEL_LABEL[f.level]}</span>
            <b>{f.title}</b>
          </div>
          {!compact && <p>{f.message}</p>}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- verdicts

const VERDICT: Record<Verdict, { label: string; icon: string; cls: string }> = {
  helping: { label: 'Looks like it’s helping', icon: '✓', cls: 'good' },
  'no-change': { label: 'No clear change yet', icon: '–', cls: 'neutral' },
  worse: { label: 'Pain went up', icon: '↑', cls: 'bad' },
  'too-early': { label: 'Too early to tell', icon: '…', cls: 'muted' },
};

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return <span className={`verdict verdict-${v.cls}`}><span aria-hidden>{v.icon}</span> {v.label}</span>;
}

export function EffectSummary({ effect }: { effect: Effect }) {
  const { before: b, after: a, feedback: f } = effect;
  const felt = [f.better && `${f.better}× better`, f.same && `${f.same}× same`, f.worse && `${f.worse}× worse`].filter(Boolean).join(', ');
  return (
    <div className="effect">
      <div className="effect-cols">
        <div>
          <div className="small muted">2 weeks before</div>
          <div className="effect-num">{b.avg ?? '–'}<span className="small muted"> avg</span></div>
          <div className="small muted">{b.perWeek}× a week</div>
        </div>
        <div className="effect-arrow" aria-hidden>→</div>
        <div>
          <div className="small muted">Since starting{a.days ? ` (${a.days} d)` : ''}</div>
          <div className="effect-num">{a.avg ?? '–'}<span className="small muted"> avg</span></div>
          <div className="small muted">{a.perWeek}× a week</div>
        </div>
      </div>
      {felt && <div className="small muted">Right after doing it you felt: {felt}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- remedy card

export function RemedyCard({
  remedy, reasons, inPlan, doneCount, onOpen,
}: { remedy: Remedy; reasons?: string[]; inPlan?: boolean; doneCount?: number; onOpen: () => void }) {
  return (
    <button className="remedy-card" onClick={onOpen}>
      <div className="row spread" style={{ alignItems: 'baseline', flexWrap: 'nowrap' }}>
        <span className="remedy-title">{remedy.title}</span>
        <span className={`pill kind-${remedy.kind}`}>{KIND_LABEL[remedy.kind]}</span>
      </div>
      <div className="small" style={{ color: 'var(--ink-2)', marginTop: 2 }}>{remedy.why}</div>
      {reasons && reasons.length > 0 && <div className="small reason">★ {reasons[0]}</div>}
      <div className="small muted" style={{ marginTop: 4 }}>
        {remedy.dose}
        {inPlan && ' · in your plan'}
        {doneCount ? ` · done ${doneCount}× this week` : ''}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------- detail

export function RemedyDetailModal({
  remedy, regionId, side, inPlan, effect, onClose,
}: { remedy: Remedy; regionId: number; side: Side; inPlan: boolean; effect?: Effect; onClose: () => void }) {
  const toast = useToast();
  const [depth, setDepth] = useState<LayerKey>('muscles');
  const [asking, setAsking] = useState<RemedyLog | null>(null);
  const has3d = useMemo(webglAvailable, []);
  const highlight = useMemo(() => (remedy.targets ? { names: remedy.targets, side } : null), [remedy, side]);

  return (
    <Modal onClose={onClose} label={remedy.title}>
      <div className="stack">
        <div>
          <div className="row spread">
            <span className={`pill kind-${remedy.kind}`}>{KIND_LABEL[remedy.kind]}</span>
            <button className="btn ghost small" onClick={onClose} aria-label="Close">✕</button>
          </div>
          <h2 style={{ fontSize: 21, marginTop: 6 }}>{remedy.title}</h2>
          <p className="small muted" style={{ margin: '4px 0 0' }}>For your {placeLabel(regionId, side).toLowerCase()}</p>
        </div>
        <p style={{ margin: 0 }}>{remedy.why}</p>

        {remedy.targets && has3d && (
          <div>
            <Suspense fallback={<div className="viewer remedy-viewer" />}>
              <BodyViewer className="remedy-viewer" depth={depth} onDepthChange={setDepth} highlight={highlight} focusView={remedy.view ?? 'front'} />
            </Suspense>
            <p className="small muted" style={{ margin: '6px 0 0' }}><span className="swatch-good" /> Muscles this works</p>
          </div>
        )}

        <div>
          <h3>How to do it</h3>
          <ol className="steps">{remedy.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p style={{ margin: '6px 0 0' }}><b>How much:</b> {remedy.dose}</p>
        </div>
        <div className="notice">
          {remedy.caution && <><b>Careful:</b> {remedy.caution}<br /></>}
          Go gently. Mild stretching or effort is fine; stop if pain becomes sharp, shooting, or is worse afterwards.
        </div>

        {effect && effect.timesDone > 0 && (
          <div className="card" style={{ boxShadow: 'none' }}>
            <div className="card-head"><h3>Is it working?</h3><VerdictChip verdict={effect.verdict} /></div>
            <EffectSummary effect={effect} />
          </div>
        )}

        {asking ? (
          <FeelingPrompt log={asking} onDone={() => { setAsking(null); onClose(); }} />
        ) : (
          <div className="row">
            <button
              className="btn primary"
              style={{ flex: 1 }}
              onClick={async () => setAsking(await logRemedy({ remedyId: remedy.id, regionId, side, doneAt: new Date().toISOString() }))}
            >
              ✓ I did this
            </button>
            <button
              className="btn"
              onClick={async () => toast((await togglePlan({ remedyId: remedy.id, regionId, side })) ? 'Added to your plan' : 'Removed from your plan')}
            >
              {inPlan ? '★ In my plan' : '☆ Add to plan'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/** One-tap "how does it feel now?" after doing a remedy. */
export function FeelingPrompt({ log, onDone }: { log: RemedyLog; onDone: () => void }) {
  const toast = useToast();
  const answer = async (feeling: RemedyLog['feeling'] | null) => {
    if (feeling) await setRemedyFeeling(log.id, feeling);
    toast('Nice work — logged');
    onDone();
  };
  return (
    <div className="feeling" role="group" aria-label="How does it feel now?">
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Logged. How does it feel now?</div>
      <div className="row">
        <button className="btn" onClick={() => answer('better')}>🙂 Better</button>
        <button className="btn" onClick={() => answer('same')}>😐 Same</button>
        <button className="btn" onClick={() => answer('worse')}>🙁 Worse</button>
        <button className="btn ghost" onClick={() => answer(null)}>Skip</button>
      </div>
    </div>
  );
}
