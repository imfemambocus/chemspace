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
  build: {
    // The only chunk over the 500 kB default is the lazily-imported StructureViewer (three.js +
    // drei + postprocessing + n8ao). It is code-split out of the entry and downloads only after
    // the text paints, and three.js is irreducible, so the warning is noise here rather than a
    // regression to chase. Raise the limit past that chunk; the entry chunk stays ~106 kB gzip.
    chunkSizeWarningLimit: 1300,
  },
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
