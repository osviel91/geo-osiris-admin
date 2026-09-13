# geo-osiris-admin

Separately deployable admin UI for the OSIRIS Geo Hub. It never calls the Geo
API from the browser.

```
Browser → geo-osiris-admin (Next.js server) → Geo API /api/v1/admin/*
                        │
                        └── ADMIN_API_TOKEN (server-only env)
```

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `GEO_API_URL` | yes | Geo API base URL, used only server-side |
| `ADMIN_API_TOKEN` | yes | Bearer token for `/api/v1/admin/*`; never sent to the browser |
| `ADMIN_UI_PASSWORD` | no | When set, gates the UI behind a login cookie. When unset, the app trusts an authenticated reverse proxy in front of it. |

Copy `.env.example` to `.env.local` for development.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build
npm run start
npm run lint
npm run typecheck
npm test
```

## Scope (frontend checkpoint 1)

Implemented: layer list/create/edit, managed feature table with cursor
pagination, feature detail with provenance, manual Point creation by
coordinates or map click, feature edit/archive, external layers read-only,
freshness (`revision`, `data_updated_at`) diagnostics.

Not yet implemented: CSV/GeoJSON import UI, duplicate review, source
dashboard, OSIRIS refresh, production deployment hardening.
