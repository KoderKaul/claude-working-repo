import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import type { LayerKey, Side } from '../db/types';
import { structureType, type StructureType } from '../lib/anatomy';
import { PAIN_RAMP } from './ramp';

// Fast tap detection on big meshes.
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

declare module 'three' {
  interface BufferGeometry {
    computeBoundsTree: typeof computeBoundsTree;
    disposeBoundsTree: typeof disposeBoundsTree;
  }
}

/**
 * One anatomy layer, merged into a single mesh (one draw call, phone friendly).
 * Per-vertex lookups tell us which structure, body region and side a tap hit.
 */
export interface LayerData {
  key: LayerKey;
  geometry: THREE.BufferGeometry;
  partNames: string[];
  partTypes: StructureType[];
  partOfVertex: Uint16Array;
  regionOfVertex: Uint8Array;
  sideOfVertex: Uint8Array;
  baseColors: Float32Array;
}

const TYPE_COLOR: Record<StructureType, string> = {
  skin: '#e3bfa3',
  muscle: '#b9534b',
  tendon: '#e9dcc4',
  fascia: '#dccbb0',
  ligament: '#d9cfae',
  capsule: '#cbbf9f',
  disc: '#8eb4cc',
  cartilage: '#a6c9d8',
  bursa: '#93a9dc',
  bone: '#eee5d3',
};

const cache = new Map<LayerKey, Promise<LayerData>>();

export function loadLayer(key: LayerKey, onProgress?: (fraction: number) => void): Promise<LayerData> {
  let p = cache.get(key);
  if (!p) {
    p = build(key, onProgress);
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

async function build(key: LayerKey, onProgress?: (f: number) => void): Promise<LayerData> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(`/models/${key}.glb`, (e) => {
    if (e.total) onProgress?.(e.loaded / e.total);
  });
  gltf.scene.updateMatrixWorld(true);

  const meshes: THREE.Mesh[] = [];
  gltf.scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });

  let vTotal = 0;
  let iTotal = 0;
  for (const m of meshes) {
    vTotal += m.geometry.attributes.position.count;
    iTotal += m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count;
  }

  const pos = new Float32Array(vTotal * 3);
  const nor = new Float32Array(vTotal * 3);
  const idx = new Uint32Array(iTotal);
  const partOfVertex = new Uint16Array(vTotal);
  const regionOfVertex = new Uint8Array(vTotal);
  const sideOfVertex = new Uint8Array(vTotal);
  const baseColors = new Float32Array(vTotal * 3);
  const partNames: string[] = [];
  const partTypes: StructureType[] = [];

  const v = new THREE.Vector3();
  const n = new THREE.Vector3();
  const nm = new THREE.Matrix3();
  const col = new THREE.Color();
  let vo = 0;
  let io = 0;

  meshes.forEach((m, part) => {
    // GLTFLoader mangles node names (spaces/dots); the original is kept in userData.name
    const name = (m.userData.name || m.parent?.userData.name || m.name || `part ${part}`) as string;
    partNames.push(name);
    const type = structureType(name, key);
    partTypes.push(type);
    // tiny per-part brightness shift so neighbouring structures read apart
    const h = hash(name);
    col.set(TYPE_COLOR[type]).offsetHSL(0, 0, key === 'skin' ? 0 : ((h % 9) - 4) * 0.012);

    const g = m.geometry;
    const P = g.attributes.position;
    const N = g.attributes.normal;
    const UV = g.attributes.uv;
    nm.getNormalMatrix(m.matrixWorld);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
      pos.set([v.x, v.y, v.z], (vo + i) * 3);
      if (N) {
        n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
        nor.set([n.x, n.y, n.z], (vo + i) * 3);
      }
      partOfVertex[vo + i] = part;
      if (UV) {
        regionOfVertex[vo + i] = Math.round(UV.getX(i));
        // glTF flips V: stored v = 1 - side
        sideOfVertex[vo + i] = Math.round(1 - UV.getY(i));
      }
      baseColors.set([col.r, col.g, col.b], (vo + i) * 3);
    }
    if (g.index) {
      const I = g.index;
      for (let i = 0; i < I.count; i++) idx[io + i] = I.getX(i) + vo;
      io += I.count;
    } else {
      for (let i = 0; i < P.count; i++) idx[io + i] = vo + i;
      io += P.count;
    }
    vo += P.count;
    g.dispose();
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(baseColors.slice(), 3));
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
  if (!meshes.every((m) => m.geometry.attributes.normal)) geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.computeBoundsTree();

  return { key, geometry, partNames, partTypes, partOfVertex, regionOfVertex, sideOfVertex, baseColors };
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export interface Pick {
  layer: LayerKey;
  part: number;
  partName: string;
  partType: StructureType;
  regionId: number;
  side: Side;
}

export function pickFromFace(layer: LayerData, faceA: number): Pick {
  const part = layer.partOfVertex[faceA];
  return {
    layer: layer.key,
    part,
    partName: layer.partNames[part],
    partType: layer.partTypes[part],
    regionId: layer.regionOfVertex[faceA],
    side: layer.sideOfVertex[faceA] as Side,
  };
}

// ---------------------------------------------------------------- painting

const RAMP = PAIN_RAMP.map((c) => new THREE.Color(c));

export function rampColor(t: number, out = new THREE.Color()) {
  const x = Math.max(0, Math.min(1, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  return out.copy(RAMP[i]).lerp(RAMP[i + 1], x - i);
}

const SELECT = new THREE.Color('#2a78d6');
const SELECT_SOFT = new THREE.Color('#86b6ef');

export interface PaintOptions {
  /** Pain load per "regionId:side"; vertices are tinted by their own place. */
  heat?: Map<string, number>;
  heatMax?: number;
  selectedPart?: number | null;
  selectedPlace?: { regionId: number; side: Side } | null;
}

export function paint(layer: LayerData, o: PaintOptions) {
  const attr = layer.geometry.attributes.color as THREE.BufferAttribute;
  const out = attr.array as Float32Array;
  const base = layer.baseColors;
  const c = new THREE.Color();
  const b = new THREE.Color();
  const heatMax = o.heatMax || 1;
  const heatCache = new Map<number, THREE.Color | null>();
  const count = layer.partOfVertex.length;
  for (let i = 0; i < count; i++) {
    b.fromArray(base, i * 3);
    c.copy(b);
    if (o.heat) {
      const r = layer.regionOfVertex[i];
      const s = layer.sideOfVertex[i];
      const k = r * 4 + s;
      let hc = heatCache.get(k);
      if (hc === undefined) {
        const load = o.heat.get(`${r}:${s}`) ?? 0;
        hc = load > 0 ? rampColor(0.12 + 0.88 * (load / heatMax), new THREE.Color()) : null;
        heatCache.set(k, hc);
      }
      if (hc) c.lerp(hc, layer.key === 'skin' ? 0.92 : 0.75);
      else if (layer.key === 'skin') c.lerp(new THREE.Color('#cfcac2'), 0.6);
    }
    if (o.selectedPlace && layer.key === 'skin'
      && layer.regionOfVertex[i] === o.selectedPlace.regionId
      && (o.selectedPlace.side === 0 || layer.sideOfVertex[i] === o.selectedPlace.side)) {
      c.lerp(SELECT_SOFT, 0.55);
    }
    if (o.selectedPart != null && layer.partOfVertex[i] === o.selectedPart && layer.key !== 'skin') c.lerp(SELECT, 0.85);
    out[i * 3] = c.r;
    out[i * 3 + 1] = c.g;
    out[i * 3 + 2] = c.b;
  }
  attr.needsUpdate = true;
}
