'use strict';

// Runtime server for the self-hosted (Docker + nginx) deploy.
//
// Serves the built Vite SPA (./dist) and the single Vercel-style function
// api/publish.js (copied into the image as ./api/publish.cjs) at the same
// origin, so the frontend's relative POST /api/publish keeps working exactly
// as it does on Vercel. nginx on the host terminates TLS and proxies here.

const path = require('path');
const express = require('express');

// Vercel-style handler: module.exports = async (req, res) => { ... }
// Express's req/res are compatible (req.method, req.headers, req.body,
// res.status().json(), res.setHeader, res.status(204).end()).
const publish = require('./api/publish.cjs');

const app = express();
app.disable('x-powered-by');

// The publish handler caps markdown at ~200kb; express defaults to 100kb, so
// give it headroom. nginx also enforces client_max_body_size.
app.use(express.json({ limit: '1mb' }));

// ── API: the one function, same-origin ───────────────────────────────────────
app.all('/api/publish', (req, res) => publish(req, res));
// Any other /api/* path is a real 404 (don't fall through to the SPA HTML).
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// ── Static SPA + client-side route fallback ──────────────────────────────────
const distDir = path.join(__dirname, 'dist');
app.use(
  express.static(distDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('index.html')) {
        // Always re-fetch the entry document so new deploys take effect.
        res.setHeader('Cache-Control', 'no-cache');
      } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        // Vite emits content-hashed asset filenames — safe to cache forever.
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }),
);

// Deep links (/business-data, /history, …) -> SPA entry point.
app.use((req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`reverse-engineering listening on :${port}`);
});
