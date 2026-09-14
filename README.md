# geo-osiris-admin

Separately deployable admin UI for the OSIRIS Geo Hub. It never calls the Geo
API from the browser.

```
Browser ──HTTPS──► admin-proxy ──forward-auth──► Authelia
                        │
                        └──► geo-osiris-admin (Next.js server) ──► Geo API /api/v1/admin/*
                                       │
                                       └── GEO_ADMIN_TOKEN (server-only env)
```

Geo Admin has no host port and no login form. It trusts an authenticated human
identity only when the request carries a matching `X-Proxy-Secret` header from
the internal proxy, together with `Remote-User`/`Remote-Name`/`Remote-Email`.
Every mutation route and server action re-checks that identity before calling
the Geo API.

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `GEO_API_URL` | yes | Geo API base URL, used only server-side |
| `GEO_ADMIN_TOKEN` | yes | Scoped bearer token (`geo.read`+`geo.stage`+`geo.admin`, never `geo.publish`/`geo.approve`); never sent to the browser |
| `GEO_APPROVE_TOKEN` | yes | Server-only bearer token (`geo.read`+`geo.approve`, never `geo.publish`/`geo.stage`/`geo.admin`) used exclusively by the approval decision path; never sent to the browser |
| `ADMIN_PROXY_SECRET` | yes | Shared secret proving the request came through the trusted proxy. Without it, all identity is rejected (fail closed). |
| `AUTHELIA_PORTAL_URL` | no | Authelia portal URL for the "Sign out" link |

Copy `.env.example` to `.env.local` for development. Local development requires
a matching `ADMIN_PROXY_SECRET` and manually supplied identity headers.

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build
npm run start
npm run lint
npm run typecheck
npm test
```

## Publication approval

Curator/MCP creates a publication approval request through the Geo API. Geo
Admin lists pending and historical requests at `/approvals` and shows the
immutable, fingerprinted snapshot at `/approvals/{id}`. An authenticated human
can approve or reject there; the decision route uses the server-only
`GEO_APPROVE_TOKEN` and passes the session `userId` as the approver identity
(`X-Approver-Identity`). Approving never publishes — the isolated
`geo-publisher` executes approved requests. The browser never receives an
approve or publish token, and Geo Admin holds no `geo.publish`.

## Scope (frontend checkpoint 1)

Implemented: layer list/create/edit, managed feature table with cursor
pagination, feature detail with provenance, manual Point creation by
coordinates or map click, feature edit/archive, external layers read-only,
freshness (`revision`, `data_updated_at`) diagnostics.

Not yet implemented: CSV/GeoJSON import UI, duplicate review, source
dashboard, OSIRIS refresh, production deployment hardening.
