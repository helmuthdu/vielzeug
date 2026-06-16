import type { ReplExample } from '../../types';

export const lifecycleExample: ReplExample = {
  code: `import { batchTransport, createLogger } from '@vielzeug/rune';

// Two-arg shorthand: namespace + options
const log = createLogger('api', { logLevel: 'debug' });

log.info('logger created');
log.debug({ url: '/health' }, 'request start');

// disposed logger silences all subsequent calls
log.dispose();
log.info('this is silenced — no output');

console.log('log.disposed:', log.disposed);

// batchTransport idempotency — double-dispose does not double-flush
const flushed: string[] = [];
const batch = batchTransport({
  interval: 60_000,
  onFlush: (entries) => {
    flushed.push(...entries.map((e) => e.message ?? ''));
  },
});

const batchLog = createLogger('batch', { transports: [batch.transport] });
batchLog.info('entry-1');
batchLog.warn('entry-2');

batch.dispose(); // flushes once
batch.dispose(); // no-op — already disposed

console.log('flushed messages:', flushed);
`,
  description: 'Two-arg createLogger, disposed logger silencing, and batchTransport idempotency.',
  name: 'Logger Lifecycle & Disposal',
};
