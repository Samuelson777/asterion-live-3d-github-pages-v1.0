# ASTERION FCTA-1 Live 3D App

A single-page GitHub Pages application presenting the ASTERION CAD/CAM/CAE project from version 0.1 through 1.0.

## Features

- Ten-stage interactive version timeline
- Three.js GLB viewer with orbit, fit, wireframe, X-ray, explode and section controls
- Procedural Version 0.1 concept model
- Version-specific 3D scenes for CAD, structural, multiphysics and manufacturing work
- Subsystem highlighting for structure, habitat, propulsion, power, thermal, Skimmer, docking and robotics
- Engineering maturity and result dashboards
- Evidence image gallery and downloadable report, drawings, presentation and release packages
- Responsive layout, light/dark mode and installable web-app manifest
- GitHub Actions Pages deployment

## Run locally

Do not open `index.html` directly because browsers restrict local module and model loading.

```bash
python tools/serve.py
```

Then open `http://127.0.0.1:8000/`.

## Validate

```bash
python tools/validate_site.py
```

## Publish on GitHub Pages

1. Create a new GitHub repository.
2. Upload every file in this folder to the repository root.
3. Push to the `main` branch.
4. Open **Settings → Pages**.
5. Select **GitHub Actions** as the source.
6. The included `.github/workflows/pages.yml` workflow deploys the site.

The application is static and needs no server-side database. Three.js is pinned to version `0.185.1` through an import map.

## Claim boundary

This site presents conceptual engineering geometry and reduced-order screening. It does not claim a certified spacecraft, production aircraft, solved proprietary ANSYS database or fully parametric native Siemens NX release.
