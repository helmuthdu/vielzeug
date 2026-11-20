import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const rippleModule of modules) {
  let unsubscribed = 0;
  const scope = rippleModule.createScope();
  scope.run(() =>
    rippleModule.fromSubscribable({
      getSnapshot: () => 1,
      subscribe: () => () => unsubscribed++,
    }),
  );

  scope.dispose();
  if (unsubscribed !== 1) throw new Error('bridge disposal mismatch');

  try {
    scope.run(() => undefined);
    throw new Error('expected disposed scope failure');
  } catch (error) {
    if (!(error instanceof rippleModule.RippleError))
      throw new Error('RippleError identity mismatch', { cause: error });
    if (!(error instanceof rippleModule.RippleDisposedError)) {
      throw new Error('RippleDisposedError identity mismatch', { cause: error });
    }
    if (error.name !== 'RippleDisposedError') throw new Error(`unexpected error name: ${error.name}`, { cause: error });
  }
}
