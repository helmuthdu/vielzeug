import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];
const workerModules = [await import('./dist/worker/index.js'), require('./dist/worker/index.cjs')];

for (const worker of workerModules) {
  if (typeof worker.createWorkerStage !== 'function') {
    throw new Error('createWorkerStage export missing');
  }
  if (typeof worker.serveStage !== 'function') {
    throw new Error('serveStage export missing');
  }
  if (worker.STAGE_WORKER_PROTOCOL !== undefined || worker.checkProtocol !== undefined) {
    throw new Error('worker protocol surface must stay internal');
  }
}

for (const stage of modules) {
  if (typeof stage.createStage !== 'function') {
    throw new Error('createStage export missing');
  }
  for (const [ErrorType, name] of [
    [stage.StageError, 'StageError'],
    [stage.StageConfigError, 'StageConfigError'],
    [stage.StageUnsupportedError, 'StageUnsupportedError'],
    [stage.StageDisposedError, 'StageDisposedError'],
  ]) {
    const error = new ErrorType('artifact');
    if (error.name !== name || !(error instanceof stage.StageError)) {
      throw new Error(`${name} artifact identity mismatch`);
    }
  }
}
