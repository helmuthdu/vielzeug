import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const stage of modules) {
  if (typeof stage.createStage !== 'function') {
    throw new Error('createStage export missing');
  }
  for (const [ErrorType, name] of [
    [stage.StageError, 'StageError'],
    [stage.StageConfigError, 'StageConfigError'],
    [stage.StageUnsupportedError, 'StageUnsupportedError'],
  ]) {
    const error = new ErrorType('artifact');
    if (error.name !== name || !(error instanceof stage.StageError)) {
      throw new Error(`${name} artifact identity mismatch`);
    }
  }
}
