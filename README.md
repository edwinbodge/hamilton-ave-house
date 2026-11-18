# Harrison Ave house: 3D model

A walkable 3D model of the house, built from the listing's CubiCasa floor plans and photos.

## Open it

The page loads its code as JavaScript modules, so it needs a local web server (opening `index.html` directly won't work). `serve.py` turns off browser caching so edits always show up:

```bash
cd ~/Documents/Projects/housing/hamilton_ave && python3 serve.py
```

Then open http://localhost:8742.

## What's where

- `js/data.js`: everything measured from the plans: walls, doors and windows, rooms, stairs, fixtures, the lot. Edit this file to fix a measurement.
- `js/build.js`: turns the data into walls, floors, stairs, railings and roofs.
- `js/site.js`: lawn, driveway, patio, trees and neighbors.
- `js/furnish.js`: kitchen cabinetry, baths, fireplace, light fixtures, and the staged furniture (real sizes: king 76×80", queen 60×80", full 54×75"). Move a piece by editing its `place(...)` line.
- `js/textures.js`: wall finishes (sponge paint, ivy and grid wallpaper), floors, tile, siding, shingles.
- `js/app.js`: viewer, walk mode, measuring, sun study, additions sandbox.

Assumptions (ceiling heights, roof pitches, lot placement) are listed in the app under "How this model was made".
