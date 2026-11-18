import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const ink of modules) {
  for (const name of [
    'simplifyStroke',
    'smoothStroke',
    'stabilizeStroke',
    'strokeOutline',
    'polylineToSvgPath',
    'strokeWidths',
  ]) {
    if (typeof ink[name] !== 'function') {
      throw new Error(`${name} export missing`);
    }
  }
  for (const [ErrorType, name] of [
    [ink.InkError, 'InkError'],
    [ink.InkConfigError, 'InkConfigError'],
  ]) {
    const error = new ErrorType('artifact');
    if (error.name !== name || !(error instanceof ink.InkError)) {
      throw new Error(`${name} artifact identity mismatch`);
    }
  }
}
