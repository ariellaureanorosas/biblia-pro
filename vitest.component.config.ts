import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    // Testes de componente: happy-dom + React Testing Library.
    // happy-dom não depende do undici (diferente do jsdom), então funciona
    // no Node 24 do GitHub Actions.
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.component.test.{ts,tsx}'],
  },
});
