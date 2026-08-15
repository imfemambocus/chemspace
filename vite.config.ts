import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

// `npm run analyze` adds the bundle visualizer and writes dist/stats.html, a treemap of chunk
// weights: it is how you confirm three.js is still out of the entry chunk. A normal build and
// the dev server never load it.
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
    // one chunk goes over the 500 kB default: the lazy StructureViewer, which is three.js plus
    // drei, postprocessing and n8ao. it downloads after the text paints and three.js is
    // irreducible, so the warning is noise rather than a regression. the entry stays ~106 kB gzip
    chunkSizeWarningLimit: 1300,
  },
  server: {
    // same-origin, which is what keeps the browser calls clear of CORS. every deployed host
    // needs its own equivalent: see vercel.json and docker/nginx.conf
    proxy: {
      '/pubchem': {
        target: 'https://pubchem.ncbi.nlm.nih.gov',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/pubchem/, ''),
      },
    },
  },
}))
