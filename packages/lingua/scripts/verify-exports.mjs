// Smoke check for `package.json`'s `exports` map: dynamically imports every declared
// subpath from the *built* package and fails loudly if Node's module resolution can't
// find the file. Run after `pnpm build` — catches drift between `exports` and the actual
// vite entry / output layout that unit tests (which import from `src/`, not `dist/`) cannot see.
import { createRequire } from 'node:module';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const requireFromPackage = createRequire(path.join(packageRoot, 'package.json'));

const main = async () => {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
  const failures = [];

  for (const subpath of Object.keys(packageJson.exports)) {
    const specifier = subpath === '.' ? packageJson.name : `${packageJson.name}/${subpath.slice(2)}`;
    const { import: esmEntry, require: cjsEntry, types: typesEntry } = packageJson.exports[subpath];

    try {
      await import(pathToFileURL(path.join(packageRoot, esmEntry)).href);
    } catch (/** @type {any} */ error) {
      failures.push(`${specifier} (import → ${esmEntry}): ${/** @type {Error} */ (error).message}`);
    }

    try {
      requireFromPackage(path.join(packageRoot, cjsEntry));
    } catch (/** @type {any} */ error) {
      failures.push(`${specifier} (require → ${cjsEntry}): ${/** @type {Error} */ (error).message}`);
    }

    try {
      await access(path.join(packageRoot, typesEntry));
    } catch (/** @type {any} */ error) {
      failures.push(`${specifier} (types → ${typesEntry}): ${/** @type {Error} */ (error).message}`);
    }
  }

  if (failures.length > 0) {
    console.error('Broken package exports (built dist does not match package.json "exports"):');

    for (const failure of failures) console.error(`  - ${failure}`);

    process.exitCode = 1;

    return;
  }

  // The prod gate (`__LINGUA_PROD__`) must be baked into every built artifact as a
  // literal (see vite.config.ts / vite.bundle.config.ts `define`). If the raw global
  // reference survives into any emitted file, the define was lost from that build
  // config and every dev warn + the lazy validate-chunk fetch is live in production again.
  for (const artifact of ['dist/index.js', 'dist/format.js', 'dist/lingua.iife.js']) {
    const contents = await readFile(path.join(packageRoot, artifact), 'utf8');

    if (contents.includes('__LINGUA_PROD__')) {
      console.error(`${artifact} still references __LINGUA_PROD__ — the prod-gate define is missing from the build config.`);
      process.exitCode = 1;

      return;
    }
  }

  console.log(`OK — all ${Object.keys(packageJson.exports).length} export(s) resolve, prod gate baked in.`);
};

await main();
