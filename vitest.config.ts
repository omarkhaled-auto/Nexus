import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    // Use jsdom for renderer tests (both .ts and .tsx)
    environmentMatchGlobs: [
      ['src/renderer/**/*.test.tsx', 'jsdom'],
      ['src/renderer/**/*.test.ts', 'jsdom'],
    ],
    // Setup files - global MSW setup + renderer-specific setup
    setupFiles: ['./vitest.setup.ts', './src/renderer/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.test.tsx', 'config/**', 'tests/**'],
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
