import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const cases = JSON.parse(readFileSync(new URL('docs/api/explorer-cases.json', root), 'utf8'));
const server = readFileSync(new URL('src/app/server.ts', root), 'utf8');
const routes = [...server.matchAll(/app\.(get|post|patch|delete)\(\s*'([^']+)'/g)].map(
  ([, method, path]) => ({ method, path: path.replace(/:(\w+)/g, '{$1}') }),
);
const supplemental = {
  'get /authorize/interaction': { query: { interaction_id: '{{interactionId}}' } },
  'post /authorize/decision': {
    body: { interaction_id: '{{interactionId}}', decision: 'approve' },
  },
  'patch /api/v1/users/me/profile': {
    body: { name: 'eTroy User', avatar_url: 'https://example.com/avatar.png' },
  },
  'post /api/v1/users/me/password': {
    body: { currentPassword: '{{userPassword}}', newPassword: '{{newPassword}}' },
  },
  'post /admin/maintenance/purge-unverified-users': { body: { dryRun: true, olderThanDays: 30 } },
};
const schema = (value) => {
  if (Array.isArray(value)) return { type: 'array', items: schema(value[0] ?? '') };
  if (value && typeof value === 'object')
    return {
      type: 'object',
      properties: Object.fromEntries(Object.entries(value).map(([key, v]) => [key, schema(v)])),
    };
  return {
    type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string',
  };
};
const paths = {};
for (const { method, path } of routes) {
  const matches = cases.filter((c) => c.method.toLowerCase() === method && c.path === path);
  const samples = [...matches];
  if (supplemental[`${method} ${path}`])
    samples.push({ id: 'example', name: 'Example', ...supplemental[`${method} ${path}`] });
  const op = {
    tags: [
      matches[0]?.group ??
        (path.startsWith('/admin')
          ? 'Admin'
          : path.startsWith('/api/v1/users')
            ? 'Account'
            : 'OIDC & Account'),
    ],
    summary: matches[0]?.name.replace(/^\d+ /, '') ?? `${method.toUpperCase()} ${path}`,
    operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_')}`,
    description: matches.length
      ? 'Explorer scenarios:\n\n' +
        matches.map((c) => `- **${c.name}**: ${c.description}`).join('\n')
      : 'Integrated backend endpoint.',
    parameters: [],
    responses: {
      200: { description: 'Successful response (endpoint-specific JSON or text).' },
      400: { description: 'Invalid request.' },
      401: { description: 'Missing or invalid credentials/session.' },
      403: { description: 'Operation denied.' },
      500: { description: 'Server error.' },
    },
    'x-explorer-cases': matches.map((c) => c.id),
  };
  if (['/authorize', '/verify-email'].includes(path))
    op.responses['302'] = {
      description: 'Redirect to interaction UI or registered client.',
      headers: { Location: { schema: { type: 'string' } } },
    };
  if (method === 'post' && ['/register', '/admin/users', '/admin/clients'].includes(path))
    op.responses['201'] = { description: 'Created.' };
  if (path === '/ready') op.responses['503'] = { description: 'Dependencies unavailable.' };
  for (const [, name] of path.matchAll(/\{(\w+)\}/g))
    op.parameters.push({ name, in: 'path', required: true, schema: { type: 'string' } });
  for (const kind of ['query', 'headers']) {
    const names = new Set(samples.flatMap((c) => Object.keys(c[kind] ?? {})));
    for (const name of names) {
      if (name.toLowerCase() === 'authorization') continue;
      op.parameters.push({
        name,
        in: kind === 'query' ? 'query' : 'header',
        schema: { type: 'string' },
        examples: Object.fromEntries(
          samples
            .filter((c) => c[kind]?.[name] !== undefined)
            .map((c) => [c.id, { summary: c.name, value: c[kind][name] }]),
        ),
      });
    }
  }
  if (path.startsWith('/admin')) op.security = [{ adminContext: [] }];
  if (path === '/userinfo') op.security = [{ bearerAuth: [] }];
  if (
    path.startsWith('/api/v1/users') ||
    path.startsWith('/authorize/interaction') ||
    path.startsWith('/authorize/decision') ||
    path === '/logout'
  )
    op.security = [{ sessionCookie: [] }];
  const bodies = samples.filter((c) => c.body !== undefined);
  if (bodies.length) {
    const content = {};
    for (const c of bodies) {
      const mime =
        c.contentType === 'form' ? 'application/x-www-form-urlencoded' : 'application/json';
      content[mime] ??= { schema: { type: 'object', properties: {} }, examples: {} };
      Object.assign(content[mime].schema.properties, schema(c.body).properties);
      content[mime].examples[c.id] = { summary: c.name, value: c.body };
    }
    op.requestBody = { required: true, content };
  }
  (paths[path] ??= {})[method] = op;
}
const mapped = new Set(
  Object.values(paths).flatMap((p) => Object.values(p).flatMap((o) => o['x-explorer-cases'])),
);
if (cases.some((c) => !mapped.has(c.id))) throw new Error('Unmapped Explorer cases');
const spec = {
  openapi: '3.0.3',
  info: {
    title: 'eTroy One API',
    version: '1.0.0',
    description:
      'OIDC provider, identity lifecycle and administration. The 87 original API Explorer scenarios are preserved as named examples and x-explorer-cases. Replace {{placeholders}} before executing requests. Browser login establishes the same-origin session cookie; copy the etroy_oidc_csrf cookie value to x-oidc-csrf-token for logout. Admin context is inherited from upstream and is not a complete authorization mechanism. Do not expose this development configuration publicly.',
  },
  servers: [{ url: '/', description: 'Current eTroy One origin' }],
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      adminContext: {
        type: 'apiKey',
        in: 'header',
        name: 'x-admin-sub',
        description: 'Upstream administrative actor context; not proof of authorization.',
      },
      sessionCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'etroy_oidc_sid',
        description:
          'Established by POST /login; browser sends automatically. Swagger cannot set HttpOnly cookies manually.',
      },
    },
  },
};
writeFileSync(new URL('docs/api/openapi.json', root), JSON.stringify(spec, null, 2) + '\n');
process.stdout.write(
  `Generated ${routes.length} operations; preserved ${mapped.size} Explorer cases.\n`,
);
