# Harrison Ave house: 3D model

A walkable 3D model of the house, built from the listing's CubiCasa floor plans and photos with three.js.

- Orbit around it, look floor by floor, or walk through at eye level (stairs, doors you can open, sliding closets).
- **Interior style:** presets (As listed, Warm modern, Coastal light, Classic moody, Scandi oak) plus fine-tune controls for walls, trim, doors, floors, tile, cabinets, counters, backsplash and fireplace.
- **Renovation ideas** you can switch on and off, also from inside the walk-through (press `O`): open floor plan, kitchen remodel, primary bath remodel, rear addition (mudroom, scullery, dining addition, longer sun room), and a detached garage/studio (golf simulator, pottery studio or gym).
- Measuring, sun and shadow study, a basement layout switch, and an additions sandbox.

## Open it

The page loads its code as JavaScript modules, so it needs a web server (opening `index.html` directly won't work). `serve.py` turns off browser caching so edits always show up:

```bash
cd ~/Documents/Projects/housing/hamilton_ave && python3 serve.py
```

Then open http://localhost:8742.

## What's where

- `js/data.js`: everything measured from the plans: walls, doors and windows, rooms, stairs, the lot. Walls tagged `reno` are removed by a renovation.
- `js/build.js`: turns the data into walls, floors, stairs, railings, roofs and trim; door/slider mechanics.
- `js/furnish.js`: kitchen, baths, fireplace, lights, closets and the staged furniture (real sizes: king 76×80", queen 60×80", full 54×75").
- `js/reno.js`: the renovation options.
- `js/themes.js`: interior style presets and controls.
- `js/site.js`: lawn, driveway, patio, trees, play set, neighbors.
- `js/app.js`: viewer, walk mode, measuring, sun study, panels.

Assumptions (ceiling heights, roof pitches, lot placement) are listed in the app under "How this model was made".
