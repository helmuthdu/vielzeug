import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const modules = [await import('./dist/index.js'), require('./dist/index.cjs')];

for (const rippleModule of modules) {
  const ripple = rippleModule.createRipple();
  let unsubscribed = 0;
  const readable = ripple.fromSubscribable({
    getSnapshot: () => 1,
    subscribe: () => () => unsubscribed++,
  });

  readable.dispose();
  if (unsubscribed !== 1) throw new Error('bridge disposal mismatch');

  ripple.dispose();
  try {
    ripple.signal(0);
    throw new Error('expected disposed runtime failure');
  } catch (error) {
    if (!(error instanceof rippleModule.RippleError)) throw new Error('RippleError identity mismatch');
    if (!(error instanceof rippleModule.RippleDisposedRuntimeError)) {
      throw new Error('RippleDisposedRuntimeError identity mismatch');
    }
    if (error.name !== 'RippleDisposedRuntimeError') throw new Error(`unexpected error name: ${error.name}`);
  }
}
