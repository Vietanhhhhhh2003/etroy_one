import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import test, { mock } from 'node:test';
import dotenv from 'dotenv';
Object.assign(process.env, dotenv.parse(readFileSync('.env.example')), { NODE_ENV: 'test' });

test('admin APIs enforce persisted roles, ignore forged actor headers and recheck role/status', async () => {
  const { createServer } = await import('../src/app/server.js');
  const { oidcService } = await import('../src/modules/oidc/services/oidc.service.js');
  const { userService } = await import('../src/modules/users/user.service.js');
  const { adminService } = await import('../src/modules/admin/admin.service.js');
  let roles: ('user' | 'admin')[] = ['user'];
  let status: 'active' | 'disabled' = 'active';
  mock.method(oidcService, 'getActiveSession', async (cookie: string | undefined) =>
    cookie ? { subject: 'real-subject' } : null,
  );
  mock.method(userService, 'getUserBySub', async () => ({
    sub: 'real-subject',
    email: 'member@example.com',
    roles,
    status,
    email_verified: true,
  }));
  mock.method(adminService, 'listUsers', async () => []);
  let actor: string | undefined;
  mock.method(adminService, 'createUser', async (_input, context) => {
    actor = context.actor.adminSub;
    return {};
  });
  const server = createServer().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const headers = {
    Cookie: 'etroy_oidc_sid=test',
    'x-admin-sub': 'forged-admin',
    'Content-Type': 'application/json',
  };
  try {
    assert.equal(
      (await fetch(base + '/api/v1/admin/users', { headers: { 'x-admin-sub': 'forged-admin' } }))
        .status,
      401,
    );
    for (const [method, path] of [
      ['GET', '/users'],
      ['GET', '/users/a'],
      ['POST', '/users'],
      ['PATCH', '/users/a/profile'],
      ['POST', '/users/a/disable'],
      ['GET', '/clients'],
      ['POST', '/clients'],
      ['GET', '/sessions'],
      ['GET', '/audit-logs'],
      ['POST', '/maintenance/purge-unverified-users'],
    ]) {
      assert.equal(
        (await fetch(base + '/api/v1/admin' + path, { method, headers })).status,
        403,
        `${method} ${path}`,
      );
    }
    roles = ['user', 'admin'];
    assert.equal((await fetch(base + '/api/v1/admin/users', { headers })).status, 200);
    assert.equal(
      (
        await fetch(base + '/api/v1/admin/users', {
          method: 'POST',
          headers,
          body: JSON.stringify({ email: 'new@example.com', password: 'example-password' }),
        })
      ).status,
      201,
    );
    assert.equal(actor, 'real-subject', 'audit actor is derived from the verified session');
    roles = ['user'];
    assert.equal((await fetch(base + '/api/v1/admin/users', { headers })).status, 403);
    roles = ['user', 'admin'];
    status = 'disabled';
    assert.equal((await fetch(base + '/api/v1/admin/users', { headers })).status, 403);
    assert.equal(
      (await fetch(base + '/admin/users', { headers })).status,
      404,
      'no legacy JSON admin alias',
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    mock.restoreAll();
  }
});
