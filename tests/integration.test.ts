import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import test from 'node:test';
import dotenv from 'dotenv';
import SwaggerParser from '@apidevtools/swagger-parser';

Object.assign(process.env, dotenv.parse(readFileSync('.env.example')), { NODE_ENV: 'test' });
const spec = JSON.parse(readFileSync('docs/api/openapi.json', 'utf8'));

test('OpenAPI is valid and retains all 87 original Explorer scenarios', async () => {
  await SwaggerParser.validate(structuredClone(spec));
  const ids = new Set(
    Object.values(spec.paths).flatMap((path: any) =>
      Object.values(path).flatMap((operation: any) => operation['x-explorer-cases']),
    ),
  );
  const cases = JSON.parse(readFileSync('docs/api/explorer-cases.json', 'utf8'));
  assert.equal(ids.size, 87);
  for (const scenario of cases) assert.ok(ids.has(scenario.id));
  assert.ok(spec.paths['/token'].post.requestBody.content['application/x-www-form-urlencoded']);
});

for (const modulePath of ['../src/app/server.js', '../dist/src/app/server.js']) {
  test(`single-origin presentation and API dispatch: ${modulePath}`, async () => {
    const { createServer } = await import(modulePath);
    const server = createServer().listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    assert.ok(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    try {
      for (const path of [
        '/',
        '/login',
        '/admin/login',
        '/user/login',
        '/user/profile',
        '/register',
        '/oidc/login',
        '/oidc/consent',
        '/admin/users',
        '/admin/clients',
        '/reset-password?token=example',
      ]) {
        const response = await fetch(base + path, {
          headers: { Accept: 'text/html' },
          redirect: 'manual',
        });
        assert.equal(response.status, 200, path);
        assert.match(response.headers.get('content-type') ?? '', /text\/html/);
        assert.match(await response.text(), /<div id="root">/);
      }
      for (const path of [
        '/health',
        '/openapi.json',
        '/docs/',
        '/docs/swagger-ui.css',
        '/docs/swagger-ui-bundle.js',
      ]) {
        assert.equal((await fetch(base + path)).status, 200, path);
      }
      const admin = await fetch(base + '/api/v1/admin/users', {
        headers: { Accept: 'application/json', 'x-admin-sub': 'system-admin' },
      });
      assert.equal(admin.status, 401);
      assert.match(admin.headers.get('content-type') ?? '', /json/);
      const login = await fetch(base + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.equal(login.status, 400);
      assert.match(login.headers.get('content-type') ?? '', /json/);
      const profile = await fetch(base + '/api/v1/user/me');
      assert.equal(profile.status, 401);
      assert.equal((await fetch(base + '/api/unknown')).status, 404);
      assert.equal((await fetch(base + '/assets/missing.js')).status, 404);
      const verify = await fetch(base + '/verify-email?token=example', { redirect: 'manual' });
      assert.equal(verify.status, 302);
      assert.equal(
        verify.headers.get('location'),
        'http://localhost:3000/verify-email/result?token=example',
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });
}
