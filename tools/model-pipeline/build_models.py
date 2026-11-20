"""
PaiNo model pipeline.

Converts the Z-Anatomy FBX models (CC BY-SA 4.0) into four lightweight
glTF layers for the web app:

  skin.glb     - body surface split into friendly regions (tap-to-log)
  muscles.glb  - muscles, tendons, plantar fascia, IT band
  joints.glb   - ligaments, capsules, discs, menisci, cartilage, bursae
  bones.glb    - skeleton

Every vertex gets a body-region id and a side (left / right) stored in the
first UV channel (u = region id, v = side), so the app can tell which
friendly region a tap on any deep structure belongs to.

Run with Blender's Python module (pip install bpy):
  python build_models.py -- <path-to-'1.0 Models'-folder> <output-dir>
"""

import bpy
import bmesh
import json
import os
import re
import sys
from mathutils import Matrix
from mathutils.kdtree import KDTree

HERE = os.path.dirname(os.path.abspath(__file__))
REGIONS = json.load(open(os.path.join(HERE, "..", "..", "src", "data", "regions.json")))

SRC, OUT = sys.argv[-2], sys.argv[-1]
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- helpers


def side_of(name):
    if name.endswith(".l"):
        return 1
    if name.endswith(".r"):
        return 2
    return 0


def base_name(name):
    return re.sub(r"\.(l|r)$", "", name)


def load(fbx):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=os.path.join(SRC, fbx))


def keep_only(predicate):
    """Delete every object that is not a mesh matching predicate; bake transforms."""
    keep = [o for o in bpy.data.objects if o.type == "MESH" and len(o.data.polygons) > 0 and predicate(o.name)]
    keep_set = set(keep)
    # bake world transform into mesh data
    for o in keep:
        if o.data.users > 1:
            o.data = o.data.copy()
        mw = o.matrix_world.copy()
        o.data.transform(mw)
    for o in keep:
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
    for o in list(bpy.data.objects):
        if o not in keep_set:
            bpy.data.objects.remove(o, do_unlink=True)
    fix_names(keep)
    return keep


# Labels the source model has the wrong way round. The trapezius's descending (upper)
# part runs neck -> shoulder and its ascending (lower) part runs up from the mid back;
# Z-Anatomy's meshes carry each other's names (checked by height).
SWAPPED = [("Descending part of trapezius muscle", "Ascending part of trapezius muscle")]


def fix_names(objs):
    for a, b in SWAPPED:
        for side in (".l", ".r", ""):
            oa = next((o for o in objs if o.name == a + side), None)
            ob = next((o for o in objs if o.name == b + side), None)
            if oa and ob:
                oa.name, ob.name = "__tmp__", a + side
                oa.name = b + side


def decimate(objs, ratio, min_faces=60):
    if ratio >= 1:
        return
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        n = len(o.data.polygons)
        r = max(ratio, min(1.0, min_faces / max(n, 1)))
        if r >= 0.999:
            continue
        m = o.modifiers.new("dec", "DECIMATE")
        m.ratio = r
        m.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    for o in objs:
        if not o.modifiers:
            continue
        new = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        old = o.data
        o.modifiers.clear()
        o.data = new
        bpy.data.meshes.remove(old)


def clean(objs):
    for o in objs:
        o.data.materials.clear()
        while o.data.uv_layers:
            o.data.uv_layers.remove(o.data.uv_layers[0])
        for a in list(o.data.color_attributes):
            o.data.color_attributes.remove(a)
        o.data.shade_smooth()


def write_uv(o, per_vertex):
    """per_vertex: list of (region, side) indexed by vertex index."""
    me = o.data
    uv = me.uv_layers.new(name="region")
    loops = me.loops
    data = uv.data
    for i, lp in enumerate(loops):
        r, s = per_vertex[lp.vertex_index]
        data[i].uv = (float(r), float(s))


def export(objs, name):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    path = os.path.join(OUT, name)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="NONE",
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    print(f"EXPORTED {name}: {len(objs)} parts, {tris} triangles, {os.path.getsize(path)/1e6:.1f} MB")
    return {"file": name, "parts": len(objs), "triangles": tris}


# --------------------------------------------------------------- 1. skin

skin_lookup = {}
for reg in REGIONS["regions"]:
    for s in reg["skin"]:
        skin_lookup[s] = reg["id"]
ID = {r["key"]: r["id"] for r in REGIONS["regions"]}
SPLIT = set(REGIONS["splitByHeight"].keys())

load("Regions of human body100.fbx")
skin = keep_only(lambda n: side_of(n) and (base_name(n) in skin_lookup or base_name(n) in SPLIT))
missing = sorted({base_name(o.name) for o in bpy.data.objects} - set(skin_lookup) - SPLIT)
print("skin meshes:", len(skin), "unmapped:", missing)
clean(skin)


def top_z(names):
    zs = [v.co.z for o in skin if base_name(o.name) in names for v in o.data.vertices]
    return max(zs)


z_mid_top = top_z({"Infrascapular region"})   # above -> upper back
z_low_top = top_z({"Lumbar region"})          # above -> mid back
z_neck = top_z({"Interscapular region", "Scapular region"})  # above -> neck
print(f"back split heights: neck>{z_neck:.3f} upper>{z_mid_top:.3f} mid>{z_low_top:.3f}")


def back_region(z):
    if z > z_neck:
        return ID["neck"]
    if z > z_mid_top:
        return ID["upper_back"]
    if z > z_low_top:
        return ID["mid_back"]
    return ID["lower_back"]


kd_items = []
for o in skin:
    s = side_of(o.name)
    b = base_name(o.name)
    per_v = []
    for v in o.data.vertices:
        r = back_region(v.co.z) if b in SPLIT else skin_lookup[b]
        per_v.append((r, s))
        kd_items.append((v.co.copy(), r, s))
    write_uv(o, per_v)

kd = KDTree(len(kd_items))
for i, (co, _, _) in enumerate(kd_items):
    kd.insert(co, i)
kd.balance()

# sanity: which way is the body's left? (Z-Anatomy '.l' should be +X)
lx = [v.co.x for o in skin if o.name == "Lateral malleolus.l" for v in o.data.vertices]
fy = [v.co.y for o in skin if base_name(o.name) == "Nasal region" for v in o.data.vertices]
by = [v.co.y for o in skin if base_name(o.name) == "Occipital region" for v in o.data.vertices]
print(f"orientation: left ankle x={sum(lx)/len(lx):.3f}  nose y={sum(fy)/len(fy):.3f}  back-of-head y={sum(by)/len(by):.3f}")

manifest = {"source": "Z-Anatomy (CC BY-SA 4.0)", "layers": {}}
manifest["layers"]["skin"] = export(skin, "skin.glb")

# ------------------------------------------------------- 2. deep layers


def tag_by_nearest_skin(objs):
    for o in objs:
        per_v = []
        for v in o.data.vertices:
            _, idx, _ = kd.find(v.co)
            _, r, s = kd_items[idx]
            per_v.append((r, s))
        write_uv(o, per_v)


SKIP_COMMON = re.compile(r"^\(|Cross Section")
INTERNAL_HEAD = re.compile(
    r"arytenoid|cricothyroid|thyro-|pharyn|glossus|palato|rectus muscle|oblique muscle$|"
    r"Levator palpebrae|tarsus|Trochlea of superior|Common tendinous ring|Procerus|"
    r"Depressor septi|nasalis|corrugator|Risorius|Levator nasolabialis|Levator labii|"
    r"Levator anguli|Depressor anguli|Depressor labii|Zygomaticus|Mentalis|Orbicularis|"
    r"orbicularis oculi|Bucinator|Epicranial|Temporoparietalis",
    re.I,
)
MUSCLE_WRAPPERS = re.compile(r"\bfascia\b|septum|sheath|retinac|Linea alba|Investing|Iliopectineal arch|"
                             r"Tendinous arch|Superficial transverse meta|Palmar aponeurosis|Inguinal ligament", re.I)
KEEP_FASCIA = {"Plantar aponeurosis", "Iliotibial tract"}
BURSA = re.compile(r"bursa", re.I)

layers_cfg = [
    ("muscles.glb", "MuscularSystem100.fbx", 0.13,
     lambda n: not SKIP_COMMON.search(n) and not BURSA.search(n) and not INTERNAL_HEAD.search(n)
     and (base_name(n) in KEEP_FASCIA or not MUSCLE_WRAPPERS.search(n))),
    ("bones.glb", "SkeletalSystem100.fbx", 0.2,
     lambda n: not SKIP_COMMON.search(n)
     and not re.search(r"\.(o|e)\d*[lr]?$", n) and not re.search(r"\.[ij]$", n)
     and not re.search(r"arytenoid|corniculate|cricoid|thyroid cartilage|epiglott|nasal|septal cartilage|"
                       r"cells of ethmoid|Incus|Malleus|Stapes|concha|alar cartilage", n, re.I)),
    ("joints.glb", "Joints100.fbx", 0.45,
     lambda n: not SKIP_COMMON.search(n)
     and not re.search(r"cricothyroid|thyrohyoid|cricopharyngeal|Quadrangular membrane|intercostal membrane", n, re.I)),
]

for out_name, fbx, ratio, pred in layers_cfg:
    load(fbx)
    objs = keep_only(pred)
    extra = []
    if out_name == "joints.glb":
        # bring bursae (bursitis is a common pain source) over from the muscle file
        names_here = {o.name for o in objs}
        lib = os.path.join(SRC, "MuscularSystem100.fbx")
        before = set(bpy.data.objects)
        bpy.ops.import_scene.fbx(filepath=lib)
        new = [o for o in bpy.data.objects if o not in before]
        for o in new:
            if o.type == "MESH" and BURSA.search(o.name) and not SKIP_COMMON.search(o.name) and len(o.data.polygons):
                if o.data.users > 1:
                    o.data = o.data.copy()
                o.data.transform(o.matrix_world.copy())
                extra.append(o)
        for o in extra:
            o.parent = None
            o.matrix_world = Matrix.Identity(4)
        keep = set(objs) | set(extra)
        for o in list(bpy.data.objects):
            if o not in keep:
                bpy.data.objects.remove(o, do_unlink=True)
        objs = objs + extra
    print(out_name, "parts:", len(objs), "faces before:", sum(len(o.data.polygons) for o in objs))
    decimate(objs, ratio)
    clean(objs)
    tag_by_nearest_skin(objs)
    manifest["layers"][out_name.replace(".glb", "")] = export(objs, out_name)

json.dump(manifest, open(os.path.join(OUT, "manifest.json"), "w"), indent=2)
print("DONE")
