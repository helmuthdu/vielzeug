#!/usr/bin/env node
/**
 * verify-exports.mjs
 *
 * Runs after `build`: dynamically imports every `import`/`require` path in
 * package.json's `exports` map (both ESM and CJS) and fails loudly if any file is
 * missing or throws on load. Catches exactly the class of bug that shipped silently
 * before — vite.config.ts's build output didn't match package.json's `exports` paths,
 * so `@vielzeug/ripple/devtools`, `/history`, and `/ssr` all 404'd once published,
 * and `/ssr` additionally used a bundler-only `require()` that broke under real ESM.
 *
 * Usage: node scripts/verify-exports.mjs (run automatically as part of `prepublishOnly`
 * — see package.json). Run manually after `pnpm build` to check sub-path wiring locally.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);

const packageJson = require(path.join(packageRoot, 'package.json'));
const failures = [];

for (const [subpath, conditions] of Object.entries(packageJson.exports)) {
  for (const [condition, relativePath] of Object.entries(conditions)) {
    if (condition !== 'import' && condition !== 'require') continue;

    const absolutePath = path.join(packageRoot, relativePath);
    const label = `${subpath} (${condition}: ${relativePath})`;

    try {
      if (condition === 'import') {
        await import(`file://${absolutePath}`);
      } else {
        require(absolutePath);
      }
    } catch (error) {
      failures.push(`${label}\n    ${error.message}`);
    }
  }
}

if (failures.length > 0) {
  console.error('verify-exports: the following export entries failed to load:\n');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(`\n${failures.length} of the package's export entries are broken. Run \`pnpm build\` first.`);
  process.exit(1);
}

console.log(`verify-exports: all ${Object.keys(packageJson.exports).length} export entries load cleanly (ESM + CJS).`);
