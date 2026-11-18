import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { clearAll, clearDemo, db } from '../db/db';
import { downloadFile, entriesToCsv, makeBackup, parseBackup } from '../lib/backup';
import { loadDemoData } from '../lib/demo';
import { todayStr } from '../lib/time';
import { useToast } from '../components/ui';

export default function MorePage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const counts = useLiveQuery(async () => ({
    entries: await db.entries.count(),
    demo: await db.entries.filter((e) => !!e.demo).count(),
    checkins: await db.checkins.count(),
  }), []);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('paino-theme') ?? 'system'; } catch { return 'system'; }
  });

  function applyTheme(t: string) {
    setTheme(t);
    try { localStorage.setItem('paino-theme', t); } catch { /* private mode */ }
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  async function exportJson() {
    const b = makeBackup(await db.entries.toArray(), await db.checkins.toArray());
    downloadFile(`paino-backup-${todayStr()}.json`, JSON.stringify(b, null, 2), 'application/json');
  }
  async function exportCsv() {
    downloadFile(`paino-entries-${todayStr()}.csv`, entriesToCsv(await db.entries.orderBy('occurredAt').toArray()), 'text/csv');
  }
  async function importFile(f: File) {
    try {
      const b = parseBackup(await f.text());
      await db.transaction('rw', db.entries, db.checkins, async () => {
        await db.entries.bulkPut(b.entries);
        await db.checkins.bulkPut(b.checkins);
      });
      toast(`Imported ${b.entries.length} entries and ${b.checkins.length} check-ins`);
    } catch (e) {
      toast((e as Error).message);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <div className="page-head"><h1>More</h1></div>

      <div className="card stack">
        <h2>Your data</h2>
        <p className="small muted" style={{ marginTop: 6 }}>
          Everything is stored only in this browser on this device ({counts?.entries ?? 0} entries, {counts?.checkins ?? 0} check-ins).
          Nothing is sent anywhere. Export a backup now and then — clearing your browser data would erase it.
        </p>
        <div className="row">
          <button className="btn" onClick={exportJson}>Download backup (.json)</button>
          <button className="btn" onClick={exportCsv}>Export spreadsheet (.csv)</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Restore from backup…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
        </div>
      </div>

      <div className="card stack">
        <h2>Sample data</h2>
        <p className="small muted" style={{ marginTop: 6 }}>
          Load six weeks of made-up entries to see how Insights works. Sample entries are marked and can be removed in one go; your own entries are untouched.
        </p>
        <div className="row">
          <button className="btn" disabled={busy} onClick={async () => { setBusy(true); const n = await loadDemoData(); setBusy(false); toast(`Loaded ${n} sample entries`); }}>
            Load sample data
          </button>
          <button className="btn" disabled={!counts?.demo} onClick={async () => { await clearDemo(); toast('Sample data removed'); }}>
            Remove sample data{counts?.demo ? ` (${counts.demo})` : ''}
          </button>
        </div>
      </div>

      <div className="card stack">
        <h2>Appearance</h2>
        <div className="seg" role="radiogroup" aria-label="Theme" style={{ marginTop: 8 }}>
          {['system', 'light', 'dark'].map((t) => (
            <button key={t} role="radio" aria-checked={theme === t} onClick={() => applyTheme(t)}>
              {t === 'system' ? 'Match device' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <p className="small muted">Tip: on your phone, use your browser's “Add to Home Screen” to open PaiNo like an app.</p>
      </div>

      <div className="card stack">
        <h2>About PaiNo</h2>
        <p className="small" style={{ marginTop: 6 }}>
          PaiNo helps you notice which parts of your body give you trouble and when. It is a personal tracking aid and does not diagnose
          or treat anything. Seek medical help for severe or sudden pain, pain after an injury, or pain with numbness, weakness, fever,
          chest pain, or loss of bladder or bowel control.
        </p>
        <p className="small muted">
          3D anatomy: <a href="https://www.z-anatomy.com" target="_blank" rel="noreferrer">Z-Anatomy</a> by Gauthier Kervyn and
          Lluís Vinent, based on BodyParts3D (© The Database Center for Life Science), licensed{' '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
          The models were simplified and split into layers for the web; the adapted models are shared under the same licence.
        </p>
      </div>

      <div className="card stack">
        <h2>Danger zone</h2>
        <button
          className="btn danger"
          style={{ marginTop: 8 }}
          onClick={async () => {
            if (!confirm('Delete ALL entries and check-ins on this device? This cannot be undone.')) return;
            await clearAll();
            toast('All data deleted');
          }}
        >
          Delete all my data
        </button>
      </div>
    </div>
  );
}
