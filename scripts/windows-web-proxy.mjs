#!/usr/bin/env node
// A same-origin front door for the local Windows stack.
//
// In production nginx fronts the SvelteKit server and proxies /api and /health
// to the Go backend, so the browser only ever talks to one origin — which is
// what the SameSite=Lax session cookie needs. Locally there is no nginx, so the
// SPA's own fetches to /api/v1/... landed on the SvelteKit server, which has no
// such route: the list pages loaded server-side and then failed to refresh.
//
// This is that nginx, in one file and without a dependency: /api and /health go
// to the Go API, everything else goes to the app.
//
//   node scripts/windows-web-proxy.mjs
//
//   PORT          the port this listens on (default 3000)
//   APP_ORIGIN    the SvelteKit server (default http://127.0.0.1:3001)
//   API_ORIGIN    the Go API (default http://127.0.0.1:8080)

import { createServer, request as httpRequest } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);
const APP_ORIGIN = process.env.APP_ORIGIN ?? 'http://127.0.0.1:3001';
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://127.0.0.1:8080';

const API_PREFIXES = ['/api/', '/health'];

/** Is this path one the backend answers? */
function isApiPath(pathname) {
  return API_PREFIXES.some((prefix) =>
    prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix,
  );
}

/** Pipe one request through to another origin and back. */
function pipe(req, res, origin) {
  const target = new URL(req.url, origin);
  const upstream = httpRequest(
    {
      hostname: target.hostname,
      port: target.port,
      path: target.pathname + target.search,
      method: req.method,
      headers: { ...req.headers, host: target.host },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );
  upstream.on('error', (error) => {
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`proxy error: ${error.message}\n`);
  });
  req.pipe(upstream);
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  pipe(req, res, isApiPath(pathname) ? API_ORIGIN : APP_ORIGIN);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`windows-web-proxy: http://127.0.0.1:${PORT} -> app ${APP_ORIGIN}, api ${API_ORIGIN}`);
});
