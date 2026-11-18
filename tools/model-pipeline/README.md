# Model pipeline

Turns the Z-Anatomy FBX models into the four web layers in `public/models/`.
You only need this if you want to change which structures are included or how detailed they are.

```bash
# 1. get the source models (FBX files are in "Z-Anatomy PC/Assets/Models/1.0 Models")
GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/LluisV/Z-Anatomy z-anatomy

# 2. Blender as a Python module
python3 -m venv bvenv && ./bvenv/bin/pip install bpy

# 3. convert (writes raw .glb files) then compress into public/models
./bvenv/bin/python tools/model-pipeline/build_models.py -- "z-anatomy/Z-Anatomy PC/Assets/Models/1.0 Models" /tmp/raw
node tools/model-pipeline/compress.mjs /tmp/raw public/models
```

How region tagging works: each skin piece is named (e.g. `Lumbar region.l`) and mapped to a friendly
region in `src/data/regions.json`. Every vertex of the deeper layers is tagged with the region and
side of the nearest skin point. Tags live in the first UV channel (u = region id, v = side).
