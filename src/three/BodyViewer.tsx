import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { LayerKey, Side } from '../db/types';
import { findParts, loadLayer, paint, pickFromFace, type LayerData, type Pick } from './layers';
import { LAYERS } from '../lib/anatomy';

/** Which layers are drawn for each "depth" the user chooses. */
const VISIBLE: Record<LayerKey, LayerKey[]> = {
  skin: ['skin'],
  muscles: ['muscles', 'bones'],
  joints: ['joints', 'bones'],
  bones: ['bones'],
};

const TARGET = new THREE.Vector3(0, 0.9, 0);
export type View = 'front' | 'back' | 'left' | 'right';
const VIEW_DIR: Record<View, [number, number, number]> = {
  front: [0, 0.08, 1],
  back: [0, 0.08, -1],
  // the person's left side faces +X
  left: [1, 0.08, 0],
  right: [-1, 0.08, 0],
};

export interface BodyViewerProps {
  depth: LayerKey;
  onDepthChange: (d: LayerKey) => void;
  onPick?: (p: Pick) => void;
  selectedPart?: { layer: LayerKey; part: number } | null;
  selectedPlace?: { regionId: number; side: Side } | null;
  heat?: Map<string, number>;
  heatMax?: number;
  /** Structures to light up (name fragments) on a side (0 = both). */
  highlight?: { names: string[]; side: Side } | null;
  /** Turn the body to this view whenever it changes. */
  focusView?: View | null;
  className?: string;
}

export default function BodyViewer(props: BodyViewerProps) {
  const { depth, onDepthChange } = props;
  const [layers, setLayers] = useState<Partial<Record<LayerKey, LayerData>>>({});
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<{ v: View; n: number }>({ v: 'front', n: 0 });
  const focusMode = !!props.highlight;
  const wanted = focusMode && depth === 'skin' ? (['skin', 'muscles'] as LayerKey[]) : VISIBLE[depth];

  useEffect(() => {
    if (props.focusView) setView((v) => ({ v: props.focusView!, n: v.n + 1 }));
  }, [props.focusView]);

  useEffect(() => {
    let alive = true;
    setError(null);
    const fractions: Record<string, number> = {};
    Promise.all(
      wanted.map((k) =>
        loadLayer(k, (f) => {
          fractions[k] = f;
          if (alive) setProgress(Object.values(fractions).reduce((a, b) => a + b, 0) / wanted.length);
        }).then((d) => {
          if (alive) setLayers((prev) => ({ ...prev, [k]: d }));
        }),
      ),
    ).catch(() => alive && setError('Could not load the 3D body. Check your connection and try again.'));
    return () => {
      alive = false;
    };
  }, [depth, focusMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = wanted.every((k) => layers[k]);

  // centre the camera on the highlighted structures
  const hl = props.highlight;
  const hlKey = hl ? `${hl.side}|${hl.names.join(',')}` : '';
  const focus = useMemo(() => {
    const m = layers.muscles;
    if (!hl || !m) return null;
    const parts = findParts(m, hl.names, hl.side);
    if (!parts.size) return null;
    const box = new THREE.Box3();
    const pos = m.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < m.partOfVertex.length; i++) if (parts.has(m.partOfVertex[i])) box.expandByPoint(v.fromBufferAttribute(pos, i));
    const size = box.getSize(new THREE.Vector3());
    return { center: box.getCenter(new THREE.Vector3()), dist: Math.min(3.4, Math.max(1.1, Math.max(size.x, size.y, size.z) * 2.6)) };
  }, [layers.muscles, hlKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`viewer ${props.className ?? ''}`}>
      <Canvas
        camera={{ position: [0, 0.9, 3.7], fov: 34, near: 0.05, far: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: false }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <Lights />
        {wanted.map((k) => {
          const d = layers[k];
          return d ? <LayerMesh key={k} data={d} {...props} focusMode={focusMode} /> : null;
        })}
        <Controls view={view} focus={focus} />
      </Canvas>

      <div className="viewer-depth" role="radiogroup" aria-label="Layer">
        {LAYERS.map((l) => (
          <button
            key={l.key}
            role="radio"
            aria-checked={depth === l.key}
            className={depth === l.key ? 'on' : ''}
            onClick={() => onDepthChange(l.key)}
            title={l.hint}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="viewer-views" aria-label="Turn the body">
        {(['front', 'back', 'left', 'right'] as View[]).map((v) => (
          <button key={v} onClick={() => setView({ v, n: view.n + 1 })}>
            {v === 'front' ? 'Front' : v === 'back' ? 'Back' : v === 'left' ? 'L side' : 'R side'}
          </button>
        ))}
      </div>

      {!ready && !error && (
        <div className="viewer-status">
          <div className="spinner" aria-hidden />
          Loading 3D body… {Math.round(progress * 100)}%
        </div>
      )}
      {error && <div className="viewer-status error">{error}</div>}
    </div>
  );
}

function Lights() {
  const { camera, scene } = useThree();
  useEffect(() => {
    // a light that follows the camera keeps the side you look at well lit
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(0.6, 1, 1.2);
    camera.add(key);
    scene.add(camera);
    return () => {
      camera.remove(key);
    };
  }, [camera, scene]);
  return <hemisphereLight args={[0xffffff, 0x8d8378, 1.25]} />;
}

function Controls({ view, focus }: { view: { v: View; n: number }; focus: { center: THREE.Vector3; dist: number } | null }) {
  const ref = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();
  useEffect(() => {
    if ((view.n === 0 && !focus) || !ref.current) return;
    const target = focus ? focus.center : TARGET;
    const dist = focus ? focus.dist : Math.max(2.2, camera.position.distanceTo(ref.current.target));
    const dir = new THREE.Vector3(...VIEW_DIR[view.v]).normalize();
    ref.current.target.copy(target);
    camera.position.copy(target).addScaledVector(dir, dist);
    ref.current.update();
  }, [view, camera, focus]);
  return (
    <OrbitControls
      ref={ref}
      target={TARGET}
      enableDamping
      dampingFactor={0.12}
      minDistance={0.35}
      maxDistance={6}
      zoomSpeed={0.9}
      rotateSpeed={0.8}
      makeDefault
    />
  );
}

function LayerMesh({
  data, onPick, selectedPart, selectedPlace, heat, heatMax, highlight, focusMode,
}: { data: LayerData; focusMode?: boolean } & BodyViewerProps) {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: data.key === 'skin' ? 0.75 : 0.55,
        metalness: 0,
        // the source model has tiny gaps between pieces; drawing back faces hides them
        side: THREE.DoubleSide,
        // focus mode: everything see-through except the highlighted structures
        transparent: !!focusMode,
        opacity: focusMode ? (data.key === 'skin' ? 0.06 : data.key === 'bones' ? 0.14 : 0.1) : 1,
        depthWrite: !focusMode,
      }),
    [data.key, focusMode],
  );
  const solidMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, side: THREE.DoubleSide }),
    [],
  );
  const part = selectedPart && selectedPart.layer === data.key ? selectedPart.part : null;
  const hlKey = highlight ? `${highlight.side}|${highlight.names.join(',')}` : '';
  const highlightParts = useMemo(
    () => (highlight && data.key !== 'skin' ? findParts(data, highlight.names, highlight.side) : null),
    [data, hlKey], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // the highlighted structures as their own solid mesh (shares the big mesh's vertex data)
  const focusGeometry = useMemo(() => {
    if (!highlightParts?.size || !data.geometry.index) return null;
    const idx = data.geometry.index.array as Uint32Array;
    const keep: number[] = [];
    for (let t = 0; t < idx.length; t += 3) if (highlightParts.has(data.partOfVertex[idx[t]])) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    const g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'color']) g.setAttribute(k, data.geometry.attributes[k]);
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(keep), 1));
    g.computeBoundingSphere();
    return g;
  }, [data, highlightParts]);
  useEffect(() => () => focusGeometry?.dispose(), [focusGeometry]);

  useEffect(() => {
    paint(data, { heat, heatMax, selectedPart: part, selectedPlace, highlightParts, ghost: focusMode });
  }, [data, heat, heatMax, part, selectedPlace?.regionId, selectedPlace?.side, highlightParts, focusMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const down = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    down.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation(); // only the closest layer handles a tap
    const d = down.current;
    if (d && Math.hypot(e.nativeEvent.clientX - d.x, e.nativeEvent.clientY - d.y) > 8) return; // it was a drag
    if (!e.face || !onPick) return;
    onPick(pickFromFace(data, e.face.a));
  };

  return (
    <>
      {focusGeometry && <mesh geometry={focusGeometry} material={solidMaterial} renderOrder={0} raycast={() => null} />}
      <mesh geometry={data.geometry} material={material} renderOrder={1} onPointerDown={onPointerDown} onClick={onClick} />
    </>
  );
}
