import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const MANIFEST_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
const SEARCH_STEPS = 10;

export interface DeclaredPackage {
  /** The semver range (or `link:`/`workspace:` specifier) from the manifest. */
  readonly declared: string;
  /** The exact version from the lockfile, when the lockfile resolved one. */
  readonly installed?: string;
  readonly name: string;
}

export interface ConsumerProject {
  readonly packages: readonly DeclaredPackage[];
  readonly projectDir: string;
}

function isVielzeug(name: string): boolean {
  return name.startsWith('@vielzeug/');
}

function readText(file: string): string {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function parseJson(text: string): Record<string, unknown> | undefined {
  if (!text) return undefined;

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    // bun.lock allows trailing commas; strip them before retrying.
    try {
      return JSON.parse(text.replace(/,\s*([}\]])/g, '$1')) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}

/** The version part of a package id such as `@vielzeug/lingua@0.6.0`; undefined for link/workspace ids. */
function versionFromId(id: string): string | undefined {
  const at = id.lastIndexOf('@');

  if (at <= 1) return undefined;

  const version = id.slice(at + 1);

  return /^[0-9]/.test(version) ? version : undefined;
}

/**
 * Extracts exact resolved versions for `@vielzeug/*` packages from a bun.lock
 * (`"name": ["name@version", {...}]`) or package-lock.json (`node_modules/...`
 * entries). Returns an empty map when no lockfile resolves them.
 */
function readLockfileVersions(projectDir: string): Map<string, string> {
  const versions = new Map<string, string>();

  const bunPackages = parseJson(readText(join(projectDir, 'bun.lock')))?.packages;

  if (bunPackages && typeof bunPackages === 'object') {
    for (const [name, entry] of Object.entries(bunPackages as Record<string, unknown>)) {
      if (!isVielzeug(name)) continue;

      const id = Array.isArray(entry) ? entry[0] : entry;

      if (typeof id === 'string') {
        const version = versionFromId(id);

        if (version) versions.set(name, version);
      }
    }
  }

  if (versions.size > 0) return versions;

  const nodes = parseJson(readText(join(projectDir, 'package-lock.json')))?.packages;

  if (nodes && typeof nodes === 'object') {
    for (const [path, entry] of Object.entries(nodes as Record<string, unknown>)) {
      const match = /(?:^|\/)node_modules\/(@vielzeug\/[^/]+)$/.exec(path);

      if (!match || !entry || typeof entry !== 'object') continue;

      const { version } = entry as { version?: unknown };

      if (typeof version === 'string') versions.set(match[1], version);
    }
  }

  return versions;
}

/**
 * Finds the nearest directory (walking up from `startDir`) whose package.json
 * declares `@vielzeug/*` dependencies and reads their declared ranges plus any
 * lockfile-resolved versions. Returns undefined outside such a project.
 */
export function detectConsumer(startDir: string = process.cwd()): ConsumerProject | undefined {
  let dir = resolve(startDir);

  for (let step = 0; step < SEARCH_STEPS; step++) {
    const manifest = parseJson(readText(join(dir, 'package.json')));

    if (manifest) {
      const declared = new Map<string, string>();

      for (const field of MANIFEST_FIELDS) {
        const section = manifest[field];

        if (!section || typeof section !== 'object') continue;

        for (const [name, range] of Object.entries(section as Record<string, unknown>)) {
          if (isVielzeug(name) && typeof range === 'string') declared.set(name, range);
        }
      }

      if (declared.size > 0) {
        const installed = readLockfileVersions(dir);

        return {
          packages: [...declared.entries()].map(([name, range]) => ({
            declared: range,
            installed: installed.get(name),
            name,
          })),
          projectDir: dir,
        };
      }
    }

    const parent = dirname(dir);

    if (parent === dir) break;
    dir = parent;
  }

  return undefined;
}
