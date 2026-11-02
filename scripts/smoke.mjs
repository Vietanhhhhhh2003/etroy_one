import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Run only against a disposable local/CI stack; creates a unique test identity.
const base = 'http://localhost:3000';
const post = (path, body, headers = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
assert.equal((await fetch(base + '/ready')).status, 200);
assert.equal((await fetch(base + '/docs/')).status, 200);
const jwks = await (await fetch(base + '/jwks')).json();
assert.ok(jwks.keys.length > 0);
const email = `smoke-${randomUUID()}@example.com`;
const password = randomUUID() + 'Aa1!';
const register = await post('/register', { email, password, name: 'Integration smoke' });
assert.equal(register.status, 201);
const { data: identity } = await register.json();
assert.equal(identity.email, email);
assert.deepEqual(identity.roles, ['user']);
const forbiddenLogin = await post('/api/v1/admin/login', { email, password });
assert.equal(forbiddenLogin.status, 403);
assert.equal(forbiddenLogin.headers.getSetCookie().length, 0);
const login = await post('/api/v1/user/login', { email, password });
assert.equal(login.status, 200);
const cookie = login.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
assert.match(cookie, /etroy_oidc_sid=/);
const me = await fetch(base + '/api/v1/user/me', { headers: { Cookie: cookie } });
assert.equal(me.status, 200);
assert.equal((await me.json()).data.sub, identity.sub);
assert.equal(
  (await fetch(base + '/api/v1/admin/users', { headers: { 'x-admin-sub': 'system-admin' } }))
    .status,
  401,
);
assert.equal(
  (
    await fetch(base + '/api/v1/admin/users', {
      headers: { Cookie: cookie, 'x-admin-sub': 'system-admin' },
    })
  ).status,
  403,
);
assert.equal(
  (
    await post('/register', {
      email: `escalation-${randomUUID()}@example.com`,
      password,
      roles: ['admin'],
    })
  ).status,
  400,
);
execFileSync(
  'docker',
  ['compose', 'exec', '-T', 'app', 'node', 'dist/scripts/grant-admin.js', email],
  { stdio: 'pipe' },
);
const adminLogin = await post('/api/v1/admin/login', { email, password });
assert.equal(adminLogin.status, 200);
const adminCookie = adminLogin.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
assert.equal(
  (await fetch(base + '/api/v1/admin/users', { headers: { Cookie: adminCookie } })).status,
  200,
);
const verification = await post('/verification/request', { userId: identity.sub });
assert.equal(verification.status, 200);
const inbox = await (await fetch('http://localhost:8025/api/v1/messages')).json();
assert.ok(inbox.total > 0, 'SMTP delivered verification email to Mailpit');
const verifier = randomUUID() + randomUUID();
const query = new URLSearchParams({
  response_type: 'code',
  client_id: 'etroy-web',
  redirect_uri: base + '/callback',
  scope: 'openid profile email',
  state: randomUUID(),
  nonce: randomUUID(),
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method: 'S256',
});
const authorize = await fetch(base + '/authorize?' + query, {
  headers: { Cookie: cookie },
  redirect: 'manual',
});
assert.equal(authorize.status, 302);
const location = new URL(authorize.headers.get('location'));
assert.equal(location.origin, base);
assert.ok(['/oidc/consent', '/oidc/login', '/callback'].includes(location.pathname));
if (location.pathname !== '/callback') {
  assert.equal((await fetch(location, { headers: { Accept: 'text/html' } })).status, 200);
}
console.log(
  'Live stack smoke passed: readiness, Swagger, JWKS, registration, session/profile, SMTP and OIDC interaction redirect.',
);
