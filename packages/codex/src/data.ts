import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CodexError } from './errors.js';
import { type BundledData, type BundledPackage, type PackageMeta, SCHEMA_VERSION } from './types.js';

const DEFAULT_DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/vielzeug-data.json');

const REGEN_CMD = 'pnpm --dir packages/codex run prepare:data';

/** Array-typed BundledPackage fields that every real generated entry always populates. */
const PACKAGE_ARRAY_FIELDS = ['availableDocPages', 'examples', 'exports', 'keywords', 'related'] as const;

/** Plain-object-typed BundledPackage fields that every real generated entry always populates. */
const PACKAGE_OBJECT_FIELDS = ['docs', 'typeSignatures'] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * `validateBundledData` is public API (see usage.md "load data from a custom snapshot file") and
 * therefore reachable with arbitrary, possibly malformed JSON — not just the package's own
 * generated output. Checking only `slug`/`name` let a structurally-wrong `docs`/`examples`/etc.
 * field pass validation and then throw an unclear `TypeError` deep inside a tool's `run()` instead
 * of a clear `CodexError` here, at load time.
 */
export function validateBundledData(raw: unknown): BundledData {
  const r = raw as Record<string, unknown>;

  if (
    typeof raw !== 'object' ||
    raw === null ||
    r['schemaVersion'] !== SCHEMA_VERSION ||
    typeof r['version'] !== 'string' ||
    !Array.isArray(r['packages']) ||
    !Array.isArray(r['refineComponents'])
  ) {
    throw new CodexError(
      `Bundled data is malformed or uses an outdated schema (expected v${SCHEMA_VERSION}). Regenerate with ${REGEN_CMD}.`,
    );
  }

  for (const entry of r['packages'] as unknown[]) {
    const p = entry as Record<string, unknown>;

    if (typeof p['slug'] !== 'string' || p['slug'].length === 0 || typeof p['name'] !== 'string') {
      throw new CodexError(
        `Bundled data has a malformed package entry (missing slug or name). Regenerate with ${REGEN_CMD}.`,
      );
    }

    for (const field of PACKAGE_ARRAY_FIELDS) {
      if (!Array.isArray(p[field])) {
        throw new CodexError(
          `Bundled data has a malformed package entry ("${p['slug']}"."${field}" must be an array). Regenerate with ${REGEN_CMD}.`,
        );
      }
    }

    for (const field of PACKAGE_OBJECT_FIELDS) {
      if (!isPlainObject(p[field])) {
        throw new CodexError(
          `Bundled data has a malformed package entry ("${p['slug']}"."${field}" must be an object). Regenerate with ${REGEN_CMD}.`,
        );
      }
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
      throw new CodexError(
        `Bundled MCP data not found at ${file}. In the monorepo run ${REGEN_CMD}; for standalone installs, reinstall @vielzeug/codex to restore packaged data.`,
        { cause: error },
      );
    }

    const detail = error instanceof Error ? error.message : String(error);

    throw new CodexError(`Failed to read bundled MCP data at ${file}: ${detail}.`, { cause: error });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new CodexError(`Bundled MCP data at ${file} is malformed JSON. Regenerate with ${REGEN_CMD}.`, {
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
    exampleIds: pkg.examples.map((e) => e.id),
    exports: pkg.exports,
    hasSource: pkg.apiSource !== null,
    keywords: pkg.keywords,
    name: pkg.name,
    related: pkg.related,
    slug: pkg.slug,
    version: pkg.version,
  };
}
