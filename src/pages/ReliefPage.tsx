import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../db/db';
import type { Side } from '../db/types';
import { remedyById, type RemedyKind } from '../data/remedies';
import { byPlace, filterByPeriod } from '../lib/insights';
import { flagsForPlace, GENERAL_WARNINGS } from '../lib/redflags';
import { atPlace, doneThisWeek, remedyEffect, suggestRemedies } from '../lib/relief';
import { REGIONS, placeLabel, SIDE_LABEL } from '../lib/regions';
import { EffectSummary, FlagList, RemedyCard, RemedyDetailModal, VerdictChip } from '../components/Relief';

const GROUPS: { label: string; kinds: RemedyKind[] }[] = [
  { label: 'Stretch & loosen up', kinds: ['stretch', 'mobility'] },
  { label: 'Strengthen', kinds: ['strengthen'] },
  { label: 'Everyday habits', kinds: ['habit'] },
  { label: 'Quick relief', kinds: ['relief'] },
];

export default function ReliefPage() {
  const [params, setParams] = useSearchParams();
  const entries = useLiveQuery(() => db.entries.toArray(), []);
  const logs = useLiveQuery(() => db.remedyLogs.toArray(), []);
  const plan = useLiveQuery(() => db.plan.toArray(), []);
  const [open, setOpen] = useState<{ id: string; regionId: number; side: Side } | null>(null);
  const [showAll, setShowAll] = useState(false);

  const spots = useMemo(() => byPlace(filterByPeriod(entries ?? [], 30)).slice(0, 6), [entries]);

  // selected place: from the URL, else the top trouble spot
  const regionParam = Number(params.get('region'));
  const regionId = regionParam || spots[0]?.regionId || 0;
  const side = (params.has('side') ? Number(params.get('side')) : regionParam ? 0 : spots[0]?.side ?? 0) as Side;
  const select = (r: number, s: Side) => {
    setParams({ region: String(r), side: String(s) }, { replace: true });
    setShowAll(false);
  };

  const data = useMemo(() => {
    if (!entries || !logs || !plan || !regionId) return null;
    const suggestions = suggestRemedies(regionId, side, entries, logs, plan);
    const triedIds = [...new Set(atPlace(logs, regionId, side).map((l) => l.remedyId))];
    return {
      flags: flagsForPlace(entries, regionId, side),
      suggestions,
      tried: triedIds.map((id) => ({ remedy: remedyById(id)!, effect: remedyEffect(entries, logs, id, regionId, side) })).filter((t) => t.remedy),
      week: doneThisWeek(logs),
      planned: new Set(plan.map((p) => p.remedyId)),
    };
  }, [entries, logs, plan, regionId, side]);

  const planRows = useMemo(() => {
    if (!entries || !logs || !plan) return [];
    return plan
      .map((p) => ({ p, remedy: remedyById(p.remedyId), effect: remedyEffect(entries, logs, p.remedyId, p.regionId, p.side) }))
      .filter((x) => x.remedy);
  }, [entries, logs, plan]);

  if (!entries || !logs || !plan) return <div className="page" />;

  const openRemedy = open && remedyById(open.id);
  const top = data?.suggestions.slice(0, 3) ?? [];
  const rest = data?.suggestions.slice(3) ?? [];

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Relief</h1>
          <p className="small muted" style={{ margin: '4px 0 0' }}>Gentle self-care ideas for your trouble spots, and whether they’re working.</p>
        </div>
      </div>

      <div className="relief-layout">
        <div className="stack">
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Which area?</h3>
            {spots.length > 0 && (
              <div className="chips" style={{ marginBottom: 10 }}>
                {spots.map((s) => (
                  <button
                    key={`${s.regionId}:${s.side}`}
                    className="chip"
                    aria-pressed={s.regionId === regionId && s.side === side}
                    onClick={() => select(s.regionId, s.side)}
                  >
                    {placeLabel(s.regionId, s.side)}
                  </button>
                ))}
              </div>
            )}
            <div className="row">
              <select value={regionId || ''} onChange={(e) => select(Number(e.target.value), side)} aria-label="Body area" style={{ flex: 1, minWidth: 160 }}>
                {!regionId && <option value="">Choose a body area…</option>}
                {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <div className="seg" role="radiogroup" aria-label="Side">
                {([1, 2, 0] as Side[]).map((s) => (
                  <button key={s} role="radio" aria-checked={side === s} onClick={() => regionId && select(regionId, s)}>
                    {SIDE_LABEL[s].split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!regionId || !data ? (
            <div className="card empty-state">
              <h2>Pick an area</h2>
              <p>Choose where it hurts to see ideas. Once you’ve logged some pain, your trouble spots appear here automatically.</p>
            </div>
          ) : (
            <>
              {data.flags.length > 0 && (
                <div className="card">
                  <h2 style={{ marginBottom: 10 }}>Check this first</h2>
                  <FlagList flags={data.flags} />
                </div>
              )}

              <div className="card">
                <div className="card-head">
                  <h2>Start here</h2>
                  <span className="small muted">{placeLabel(regionId, side)}</span>
                </div>
                <div className="remedy-list">
                  {top.map((s) => (
                    <RemedyCard key={s.remedy.id} remedy={s.remedy} reasons={s.reasons} inPlan={data.planned.has(s.remedy.id)}
                      doneCount={data.week.get(s.remedy.id)} onOpen={() => setOpen({ id: s.remedy.id, regionId, side })} />
                  ))}
                </div>
                {rest.length > 0 && (
                  showAll ? (
                    GROUPS.map((g) => {
                      const items = rest.filter((s) => g.kinds.includes(s.remedy.kind));
                      if (!items.length) return null;
                      return (
                        <div key={g.label} style={{ marginTop: 16 }}>
                          <h3 style={{ marginBottom: 8 }}>{g.label}</h3>
                          <div className="remedy-list">
                            {items.map((s) => (
                              <RemedyCard key={s.remedy.id} remedy={s.remedy} reasons={s.reasons} inPlan={data.planned.has(s.remedy.id)}
                                doneCount={data.week.get(s.remedy.id)} onOpen={() => setOpen({ id: s.remedy.id, regionId, side })} />
                            ))}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <button className="btn block" style={{ marginTop: 12 }} onClick={() => setShowAll(true)}>
                      Show {rest.length} more ideas
                    </button>
                  )
                )}
              </div>

              {data.tried.length > 0 && (
                <div className="card">
                  <div className="card-head"><h2>Is it working?</h2><span className="small muted">{placeLabel(regionId, side)}</span></div>
                  {data.tried.map(({ remedy, effect }) => (
                    <div key={remedy.id} className="effect-row">
                      <div className="row spread">
                        <button className="link-btn" onClick={() => setOpen({ id: remedy.id, regionId, side })}>{remedy.title}</button>
                        <VerdictChip verdict={effect.verdict} />
                      </div>
                      <div className="small muted" style={{ margin: '2px 0 6px' }}>Done {effect.timesDone}× since {new Date(effect.firstDone!).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</div>
                      <EffectSummary effect={effect} />
                    </div>
                  ))}
                  <p className="small muted" style={{ margin: '8px 0 0' }}>
                    Compares your pain here in the 2 weeks before you started with the time since. Pain changes for many reasons, so treat this as a hint, not proof.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-head"><h2>My plan</h2><span className="small muted">this week</span></div>
            {!planRows.length ? (
              <p className="small muted" style={{ margin: 0 }}>Open an idea and tap <b>Add to plan</b> to keep it here.</p>
            ) : (
              planRows.map(({ p, remedy, effect }) => (
                <button key={p.remedyId} className="entry-row" onClick={() => setOpen({ id: p.remedyId, regionId: p.regionId, side: p.side })}>
                  <span className="plan-count num" aria-label={`done ${data?.week.get(p.remedyId) ?? 0} times this week`}>{data?.week.get(p.remedyId) ?? 0}×</span>
                  <div className="grow">
                    <div className="title">{remedy!.title}</div>
                    <div className="sub">{placeLabel(p.regionId, p.side)} · {remedy!.dose}</div>
                  </div>
                  <VerdictChip verdict={effect.verdict} />
                </button>
              ))
            )}
          </div>

          <div className="card">
            <h2 style={{ marginBottom: 8 }}>See a doctor if you have…</h2>
            <ul className="warn-list">{GENERAL_WARNINGS.map((w) => <li key={w}>{w}</li>)}</ul>
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              These ideas are general self-care for everyday aches — not a diagnosis. A GP or physiotherapist can tailor a plan to you.
              For chest pain, sudden severe pain, or numbness with loss of bladder or bowel control, get emergency help.
            </p>
          </div>
          {!entries.length && (
            <p className="small muted">Tip: log pain on the <Link to="/">Log</Link> screen and ideas will be tailored to what you were doing and how it feels.</p>
          )}
        </div>
      </div>

      {openRemedy && open && (
        <RemedyDetailModal
          remedy={openRemedy}
          regionId={open.regionId}
          side={open.side}
          inPlan={!!data?.planned.has(open.id) || plan.some((p) => p.remedyId === open.id)}
          effect={remedyEffect(entries, logs, open.id, open.regionId, open.side)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
