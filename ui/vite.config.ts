import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Browser navigation stays with Vite; API calls use the integrated Express server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      [
        '/api',
        '/authorize',
        '/token',
        '/userinfo',
        '/jwks',
        '/logout',
        '/revoke',
        '/introspect',
        '/verification',
        '/password-reset',
        '/verify-email',
        '/health',
        '/ready',
        '/metrics',
        '/docs',
        '/openapi.json',
        '/admin',
        '/login',
        '/register',
      ].map((path) => [
        path,
        {
          target: 'http://localhost:3000',
          bypass: (req: { headers: { accept?: string }; url?: string }) =>
            req.headers.accept?.includes('text/html') &&
            ['/admin', '/login', '/register'].some((prefix) => req.url?.startsWith(prefix))
              ? req.url
              : undefined,
        },
      ]),
    ),
  },
});
