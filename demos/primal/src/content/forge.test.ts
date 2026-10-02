import { describe, expect, it } from 'vitest';
import type { WeaponEquipment } from '../domain/types';
import {
  forgeById,
  forgeEquipment,
  potions,
  previousForgeEquipment,
  rewardCardEquipment,
  rewardCardPotions,
  weaponById,
} from './forge';

describe('Forge catalog', () => {
  it('loads canonical Forge and Herbalist metadata', () => {
    expect(forgeById('forge-anyone-red-scale-armor-l1')).toMatchObject({
      cost: { blood: 1, scales: 1 },
      health: 6,
      name: 'Red Scale Armor',
    });
    expect(potions.find((entry) => entry.id === 'herbalist-anyone-imperia-l1')).toMatchObject({
      cost: { anthemon: 1, nillea: 1 },
      name: 'Imperia',
    });
    expect(potions.find((entry) => entry.id === 'herbalist-anyone-evok-l1')?.cost).toEqual({
      anthemon: 1,
      tarmaret: 1,
    });
    expect(potions.find((entry) => entry.id === 'herbalist-anyone-irden-l3')?.cost).toEqual({
      saelicornia: 1,
      tarmaret: 1,
    });
    expect(forgeById('forge-anyone-big-jaws-l1')?.cost).toEqual({ blood: 1, kobaureo: 1 });
    expect(forgeById('forge-anyone-frost-armor-l1')?.cost).toEqual({ iride: 1, kobaureo: 1 });
    expect(forgeById('weapon-karah-tidal-waves-l1')).toMatchObject({
      cost: { blood: 2 },
      expansionId: 'mount-havoc',
    });
    expect(forgeById('weapon-thoreg-burning-stone-l3')?.cost).toEqual({ blood: 1, iride: 1 });
    expect(forgeById('weapon-thoreg-dragon-bane-l2')?.cost).toEqual({ iride: 1, scales: 1 });
    expect(forgeById('weapon-daeron-flame-tounge-l1')?.name).toBe('Flame Tongue');
    expect(weaponById('weapon-daeron-great-sword-l1')?.deckComposition).toEqual({
      attack: 6,
      dodge: 6,
      maneuver: 6,
      parry: 6,
    });
  });

  it('includes complete spear and war-drum recipe costs', () => {
    const weapons = forgeEquipment.filter((entry): entry is WeaponEquipment => entry.type === 'weapon');
    const spear = weapons.filter((entry) => entry.classRestriction === 'spear');
    const drums = weapons.filter((entry) => entry.classRestriction === 'war-drum');

    expect(spear).toHaveLength(30);
    expect(drums).toHaveLength(30);
    expect(spear.every((entry) => entry.artwork.startsWith('/cards/weapon_spear/'))).toBe(true);
    expect(drums.every((entry) => entry.artwork.startsWith('/cards/weapon_drum/'))).toBe(true);
    expect([...spear, ...drums].filter((entry) => entry.element !== null).every((entry) => entry.cost !== null)).toBe(
      true,
    );
    expect(forgeById('weapon-zaraya-tidespear-l3')).toMatchObject({
      cost: { kobaureo: 2 },
      expansionId: 'heart-of-the-wild',
    });
    expect(forgeById('weapon-drusk-nocturnedrum-l3')).toMatchObject({
      cost: { iride: 2 },
      element: 'crystal',
      expansionId: 'heart-of-the-wild',
    });
    expect(forgeById('weapon-drusk-vinedrum-l2')).toMatchObject({ cost: { blood: 1, scales: 1 }, element: 'venom' });
  });

  it('loads complete spear and war-drum card details without replacing recipe costs', () => {
    expect(forgeById('weapon-zaraya-arkenspike-l1')).toMatchObject({
      cost: { iride: 1, kobaureo: 1 },
      damage: [4, 9],
      deckComposition: { attack: 4, dodge: 5, maneuver: 5, parry: 6 },
      description: expect.stringContaining('avoid attrition damage'),
    });
    expect(forgeById('weapon-drusk-frozendrum-l1')).toMatchObject({
      damage: 2,
      deckComposition: { attack: 6, dodge: 4, maneuver: 6, parry: 4 },
      description: expect.stringContaining('exile zone'),
    });
    const weapons = forgeEquipment
      .filter((entry): entry is WeaponEquipment => entry.type === 'weapon')
      .filter((entry) => entry.classRestriction === 'spear' || entry.classRestriction === 'war-drum');
    expect(
      weapons
        .filter((entry) => !entry.awakenedOnly)
        .every((entry) => entry.damage !== null && entry.deckComposition !== null && entry.description),
    ).toBe(true);
  });

  it('loads every authored weapon and generated Forge record', () => {
    expect(forgeEquipment.filter((entry) => entry.type === 'weapon')).toHaveLength(240);
    expect(forgeEquipment.filter((entry) => entry.type !== 'weapon')).toHaveLength(144);
    expect(forgeById('forge-anyone-base-armor-l1')).toMatchObject({
      artwork: '/cards/base_armor.webp',
      cost: null,
      health: 5,
    });
    expect(forgeById('forge-anyone-base-helm-l1')).toMatchObject({
      artwork: '/cards/base_helmet.webp',
      cost: null,
      health: 4,
    });
    expect(potions).toHaveLength(26);
  });

  it('links every leveled weapon to its previous upgrade', () => {
    // Awakened-set legendaries are single-level rewards with no upgrade chain.
    const leveled = forgeEquipment.filter((entry) => entry.type === 'weapon' && entry.level > 1 && !entry.awakenedOnly);
    expect(leveled.every((entry) => previousForgeEquipment(entry)?.level === entry.level - 1)).toBe(true);
  });

  it('covers every printed reward card exactly once across items and potions', () => {
    const cards = [...rewardCardEquipment.keys(), ...rewardCardPotions.keys()].sort((left, right) => left - right);
    expect(cards).toEqual(Array.from({ length: 38 }, (_, index) => index + 1));
    expect(rewardCardEquipment.get(12)?.name).toBe('Vermilion');
    expect(rewardCardPotions.get(2)?.name).toBe('Lumenera');
  });

  it('uses unique stable ids for every craftable record', () => {
    const ids = [...forgeEquipment.map((entry) => entry.id), ...potions.map((entry) => entry.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
