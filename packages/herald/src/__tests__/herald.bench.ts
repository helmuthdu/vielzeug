import { describe, test } from 'vitest';

import { createBus } from '../index';

type BenchEvents = {
  tick: number;
  toggle: undefined;
};

// ─── Emit throughput ────────────────────────────────────────────────────────
// Pre-create buses outside bench fns — measures the emit hot path only.

describe('emit throughput', () => {
  const noListeners = createBus<BenchEvents>();
  const oneListener = createBus<BenchEvents>();
  const tenListeners = createBus<BenchEvents>();

  oneListener.on('tick', () => {});
  for (let i = 0; i < 10; i++) tenListeners.on('tick', () => {});

  test('benchmarks', async ({ bench }) => {
    await bench.compare(
      bench('0 listeners (no-op)', () => {
        noListeners.emit('tick', 1);
      }),
      bench('1 listener', () => {
        oneListener.emit('tick', 1);
      }),
      bench('10 listeners', () => {
        tenListeners.emit('tick', 1);
      }),
    );
  });
});

// ─── Subscription churn ─────────────────────────────────────────────────────

describe('subscription churn', () => {
  const bus = createBus<BenchEvents>();

  test('benchmarks', async ({ bench }) => {
    await bench.compare(
      bench('on + off (single cycle)', () => {
        const unsub = bus.on('tick', () => {});

        unsub();
      }),
      bench('once + fire (single cycle)', () => {
        bus.once('tick', () => {});
        bus.emit('tick', 1);
      }),
    );
  });
});

// ─── Bus lifecycle ───────────────────────────────────────────────────────────

describe('bus lifecycle', () => {
  test('benchmarks', async ({ bench }) => {
    await bench.compare(
      bench('createBus + dispose', () => {
        const bus = createBus<BenchEvents>();

        bus.dispose();
      }),
      bench('createBus + 10 unsubscribes + dispose', () => {
        const bus = createBus<BenchEvents>();
        const unsubs = Array.from({ length: 10 }, () => bus.on('tick', () => {}));

        for (const unsub of unsubs) unsub();
        bus.dispose();
      }),
    );
  });
});
