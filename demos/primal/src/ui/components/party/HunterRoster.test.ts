// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h } from 'vue';

import { hunterById, hunters } from '../../../content';
import type { Hunter } from '../../../domain/types';
import HunterRoster from './HunterRoster.vue';

const mounted: Array<ReturnType<typeof createApp>> = [];

afterEach(() => {
  for (const app of mounted) app.unmount();
  vi.unstubAllGlobals();
  mounted.length = 0;
});

function mountRoster(props: {
  deckStatus?: Record<string, boolean>;
  hunters: Hunter[];
  invalidLabel?: string;
  selectedId: string;
}): HTMLElement {
  const container = document.createElement('div');

  if (typeof IntersectionObserver === 'undefined') {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
  }
  const app = createApp({ render: () => h(HunterRoster, props) });

  for (const tag of ['ore-card', 'ore-chip', 'ore-icon', 'ore-text']) {
    app.component(
      tag,
      defineComponent({
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
          return () =>
            h(
              tag,
              attrs,
              Object.values(slots).flatMap((slot) => slot?.() ?? []),
            );
        },
      }),
    );
  }

  app.mount(container);
  mounted.push(app);
  return container;
}

const hunter = (id: string): Hunter => {
  const entry = hunterById(id);
  if (!entry) throw new Error(`Hunter ${id} is missing`);
  return entry;
};

describe('HunterRoster', () => {
  it('marks a hunter whose deck is not legal with the default chip', () => {
    const container = mountRoster({
      deckStatus: { daeron: false },
      hunters: [hunter('daeron'), hunter('mirah')],
      selectedId: 'daeron',
    });

    const chips = [...container.querySelectorAll('.hunter-roster__deck-status')];

    expect(chips).toHaveLength(1);
    expect(chips[0]?.textContent?.trim()).toBe('Not legal');
  });

  it('renames the not-ready chip where readiness means more than the deck', () => {
    const container = mountRoster({
      deckStatus: { daeron: false },
      hunters: [hunter('daeron')],
      invalidLabel: 'Not ready',
      selectedId: 'daeron',
    });

    expect(container.querySelector('.hunter-roster__deck-status')?.textContent?.trim()).toBe('Not ready');
  });

  it('shows no chip when every hunter is ready', () => {
    const container = mountRoster({
      deckStatus: Object.fromEntries(hunters.map(({ id }) => [id, true])),
      hunters: [hunter('daeron'), hunter('mirah')],
      selectedId: 'daeron',
    });

    expect(container.querySelector('.hunter-roster__deck-status')).toBeNull();
  });
});
