// Run with `vitest bench` (not picked up by `vitest run` — bench files use a separate
// entry point). Not part of the standard `pnpm test` pipeline; a starting point for
// tracking regressions in the reactive graph's hot paths and the store's deep-freeze cost.
import { bench, describe } from 'vitest';

import { computed, effect, signal, store } from '../';

describe('reactive graph propagation', () => {
  bench('1000 chained computed nodes, one root write', () => {
    const root = signal(0);
    let node: { value: number } = root;

    for (let i = 0; i < 1000; i++) {
      const upstream = node;

      node = computed(() => upstream.value + 1);
    }

    const stop = effect(() => {
      void node.value;
    });

    root.value = 1;
    stop.dispose();
  });

  bench('1000 independent effects reacting to one signal write', () => {
    const n = signal(0);
    const stops = Array.from({ length: 1000 }, () =>
      effect(() => {
        void n.value;
      }),
    );

    n.value = 1;

    for (const stop of stops) stop.dispose();
  });
});

describe('store mutation — deep-freeze cost', () => {
  const wideState = { items: Array.from({ length: 200 }, (_, i) => ({ id: i, label: `item-${i}` })) };

  bench('patch() replacing a 200-item array (deep-clone + deep-freeze)', () => {
    const s = store(wideState);

    s.patch({ items: [...wideState.items] });
    s.dispose();
  });

  bench('lens() write on a nested path within the same shape', () => {
    const s = store({ meta: wideState });
    const lens = s.lens('meta.items');

    lens.value = [...wideState.items];
    s.dispose();
  });
});
