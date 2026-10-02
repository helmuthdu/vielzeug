// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, defineComponent, h, nextTick, shallowRef } from 'vue';

import { campaigns } from '../../../app/store';
import { forgeEquipment } from '../../../content';
import { createCampaign } from '../../../domain/campaign';
import type { Campaign } from '../../../domain/types';
import { useWorkshop, type WorkshopModel } from './use-workshop';
import WorkshopShelf from './WorkshopShelf.vue';

vi.mock('../../../app/store', async () => {
  const { signal } = await import('@vielzeug/ripple');

  return {
    campaigns: signal<Campaign[]>([]),
    runCommand: vi.fn(() => ({})),
  };
});

vi.mock('../../../app/vue-bridge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../app/vue-bridge')>();

  return {
    ...actual,
    useRouteParams: () => shallowRef({ id: 'crafting-test' }),
  };
});

let app: ReturnType<typeof createApp> | undefined;
let workshop: WorkshopModel;

function createTestCampaign(): Campaign {
  return createCampaign({
    config: { expansionIds: ['core'], name: 'Crafting Test', nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah'],
    id: 'crafting-test',
    now: '2026-01-01T00:00:00.000Z',
  });
}

async function mountWorkshop(campaign: Campaign): Promise<{ container: HTMLElement; model: WorkshopModel }> {
  campaigns.value = [campaign];
  app = createApp(
    defineComponent({
      setup() {
        workshop = useWorkshop();
        return () => h(WorkshopShelf, { workshop });
      },
    }),
  );
  const container = document.createElement('div');
  app.mount(container);
  await nextTick();
  return { container, model: workshop };
}

afterEach(() => {
  app?.unmount();
  app = undefined;
  campaigns.value = [];
  vi.clearAllMocks();
});

describe('useWorkshop()', () => {
  it('keeps the craftable scope selected after crafting equipment', async () => {
    const { model } = await mountWorkshop(createTestCampaign());

    const entry = forgeEquipment.find((item) => item.id === 'forge-anyone-red-scale-armor-l1');
    if (!entry) throw new Error('expected a craftable equipment recipe');

    model.requestAction({ entry, kind: 'craft' });
    model.confirmAction();

    expect(model.scope).toBe('craftable');
  });

  it('shows an upgrade badge only when the selected hunter owns a lower-level piece', async () => {
    const campaign = createTestCampaign();
    campaign.forge.level = 2;
    campaign.forge.unlockedElementIds = ['fire'];
    campaign.hunters[0].resources = { blood: 1, scales: 1 };
    campaign.hunters[0].craftedEquipmentIds.push('forge-anyone-red-scale-armor-l1');
    campaign.hunters[1].craftedEquipmentIds.push('forge-anyone-red-scale-armor-l2');
    const { container, model } = await mountWorkshop(campaign);

    const item = model.shelfItems.find((candidate) =>
      candidate.entries.some((entry) => entry.id === 'forge-anyone-red-scale-armor-l2'),
    );
    const badge = container.querySelector('ore-badge.recipe-choice__upgrade-badge');
    const iconWrap = badge?.parentElement;
    const icon = iconWrap?.querySelector('.recipe-choice__icon');
    const row = badge?.closest('ore-list-item');
    const state = row?.querySelector('.recipe-choice__state[slot="trailing"]');

    expect(model.scope).toBe('craftable');
    expect(item?.entry.id).toBe('forge-anyone-red-scale-armor-l2');
    expect(item?.state).toBe('craftable');
    expect(item?.upgradeAvailable).toBe(true);
    expect(badge?.textContent).toContain('Upgrade');
    expect(iconWrap?.contains(icon ?? null)).toBe(true);
    expect(badge?.parentElement).toBe(iconWrap);
    expect(badge?.querySelector('.recipe-choice__icon')).toBeNull();
    expect(badge?.querySelector('strong')).toBeNull();
    expect(row?.querySelector('.recipe-choice__icon')).not.toBeNull();
    expect(row?.querySelector('strong')?.textContent).toContain('Red Scale Armor');
    expect(state).not.toBeNull();
    expect(state?.parentElement).toBe(row);
    expect(badge?.contains(state ?? null)).toBe(false);

    model.scope = 'all';
    await nextTick();
    expect(container.querySelector('ore-badge.recipe-choice__upgrade-badge')).toBeNull();
  });
});
