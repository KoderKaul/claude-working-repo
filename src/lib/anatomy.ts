import type { LayerKey, Side } from '../db/types';

export type StructureType =
  | 'muscle' | 'tendon' | 'fascia' | 'ligament' | 'capsule' | 'disc'
  | 'cartilage' | 'bursa' | 'bone' | 'skin';

/** Side encoded in a Z-Anatomy mesh name: ".l" = person's left, ".r" = right. */
export function sideFromName(name: string): Side {
  if (/\.l$/.test(name)) return 1;
  if (/\.r$/.test(name)) return 2;
  return 0;
}

/** "Gluteus medius muscle.l" -> "Gluteus medius muscle" */
export function structureLabel(name: string): string {
  return name.replace(/\.(l|r)$/, '');
}

export function structureType(name: string, layer: LayerKey): StructureType {
  const n = name.toLowerCase();
  if (layer === 'skin') return 'skin';
  if (layer === 'bones') return /cartilage/.test(n) ? 'cartilage' : 'bone';
  if (/bursa/.test(n)) return 'bursa';
  if (/intervertebral disc|nucleus pulposus|interpubic disc|articular disc/.test(n)) return 'disc';
  if (/meniscus|labrum|cartilage/.test(n)) return 'cartilage';
  if (/capsule/.test(n)) return 'capsule';
  if (/aponeurosis|iliotibial tract/.test(n)) return 'fascia';
  if (/tendon/.test(n)) return 'tendon';
  if (layer === 'joints') return 'ligament';
  return 'muscle';
}

export const TYPE_LABEL: Record<StructureType, string> = {
  muscle: 'Muscle', tendon: 'Tendon', fascia: 'Fascia / band', ligament: 'Ligament',
  capsule: 'Joint capsule', disc: 'Disc', cartilage: 'Cartilage', bursa: 'Bursa (fluid sac)',
  bone: 'Bone', skin: 'Body area',
};

export const LAYERS: { key: LayerKey; label: string; hint: string }[] = [
  { key: 'skin', label: 'Skin', hint: 'Tap a body area' },
  { key: 'muscles', label: 'Muscles', hint: 'Muscles & tendons' },
  { key: 'joints', label: 'Ligaments', hint: 'Ligaments, discs, cartilage & bursae' },
  { key: 'bones', label: 'Bones', hint: 'Skeleton' },
];
