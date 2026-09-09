import type { ReplExample } from '../../types';

export const lifecycleExample: ReplExample = {
  code: `import { createLogger } from '@vielzeug/rune';

// Two-arg shorthand: namespace + options
const log = createLogger('api', { logLevel: 'debug' });

log.info('logger created');
log.debug('request start', { url: '/health' });

// disposed logger silences all subsequent calls
log.dispose();
log.info('this is silenced — no output');

console.log('log.disposed:', log.disposed);

// using-declaration auto-disposes at end of scope
{
  using scoped = createLogger('scoped', { logLevel: 'debug' });
  scoped.info('scoped logger active');
} // scoped.dispose() called automatically here

// disposalSignal aborts when dispose() is called
const monitored = createLogger('monitored');
monitored.disposalSignal.addEventListener('abort', () => {
  console.log('monitored logger was disposed');
});
monitored.dispose();
`,
  description: 'Two-arg createLogger, disposed logger silencing, and using-declaration auto-disposal.',
  name: 'Logger Lifecycle & Disposal',
};
