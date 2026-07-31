import type { LibraryFormats } from 'vite';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type LibraryEntry = string | Record<string, string>;

/**
 * Reads the calling package's own `dependencies` + `peerDependencies` from `package.json` next to `__dirname`.
 * Pass the result as `external` to `getConfig()`/`getBundleConfig()` for packages whose
 * externals are exactly "my own workspace dependencies, nothing more" — avoids hand-listing
 * the same `@vielzeug/*` names already in `package.json` a second (and third — `vite.config.ts`
 * and `vite.bundle.config.ts` each need their own copy today) time.
 *
 * Deliberately NOT a silent default inside `getConfig`/`getBundleConfig`: several packages
 * (e.g. `refine`) need a *function* predicate for `external` (to match `@vielzeug/ore/<subpath>`
 * imports, which Rolldown's array-of-strings `external` only matches by exact equality, not
 * prefix) layered on afterward via `mergeConfig()`. Rolldown's `external` array only accepts
 * plain strings/RegExp per element — auto-populating an array here by default would collide
 * with that pattern the moment a package merges in its own function-shaped override. Opt in
 * explicitly per package instead.
 */
export const readWorkspaceDeps = (__dirname: string): string[] => {
  // No try/catch — a missing or malformed package.json here is a real configuration error that
  // should fail the build loudly. Silently falling back to `[]` would instead produce a build
  // that "succeeds" while inlining every workspace dependency into the package's own output.
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

  // Peer deps are external by definition — the consumer installs them, the package
  // must never inline them (e.g. ore's optional `@vielzeug/assay` peer, used only
  // by its `/testing` sub-path).
  return Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });
};

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
 * Every package's `src/_dev.ts` gates dev warnings behind `globalThis.__<NAME>_PROD__`.
 * The dist build IS the production artifact, so bake the gate in centrally — per-package
 * `define` entries for this were repeatedly forgotten (ore, lingua, courier all shipped
 * with dev warns live in prod before this existed). `verify:prod-gate` asserts no raw
 * gate reference survives into any published artifact.
 */
const prodGateDefine = (name: string): Record<string, string> => ({
  [`globalThis.__${name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_PROD__`]: 'true',
});

/**
 * Primary build config: tree-shakeable per-module ESM + CJS output with preserveModules.
 * Used by each package's vite.config.ts.
 */
export const getConfig = (
  __dirname: string,
  options?: {
    entry?: LibraryEntry;
    /** Modules to mark as external. Not derived automatically — see `readWorkspaceDeps()`. */
    external?: string[];
    name?: string;
    preserveModules?: boolean;
  },
) => {
  const entry = options?.entry || resolve(__dirname, 'src/index.ts');
  const name = options?.name || 'Vielzeug';
  const preserveModules = options?.preserveModules ?? true;
  const external = options?.external;

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
        ...(external?.length && { external }),
        output: {
          preserveModules,
          ...(preserveModules && { preserveModulesRoot: resolve(__dirname, 'src') }),
        },
      },
      sourcemap: true,
    },
    define: prodGateDefine(name),
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
    define: prodGateDefine(name),
  };
};
