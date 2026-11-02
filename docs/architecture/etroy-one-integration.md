# eTroy One integration contract

Requested by the repository owner: combine the OIDC backend and identity UI into a new monolith and replace the standalone Explorer with integrated Swagger.

This contract supersedes upstream documents only on repository boundaries, delivery, startup and API exploration. Domain ownership, OIDC semantics, persistence and lifecycle rules remain inherited.

- One root backend package and one React npm workspace; one lockfile.
- Production: one Express process serves static UI, Swagger and API on one origin.
- React browser routes require an explicit HTML Accept header; existing JSON API paths remain intact.
- `/reset-password` is a presentation route instead of an external-UI redirect.
- Public UI origin is explicit configuration, independent of third-party redirect URIs.
- All 87 Explorer scenarios are preserved as examples; every registered backend operation is documented.
- No upstream history, secrets or private keys are imported. Source snapshots and notices are recorded in SOURCES.md.
- Root CI, Docker build and Compose replace independent deployment workflows.

Acceptance: complete UI/server build; valid OpenAPI and full scenario mapping; real HTTP checks against both source and compiled application for UI, JSON dispatch, Swagger assets, reset/verification navigation and missing routes. External dependency and full OIDC workflows need running MongoDB/Redis/SMTP.
