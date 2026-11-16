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
    // Testes de componente: jsdom + React Testing Library.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.component.test.{ts,tsx}'],
  },
});
