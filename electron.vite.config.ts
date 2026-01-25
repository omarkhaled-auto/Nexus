import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import MagicString from 'magic-string';

/**
 * Plugin that disables the built-in esm-shim plugin by intercepting its output
 * and adding proper CJS shims ourselves
 */
function overrideEsmShimPlugin() {
  return {
    name: 'override-esm-shim',
    enforce: 'post' as const,
    // Run with highest order to execute after esm-shim
    order: 'post' as const,
    async renderChunk(code: string, chunk: any, options: any) {
      if (options.format !== 'es') {
        return null;
      }

      // Pattern for the misplaced shim - shim inserted in middle of string
      const corruptionPattern = /return\s*"\s*\n?\/\/ -- CommonJS Shims --[\s\S]*?const require = __cjs_mod__\.createRequire\(import\.meta\.url\);\s*\n/;

      if (!corruptionPattern.test(code)) {
        return null; // No corruption, let it pass
      }

      console.log('[override-esm-shim] Fixing corrupted CJS shim injection');

      // Remove all existing shims (they may be corrupted)
      let fixedCode = code.replace(
        /\n?\/\/ -- CommonJS Shims --[\s\S]*?const require = __cjs_mod__\.createRequire\(import\.meta\.url\);\s*\n/g,
        ''
      );

      // Now add proper shim at the correct location
      const CJSShim = `
// -- CommonJS Shims --
import __cjs_mod__ from 'node:module';
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require = __cjs_mod__.createRequire(import.meta.url);
`;

      // Check if we need CJS syntax
      const CJSyntaxRe = /__filename|__dirname|require\(|require\.resolve\(/;
      if (!CJSyntaxRe.test(fixedCode)) {
        return { code: fixedCode, map: null };
      }

      // Find where to insert (after last import at start of file)
      const lines = fixedCode.split('\n');
      let insertLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ') && lines[i].includes(' from ')) {
          insertLine = i + 1;
        }
        // Stop looking after first non-import statement (that isn't a comment)
        if (!lines[i].trim().startsWith('import ') &&
            !lines[i].trim().startsWith('//') &&
            !lines[i].trim().startsWith('/*') &&
            lines[i].trim().length > 0) {
          break;
        }
      }

      // Insert shim
      lines.splice(insertLine, 0, CJSShim);
      fixedCode = lines.join('\n');

      return {
        code: fixedCode,
        map: options.sourcemap ? null : null // TODO: generate proper sourcemap
      };
    }
  };
}

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({
        // Include these deps in the bundle instead of externalizing
        exclude: ['uuid', 'nanoid']
      }),
      // Add plugin to fix corrupted shim injection
      overrideEsmShimPlugin(),
    ],
    build: {
      outDir: 'out/main',
      lib: {
        entry: resolve(__dirname, 'src/main/index.ts'),
      },
      rollupOptions: {
        // Externalize problematic native modules
        external: [
          'better-sqlite3',
          '@google/generative-ai',
          'openai',
          '@huggingface/transformers',
        ],
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js',
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: 'src/renderer',
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@renderer': resolve(__dirname, 'src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared'),
        '@main': resolve(__dirname, 'src/main'),
        '@preload': resolve(__dirname, 'src/preload'),
      },
    },
  },
});
