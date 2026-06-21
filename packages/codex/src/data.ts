import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type BundledData, type BundledPackage, type PackageMeta, SCHEMA_VERSION } from './types.js';

const DEFAULT_DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/vielzeug-data.json');

const REGEN_CMD = 'pnpm --dir packages/codex run prepare:data';

export function validateBundledData(raw: unknown): BundledData {
  const r = raw as Record<string, unknown>;

  if (
    typeof raw !== 'object' ||
    raw === null ||
    r['schemaVersion'] !== SCHEMA_VERSION ||
    typeof r['version'] !== 'string' ||
    !Array.isArray(r['packages'])
  ) {
    throw new Error(
      `Bundled data is malformed or uses an outdated schema (expected v${SCHEMA_VERSION}). Regenerate with ${REGEN_CMD}.`,
    );
  }

  for (const entry of r['packages'] as unknown[]) {
    const p = entry as Record<string, unknown>;

    if (typeof p['slug'] !== 'string' || p['slug'].length === 0 || typeof p['name'] !== 'string') {
      throw new Error(
        `Bundled data has a malformed package entry (missing slug or name). Regenerate with ${REGEN_CMD}.`,
      );
    }
  }

  return raw as BundledData;
}

export function loadData(dataFile?: string): BundledData {
  const file = dataFile ?? DEFAULT_DATA_FILE;
  let raw: string;

  try {
    raw = readFileSync(file, 'utf8');
  } catch (error) {
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;

    if (code === 'ENOENT') {
      throw new Error(
        `Bundled MCP data not found at ${file}. In the monorepo run ${REGEN_CMD}; for standalone installs, reinstall @vielzeug/codex to restore packaged data.`,
        { cause: error },
      );
    }

    const detail = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to read bundled MCP data at ${file}: ${detail}.`, { cause: error });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Bundled MCP data at ${file} is malformed JSON. Regenerate with ${REGEN_CMD}.`, {
      cause: error,
    });
  }

  return validateBundledData(parsed);
}

/** Projects a BundledPackage to its lightweight PackageMeta shape (strips heavy content fields). */
export function packageMeta(pkg: BundledPackage): PackageMeta {
  return {
    availableDocPages: pkg.availableDocPages,
    category: pkg.category,
    description: pkg.description,
    exports: pkg.exports,
    hasSource: pkg.apiSource !== null,
    keywords: pkg.keywords,
    name: pkg.name,
    related: pkg.related,
    slug: pkg.slug,
    version: pkg.version,
  };
}
