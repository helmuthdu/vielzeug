import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BundledData, BundledPackage, PackageMeta } from './types.js';

const DATA_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../data/vielzeug-data.json');

export function loadData(): BundledData {
  try {
    return JSON.parse(readFileSync(DATA_FILE, 'utf8')) as BundledData;
  } catch (error) {
    const code = error && typeof error === 'object' ? (error as NodeJS.ErrnoException).code : undefined;

    if (code === 'ENOENT') {
      throw new Error(
        `Bundled MCP data not found at ${DATA_FILE}. In the monorepo run \`pnpm --dir packages/mcpit run prepare:data\`; for standalone installs, reinstall @vielzeug/mcpit to restore packaged data.`,
        { cause: error },
      );
    }

    if (error instanceof SyntaxError) {
      throw new Error(
        `Bundled MCP data at ${DATA_FILE} is malformed. Regenerate it with \`pnpm --dir packages/mcpit run prepare:data\`.`,
        { cause: error },
      );
    }

    throw error;
  }
}

export function packageMeta(pkg: BundledPackage): PackageMeta {
  const { apiSource, components: _components, docs: _docs, ...rest } = pkg;

  return {
    ...rest,
    hasSource: apiSource !== null,
  };
}
