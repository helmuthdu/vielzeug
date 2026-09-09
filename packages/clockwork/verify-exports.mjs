import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const clockwork of modules) {
  if (typeof clockwork.defineMachine !== 'function') throw new Error('defineMachine export missing');

  const error = new clockwork.ClockworkError('INVALID_CONTEXT', 'invalid');
  if (error.name !== 'ClockworkError') throw new Error(`unexpected error name: ${error.name}`);
  if (!(error instanceof clockwork.ClockworkError)) throw new Error('ClockworkError identity mismatch');
}
