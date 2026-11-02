# eTroy One

Integrated React identity UI, modular Express OIDC provider and Swagger UI. Production serves everything from **one Node.js process and one origin**.

## Quick start with Docker

```sh
docker compose up --build
```

- UI: http://localhost:3000
- Swagger: http://localhost:3000/docs/
- OpenAPI: http://localhost:3000/openapi.json
- Mailpit inbox: http://localhost:8025

Compose provides MongoDB 7.0, Redis and a local SMTP inbox. It binds host ports to loopback and uses development cookies for local HTTP. Signing keys are generated on first startup and persisted in MongoDB. This configuration is for local development. MongoDB 7.0 avoids the current [MongoDB 8.x startup issue on newer Ubuntu kernels](https://jira.mongodb.org/browse/SERVER-136848).

## Run with Node.js

Use Node.js 22.12+ and npm 10+.

```sh
npm ci
# Copy .env.example to .env, then adjust infrastructure settings.
docker compose up -d mongo redis mailpit
npm run build
npm start
```

PowerShell: `Copy-Item .env.example .env`. Bash: `cp .env.example .env`.

`npm run dev` builds the UI and watches the backend on port 3000. For UI hot reload, also run `npm run dev:ui` in a second terminal and use http://localhost:5173; set `PUBLIC_UI_BASE_URL=http://localhost:5173` in the root `.env` and restart the backend. API calls are proxied to port 3000. Restart `npm run dev` or rebuild after frontend changes when using port 3000 directly.

## Structure

```text
src/                 OIDC, identity, administration and infrastructure modules
ui/                  React/Vite frontend (npm workspace)
src/app/presentation.ts   Same-origin UI and Swagger delivery
docs/api/            OpenAPI specification and 87 migrated Explorer scenarios
scripts/generate-openapi.mjs  Reproducible API specification generator
tests/               Source and compiled HTTP integration checks
Dockerfile           One deployable application image
compose.yaml         Application, MongoDB, Redis, local SMTP
```

`npm run check` runs frontend/backend lint, backend typecheck, full frontend and backend builds, OpenAPI validation and HTTP integration tests. `npm run docs:generate` refreshes the spec after route changes. CI also checks generated-spec drift and builds the container.

## Swagger migration

The standalone API Explorer is replaced by Swagger UI at `/docs/`. All **87 original scenarios** are retained in `docs/api/explorer-cases.json` and mapped to **41 backend operations**. Repeated requests are named examples under the same OpenAPI operation. Negative scenarios remain available; they are expectations, not claims that a test has passed. The generator supplements endpoints absent from the Explorer with account, interaction and maintenance examples.

Replace `{{placeholders}}` with your local values before using **Try it out**. Login with `POST /login` to establish the browser session. The browser shares cookies with the UI; Swagger cannot manually set an HttpOnly cookie. `/userinfo` accepts a bearer JWT. For logout, copy the `etroy_oidc_csrf` cookie value into `x-oidc-csrf-token`. Admin requests expose the upstream `x-admin-sub` context via the Authorize dialog. The testing sequence remains in [API_TESTING_GUIDELINE.md](docs/API_TESTING_GUIDELINE.md).

UI navigation uses `Accept: text/html`; JSON API calls use `Accept: application/json`. This preserves overlapping `/admin/users`, `/admin/clients` and `/admin/sessions` routes. `/reset-password` now directly serves the React page, preventing a redirect loop after unifying origins. Unknown API and asset paths return 404.

## Configuration and deployment limits

The root `.env` is the backend configuration source. Frontend defaults use relative same-origin URLs; optional overrides are documented in `ui/.env.example`. `PUBLIC_UI_BASE_URL` explicitly controls email/interaction UI links and defaults to `APP_BASE_URL`, independently of ecosystem client callback URLs.

The imported backend retains its existing authorization and credential implementation: administrative actor headers and frontend email allowlists are development foundations, and password hashing uses SHA-256. These require a separate hardening pass before public production use. This integration does not claim production security readiness. For deployment, configure a public HTTPS issuer/UI origin, `NODE_ENV=production`, secure infrastructure, real SMTP credentials, access controls and a strong password KDF. Do not use the upstream demonstration account script in production.

No values from other local projects' `.env` files are imported. Generated builds, local environment files and private keys are excluded from Git.

## Sources and notices

See [SOURCES.md](SOURCES.md) for exact upstream snapshots and ownership notices. Original backend architecture/contracts remain in `docs/`; [the integration contract](docs/architecture/etroy-one-integration.md) defines the approved changes for this combined repository.
