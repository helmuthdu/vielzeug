import { base64UrlToText, textToBase64Url } from '@vielzeug/arsenal';
import { s } from '@vielzeug/spell';
import { forgeEquipment, hunterById, hunterCards, potions } from '../content';
import {
  baseEquipment,
  deckTypeOf,
  EQUIPMENT_SLOTS,
  fitDeck,
  loadoutDeckContext,
  starterMasteryId,
  wearEquipment,
} from './deck';
import { PrimalDomainError } from './errors';
import { emptyPotionLoadout, setPotionSlot } from './potion';
import type {
  BoardBuild,
  EquipmentIds,
  EquipmentSlot,
  ExpansionId,
  HunterLoadout,
  PotionLoadout,
  PotionSlot,
} from './types';

/**
 * Build codes let players pass a loadout between devices as text, a link or a QR code. The
 * code is self-contained: the hunter, a bitmask over the hunter's action cards, and catalog
 * indices for equipment, the mastery card and potions: every catalog sorted by id so the
 * encoding survives re-ordering: wrapped as base64url JSON. Indices keep codes compact
 * (~100 characters for a full build); inserting content whose id sorts before existing
 * entries shifts indices, which CODE_VERSION bumps absorb.
 */
const CODE_VERSION = 4;
export const LOADOUT_NAME_MAX = 32;
export const LOADOUT_STRATEGY_MAX = 2000;

const codeSchema = s.object({
  d: s.string().regex(/^[0-9a-f]*$/),
  e: s.tuple([
    s.number().int().min(0).nullable(),
    s.number().int().min(0).nullable(),
    s.number().int().min(0).nullable(),
    s.number().int().min(0).nullable(),
  ]),
  h: s.string().min(1),
  m: s.number().int().min(0),
  n: s.string().max(LOADOUT_NAME_MAX),
  p: s.tuple([
    s.number().int().min(0).nullable(),
    s.number().int().min(0).nullable(),
    s.number().int().min(0).nullable(),
  ]),
  v: s.literal(CODE_VERSION),
});

export type SharedBuild = Pick<HunterLoadout, 'hunterId' | 'name'> & BoardBuild;

/** The shareable snapshot of a saved build: exactly what a code or a catalog entry carries. */
export function toSharedBuild(loadout: HunterLoadout): SharedBuild {
  return {
    deckCardIds: [...loadout.deckCardIds],
    equipment: { ...loadout.equipment },
    hunterId: loadout.hunterId,
    masteryCardId: loadout.masteryCardId,
    name: loadout.name,
    potionLoadoutIds: [...loadout.potionLoadoutIds],
  };
}

const requireHunter = (hunterId: string) => {
  const hunter = hunterById(hunterId);
  if (!hunter) throw new PrimalDomainError('loadout-invalid', `Unknown hunter "${hunterId}".`);
  return hunter;
};

/** A fresh build starts like a hunter joining a hunt: basic weapon, base armor and helm, a fitted deck, no potions. */
export function createLoadout(
  hunterId: string,
  expansionIds: readonly ExpansionId[],
  input: { id: string; name: string; now: string },
): HunterLoadout {
  const hunter = requireHunter(hunterId);
  const build: BoardBuild = {
    deckCardIds: [],
    equipment: baseEquipment(hunter),
    masteryCardId: starterMasteryId(hunter),
    potionLoadoutIds: emptyPotionLoadout(),
  };
  return {
    ...build,
    createdAt: input.now,
    deckCardIds: fitDeck([], loadoutDeckContext(expansionIds, build, hunter)),
    hunterId,
    id: input.id,
    name: input.name,
    rev: 0,
    strategy: '',
    updatedAt: input.now,
  };
}

/** Slots a potion from the owned boxes into the build; a potion may sit in only one slot. */
export function setLoadoutPotion(
  loadout: HunterLoadout,
  slot: PotionSlot,
  potionId: string | null,
  expansionIds: readonly ExpansionId[],
  now: string,
): HunterLoadout {
  const hunter = requireHunter(loadout.hunterId);
  if (potionId && !loadoutDeckContext(expansionIds, loadout, hunter).availablePotionIds.has(potionId)) {
    throw new PrimalDomainError('potion-locked', 'That potion is not in your boxes.');
  }
  return { ...loadout, potionLoadoutIds: setPotionSlot(loadout.potionLoadoutIds, slot, potionId), updatedAt: now };
}

export function setLoadoutEquipment(
  loadout: HunterLoadout,
  slot: EquipmentSlot,
  equipmentId: string | null,
  expansionIds: readonly ExpansionId[],
  now: string,
): HunterLoadout {
  const hunter = requireHunter(loadout.hunterId);
  return {
    ...wearEquipment(loadout, slot, equipmentId, loadoutDeckContext(expansionIds, loadout, hunter)),
    updatedAt: now,
  };
}

/** Chooses the mastery card the build plays; it must belong to the hunter's catalogue. */
export function setLoadoutMastery(
  loadout: HunterLoadout,
  masteryCardId: string,
  expansionIds: readonly ExpansionId[],
  now: string,
): HunterLoadout {
  const hunter = requireHunter(loadout.hunterId);
  if (!loadoutDeckContext(expansionIds, loadout, hunter).availableMasteryIds.has(masteryCardId)) {
    throw new PrimalDomainError('loadout-invalid', `Mastery "${masteryCardId}" is not available to this hunter.`);
  }
  return { ...loadout, masteryCardId, updatedAt: now };
}

const sortedActionCardIds = (hunterId: string): string[] =>
  hunterCards(requireHunter(hunterId))
    .filter((card) => deckTypeOf(card) !== null)
    .map((card) => card.id)
    .sort();

/** Sorted per-slot equipment catalog; indices are the wire format. */
const sortedEquipmentIds = (slot: EquipmentSlot): string[] =>
  forgeEquipment
    .filter((piece) => piece.type === slot)
    .map((piece) => piece.id)
    .sort();

/** Sorted mastery catalog of one hunter; the index picks the worn mastery. */
const sortedMasteryIds = (hunterId: string): string[] =>
  hunterCards(requireHunter(hunterId))
    .filter((card) => card.kind === 'mastery')
    .map((card) => card.id)
    .sort();

/** Sorted potion catalog; indices pick the slotted potions. */
const sortedPotionIds = (): string[] => potions.map((potion) => potion.id).sort();

const indexOfOrThrow = (catalog: readonly string[], id: string): number => {
  const index = catalog.indexOf(id);
  if (index < 0) {
    throw new PrimalDomainError('loadout-invalid', `The build names unknown content "${id}".`);
  }
  return index;
};

const idAtIndexOrThrow = (catalog: readonly string[], index: number, what: string): string => {
  const id = catalog[index];
  if (!id) throw new PrimalDomainError('loadout-invalid', `The build code names unknown ${what}.`);
  return id;
};

export function encodeLoadoutCode(build: SharedBuild): string {
  const ids = sortedActionCardIds(build.hunterId);
  const bits = ids.map((id) => (build.deckCardIds.includes(id) ? '1' : '0')).join('');
  const nibbles = bits.padEnd(Math.ceil(bits.length / 4) * 4, '0').match(/.{4}/g) ?? [];
  return textToBase64Url(
    JSON.stringify({
      d: nibbles.map((nibble) => Number.parseInt(nibble, 2).toString(16)).join(''),
      e: EQUIPMENT_SLOTS.map((slot) => {
        const id = build.equipment[`${slot}Id`];
        return id === null ? null : indexOfOrThrow(sortedEquipmentIds(slot), id);
      }),
      h: build.hunterId,
      m: indexOfOrThrow(sortedMasteryIds(build.hunterId), build.masteryCardId),
      n: build.name,
      p: build.potionLoadoutIds.map((id) => (id === null ? null : indexOfOrThrow(sortedPotionIds(), id))),
      v: CODE_VERSION,
    }),
  );
}

/** Accepts a bare code or a share link (`…/build/<code>`, with or without a hash router) and returns the code. */
export const loadoutCodeFromText = (text: string): string =>
  (text.trim().split('/build/').pop() ?? '').split(/[?#/]/)[0] ?? '';

export function decodeLoadoutCode(code: string): SharedBuild {
  let parsed: unknown;
  try {
    parsed = JSON.parse(base64UrlToText(code.trim()));
  } catch {
    throw new PrimalDomainError('loadout-invalid', 'That is not a Primal build code.');
  }
  const result = codeSchema.safeParse(parsed);
  if (!result.success) throw new PrimalDomainError('loadout-invalid', 'That build code is not supported.');
  const { d, e, h, m, n, p } = result.data;
  const ids = sortedActionCardIds(h);
  const bits = [...d].map((hex) => Number.parseInt(hex, 16).toString(2).padStart(4, '0')).join('');
  const equipment = Object.fromEntries(
    EQUIPMENT_SLOTS.map((slot, index) => [
      `${slot}Id`,
      e[index] === null ? null : idAtIndexOrThrow(sortedEquipmentIds(slot), e[index] as number, `${slot} equipment`),
    ]),
  ) as EquipmentIds;
  const masteryId = idAtIndexOrThrow(sortedMasteryIds(h), m, 'mastery');
  // The schema guarantees a three-slot tuple; spelled out per slot so the tuple shape survives.
  const decodeSlot = (index: number | null): string | null =>
    index === null ? null : idAtIndexOrThrow(sortedPotionIds(), index, 'potion');
  const potionLoadoutIds: PotionLoadout = [decodeSlot(p[0]), decodeSlot(p[1]), decodeSlot(p[2])];
  const slotted = potionLoadoutIds.filter((id): id is string => id !== null);
  if (new Set(slotted).size !== slotted.length) {
    throw new PrimalDomainError('loadout-invalid', 'The build code names repeated potions.');
  }
  return {
    deckCardIds: ids.filter((_, index) => bits[index] === '1'),
    equipment,
    hunterId: h,
    masteryCardId: masteryId,
    name: n.trim(),
    potionLoadoutIds,
  };
}
