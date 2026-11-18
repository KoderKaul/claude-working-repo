import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { PAIN_RAMP } from '../three/ramp';
import { INTENSITY_WORDS } from '../lib/options';

/** Colour for a 0–10 intensity (0 = neutral). Returns [background, text]. */
export function intensityColors(i: number): [string, string] {
  if (i <= 0) return ['var(--surface-2)', 'var(--ink-2)'];
  const idx = Math.min(PAIN_RAMP.length - 1, Math.round(((i - 1) / 9) * (PAIN_RAMP.length - 1)));
  return [PAIN_RAMP[idx], idx >= 3 ? '#ffffff' : '#0b0b0b'];
}

export function IntensityBadge({ value }: { value: number }) {
  const [bg, fg] = intensityColors(value);
  return (
    <span className="badge" style={{ background: bg, color: fg }} aria-label={`Pain ${value} out of 10`}>
      {value}
    </span>
  );
}

export function IntensityPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="intensity" role="radiogroup" aria-label="How bad is it, 0 to 10">
        {Array.from({ length: 11 }, (_, i) => {
          const [bg, fg] = intensityColors(i);
          const on = value === i;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={`${i} – ${INTENSITY_WORDS[i]}`}
              style={on || value == null || i <= (value ?? 0) ? { background: bg, color: fg } : undefined}
              onClick={() => onChange(i)}
            >
              {i}
            </button>
          );
        })}
      </div>
      <div className="intensity-word" aria-live="polite">
        {value == null ? <span className="muted">Tap a number</span> : INTENSITY_WORDS[value]}
      </div>
    </div>
  );
}

export function Chips<T extends string>({
  options, value, onChange, multi, labels,
}: {
  options: readonly T[];
  value: T[] | T | undefined;
  onChange: (v: any) => void;
  multi?: boolean;
  labels?: Partial<Record<T, string>>;
}) {
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <div className="chips">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            className="chip"
            aria-pressed={on}
            onClick={() => {
              if (multi) onChange(on ? selected.filter((x) => x !== o) : [...selected, o]);
              else onChange(on ? undefined : o);
            }}
          >
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value, onChange, step = 1, min = 0, max = 24, unit = '', label,
}: { value: number | undefined; onChange: (v: number | undefined) => void; step?: number; min?: number; max?: number; unit?: string; label: string }) {
  const v = value;
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" aria-label={`Less ${label}`} onClick={() => onChange(v == null ? min : Math.max(min, v - step))}>−</button>
      <output aria-live="polite">{v == null ? '–' : `${v}${unit}`}</output>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(v == null ? Math.min(max, 7) : Math.min(max, v + step))}>+</button>
    </div>
  );
}

export function Modal({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', k);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- toast
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => setMsg(m), []);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2600);
    return () => clearTimeout(t);
  }, [msg]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status">{msg}</div>}
    </ToastCtx.Provider>
  );
}

// ---------------------------------------------------------------- icons
const paths: Record<string, ReactNode> = {
  log: <><circle cx="12" cy="5" r="2.6" /><path d="M8 21v-6.5L6 10l6-2 6 2-2 4.5V21" /><path d="M12 13v4" /></>,
  history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  insights: <><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>,
  more: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>,
  close: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  list: <><path d="M8 6h13" /><path d="M8 12h13" /><path d="M8 18h13" /><path d="M3 6h.01" /><path d="M3 12h.01" /><path d="M3 18h.01" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
};

export function Icon({ name, size = 24 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}
