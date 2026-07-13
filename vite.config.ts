import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: './',
  define: {
    'process.env': {},
  },
  build: {
    outDir: 'dist',
    // Opt-in source maps: `TEW_SOURCEMAP=1 npm run build:react` produces a
    // debuggable build so minified runtime errors (e.g. React #300) decode to
    // real file:line. Release builds stay lean by leaving it unset.
    sourcemap: process.env.TEW_SOURCEMAP === '1',
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
})
