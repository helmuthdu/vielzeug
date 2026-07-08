import type { LibraryFormats } from 'vite';

import { resolve } from 'node:path';

type LibraryEntry = string | Record<string, string>;

export type BundleOptions = {
  /** Absolute path to the bundle entry point. Defaults to `src/index.ts`. */
  entry?: string;
  /** Modules to mark as external in the bundled output. */
  external?: string[];
  /** Output file base name, without extension (e.g. "refine" → refine.js / refine.cjs / refine.iife.js). */
  fileName: string;
  /** Explicit IIFE globals overrides (merged on top of auto-derived ones). */
  globals?: Record<string, string>;
  /** Global variable name for the IIFE output (PascalCase, e.g. "Refine"). */
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
) => {
  const entry = options?.entry || resolve(__dirname, 'src/index.ts');
  const name = options?.name || 'Vielzeug';
  const preserveModules = options?.preserveModules ?? true;

  console.log(`|> Building library in ${__dirname}`);

  return {
    build: {
      lib: {
        entry,
        fileName: (format: string, entryName: string) => {
          // Query-suffixed imports (e.g. `./foo.css?inline`) surface here as an entryName
          // still carrying the `?inline` suffix — strip it, or the emitted file (and its
          // sourcemap) end up with a literal "?" in the filename, which GitHub's
          // upload-artifact action (and some filesystems) reject outright.
          const cleanEntryName = entryName.split('?')[0];

          if (cleanEntryName === 'src/index') {
            return `index.${format === 'es' ? 'js' : 'cjs'}`;
          }

          return `${cleanEntryName}.${format === 'es' ? 'js' : 'cjs'}`;
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

export const getBundleConfig = (__dirname: string, options: BundleOptions) => {
  const { entry, external, fileName, globals: globalsOverride, name } = options;

  const globals = {
    ...Object.fromEntries((external ?? []).map((id) => [id, toGlobalName(id)])),
    ...globalsOverride,
  };

  return {
    build: {
      emptyOutDir: false,
      lib: {
        entry: entry ?? resolve(__dirname, 'src/index.ts'),
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
