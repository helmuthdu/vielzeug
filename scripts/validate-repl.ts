/**
 * Validates all REPL examples by extracting each `code` string,
 * writing it as a runnable temp file, and executing via vitest.
 *
 * Usage:
 *   pnpm validate:repl
 *   pnpm validate:repl -- --package ripple
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const EXAMPLES_DIR = join(ROOT, 'docs/.vitepress/theme/components/repl/examples');
const TMP_DIR = join(__dirname, '.repl-tmp');

const filterPackage = (() => {
  const idx = process.argv.indexOf('--package');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

type ExampleModule = { code: string; name: string; browserOnly?: boolean };
type ExampleRecord = Record<string, ExampleModule>;

async function loadExamples(pkg: string): Promise<ExampleRecord> {
  const { createJiti } = await import('jiti');
  const jiti = createJiti(import.meta.url);
  const indexPath = join(EXAMPLES_DIR, pkg, 'index.ts');
  const mod = await jiti.import(indexPath) as Record<string, unknown>;
  const exportKey = Object.keys(mod).find(k => k !== 'default') ?? 'default';
  return (mod[exportKey] ?? mod['default'] ?? {}) as ExampleRecord;
}

function sanitize(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function main(): Promise<void> {
  const packages = readdirSync(EXAMPLES_DIR).filter(f => !f.includes('.'));
  const targets = filterPackage ? packages.filter(p => p === filterPackage) : packages;

  if (filterPackage && targets.length === 0) {
    console.error(`No examples folder for package: ${filterPackage}`);
    process.exit(1);
  }

  rmSync(TMP_DIR, { force: true, recursive: true });
  mkdirSync(TMP_DIR, { recursive: true });

  let total = 0;

  for (const pkg of targets) {
    let examples: ExampleRecord;
    try {
      examples = await loadExamples(pkg);
    } catch (err) {
      console.error(`Failed to load examples for ${pkg}:`, err);
      process.exit(1);
    }

    for (const [key, example] of Object.entries(examples)) {
      if (!example?.code) continue;
      if (example.browserOnly) continue; // requires real browser APIs (Worker, etc.)

      const id = `${pkg}__${sanitize(key)}`;

      // The snippet file — the actual example code as-is
      writeFileSync(join(TMP_DIR, `${id}.snippet.ts`), example.code + '\n', 'utf8');

      // The test file — imports the snippet as a side-effect module
      const needsIndexedDb = pkg === 'vault';
      const testContent = [
        `// @vitest-environment jsdom`,
        needsIndexedDb ? `import 'fake-indexeddb/auto';` : null,
        `import { test } from 'vitest';`,
        ``,
        `test(${JSON.stringify(`${pkg} / ${key} — ${example.name}`)}, async () => {`,
        `  await import('./${id}.snippet.ts');`,
        `});`,
      ].filter(line => line !== null).join('\n') + '\n';

      writeFileSync(join(TMP_DIR, `${id}.test.ts`), testContent, 'utf8');
      total++;
    }
  }

  console.log(`Validating ${total} REPL example${total === 1 ? '' : 's'} across ${targets.length} package${targets.length === 1 ? '' : 's'}...`);

  const vitestBin = join(ROOT, 'node_modules/.bin/vitest');
  const configPath = join(__dirname, 'vitest.repl.config.ts');

  let exitCode = 0;
  try {
    execSync(`${vitestBin} run --config ${configPath} --reporter=verbose`, {
      cwd: ROOT,
      env: { ...process.env, REPL_TMP_DIR: TMP_DIR },
      stdio: 'inherit',
    });
  } catch {
    exitCode = 1;
  } finally {
    rmSync(TMP_DIR, { force: true, recursive: true });
  }

  process.exit(exitCode);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
