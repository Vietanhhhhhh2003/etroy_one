# RBAC route separation validation

- `npm run check`: PASS (frontend/backend lint, typecheck, complete builds and 4 integration test cases).
- Authorization integration: anonymous 401, ordinary user 403 across administrative modules, spoofed actor headers ignored, session-derived audit actor, persisted-role revocation and disabled-user denial.
- Docker rebuild/start: PASS; all services healthy.
- Existing local `admin@troy.edu` explicitly granted `user` + `admin` roles through the operator CLI; credentials unchanged.
- Live HTTP: admin/user pages 200, administrative login 200, role-bearing profile 200, administrative user listing 200, anonymous actor-header request 401, legacy admin and account JSON paths 404.
- OpenAPI: 43 operations, all 87 original Explorer scenarios mapped.
- CI stack smoke additionally exercises regular-user denial at admin login/API, role injection rejection, explicit operator promotion and successful admin access against real MongoDB.

## Initial consolidation validation (historical)

# Validation

Local checks passed:

- `npm run check`: frontend/backend lint, backend typecheck, frontend/server builds and 3 integration tests.
- OpenAPI 3.0 validation: 41 operations; all 87 Explorer scenario IDs retained.
- HTTP checks against source and compiled server: UI routes, overlapping admin JSON routes, login input errors, session boundary, Swagger HTML/CSS/JS, OpenAPI, verification redirects, reset page and API/asset 404s.
- `docker compose config --quiet`.
- `npm audit --omit=dev`: zero vulnerabilities after updating Nodemailer to 10.3.1.

The local Docker daemon is unavailable. GitHub Actions starts the complete Compose stack and runs `scripts/smoke.mjs` to validate database-backed registration, session/profile access, SMTP delivery, readiness, signing keys and an OIDC interaction redirect.

The development dependency audit reports 14 moderate findings in the inherited ESLint/minimatch toolchain; npm reports no non-breaking automatic fix. Upstream documentation and UI source also contain pre-existing trailing whitespace. These do not block lint, typecheck, builds or HTTP tests.

Domain-level security and the full 87-case business workflow suite are not asserted by these integration checks. See README.md for inherited authentication/authorization limitations.
