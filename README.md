# PaiNo

Track where and when your body hurts, on a 3D anatomy model, so patterns show up over time.

**Phase 1 (this version)**
- 3D body with four layers: skin (body areas), muscles & tendons, ligaments/discs/cartilage/bursae, bones
- Tap to log pain: 0–10, what it feels like, what you were doing, time, notes. Log as often as you like.
- Daily check-in: sleep, stress, workout, hours sitting
- History with edit/delete
- Insights: body heatmap, place × time-of-day grid, hour-of-day chart, pain over time, activities,
  lifestyle comparisons, trouble-spot table
- Data stays on your device (IndexedDB). Backup/restore (JSON) and CSV export. Sample data to explore.
- Installable on a phone (PWA), works offline, light & dark mode.

**Later phases**: remedies (stretches, habits, red-flag warnings, "did it help?"), AI cause explainer.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # production build in dist/
```

Code map: `src/pages` (screens), `src/three` (3D viewer), `src/lib/insights.ts` (pattern maths),
`src/db` (storage), `tools/model-pipeline` (3D model conversion).

PaiNo is a tracking aid, not medical advice.

3D anatomy adapted from [Z-Anatomy](https://www.z-anatomy.com) (CC BY-SA 4.0) — see `public/models/LICENSE.txt`.
