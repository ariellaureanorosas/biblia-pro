import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// UI thread build. A small React app rendered inside a sandboxed iframe.
// `base: './'` keeps asset URLs relative so the host can serve the build under
// /plugins/<id>/ui/.
export default defineConfig({
  root: resolve(__dirname, 'src/ui'),
  base: './',
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'dist/ui'),
    // Mantém os arquivos antigos: se o painel estiver com o index.html em cache,
    // ele continua carregando os assets que já conhece (em vez de ficar vazio).
    emptyOutDir: false,
  },
});
