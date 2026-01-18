import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [tsconfigPaths(), wasm(), topLevelAwait()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.disabled/**',
      '**/Reference_repos/**',
    ],
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
    // Use forks pool for better WASM compatibility
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Avoid WASM initialization race conditions
      },
    },
    // Increase timeout for WASM initialization
    testTimeout: 30000,
    // Server deps configuration for proper module handling
    server: {
      deps: {
        // Inline these packages for vitest
        inline: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        // Don't transform web-tree-sitter - let Node.js handle it
        external: ['web-tree-sitter', 'tree-sitter-typescript', 'tree-sitter-javascript'],
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@renderer': resolve(__dirname, './src/renderer/src'),
    },
  },
  // Exclude WASM modules from optimization to prevent issues
  optimizeDeps: {
    exclude: ['web-tree-sitter', 'tree-sitter-typescript', 'tree-sitter-javascript'],
  },
});
