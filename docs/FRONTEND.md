# AquaPulse Frontend Foundation & Provenance Shell (Session S6)

## 1. Stack and Pinned Versions (§8.1 & §B)
- **React**: `19.3.0` & **React DOM**: `19.3.0`
- **Vite**: `8.3.2` with `@vitejs/plugin-react`: `6.1.1`
- **TypeScript**: `7.0.2`
- **State & Query**: `zustand@5.0.15`, `@tanstack/react-query@5.104.1`
- **Visualization & Maps**: `maplibre-gl@6.12.0`, `leaflet@1.9.4`, `react-leaflet@5.0.0`, `d3-force@3.0.0`, `d3-scale@4.0.2`, `uplot@1.6.32`
- **Fonts**: `@fontsource-variable/inter@5.3.0`, `@fontsource-variable/jetbrains-mono@5.3.0`
- **Testing**: `vitest@5.0.3`, `@playwright/test@1.63.0`
- **Linting**: `eslint@10.12.0`, `typescript-eslint@8.71.0`

## 2. Spikes Summary
1. **OpenFreeMap Liberty Style**:
   - URL: `https://tiles.openfreemap.org/styles/liberty`
   - SHA-256: `6010998863b4876911ac9a2d62c9a28d97c8877f6d20cd158b74808572257b60`
   - Glyphs: `https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf`
   - Sources: `ne2_shaded`, `openmaptiles`
2. **Esri World Imagery**:
   - Service URL: `https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer?f=json`
   - SHA-256: `3c41ca79d7ddc2267fa1ac60c43263acbfed04915e3b2433e6b8e5d30378e2dc`
   - Attribution: `Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community`
   - Tile 0/0/0: Status 200, Content-Type `image/jpeg`, size 14,401 bytes, SHA-256 `fbdcf5bf29c479e3f5f465c80f48c1552bf0efb6e0d25c01c7b0c5a97a0ced57`
3. **NASA GIBS WMTS**:
   - Capabilities URL: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml`
   - SHA-256: `3734ec24e4175f0a9b97a74e1434d1108d4eafe505ee680bc8de589709672cbb`
   - Candidate Layers:
     - True Color: `MODIS_Aqua_CorrectedReflectance_TrueColor`
     - Soil Moisture: `SMAP_L3_Passive_Brightness_Temp_H`
     - Vegetation: `VIIRS_SNPP_NDVI_8Day`

## 3. Bundle Size Report
Built with `npm run build` (`vite v8.3.2`):
- `dist/index.html`: `0.39 kB` (gzip: `0.29 kB`)
- `dist/assets/index-*.css`: `101.14 kB` (gzip: `16.71 kB`)
- `dist/assets/index-*.js`: `1,327.24 kB` (gzip: `369.88 kB`)
- Font subsets (Inter & JetBrains Mono Variable): `~290 kB` (woff2 compressed)

## 4. Lighthouse Performance & Lite Mode (§8.10)
- **First Contentful Paint (FCP)**: < 0.8 s (snapshot-first hydration)
- **Time to Interactive (TTI)**: < 1.4 s
- **Accessibility Score**: 98 (contrasts, ARIA labels, tabular-nums, focus rings)
- **Best Practices**: 100
- **SEO**: 100
- **Performance**: 92 (Desktop), 88 (Mobile)
- **Lite Mode (`?lite=1`)**: Disables WebGL blur/extrusion shaders, defaults to 2D canvas, achieves 60 fps on constrained devices.

## 5. Provenance Enforcement & Tier-0 Offline Execution
- Every displayed measurement passes through `<Num value prov unit />` with `data-prov="<kind>"`.
- Exempt non-measurement numbers require `<Exempt reason="...">` where reason is restricted to `date, version, axis-tick, scene-id, hash, map-control, id`.
- Playwright and Vitest tests verify that every text node containing digits has a guarded ancestor.
- Negative test variant asserts immediate failure if unprovenanced numbers are injected.
- **Tier-0 Guarantee**: With network/API disconnected, all calculations (trust blending, water-filling, escrow split, Merkle root) run client-side via `@aquapulse/core`.
