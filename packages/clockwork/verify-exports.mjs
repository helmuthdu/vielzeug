import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const clockwork of modules) {
  if (typeof clockwork.defineMachine !== 'function') throw new Error('defineMachine export missing');

  const error = new clockwork.ClockworkError('invalid');
  if (error.name !== 'ClockworkError') throw new Error(`unexpected error name: ${error.name}`);
  if (!(error instanceof clockwork.ClockworkError)) throw new Error('ClockworkError identity mismatch');

  const definition = new clockwork.ClockworkDefinitionError('invalid definition');
  if (definition.name !== 'ClockworkDefinitionError') throw new Error(`unexpected error name: ${definition.name}`);
  if (!(definition instanceof clockwork.ClockworkError)) throw new Error('ClockworkDefinitionError identity mismatch');
}
