import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [
  [await import('./dist/index.js'), await import('./dist/protocol.js'), await import('./dist/testing.js')],
  [require('./dist/index.cjs'), require('./dist/protocol.cjs'), require('./dist/testing.cjs')],
];

for (const [familiar, protocol, testing] of modules) {
  if (typeof familiar.createWorker !== 'function' || typeof familiar.createStreamWorker !== 'function') {
    throw new Error('worker factory export missing');
  }
  if (typeof protocol.exposeTask !== 'function' || protocol.PROTOCOL_VERSION !== 1) {
    throw new Error('protocol export mismatch');
  }
  if (typeof testing.createTestWorker !== 'function') throw new Error('testing export mismatch');

  for (const [ErrorType, name] of [
    [familiar.FamiliarError, 'FamiliarError'],
    [familiar.FamiliarRuntimeError, 'FamiliarRuntimeError'],
    [familiar.FamiliarTerminatedError, 'FamiliarTerminatedError'],
  ]) {
    const error = new ErrorType('artifact');
    if (error.name !== name || !(error instanceof familiar.FamiliarError)) {
      throw new Error(`${name} artifact identity mismatch`);
    }
  }

  if ('batch' in familiar) throw new Error('legacy batch alias leaked');
  const worker = testing.createTestWorker((value) => value);
  if ((await worker.run('ok')) !== 'ok') throw new Error('testing worker mismatch');
  const values = [];
  for await (const value of familiar.runBatch(worker, ['a', 'b'])) values.push(value);
  if (values.join() !== 'a,b') throw new Error('runBatch artifact mismatch');
  worker.dispose();
}
