import { describe, expect, it } from 'vitest';
import { hunterMaxHealth } from './hunter-state';
import type { CampaignHunter } from './types';

const wearing = (armorId: string | null, helmId: string | null): Pick<CampaignHunter, 'equipment'> => ({
  equipment: { armorId, helmId, itemId: null, weaponId: null },
});

describe('hunterMaxHealth', () => {
  it('sums the health pips on the worn armor and helm', () => {
    expect(hunterMaxHealth(wearing('forge-anyone-base-armor-l1', 'forge-anyone-base-helm-l1'))).toBe(9);
    expect(hunterMaxHealth(wearing('forge-anyone-crystal-armor-l3', 'forge-anyone-crystal-helm-l3'))).toBe(31);
  });

  it('uses the single worn piece when only one slot grants health', () => {
    expect(hunterMaxHealth(wearing('forge-anyone-reefbound-plate-l1', null))).toBe(7);
    expect(hunterMaxHealth(wearing(null, 'forge-anyone-reefbound-helm-l2'))).toBe(10);
  });

  it('is unbounded when no worn piece prints health', () => {
    expect(hunterMaxHealth(wearing(null, null))).toBeUndefined();
    expect(hunterMaxHealth(wearing('forge-anyone-totemic-plate-l2', null))).toBeUndefined();
  });

  it('stops counting the health of depleted pieces, down to none left', () => {
    expect(
      hunterMaxHealth(wearing('forge-anyone-reefbound-plate-l1', 'forge-anyone-reefbound-helm-l2'), {
        armor: true,
        helm: false,
      }),
    ).toBe(10);
    expect(
      hunterMaxHealth(wearing('forge-anyone-reefbound-plate-l1', 'forge-anyone-reefbound-helm-l2'), {
        armor: true,
        helm: true,
      }),
    ).toBe(0);
    expect(hunterMaxHealth(wearing('forge-anyone-reefbound-plate-l1', null), { armor: true, helm: false })).toBe(0);
    expect(
      hunterMaxHealth(wearing('forge-anyone-totemic-plate-l2', null), { armor: true, helm: false }),
    ).toBeUndefined();
  });
});
