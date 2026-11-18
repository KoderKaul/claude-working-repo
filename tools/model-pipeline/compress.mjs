// Compresses the raw GLB layers from build_models.py for the web (meshopt + quantization).
// Usage: node tools/model-pipeline/compress.mjs <raw-dir> [out-dir=public/models]
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization, ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, reorder, quantize, dedup, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';

const [rawDir, outDir = 'public/models'] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
fs.mkdirSync(outDir, { recursive: true });

for (const f of ['skin.glb', 'muscles.glb', 'joints.glb', 'bones.glb']) {
  const doc = await io.read(path.join(rawDir, f));
  await doc.transform(
    dedup(),
    weld(),
    reorder({ encoder: MeshoptEncoder }),
    // keep the region/side UVs as exact floats; only quantize geometry
    quantize({ pattern: /^(POSITION|NORMAL)$/, quantizePosition: 14, quantizeNormal: 8 }),
    prune(),
  );
  doc.createExtension(KHRMeshQuantization).setRequired(true);
  doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  const out = path.join(outDir, f);
  await io.write(out, doc);
  console.log(f, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
}
