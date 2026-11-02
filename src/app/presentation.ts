import express, { type Express } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import swaggerUi from 'swagger-ui-express';

// Source and compiled modules have different depths. Resolve independently of cwd.
const projectRoot = fileURLToPath(
  new URL(import.meta.url.includes('/dist/') ? '../../../' : '../../', import.meta.url),
);
const uiDirectory = `${projectRoot}/ui/dist`;
const spec = JSON.parse(readFileSync(`${projectRoot}/docs/api/openapi.json`, 'utf8')) as object;
const uiPaths = new Set([
  '/',
  '/login',
  '/oidc/login',
  '/register',
  '/register/success',
  '/consent',
  '/oidc/consent',
  '/platform-user-agreement',
  '/data-privacy-policy',
  '/resend-verification',
  '/verify-email/result',
  '/forgot-password',
  '/reset-password',
  '/account/error',
  '/support',
  '/user',
  '/user/login',
  '/user/profile',
  '/admin/login',
  '/admin',
  '/admin/overview',
  '/admin/users',
  '/admin/clients',
  '/admin/sessions',
  '/admin/audit',
  '/admin/observability',
  '/admin/keys',
]);

export const mountPresentation = (app: Express): void => {
  app.get('/openapi.json', (_request, response) => {
    response.json(spec);
  });
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      customSiteTitle: 'eTroy One API',
      swaggerOptions: { url: '/openapi.json', persistAuthorization: false, withCredentials: true },
    }),
  );
  app.use((request, response, next) => {
    if (
      (request.method === 'GET' || request.method === 'HEAD') &&
      request.headers.accept?.includes('text/html') &&
      uiPaths.has(request.path)
    ) {
      if (!existsSync(`${uiDirectory}/index.html`)) {
        response.status(503).type('text').send('Build the UI with npm run build:ui.');
        return;
      }
      response.set('Cache-Control', 'no-cache').sendFile(`${uiDirectory}/index.html`);
      return;
    }
    next();
  });
  app.use(express.static(uiDirectory, { index: false, redirect: false }));
};
