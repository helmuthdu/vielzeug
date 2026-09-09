import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const conduit of modules) {
  for (const name of ['createContainer', 'factoryProvider', 'scope', 'token', 'valueProvider']) {
    if (typeof conduit[name] !== 'function') throw new Error(`missing export: ${name}`);
  }
  if (typeof conduit.disposalSignalToken !== 'symbol') throw new Error('missing disposalSignalToken export');

  const token = conduit.token('Token');
  const scope = conduit.scope('Scope');
  const errors = [
    ['ConduitError', new conduit.ConduitError('error')],
    ['ConduitCircularDependencyError', new conduit.ConduitCircularDependencyError([token, token])],
    ['ConduitDisposedError', new conduit.ConduitDisposedError('container')],
    ['ConduitDisposeError', new conduit.ConduitDisposeError([])],
    ['ConduitDuplicateRegistrationError', new conduit.ConduitDuplicateRegistrationError(token)],
    ['ConduitProviderNotFoundError', new conduit.ConduitProviderNotFoundError(token, 'container')],
    ['ConduitScopedResolutionError', new conduit.ConduitScopedResolutionError(token, scope)],
  ];

  for (const [name, error] of errors) {
    if (!(error instanceof conduit.ConduitError)) throw new Error('ConduitError identity mismatch');
    if (error.name !== name) throw new Error(`unexpected error name: ${error.name}`);
  }
}
