import { PrimalDomainError } from './errors';
import type { PotionLoadout, PotionSlot } from './types';

export const MAX_POTION_LOADOUT = 3;

export const emptyPotionLoadout = (): PotionLoadout => [null, null, null];

/** Refills one potion slot after a hunt: a potion that was consumed and spent comes back empty. */
export const refillPotion = (id: string | null, spent: ReadonlySet<string>): string | null =>
  id && spent.has(id) ? null : id;

/** What campaign and expedition hunters share about potions: three hunt slots and a consumed record. */
export interface PotionCarrier {
  consumedPotionIds: string[];
  potionLoadoutIds: PotionLoadout;
}

/** Places a potion in a hunt slot; a potion may sit in only one slot at a time. */
export function setPotionSlot(loadout: PotionLoadout, slot: PotionSlot, potionId: string | null): PotionLoadout {
  if (slot < 0 || slot >= MAX_POTION_LOADOUT) {
    throw new PrimalDomainError('potion-loadout', 'That potion slot does not exist.');
  }
  if (potionId && loadout.some((id, index) => index !== slot && id === potionId)) {
    throw new PrimalDomainError('potion-loadout', 'That potion is already in another loadout slot.');
  }
  // The loadout is a fixed three-slot tuple, so the replacement is spelled out rather than
  // spread-and-assign, which would widen it back to an array.
  const [first, second, third] = loadout;
  return slot === 0 ? [potionId, second, third] : slot === 1 ? [first, potionId, third] : [first, second, potionId];
}

/** Marks a loadout potion as consumed for this hunt. */
export function consumePotion<T extends PotionCarrier>(carrier: T, potionId: string): T {
  if (!carrier.potionLoadoutIds.includes(potionId)) {
    throw new PrimalDomainError('potion-loadout', 'Only a potion in the active loadout can be consumed.');
  }
  if (carrier.consumedPotionIds.includes(potionId)) {
    throw new PrimalDomainError('potion-loadout', 'That potion has already been consumed during this hunt.');
  }
  return { ...carrier, consumedPotionIds: [...carrier.consumedPotionIds, potionId] };
}
