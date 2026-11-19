# House models: Harrison Ave, Creekside Ln and Hamilton Rd

Three walkable 3D house models; pick between them from the dropdown in the panel header. Harrison Ave is at `/`, Creekside Ln at `/creekside/` and Hamilton Rd at `/hamilton-rd/`, each with its own copy of the engine (`js`, `creekside/js`, `hamilton-rd/js`). Garages hold a true-size Rivian R2 and Acura MDX plus bikes, golf bags and tennis rackets, and the sectional garage doors open like the other doors (`E` in walk mode).

## Point & click edits (Creekside Ln)

Click any piece of furniture, wall or floor (in the walk-through, walk up to it and press F or click when the prompt shows) and a small menu opens next to it: recolor, change to another model, resize, move, nudge, turn, copy or remove a piece (or all matching pieces), repaint a room, hang a TV or art, or add a sofa, plant, bed and more. TVs and art move along walls. There's also a box to type requests like "make these chairs white" or "add a lamp", handled by a small rule-based parser in `creekside/js/edit.js`. Edits are saved in the viewer's browser and can be undone or reset from the panel.

## Hamilton Rd

All-brick 4 bed / 3.5 bath on a wooded lot with a walk-out basement, built from the listing's CubiCasa plans (scaled from the MLS room sizes) and photos. Two-story great room with wet bar, kitchen octagon, deck with fireplace, 3-car garage. Renovation toggles: kitchen opened to dining, cosmetic refresh, primary bath, laundry/mudroom, exterior refresh, deck + walk-out patio, playground.

## Harrison Ave

A walkable 3D model of the house, built from the listing's CubiCasa floor plans and photos with three.js.

- Orbit around it, look floor by floor, or walk through at eye level (stairs, doors you can open, sliding closets).
- **Interior style:** presets (As listed, Warm modern, Coastal light, Classic moody, Scandi oak) plus fine-tune controls for walls, trim, doors, floors, tile, cabinets, counters, backsplash and fireplace.
- **Renovation ideas** you can switch on and off, also from inside the walk-through (press `O`): three separate wall openings (sun room/family, family/living, a foyer colonnade), kitchen remodel, primary bath remodel, a mudroom in the garage's rear bay, a breakfast bump-out, a sun room extension, and a detached garage/studio (golf simulator, pottery studio or gym), plus a backyard paver patio with a cedar pergola. **Edwin's decisions** turns on the chosen set in one click.
- **Basement layout:** gym + storage-room theater, gym + media room in the east bay, or gym in the main room with a TV in the octagonal bay.
- Measuring, sun and shadow study, and an additions sandbox.

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
- `js/render.js`: sky, sun, shadows, interior lighting, ambient occlusion and the High quality toggle (shared with `creekside/js/render.js`).

Assumptions (ceiling heights, roof pitches, lot placement) are listed in the app under "How this model was made".
