import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Absolute root base — production is Vercel root (reverseengineering.agencyadvanta.com),
// where /api/publish is also served. The app now has path-based routing
// (/business-data, /history, …), so a root base + a Vercel SPA rewrite (vercel.json)
// lets deep links resolve and refresh cleanly. (GitHub Pages subpath deploy is retired.)
export default defineConfig({
  base: '/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
  },
});
