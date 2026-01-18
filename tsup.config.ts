import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  target: 'es2022',
  splitting: false,
  sourcemap: true,
  clean: true,
  external: [
    // Node.js native modules
    'better-sqlite3',
    // AI SDK packages (should be resolved at runtime)
    '@google/generative-ai',
    '@google/genai',
    'openai',
    '@anthropic-ai/sdk',
    // Electron packages
    'electron',
  ],
});
