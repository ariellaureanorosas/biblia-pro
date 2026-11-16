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
    // Testes de unidade: Node puro, sem DOM. Evita problemas de compatibilidade
    // do jsdom com o undici no Node 24 do GitHub Actions.
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['src/**/*.component.test.{ts,tsx}'],
    environment: 'node',
  },
});
