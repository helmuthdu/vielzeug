import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BundledData, BundledPackage, PackageMeta } from './types.js';

const DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/vielzeug-data.json');

const REGEN_CMD = 'pnpm --dir packages/codex run prepare:data';

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
    if (
      typeof pkg !== 'object' ||
      pkg === null ||
      typeof (pkg as Record<string, unknown>)['slug'] !== 'string' ||
      typeof (pkg as Record<string, unknown>)['name'] !== 'string'
    ) {
      throw new Error(
        `Bundled MCP data is malformed: package entry missing "slug" or "name". Regenerate with ${REGEN_CMD}.`,
      );
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

    throw error;
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

export function packageMeta(pkg: BundledPackage): PackageMeta {
  const { apiSource, components: _components, docs: _docs, ...rest } = pkg;

  return {
    ...rest,
    hasSource: apiSource !== null,
  };
}
