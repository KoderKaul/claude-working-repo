/** Pain colour ramp: one orange hue, light (mild) -> dark (severe). */
export const PAIN_RAMP = ['#fde4d6', '#f9c1a3', '#f39a70', '#eb6834', '#c84f1f', '#9c3a14', '#6e2810'];

/** Hex colour at position t (0..1) along the ramp. */
export function rampHex(t: number): string {
  const x = Math.max(0, Math.min(1, t)) * (PAIN_RAMP.length - 1);
  const i = Math.min(PAIN_RAMP.length - 2, Math.floor(x));
  const a = hexToRgb(PAIN_RAMP[i]);
  const b = hexToRgb(PAIN_RAMP[i + 1]);
  const f = x - i;
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Readable text colour on top of a ramp colour. */
export function rampInk(t: number): string {
  return t >= 0.45 ? '#ffffff' : '#0b0b0b';
}

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
