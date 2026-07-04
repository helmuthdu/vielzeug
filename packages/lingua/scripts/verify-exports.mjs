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
    } catch (error) {
      failures.push(`${specifier} (import → ${esmEntry}): ${error.message}`);
    }

    try {
      requireFromPackage(path.join(packageRoot, cjsEntry));
    } catch (error) {
      failures.push(`${specifier} (require → ${cjsEntry}): ${error.message}`);
    }

    try {
      await access(path.join(packageRoot, typesEntry));
    } catch (error) {
      failures.push(`${specifier} (types → ${typesEntry}): ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.error('Broken package exports (built dist does not match package.json "exports"):');

    for (const failure of failures) console.error(`  - ${failure}`);

    process.exitCode = 1;

    return;
  }

  console.log(`OK — all ${Object.keys(packageJson.exports).length} export(s) resolve.`);
};

await main();
