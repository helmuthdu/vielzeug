import { describe, expect, it } from 'vitest';
import { forgeEquipment, potions } from '../content';
import { createCampaign } from './campaign';
import type { Campaign, ElementId, ExpansionId, ForgeEquipment, ResourceId } from './types';
import { equipmentLock, equipmentRecipeState, potionLock, potionRecipeState, suggestResourceTrade } from './workshop';

const NOW = '2026-01-01T00:00:00.000Z';
const ALL_ELEMENTS: ElementId[] = ['coral', 'crystal', 'feather', 'fire', 'horn', 'ice', 'metal', 'thunder', 'venom'];

/** True for pieces the forge can craft at all (never reward grants, core expansion only). */
const craftable = (entry: ForgeEquipment): boolean =>
  (entry.type === 'item' ? !entry.rewardOnly : !entry.awakenedOnly) && entry.expansionId === 'core';

/** A campaign whose forge and herbalist are raised to `level` with every element unlocked. */
function workshopCampaign(level: number, expansionIds: ExpansionId[] = ['core']): Campaign {
  const base = createCampaign({
    config: { expansionIds, name: 'Workshop', nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah'],
    id: 'w1',
    now: NOW,
  });
  return { ...base, forge: { level, unlockedElementIds: ALL_ELEMENTS }, herbalist: { level } };
}

const armorAt = (level: number) =>
  forgeEquipment.find((entry) => entry.level === level && entry.type === 'armor' && craftable(entry));
const potionAt = (level: number) => potions.find((entry) => entry.level === level && !entry.rewardOnly && entry.cost);

describe('equipmentLock', () => {
  it('reports the forge level before element or class', () => {
    const entry = armorAt(2);
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(equipmentLock(workshopCampaign(1), entry, 'great-sword')).toEqual({ kind: 'level-above', level: 2 });
    expect(equipmentLock(workshopCampaign(3), entry, 'great-sword')).toEqual({ kind: 'level-below', level: 3 });
  });

  it('reports an awakened-set piece as awakened regardless of forge level', () => {
    const awakened = forgeEquipment.find((entry) => entry.type !== 'item' && entry.awakenedOnly);
    expect(awakened).toBeDefined();
    if (!awakened) return;
    expect(equipmentLock(workshopCampaign(1), awakened, 'great-sword')).toEqual({ kind: 'awakened' });
  });

  it('locks a weapon whose class the hunter does not wear', () => {
    const weapon = forgeEquipment.find(
      (entry) =>
        entry.type === 'weapon' &&
        entry.level === 1 &&
        craftable(entry) &&
        entry.element === null &&
        entry.classRestriction !== 'great-sword',
    );
    expect(weapon).toBeDefined();
    if (!weapon || weapon.type !== 'weapon') return;
    const campaign = workshopCampaign(1);
    expect(equipmentLock(campaign, weapon, 'great-sword')).toEqual({
      kind: 'class',
      restriction: weapon.classRestriction,
    });
    // Codex mode (no hunter selected) never reports a class lock.
    expect(equipmentLock(campaign, weapon)).toBeUndefined();
  });

  it('locks a piece from an expansion the campaign does not carry', () => {
    const foreign = forgeEquipment.find(
      (entry) => entry.expansionId !== 'core' && entry.level === 1 && entry.type === 'armor' && !entry.awakenedOnly,
    );
    expect(foreign).toBeDefined();
    if (!foreign) return;
    expect(equipmentLock(workshopCampaign(1), foreign, 'great-sword')).toEqual({ kind: 'expansion' });
  });
});

describe('equipmentRecipeState', () => {
  it('walks craftable, owned, equipped and locked as the hunter changes', () => {
    const entry = forgeEquipment.find(
      (entry) =>
        entry.level === 1 && entry.type === 'armor' && craftable(entry) && entry.id !== 'forge-anyone-base-armor-l1',
    );
    expect(entry).toBeDefined();
    if (!entry) return;
    const campaign = workshopCampaign(1);
    const member = campaign.hunters[0];
    expect(['craftable', 'missing']).toContain(equipmentRecipeState(campaign, member, entry, 'great-sword'));

    const owned = { ...member, craftedEquipmentIds: [...member.craftedEquipmentIds, entry.id] };
    expect(equipmentRecipeState(campaign, owned, entry, 'great-sword')).toBe('owned');

    const equipped = { ...owned, equipment: { ...owned.equipment, armorId: entry.id } };
    expect(equipmentRecipeState(campaign, equipped, entry, 'great-sword')).toBe('equipped');

    expect(equipmentRecipeState(workshopCampaign(2), member, entry, 'great-sword')).toBe('locked');
  });
});

describe('potionLock / potionRecipeState', () => {
  it('gates the shelf on the herbalist level', () => {
    const entry = potionAt(2);
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(potionLock(workshopCampaign(1), entry)).toEqual({ kind: 'level-above', level: 2 });
    expect(potionLock(workshopCampaign(3), entry)).toEqual({ kind: 'level-below', level: 3 });
  });

  it('shows a prepared potion as prepared and an unaffordable one as missing', () => {
    const entry = potionAt(1);
    expect(entry).toBeDefined();
    if (!entry) return;
    const campaign = workshopCampaign(1);
    const member = campaign.hunters[0];
    const prepared = { ...member, potionInventoryIds: [...member.potionInventoryIds, entry.id] };
    expect(potionRecipeState(campaign, prepared, entry)).toBe('prepared');
    const broke = { ...member, resources: {} };
    expect(potionRecipeState(campaign, broke, entry)).toBe('missing');
  });
});

describe('suggestResourceTrade', () => {
  const tradable: ReadonlyArray<{ category: string; id: ResourceId }> = [
    { category: 'element', id: 'metal' },
    { category: 'element', id: 'ice' },
  ];

  it('finds the first partner holding a same-category resource the sender lacks', () => {
    const funded = workshopCampaign(1).hunters.map((hunter, index) =>
      index === 0
        ? { ...hunter, resources: { ...hunter.resources, metal: 2 } }
        : { ...hunter, resources: { ...hunter.resources, ice: 1 } },
    );
    expect(suggestResourceTrade(funded, 'daeron', tradable)).toEqual({
      offered: 'metal',
      partner: 'mirah',
      requested: 'ice',
    });
  });

  it('returns nothing when no partner holds a different same-category resource', () => {
    const funded = workshopCampaign(1).hunters.map((hunter) => ({
      ...hunter,
      resources: { ...hunter.resources, metal: 1 },
    }));
    expect(suggestResourceTrade(funded, 'daeron', tradable)).toBeUndefined();
  });
});
