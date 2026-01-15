import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Use jsdom for renderer tests
    environmentMatchGlobs: [
      ['src/renderer/**/*.test.tsx', 'jsdom'],
    ],
    // Setup files for renderer tests
    setupFiles: ['./src/renderer/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx', 'config/**'],
    },
    // Mock browser APIs not available in jsdom
    deps: {
      inline: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@renderer': resolve(__dirname, './src/renderer/src'),
    },
  },
});
