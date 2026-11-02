import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';

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
const login = await post('/login', { email, password });
assert.equal(login.status, 200);
const cookie = login.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
assert.match(cookie, /etroy_oidc_sid=/);
const me = await fetch(base + '/api/v1/users/me', { headers: { Cookie: cookie } });
assert.equal(me.status, 200);
assert.equal((await me.json()).data.sub, identity.sub);
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
