import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { db } from '../db/db';
import type { LayerKey, Side } from '../db/types';
import {
  activityStats, byHour, byPlace, dailySeries, filterByPeriod, lifestyleComparisons, painTypeStats,
  placeLoad, placeTimeGrid, summary,
} from '../lib/insights';
import { DAY_PARTS, hourLabel, todayStr } from '../lib/time';
import { REGIONS, placeLabel, regionLabel, SIDE_LABEL } from '../lib/regions';
import { PAIN_RAMP, rampHex, rampInk } from '../three/ramp';
import { webglAvailable } from '../three/webgl';
import type { Pick } from '../three/layers';

const BodyViewer = lazy(() => import('../three/BodyViewer'));

const PERIODS: { label: string; days: number | null }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: null },
];

/** Chart colours that follow light/dark mode. */
function useChartColors() {
  const query = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const read = () => {
    const attr = document.documentElement.getAttribute('data-theme');
    const dark = attr ? attr === 'dark' : !!query?.matches;
    return dark
      ? { grid: '#2c2c2a', axis: '#383835', tick: '#898781', s1: '#d95926', s2: '#3987e5', cursor: 'rgba(255,255,255,0.06)' }
      : { grid: '#e1e0d9', axis: '#c3c2b7', tick: '#898781', s1: '#eb6834', s2: '#2a78d6', cursor: 'rgba(0,0,0,0.04)' };
  };
  const [c, setC] = useState(read);
  useEffect(() => {
    const f = () => setC(read());
    query?.addEventListener('change', f);
    const mo = new MutationObserver(f);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { query?.removeEventListener('change', f); mo.disconnect(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return c;
}

function Tip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="t">{fmt ? fmt(label) : label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="row" style={{ gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color, display: 'inline-block' }} />
          {p.name}: <b className="num">{p.value ?? '–'}</b>
        </div>
      ))}
    </div>
  );
}

export default function InsightsPage() {
  const all = useLiveQuery(() => db.entries.toArray(), []);
  const checkins = useLiveQuery(() => db.checkins.toArray(), []);
  const [period, setPeriod] = useState<number | null>(30);
  const [region, setRegion] = useState(0);
  const [depth, setDepth] = useState<LayerKey>('skin');
  const [picked, setPicked] = useState<{ regionId: number; side: Side } | null>(null);
  const colors = useChartColors();
  const has3d = useMemo(webglAvailable, []);

  const inPeriod = useMemo(() => filterByPeriod(all ?? [], period), [all, period]);
  const entries = useMemo(() => (region ? inPeriod.filter((e) => e.regionId === region) : inPeriod), [inPeriod, region]);

  const data = useMemo(() => {
    const now = new Date();
    const first = entries.length ? entries.map((e) => e.occurredAt).sort()[0] : now.toISOString();
    const from = period ? todayStr(new Date(now.getTime() - (period - 1) * 86400000)) : todayStr(new Date(first));
    const heat = placeLoad(inPeriod);
    const periodCheckins = (checkins ?? []).filter((c) => c.date >= from);
    return {
      sum: summary(entries),
      places: byPlace(entries),
      hours: byHour(entries).map((h) => ({ ...h, label: hourLabel(h.hour) })),
      grid: placeTimeGrid(entries, 6),
      daily: dailySeries(entries, from, todayStr(now)),
      activities: activityStats(entries).slice(0, 8),
      types: painTypeStats(entries).slice(0, 8),
      lifestyle: lifestyleComparisons(entries, periodCheckins),
      heat,
      heatMax: Math.max(1, ...heat.values()),
    };
  }, [entries, inPeriod, checkins, period]);

  if (!all) return <div className="page" />;

  if (!all.length) {
    return (
      <div className="page">
        <div className="page-head"><h1>Insights</h1></div>
        <div className="card empty-state">
          <h2>Nothing to analyse yet</h2>
          <p>Log pain for a few days and patterns will show up here.<br />Want a preview? <Link to="/more">Load sample data</Link>.</p>
        </div>
      </div>
    );
  }

  const gridMax = Math.max(1, ...data.grid.flatMap((r) => r.cells.map((c) => c.count)));
  const pickedPlace = picked && data.places.find((p) => p.regionId === picked.regionId && (p.side === picked.side || p.side === 0));
  const s = data.sum;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Insights</h1>
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="Time period">
            {PERIODS.map((p) => (
              <button key={p.label} role="radio" aria-checked={period === p.days} onClick={() => setPeriod(p.days)}>{p.label}</button>
            ))}
          </div>
          <select value={region} onChange={(e) => setRegion(Number(e.target.value))} style={{ width: 'auto' }} aria-label="Body area">
            <option value={0}>All body areas</option>
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {!entries.length ? (
        <div className="card empty-state"><h2>No entries in this period</h2><p>Try a longer time period or another body area.</p></div>
      ) : (
        <>
          <div className="kpis">
            <div className="kpi"><div className="label">Entries</div><div className="value">{s.count}</div><div className="sub">on {s.painDays} day{s.painDays === 1 ? '' : 's'}</div></div>
            <div className="kpi"><div className="label">Average pain</div><div className="value">{s.avg}<span className="muted small"> / 10</span></div><div className="sub">across all entries</div></div>
            <div className="kpi"><div className="label">Most trouble</div><div className="value text">{s.worstPlace ? placeLabel(s.worstPlace.regionId, s.worstPlace.side) : '–'}</div><div className="sub">{s.worstPlace ? `${s.worstPlace.count} entries, avg ${s.worstPlace.avg}` : ''}</div></div>
            <div className="kpi"><div className="label">Usually worst</div><div className="value text">{s.peakDayPart?.label ?? '–'}</div><div className="sub">{s.peakDayPart ? `${s.peakDayPart.range} · ${s.peakDayPart.count} entries` : ''}</div></div>
          </div>

          <div className="insight-grid">
            {has3d && (
              <div className="card">
                <div className="card-head">
                  <h2>Where it hurts</h2>
                  <span className="small muted">all areas · {PERIODS.find((p) => p.days === period)?.label}</span>
                </div>
                <Suspense fallback={<div className="viewer heat-viewer" />}>
                  <BodyViewer
                    className="heat-viewer"
                    depth={depth}
                    onDepthChange={setDepth}
                    heat={data.heat}
                    heatMax={data.heatMax}
                    selectedPlace={picked}
                    onPick={(p: Pick) => setPicked({ regionId: p.regionId, side: p.side })}
                  />
                </Suspense>
                <div className="row spread" style={{ marginTop: 10 }}>
                  <div className="legend">
                    Less
                    <span className="ramp">{PAIN_RAMP.map((c) => <span key={c} style={{ background: c }} />)}</span>
                    More pain <span className="muted">(intensity × times logged)</span>
                  </div>
                </div>
                <p className="small" style={{ margin: '8px 0 0', minHeight: 20 }}>
                  {picked
                    ? pickedPlace
                      ? <><b>{placeLabel(pickedPlace.regionId, pickedPlace.side)}</b>: {pickedPlace.count} entries, average {pickedPlace.avg}, worst {pickedPlace.max}{pickedPlace.peakDayPart && `, mostly ${DAY_PARTS.find((d) => d.key === pickedPlace.peakDayPart)!.label.toLowerCase()}`}.</>
                      : <><b>{regionLabel(picked.regionId)} · {SIDE_LABEL[picked.side].toLowerCase()}</b>: nothing logged here in this period.</>
                    : <span className="muted">Tap an area for details.</span>}
                </p>
              </div>
            )}

            <div className="card">
              <div className="card-head"><h2>When it hurts</h2><span className="small muted">times logged</span></div>
              <div className="table-scroll">
                <table className="grid-table">
                  <thead>
                    <tr>
                      <th />
                      {DAY_PARTS.map((d) => <th key={d.key} scope="col">{d.label}<br /><span className="muted" style={{ fontWeight: 400 }}>{d.range}</span></th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.grid.map((row) => (
                      <tr key={`${row.place.regionId}:${row.place.side}`}>
                        <th scope="row">{placeLabel(row.place.regionId, row.place.side)}</th>
                        {row.cells.map((c) => {
                          if (!c.count) return <td key={c.dayPart} className="cell empty">·</td>;
                          const t = 0.15 + 0.85 * (c.count / gridMax);
                          return (
                            <td key={c.dayPart} className="cell" style={{ background: rampHex(t), color: rampInk(t) }} title={`${c.count} entries, average pain ${c.avg}`}>
                              {c.count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="legend" style={{ marginTop: 10 }}>
                Fewer <span className="ramp">{PAIN_RAMP.map((c) => <span key={c} style={{ background: c }} />)}</span> More often
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h2>Hour of day</h2><span className="small muted">times logged</span></div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={data.hours} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={colors.grid} />
                    <XAxis dataKey="hour" tickFormatter={(h) => (h % 6 === 0 ? hourLabel(h) : '')} interval={0} tick={{ fill: colors.tick, fontSize: 12 }} axisLine={{ stroke: colors.axis }} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: colors.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: colors.cursor }} content={(p: any) => p.active && p.payload?.length ? (
                      <div className="chart-tooltip"><div className="t">{hourLabel(p.payload[0].payload.hour)}</div>{p.payload[0].payload.count} entries{p.payload[0].payload.avg != null && <> · avg pain {p.payload[0].payload.avg}</>}</div>
                    ) : null} />
                    <Bar dataKey="count" name="Entries" fill={colors.s1} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-head"><h2>Pain over time</h2><span className="small muted">0–10 per day</span></div>
              <div style={{ height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={data.daily} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={colors.grid} />
                    <XAxis dataKey="date" tickFormatter={(d) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} minTickGap={28} tick={{ fill: colors.tick, fontSize: 12 }} axisLine={{ stroke: colors.axis }} tickLine={false} />
                    <YAxis domain={[0, 10]} ticks={[0, 5, 10]} tick={{ fill: colors.tick, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<Tip fmt={(d: string) => new Date(d + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} />} />
                    <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
                    <Line type="monotone" dataKey="max" name="Worst" stroke={colors.s1} strokeWidth={2} dot={data.daily.length <= 31 ? { r: 3 } : false} connectNulls={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="avg" name="Average" stroke={colors.s2} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="small muted" style={{ margin: '6px 0 0' }}>Gaps are days with nothing logged.</p>
            </div>

            <div className="card">
              <div className="card-head"><h2>What you were doing</h2><span className="small muted">times logged · avg pain</span></div>
              {!data.activities.length ? <p className="muted small">No activities recorded yet.</p> : (
                data.activities.map((a) => (
                  <div key={a.label} className="compare-bar">
                    <span className="lbl">{a.label}</span>
                    <span className="track"><span className="fill" style={{ width: `${(a.count / data.activities[0].count) * 100}%`, background: colors.s1 }} /></span>
                    <span className="val">{a.count} · avg {a.avg}</span>
                  </div>
                ))
              )}
            </div>

            <div className="card">
              <div className="card-head"><h2>Your days vs. your pain</h2><span className="small muted">avg worst pain that day</span></div>
              {!data.lifestyle.length ? (
                <p className="muted small" style={{ margin: 0 }}>
                  Fill in the daily check-in (sleep, stress, workout, sitting) on a few days and PaiNo will compare how much it hurt on different kinds of days.
                </p>
              ) : (
                data.lifestyle.map((f) => (
                  <div key={f.factor} style={{ marginBottom: 12 }}>
                    <h3 style={{ marginBottom: 4 }}>{f.factor}</h3>
                    {f.groups.map((g) => (
                      <div key={g.label} className="compare-bar">
                        <span className="lbl">{g.label}</span>
                        <span className="track"><span className="fill" style={{ width: `${(g.avgWorst / 10) * 100}%`, background: colors.s1 }} /></span>
                        <span className="val">{g.avgWorst} <span className="muted">({g.days} d)</span></span>
                      </div>
                    ))}
                  </div>
                ))
              )}
              <p className="small muted" style={{ margin: 0 }}>Patterns, not proof: other things can explain a difference.</p>
            </div>

            <div className="card span-2">
              <div className="card-head"><h2>Trouble spots</h2><span className="small muted">ranked by total pain</span></div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead><tr><th>Body area</th><th>Entries</th><th>Avg</th><th>Worst</th><th>Usually</th><th>Often while</th><th>Feels</th></tr></thead>
                  <tbody>
                    {data.places.slice(0, 12).map((p) => (
                      <tr key={`${p.regionId}:${p.side}`}>
                        <td><b>{placeLabel(p.regionId, p.side)}</b></td>
                        <td>{p.count}</td>
                        <td>{p.avg}</td>
                        <td>{p.max}</td>
                        <td>{p.peakDayPart ? DAY_PARTS.find((d) => d.key === p.peakDayPart)!.label : '–'}</td>
                        <td>{p.topActivity ?? '–'}</td>
                        <td>{p.topPainType ?? '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.types.length > 0 && (
                <p className="small muted" style={{ margin: '10px 0 0' }}>
                  Most common feelings: {data.types.slice(0, 5).map((t) => `${t.label} (${t.count})`).join(', ')}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
