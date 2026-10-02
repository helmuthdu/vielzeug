// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';
import { createApp, h } from 'vue';

import { hunterById } from '../../../content';
import HunterIdentity from './HunterIdentity.vue';

const mounted: Array<ReturnType<typeof createApp>> = [];

afterEach(() => {
  for (const app of mounted) app.unmount();
  mounted.length = 0;
});

function mountIdentity(playerName?: string): HTMLElement {
  const hunter = hunterById('daeron');
  if (!hunter) throw new Error('expected Daeron in the hunter catalog');

  const container = document.createElement('div');
  const app = createApp({ render: () => h(HunterIdentity, { hunter, playerName }) });
  app.mount(container);
  mounted.push(app);
  return container;
}

describe('HunterIdentity', () => {
  it('shows an assigned player beside the hunter name as secondary text', () => {
    const container = mountIdentity('Ana');
    const glyph = container.querySelector('.hunter-identity__glyph');
    const player = container.querySelector('.hunter-identity__player');
    const name = container.querySelector('.hunter-identity__name');

    expect(glyph).not.toBeNull();
    expect(player?.textContent).toBe('Ana');
    expect(player?.parentElement).toBe(name?.parentElement);
    expect(name?.textContent).toContain('Daeron');
  });

  it('omits the player detail when no player name is assigned', () => {
    const container = mountIdentity();

    expect(container.querySelector('.hunter-identity__player')).toBeNull();
  });
});
