import { REGIONS } from '../lib/regions';

/** Quick list alternative to tapping the 3D body. */
export function RegionPicker({ onPick }: { onPick: (regionId: number) => void }) {
  return (
    <div className="region-list">
      {REGIONS.map((r) => (
        <button key={r.id} type="button" onClick={() => onPick(r.id)}>{r.label}</button>
      ))}
    </div>
  );
}
