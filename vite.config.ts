import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Relative base ('./') keeps asset URLs portable across BOTH deploy targets:
//   • GitHub Pages project subpath (josiah-lgtm.github.io/reverse-engineering/)
//   • Vercel root (where /api/publish is also served)
// The app is a single page with store-driven views (no router), so no SPA
// 404-fallback is needed.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
  },
});
