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

const modules = [await import(pathToFileURL(resolve(root, manifest.exports['.'].import)).href), require(resolve(root, manifest.exports['.'].require))];
for (const flux of modules) {
  if (typeof flux.fromStore !== 'function' || typeof flux.fromSubscribe !== 'function') {
    throw new Error('structural bridge export missing');
  }
  for (const [ErrorType, name, args] of [
    [flux.FluxError, 'FluxError', ['artifact']],
    [flux.FluxTimeoutError, 'FluxTimeoutError', [1]],
    [flux.FluxCapacityError, 'FluxCapacityError', [1, 'artifact']],
  ]) {
    const error = new ErrorType(...args);
    if (error.name !== name || !(error instanceof flux.FluxError)) throw new Error(`${name} identity mismatch`);
  }
}
