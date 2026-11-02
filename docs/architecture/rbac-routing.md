# Admin and user routing / RBAC

This contract supersedes earlier header-based administrative context and frontend email allowlists. It implements the user's request to separate administrative and account routes.

| Purpose | Browser route | API namespace |
|---|---|---|
| User sign-in | `/user/login` | `POST /api/v1/user/login` |
| Account | `/user/profile` | `/api/v1/user/me/*` |
| Admin sign-in | `/admin/login` | `POST /api/v1/admin/login` |
| Administration | `/admin/*` | `/api/v1/admin/*` |

`/` resolves to the authenticated role's home. `/login` redirects to `/user/login`. OIDC interaction pages `/oidc/login` and `/oidc/consent` and protocol endpoints retain their existing URLs.

- Roles are persisted as `user` and `admin` on the user record. Existing records without a role remain ordinary users.
- Registration and profile/admin user create/update payloads cannot assign roles. Email addresses do not confer privileges.
- All administrative API operations except login require a valid session and a currently active identity with a stored admin role. Missing session returns 401; insufficient role returns 403.
- Admin login validates the role before creating a session. Admin roles are reloaded for every administrative request; revocation applies immediately to existing sessions.
- Client-supplied `x-admin-sub` is ignored. Audit actor identity comes from the verified session.
- The old `/admin/*` JSON API aliases and `/api/v1/users/me` API are removed. `/admin/*` now serves browser pages only; it does not select JSON behavior from the Accept header.
- Admins may also manage their own account through user routes.
- The explicit operator command `docker compose exec -T app node dist/scripts/grant-admin.js <existing-email>` grants both user and admin roles without changing credentials. It is not exposed as an HTTP endpoint.

The pre-existing password KDF, cookie/OIDC lifecycle and unrelated domain behavior are outside this change. Automated coverage checks anonymous and ordinary-user denial, role revocation, disabled accounts, actor spoofing, privilege injection and successful administrative login/access with real MongoDB in the container smoke test.
