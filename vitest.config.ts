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
    // Todos os testes (unidade + componente) rodam em jsdom.
    // Os testes puros (bibleRefs.test.ts) não precisam de DOM, mas jsdom não
    // prejudica; apenas adiciona um pouco de overhead no setup.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.component.test.{ts,tsx}'],
  },
});
