/**
 * Validates all REPL examples by extracting each `code` string,
 * writing it as a runnable temp file, and executing via vitest.
 *
 * Usage:
 *   pnpm validate:repl
 *   pnpm validate:repl -- --package=ripple
 *
 * Resolves the `vitest` binary through real Node module resolution instead of assuming
 * `node_modules/.bin/vitest` exists at a fixed path (that assumption breaks under some pnpm
 * hoisting/linker configurations) — see `resolveVitestBin()` below for exactly how and why.
 *
 * Runs `vitest` against `vitest.repl.config.ts` as its own subprocess rather than as a 4th
 * entry in the root `vitest.config.ts` `projects` array: that array runs on every `pnpm test`,
 * and this config's `include` is only meaningful once `REPL_TMP_DIR` points at real generated
 * files — folding it in would add a real (if small) per-run cost to every test run in the repo
 * for a check that's already its own separate CI/local step.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMain, parseArgs } from './lib/cli.mjs';

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
const EXAMPLES_DIR = join(ROOT, 'docs/.vitepress/theme/components/repl/examples');
const TMP_DIR = join(__dirname, '.repl-tmp');

export interface ExampleModule {
  browserOnly?: boolean;
  code: string;
  name: string;
}
export type ExampleRecord = Record<string, ExampleModule>;

async function loadExamples(pkg: string, examplesDir = EXAMPLES_DIR): Promise<ExampleRecord> {
  const { createJiti } = await import('jiti');
  const jiti = createJiti(import.meta.url);
  const indexPath = join(examplesDir, pkg, 'index.ts');
  const mod = (await jiti.import(indexPath)) as Record<string, unknown>;
  const exportKey = Object.keys(mod).find((k) => k !== 'default') ?? 'default';
  return (mod[exportKey] ?? mod['default'] ?? {}) as ExampleRecord;
}

export function sanitize(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Builds this example's snippet + vitest test file contents. Pure — no filesystem access —
 * so the tricky bit (jsdom pragma, conditional fake-indexeddb import, escaping the test name)
 * is unit-testable without writing anything to disk. */
export function buildExampleFiles(pkg: string, key: string, example: ExampleModule) {
  const id = `${pkg}__${sanitize(key)}`;
  const snippet = `${example.code}\n`;

  const needsIndexedDb = pkg === 'vault';
  const test = [
    `// @vitest-environment jsdom`,
    needsIndexedDb ? `import 'fake-indexeddb/auto';` : null,
    `import { test } from 'vitest';`,
    ``,
    `test(${JSON.stringify(`${pkg} / ${key} — ${example.name}`)}, async () => {`,
    `  await import('./${id}.snippet.ts');`,
    `});`,
  ]
    .filter((line) => line !== null)
    .join('\n')
    .concat('\n');

  return { id, snippet, test };
}

/** Package directories under `examplesDir`, optionally narrowed to one. Throws (rather than
 * silently validating nothing) when an explicit `--package` filter matches no folder. */
export function discoverPackages(examplesDir: string, filterPackage: string | null): string[] {
  const packages = readdirSync(examplesDir).filter((f) => !f.includes('.'));
  if (!filterPackage) return packages;

  const targets = packages.filter((p) => p === filterPackage);
  if (targets.length === 0) throw new Error(`No examples folder for package: ${filterPackage}`);
  return targets;
}

/** Resolves the real `vitest` binary path via Node's own module resolution (see header comment
 * for why not a hardcoded `node_modules/.bin/vitest` path). Uses `require.resolve` rather than
 * `import.meta.resolve` — the latter isn't reliably supported by `jiti` (this repo's `.ts`
 * script loader), which this file itself runs under (`pnpm validate:repl`). */
export function resolveVitestBin(): string {
  const packageJsonPath = require.resolve('vitest/package.json');
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { bin?: Record<string, string> | string };
  const binRelative = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.vitest;

  if (!binRelative) throw new Error(`Could not find a "vitest" bin entry in ${packageJsonPath}`);
  return join(dirname(packageJsonPath), binRelative);
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2));
  const filterPackage = typeof flags.package === 'string' ? flags.package : null;

  const targets = discoverPackages(EXAMPLES_DIR, filterPackage);

  rmSync(TMP_DIR, { force: true, recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  let total = 0;

  try {
    for (const pkg of targets) {
      let examples: ExampleRecord;
      try {
        examples = await loadExamples(pkg);
      } catch (err) {
        throw new Error(`Failed to load examples for ${pkg}`, { cause: err });
      }

      for (const [key, example] of Object.entries(examples)) {
        if (!example?.code || example.browserOnly) continue; // browserOnly requires real browser APIs (Worker, etc.)

        const { id, snippet, test } = buildExampleFiles(pkg, key, example);
        writeFileSync(join(TMP_DIR, `${id}.snippet.ts`), snippet, 'utf8');
        writeFileSync(join(TMP_DIR, `${id}.test.ts`), test, 'utf8');
        total++;
      }
    }

    console.log(
      `Validating ${total} REPL example${total === 1 ? '' : 's'} across ${targets.length} package${targets.length === 1 ? '' : 's'}...`,
    );

    execFileSync(
      resolveVitestBin(),
      ['run', '--config', join(__dirname, 'vitest.repl.config.ts'), '--reporter=verbose'],
      { cwd: ROOT, env: { ...process.env, REPL_TMP_DIR: TMP_DIR }, stdio: 'inherit' },
    );
  } finally {
    rmSync(TMP_DIR, { force: true, recursive: true });
  }
}

if (isMain(import.meta.url)) {
  main().catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  });
}
