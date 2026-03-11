---
name: 3d-print-model
description: Create or find 3D printable STL files. Use when the user asks to create, generate, find, scale, or prepare a 3D model for printing. Handles both parametric/geometric models (generated with code) and organic/character models (found on Printables).
allowed-tools: Bash, WebSearch, WebFetch
---

# 3D Print Model Creation

## Printers & Build Volumes

| Printer | Build Volume | Notes |
|---------|-------------|-------|
| Creality Ender 5 Max | 400 × 400 × 400 mm | Reliable workhorse, large bed |
| Creality K2 Plus | 350 × 350 × 350 mm | Multi-material (up to 4 colors), fast |

Any model dimension exceeding the build volume must be split into interlocking sections.

## Design Principles (Creality Guidelines)

Apply these when generating or reviewing any model.

### Wall Thickness
- Optimal: **1–2 mm** for durability
- Hollow out large solid models to save material and reduce print time
- Thin walls below ~0.8mm (single nozzle width) may not print at all

### Overhangs
- Overhangs **≤ 45°** from vertical print fine unsupported
- Overhangs **> 45°** need either support structures, model reorientation, or splitting into parts
- Bridge overhangs (horizontal spans between two walls) can span ~50–80mm unsupported depending on material

### Tolerances for Fit
- **Tight fit / press fit:** +0.1mm clearance gap
- **Loose fit / sliding fit:** +0.33mm clearance gap
- For snap-fits or hinges, add clearance and use fillets to reduce stress

### Stress & Strength
- Add **fillets** (rounded inside corners) and **chamfers** (angled outside edges) at stress points — sharp inside corners crack
- Layer lines are weakest in tension perpendicular to the layer — orient models so critical load paths run parallel to layers
- Vertical prints (Z-axis) are weakest along layer lines; horizontal prints are strongest in-plane

### Print Orientation
- Choose orientation that minimizes overhangs, maximizes strength in the loaded direction, and fits within build volume
- Flat on the bed = fastest, most stable; upright = best detail on sides but weaker

### Minimum Features
- Minimum wall: ~0.4–0.8mm (1–2× nozzle diameter)
- Minimum hole diameter: ~2mm (smaller holes often close up)
- Minimum embossed text height: ~0.6mm
- Tiny details smaller than the nozzle diameter will not appear

### Material Considerations
- **PLA**: Easy to print, poor heat resistance (softens ~60°C). Good for decorative and low-stress parts.
- **ABS**: Heat resistant, prone to warping — needs enclosure and heated bed
- **PETG**: Good middle ground — stronger than PLA, less warping than ABS
- Hollow out large models to reduce weight and avoid internal stress from differential cooling

### Pre-export Checklist
- Verify **manifold geometry** (no holes in the mesh, all normals pointing outward)
- Check for **non-manifold edges** — slicer will fail or produce bad paths
- Export as STL (binary preferred) or OBJ
- Verify mesh in slicer before sending to print

---

## Decision: Generate vs. Find

| Request type | Approach |
|-------------|----------|
| Geometric / functional part (box, bracket, mount, clip, enclosure) | Generate with OpenSCAD or Python |
| Organic / character (animals, figures, Godzilla, vehicles) | Search Printables.com |
| Scale or resize an existing file | Python + trimesh |
| Multi-color model | Search Printables, note K2 supports 4 colors |

---

## Approach A: Find on Printables.com

For complex organic models, searching Printables is faster and produces better results than code generation.

```bash
# Search strategy — use WebSearch first
# Query: site:printables.com "godzilla" STL

# Then open the result with agent-browser to get the direct download URL
agent-browser open https://www.printables.com/search/models?q=godzilla
agent-browser snapshot -i
```

When downloading, save to `/workspace/group/output/`:

```bash
mkdir -p /workspace/group/output
# Download the STL once you have a direct URL
curl -L "DIRECT_DOWNLOAD_URL" -o /workspace/group/output/model.stl
```

**Always report**: model name, original author/license, original dimensions, and any assembly notes.

---

## Approach B: Generate with OpenSCAD

Write a `.scad` file and render it headlessly with xvfb-run.

```bash
mkdir -p /workspace/group/output

cat > /workspace/group/output/model.scad << 'EOF'
// Example: parametric box with lid
$fn = 60;

module box(w, d, h, wall=2) {
  difference() {
    cube([w, d, h]);
    translate([wall, wall, wall])
      cube([w - wall*2, d - wall*2, h]);
  }
}

box(80, 50, 30);
EOF

xvfb-run -a openscad -o /workspace/group/output/model.stl /workspace/group/output/model.scad
```

OpenSCAD quick reference:
- `cube([x,y,z])` — rectangular solid
- `cylinder(h=h, r=r)` / `cylinder(h=h, r1=r1, r2=r2)` — cylinder/cone
- `sphere(r=r)` — sphere
- `translate([x,y,z])` — move
- `rotate([x,y,z])` — rotate degrees around each axis
- `union()` / `difference()` / `intersection()` — boolean ops
- `linear_extrude(h)` — extrude a 2D shape
- `$fn = 60` — smoothness (higher = smoother, slower)

---

## Approach C: Generate with Python (trimesh)

For shapes that are easier to express mathematically.

```python
#!/usr/bin/env python3
import trimesh
import numpy as np

# Create basic primitives
box     = trimesh.creation.box(extents=[50, 30, 20])
sphere  = trimesh.creation.icosphere(radius=15)
cyl     = trimesh.creation.cylinder(radius=10, height=40)
cone    = trimesh.creation.cone(radius=15, height=30)

# Position shapes
sphere.apply_translation([0, 0, 25])

# Combine (union)
combined = trimesh.boolean.union([box, sphere])

# Export
combined.export('/workspace/group/output/model.stl')
print(f"Exported: {combined.bounds}, volume: {combined.volume:.1f} mm³")
```

Run with:
```bash
python3 /workspace/group/output/make_model.py
```

---

## Scaling to a Target Size

```python
#!/usr/bin/env python3
import trimesh, sys

mesh = trimesh.load('/workspace/group/output/model.stl')

# Current dimensions
bounds = mesh.bounds
current = bounds[1] - bounds[0]
print(f"Current: {current[0]:.1f} × {current[1]:.1f} × {current[2]:.1f} mm")

# Scale to target height (e.g., 300mm tall)
target_height_mm = 300
scale_factor = target_height_mm / current[2]
mesh.apply_scale(scale_factor)

new = mesh.bounds[1] - mesh.bounds[0]
print(f"Scaled to: {new[0]:.1f} × {new[1]:.1f} × {new[2]:.1f} mm")

mesh.export('/workspace/group/output/model_scaled.stl')
```

**Unit note**: Most STL files use mm. If a model looks tiny (< 5mm), it may be in inches — multiply by 25.4.

---

## Splitting Large Models

When a model is too big for the build volume, split it into sections with alignment pins.

```python
#!/usr/bin/env python3
import trimesh
import numpy as np

mesh = trimesh.load('/workspace/group/output/model.stl')
h = mesh.bounds[1][2] - mesh.bounds[0][2]
mid = mesh.bounds[0][2] + h / 2

# Split at midpoint along Z (height)
# Bottom half
box_bottom = trimesh.creation.box(
    extents=[9999, 9999, mid - mesh.bounds[0][2]],
    transform=trimesh.transformations.translation_matrix([0, 0, mesh.bounds[0][2] + (mid - mesh.bounds[0][2])/2])
)
bottom = trimesh.boolean.intersection([mesh, box_bottom])
bottom.export('/workspace/group/output/model_bottom.stl')

# Top half
box_top = trimesh.creation.box(
    extents=[9999, 9999, mesh.bounds[1][2] - mid],
    transform=trimesh.transformations.translation_matrix([0, 0, mid + (mesh.bounds[1][2] - mid)/2])
)
top = trimesh.boolean.intersection([mesh, box_top])
top.export('/workspace/group/output/model_top.stl')

print(f"Split at Z={mid:.1f}mm. Bottom: {bottom.bounds[1][2]-bottom.bounds[0][2]:.1f}mm, Top: {top.bounds[1][2]-top.bounds[0][2]:.1f}mm")
```

For large prints (e.g., 4-foot / 1220mm model) on the Ender 5 Max (400mm height): minimum 4 sections. Recommend searching Printables for pre-split versions before splitting manually.

---

## Output

All files go to `/workspace/group/output/` — accessible on the host at `groups/{agent}/output/`.

Always report back:
- Final dimensions in mm
- Number of parts if split
- Recommended printer (Ender 5 Max or K2) based on size/color needs
- Estimated print time if known (rough: ~1 hour per 50mm height at standard settings)
- Any assembly or orientation notes
