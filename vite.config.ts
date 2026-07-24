import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// `npm run analyze` builds in the `analyze` mode, which adds the bundle visualizer: it
// writes dist/stats.html (a treemap of chunk weights) and opens it, so we can confirm the
// numbers the perf mandate cares about, e.g. that three.js stays out of the entry chunk.
// A normal build or the dev server never loads it, so it costs the app nothing.
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    mode === 'analyze' &&
      visualizer({
        filename: 'dist/stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      }),
  ],
  server: {
    // Proxy PubChem PUG REST through the dev server so browser calls are same-origin
    // and never hit CORS. Production would need its own proxy or a CORS-safe host.
    proxy: {
      '/pubchem': {
        target: 'https://pubchem.ncbi.nlm.nih.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pubchem/, ''),
      },
    },
  },
}))
