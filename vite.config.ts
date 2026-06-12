import type { LibraryFormats, UserConfig } from 'vite';

import { resolve } from 'node:path';

type LibraryEntry = string | Record<string, string>;

export type BundleOptions = {
  /** Modules to mark as external in the bundled output. */
  external?: string[];
  /** Output file base name, without extension (e.g. "sigil" → sigil.js / sigil.cjs / sigil.iife.js). */
  fileName: string;
  /** Explicit IIFE globals overrides (merged on top of auto-derived ones). */
  globals?: Record<string, string>;
  /** Global variable name for the IIFE output (PascalCase, e.g. "Sigil"). */
  name: string;
};

/**
 * Primary build config: tree-shakeable per-module ESM + CJS output with preserveModules.
 * Used by each package's vite.config.ts.
 */
export const getConfig = (
  __dirname: string,
  options?: {
    entry?: LibraryEntry;
    name?: string;
    preserveModules?: boolean;
  },
): UserConfig => {
  const entry = options?.entry || resolve(__dirname, 'src/index.ts');
  const name = options?.name || 'Vielzeug';
  const preserveModules = options?.preserveModules ?? true;

  console.log(`|> Building library in ${__dirname}`);

  return {
    build: {
      lib: {
        entry,
        fileName: (format: string, entryName: string) => {
          if (entryName === 'src/index') {
            return `index.${format === 'es' ? 'js' : 'cjs'}`;
          }

          return `${entryName}.${format === 'es' ? 'js' : 'cjs'}`;
        },
        formats: ['es', 'cjs'] as LibraryFormats[],
        name,
      },
      rolldownOptions: {
        output: {
          preserveModules,
          ...(preserveModules && { preserveModulesRoot: resolve(__dirname, 'src') }),
        },
      },
      sourcemap: true,
    },
  };
};

/**
 * Secondary build config: rolled-up ESM + CJS + IIFE bundle.
 * Used by each package's vite.bundle.config.ts.
 */
const toGlobalName = (id: string): string =>
  id
    .replace(/^@[^/]+\//, '')
    .split(/[-/]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

export const getBundleConfig = (__dirname: string, options: BundleOptions): UserConfig => {
  const { external, fileName, globals: globalsOverride, name } = options;

  const globals = {
    ...Object.fromEntries((external ?? []).map((id) => [id, toGlobalName(id)])),
    ...globalsOverride,
  };

  return {
    build: {
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        fileName: (format: string) => {
          if (format === 'es') return `${fileName}.js`;

          if (format === 'iife') return `${fileName}.iife.js`;

          return `${fileName}.cjs`;
        },
        formats: ['es', 'cjs', 'iife'] as LibraryFormats[],
        name,
      },
      rolldownOptions: {
        ...(external?.length ? { external } : {}),
        output: {
          ...(Object.keys(globals).length ? { globals } : {}),
          minify: true,
        },
      },
      sourcemap: true,
    },
  };
};
