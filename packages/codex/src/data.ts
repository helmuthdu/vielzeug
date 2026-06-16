import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BundledData, BundledPackage, PackageMeta } from './types.js';

const DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/vielzeug-data.json');

const REGEN_CMD = 'pnpm --dir packages/codex run prepare:data';

// ---------------------------------------------------------------------------
// Schema-map validation (satisfies keeps it in sync with BundledPackage type)
// ---------------------------------------------------------------------------

type FieldCheck = (v: unknown) => boolean;

const nonEmptyStr = (v: unknown): boolean => typeof v === 'string' && (v as string).length > 0;
const isStr = (v: unknown): boolean => typeof v === 'string';
const isArr = (v: unknown): boolean => Array.isArray(v);
const isObj = (v: unknown): boolean => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Field-level validators for BundledPackage. satisfies catches drift when the type changes. */
const PKG_SCHEMA = {
  apiSource: (v: unknown) => v === null || isStr(v),
  availableDocPages: isArr,
  category: isStr,
  components: isArr,
  description: isStr,
  docs: isObj,
  exports: isArr,
  keywords: isArr,
  name: nonEmptyStr,
  related: isArr,
  slug: nonEmptyStr,
  version: isStr,
} satisfies Record<keyof BundledPackage, FieldCheck>;

export function validateBundledData(raw: unknown): BundledData {
  if (
    typeof raw !== 'object' ||
    raw === null ||
    typeof (raw as Record<string, unknown>)['version'] !== 'string' ||
    !Array.isArray((raw as Record<string, unknown>)['packages'])
  ) {
    throw new Error(
      `Bundled MCP data is malformed: missing or invalid "version" or "packages". Regenerate with ${REGEN_CMD}.`,
    );
  }

  const { packages } = raw as { packages: unknown[]; version: string };

  for (const pkg of packages) {
    if (typeof pkg !== 'object' || pkg === null) {
      throw new Error(`Bundled MCP data is malformed: package entry is not an object. Regenerate with ${REGEN_CMD}.`);
    }

    const p = pkg as Record<string, unknown>;
    const slug = String(p['slug'] ?? '');

    for (const [field, check] of Object.entries(PKG_SCHEMA) as [keyof BundledPackage, FieldCheck][]) {
      if (!check(p[field])) {
        throw new Error(
          `Bundled MCP data is malformed: package "${slug}" has invalid field "${field}". Regenerate with ${REGEN_CMD}.`,
        );
      }
    }
  }

  return raw as BundledData;
}

export function loadData(): BundledData {
  let raw: string;

  try {
    raw = readFileSync(DATA_FILE, 'utf8');
  } catch (error) {
    const code = error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined;

    if (code === 'ENOENT') {
      throw new Error(
        `Bundled MCP data not found at ${DATA_FILE}. In the monorepo run ${REGEN_CMD}; for standalone installs, reinstall @vielzeug/codex to restore packaged data.`,
        { cause: error },
      );
    }

    const detail = error instanceof Error ? error.message : String(error);

    throw new Error(`Failed to read bundled MCP data at ${DATA_FILE}: ${detail}.`, { cause: error });
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Bundled MCP data at ${DATA_FILE} is malformed JSON. Regenerate with ${REGEN_CMD}.`, {
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
