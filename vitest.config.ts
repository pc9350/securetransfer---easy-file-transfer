import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node', // Node 18+ has crypto.subtle, File, Blob natively
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/utils/**/*.ts'],
      exclude: ['src/utils/__tests__/**'],
    },
  },
});
