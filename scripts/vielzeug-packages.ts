/**
 * Single source of truth for "which `packages/*` directories are real,
 * browser-resolvable @vielzeug packages".
 *
 * Every consumer that used to hand-maintain its own `@vielzeug/<name>` alias
 * list (docs Vite config, the REPL validator's vitest config, the REPL
 * registry generator) now derives it from the filesystem instead. Adding or
 * removing a package needs zero edits here.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Packages that exist under `packages/` but are never resolved in a browser context. */
const NON_BROWSER_PACKAGES = new Set(['codex']);

/** DOM-output packages have no preview container in the REPL — excluded from REPL registration. */
export const REPL_EXCLUDED_PACKAGES = new Set(['ore', 'prism', 'refine']);

/**
 * Returns every directory under `packagesDir` that has a `package.json`, sorted
 * alphabetically — the raw "what packages exist in this monorepo" primitive, with no
 * opinion about browser-resolvability. Consumers that need the browser-safe subset
 * should use `listVielzeugPackages`; consumers documenting/bundling every package
 * (e.g. codex's data generator) should use this directly.
 */
export function listPackageDirs(packagesDir: string): string[] {
  return readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(packagesDir, name, 'package.json')))
    .sort();
}

/** Returns every publishable, browser-resolvable package name under `packagesDir`, sorted alphabetically. */
export function listVielzeugPackages(packagesDir: string): string[] {
  return listPackageDirs(packagesDir).filter((name) => !NON_BROWSER_PACKAGES.has(name));
}

/**
 * Builds a `{ '@vielzeug/<name>': <absolute path to src dir> }` alias map.
 * Aliasing to the directory (not `src/index.ts` directly) lets subpath imports
 * like `@vielzeug/orbit/presets` resolve through the same alias entry.
 */
export function buildVielzeugSrcAliases(packagesDir: string, exclude: ReadonlySet<string> = new Set()): Record<string, string> {
  return Object.fromEntries(
    listVielzeugPackages(packagesDir)
      .filter((name) => !exclude.has(name))
      .map((name) => [`@vielzeug/${name}`, join(packagesDir, name, 'src')]),
  );
}
