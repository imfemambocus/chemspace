import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
