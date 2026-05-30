import { bench, describe } from 'vitest';

import { createBus } from '../index';

type BenchEvents = {
  tick: number;
  toggle: void;
};

// ─── Emit throughput ────────────────────────────────────────────────────────
// Pre-create buses outside bench fns — measures the emit hot path only.

describe('emit throughput', () => {
  const noListeners = createBus<BenchEvents>();
  const oneListener = createBus<BenchEvents>();
  const tenListeners = createBus<BenchEvents>();

  oneListener.on('tick', () => {});
  for (let i = 0; i < 10; i++) tenListeners.on('tick', () => {});

  bench('0 listeners (no-op)', () => {
    noListeners.emit('tick', 1);
  });

  bench('1 listener', () => {
    oneListener.emit('tick', 1);
  });

  bench('10 listeners', () => {
    tenListeners.emit('tick', 1);
  });
});

// ─── Subscription churn ─────────────────────────────────────────────────────

describe('subscription churn', () => {
  const bus = createBus<BenchEvents>();

  bench('on + off (single cycle)', () => {
    const unsub = bus.on('tick', () => {});

    unsub();
  });

  bench('once + fire (single cycle)', () => {
    bus.once('tick', () => {});
    bus.emit('tick', 1);
  });
});

// ─── Bus lifecycle ───────────────────────────────────────────────────────────

describe('bus lifecycle', () => {
  bench('createBus + dispose', () => {
    const bus = createBus<BenchEvents>();

    bus.dispose();
  });

  bench('createBus + 10 subs + removeAllListeners + dispose', () => {
    const bus = createBus<BenchEvents>();

    for (let i = 0; i < 10; i++) bus.on('tick', () => {});
    bus.removeAllListeners();
    bus.dispose();
  });
});
