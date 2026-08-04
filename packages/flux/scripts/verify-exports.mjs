import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const require = createRequire(import.meta.url);

for (const target of Object.values(manifest.exports)) {
  await import(pathToFileURL(resolve(root, target.import)).href);
  require(resolve(root, target.require));
}
