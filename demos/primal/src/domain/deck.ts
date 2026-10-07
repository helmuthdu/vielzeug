import {
  enabledContent,
  forgeById,
  forgeEquipment,
  hunterById,
  hunterCards,
  masteryCards,
  monsters,
  potions,
  starterCards,
  starterMastery,
  trialHuntForScenario,
  weaponById,
} from '../content';
import { PrimalDomainError } from './errors';
import { carrierMonster } from './monster-state';
import { type SkillProgress, unlockedCards } from './skill-tree';
import type {
  Ascent,
  AscentHunter,
  BoardBuild,
  Campaign,
  CampaignHunter,
  Challenge,
  ChallengeHunter,
  DeckComposition,
  ElementId,
  EquipmentIds,
  EquipmentSlot,
  ExpansionId,
  Expedition,
  ExpeditionHunter,
  ForgeEquipment,
  Hunter,
  HunterBuild,
  HunterCard,
  HuntSubject,
  Monster,
  Potion,
} from './types';
import { isAscentSubject, isCampaignSubject, isChallengeSubject } from './types';

/**
 * Action-deck rules. A deck must hold exactly the card counts printed on the weapon; every two pieces
 * of equipment whose element the monster is weak to grant one deck advantage, which lets the player
 * add or remove one card of any type. Validation is pure: the callers below build the context.
 */
export type DeckType = keyof DeckComposition;

/** Printed order on the weapon card, top to bottom. */
export const DECK_TYPES: readonly DeckType[] = ['attack', 'maneuver', 'parry', 'dodge'];
export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['weapon', 'armor', 'helm', 'item'];

const emptyComposition = (): DeckComposition => ({ attack: 0, dodge: 0, maneuver: 0, parry: 0 });

/** The deck type of an action card, or `null` for masteries and untyped cards. */
export function deckTypeOf(card: Pick<HunterCard, 'kind' | 'subtype'>): DeckType | null {
  if (card.kind !== 'action') return null;
  const type = card.subtype?.toLowerCase();
  return DECK_TYPES.find((entry) => entry === type) ?? null;
}

export interface DeckContext {
  /** Action cards the hunter may put in the deck (campaign: unlocked pool; expedition: every card). */
  availableCardIds: ReadonlySet<string>;
  /** Equipment the hunter may wear (campaign: crafted; expedition: every class-eligible piece). */
  availableEquipmentIds: ReadonlySet<string>;
  /** Mastery cards the hunter may play here (campaign: starter plus unlocked branch-2 masteries; else every card). */
  availableMasteryIds: ReadonlySet<string>;
  /** Potions the board can slot (campaign: prepared; expedition and builds: every potion in the enabled boxes). */
  availablePotionIds: ReadonlySet<string>;
  equipment: EquipmentIds;
  hunter: Hunter;
  /** Monsters in scope for the mode: the hunts a target-less build could be equipped against. */
  huntPool: readonly Monster[];
  /** The hunt target when known; drives effective equipment and deck advantages. */
  monster: Monster | null;
}

export type DeckIssue =
  | { code: 'no-weapon' }
  | { cardId: string; code: 'card-unknown' | 'card-unavailable' | 'card-duplicate' }
  | { code: 'composition'; required: number; selected: number; type: DeckType }
  | { allowed: number; code: 'advantages-exceeded'; used: number };

export interface DeckReport {
  /** Deck advantages granted by effective equipment: one per two pieces. */
  advantages: number;
  /** Advantages the deck spends: every card above or below the printed count costs one. */
  advantagesUsed: number;
  effectiveEquipment: number;
  issues: DeckIssue[];
  /** Printed weapon composition, or `null` without a weapon. */
  required: DeckComposition | null;
  selected: DeckComposition;
  size: number;
  valid: boolean;
}

export const wornEquipment = (equipment: EquipmentIds): ForgeEquipment[] =>
  EQUIPMENT_SLOTS.flatMap((slot) => {
    const piece = equipment[`${slot}Id`];
    const content = piece ? forgeById(piece) : undefined;
    return content ? [content] : [];
  });

/** Pieces whose element the monster is weak to. Zero without a target. */
export function effectiveEquipment(equipment: EquipmentIds, monster: Monster | null): ForgeEquipment[] {
  if (!monster) return [];
  return wornEquipment(equipment).filter(
    (piece) => piece.element !== null && monster.weaknesses.includes(piece.element),
  );
}

export const deckAdvantages = (effectivePieces: number): number => Math.floor(effectivePieces / 2);

/** Pieces worn per element, most worn first. The weapon is a piece like any other and counts. */
export function elementCounts(equipment: EquipmentIds): { count: number; element: ElementId }[] {
  const counts = new Map<ElementId, number>();
  for (const piece of wornEquipment(equipment)) {
    if (piece.element) counts.set(piece.element, (counts.get(piece.element) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([element, count]) => ({ count, element }))
    .sort((a, b) => b.count - a.count || a.element.localeCompare(b.element));
}

/**
 * The elements this build covers: worn on at least two pieces, so they can turn effective against a
 * monster weak to them. Coverage alone is not an advantage: only a hunt that matches it is.
 */
export const coveredElements = (equipment: EquipmentIds): { count: number; element: ElementId }[] =>
  elementCounts(equipment).filter((entry) => entry.count >= 2);

export interface HuntMatchup {
  advantages: number;
  monster: Monster;
}

/**
 * The hunts this build could exploit, best first. Each entry is what equipping the build against that
 * monster would actually grant, so the best matchup and the deck budget can never disagree: unlike a
 * sum over elements, which would count two elements no single monster is weak to.
 */
export function huntMatchups(equipment: EquipmentIds, huntPool: readonly Monster[]): HuntMatchup[] {
  const covered = new Set(coveredElements(equipment).map((entry) => entry.element));
  if (covered.size === 0) return [];
  return huntPool
    .map((monster) => ({ advantages: deckAdvantages(effectiveEquipment(equipment, monster).length), monster }))
    .filter((entry) => entry.advantages > 0)
    .sort((a, b) => b.advantages - a.advantages || a.monster.name.localeCompare(b.monster.name));
}

export const requiredComposition = (equipment: EquipmentIds): DeckComposition | null =>
  (equipment.weaponId ? weaponById(equipment.weaponId)?.deckComposition : null) ?? null;

export function validateDeck(deckCardIds: readonly string[], context: DeckContext): DeckReport {
  const cards = new Map(hunterCards(context.hunter).map((card) => [card.id, card]));
  const issues: DeckIssue[] = [];
  const selected = emptyComposition();
  const seen = new Set<string>();
  for (const cardId of deckCardIds) {
    const card = cards.get(cardId);
    const type = card ? deckTypeOf(card) : null;
    if (!card || !type) issues.push({ cardId, code: 'card-unknown' });
    else if (!context.availableCardIds.has(cardId)) issues.push({ cardId, code: 'card-unavailable' });
    else if (seen.has(cardId)) issues.push({ cardId, code: 'card-duplicate' });
    if (type) selected[type] += 1;
    seen.add(cardId);
  }

  const effective = effectiveEquipment(context.equipment, context.monster).length;
  // Without a target the budget is the best hunt the equipment could serve: never a sum across
  // elements, which would promise advantages no single monster can pay for.
  const advantages = context.monster
    ? deckAdvantages(effective)
    : (huntMatchups(context.equipment, context.huntPool)[0]?.advantages ?? 0);
  const required = requiredComposition(context.equipment);
  const composition: DeckIssue[] = [];
  let advantagesUsed = 0;
  if (!required) issues.push({ code: 'no-weapon' });
  else {
    for (const type of DECK_TYPES) {
      const delta = Math.abs(selected[type] - required[type]);
      if (delta) composition.push({ code: 'composition', required: required[type], selected: selected[type], type });
      advantagesUsed += delta;
    }
    // Per-type deltas are only a problem once they exceed the advantages the equipment grants.
    if (advantagesUsed > advantages) {
      issues.push(...composition, { allowed: advantages, code: 'advantages-exceeded', used: advantagesUsed });
    }
  }

  return {
    advantages,
    advantagesUsed,
    effectiveEquipment: effective,
    issues,
    required,
    selected,
    size: deckCardIds.length,
    valid: issues.length === 0,
  };
}

/**
 * Trims a deck to the printed composition and fills gaps from the available pool in catalog order.
 * Cards already in the deck are kept first, so re-fitting after a weapon change preserves choices.
 */
export function fitDeck(deckCardIds: readonly string[], context: DeckContext): string[] {
  const required = requiredComposition(context.equipment);
  if (!required) return [];
  const pool = hunterCards(context.hunter).filter(
    (card) => deckTypeOf(card) !== null && context.availableCardIds.has(card.id),
  );
  const chosen = new Set(deckCardIds);
  return DECK_TYPES.flatMap((type) => {
    const typed = pool.filter((card) => deckTypeOf(card) === type);
    const kept = typed.filter((card) => chosen.has(card.id));
    const rest = typed.filter((card) => !chosen.has(card.id));
    return [...kept, ...rest].slice(0, required[type]).map((card) => card.id);
  });
}

// ---------------------------------------------------------------------------
// Contexts
// ---------------------------------------------------------------------------

const actionCardIds = (cards: readonly HunterCard[]): Set<string> =>
  new Set(cards.filter((card) => deckTypeOf(card) !== null).map((card) => card.id));

const masteryCardIds = (cards: readonly HunterCard[]): Set<string> =>
  new Set(cards.filter((card) => card.kind === 'mastery').map((card) => card.id));

/** Starter action cards plus every action card the hunter's unlocked branch steps add. */
export const campaignCardPool = (member: SkillProgress, hunter: Hunter): Set<string> =>
  actionCardIds([...starterCards(hunter), ...unlockedCards(member, hunter)]);

/** The starter mastery plus every mastery an unlocked branch-2 step adds: what a campaign hunter may play. */
export const campaignMasteryPool = (member: SkillProgress, hunter: Hunter): Set<string> =>
  masteryCardIds(
    [starterMastery(hunter), ...unlockedCards(member, hunter)].filter((card): card is HunterCard => !!card),
  );

/** Reward-card items assigned to this hunter: an earned copy belongs to its hunter alone. */
export function rewardEquipmentFor(campaign: Campaign, hunterId: string): ForgeEquipment[] {
  const member = campaign.hunters.find((hunter) => hunter.hunterId === hunterId);
  return (member?.rewardEquipmentIds ?? []).flatMap((id) => {
    const piece = forgeEquipment.find((entry) => entry.id === id);
    return piece ? [piece] : [];
  });
}

/** The campaign pool for one hunter: crafted pieces plus assigned reward items. */
export function campaignEquipmentPool(campaign: Campaign, member: CampaignHunter): ForgeEquipment[] {
  return [
    ...forgeEquipment.filter((piece) => member.craftedEquipmentIds.includes(piece.id)),
    ...rewardEquipmentFor(campaign, member.hunterId),
  ];
}

export function campaignDeckContext(campaign: Campaign, member: CampaignHunter, hunter: Hunter): DeckContext {
  return {
    availableCardIds: campaignCardPool(member, hunter),
    availableEquipmentIds: new Set(campaignEquipmentPool(campaign, member).map((piece) => piece.id)),
    availableMasteryIds: campaignMasteryPool(member, hunter),
    availablePotionIds: new Set(member.potionInventoryIds),
    equipment: member.equipment,
    hunter,
    huntPool: enabledContent(monsters, campaign.expansionIds),
    monster: carrierMonster(campaign) ?? null,
  };
}

/** Every piece the hunter's class may wear from the enabled boxes: the sandbox pool for expeditions and saved builds.
 *  The Awakened-set legendaries join the pool only while the hunt target is The Awakened. */
export const eligibleEquipment = (
  expansionIds: readonly ExpansionId[],
  hunter: Hunter,
  huntTarget?: Monster | null,
): ForgeEquipment[] =>
  enabledContent(forgeEquipment, expansionIds).filter(
    (piece) =>
      (piece.type !== 'weapon' || piece.classRestriction === hunter.classId) &&
      (piece.type === 'item' || !piece.awakenedOnly || huntTarget?.id === 'the-awakened'),
  );

const sandboxContext = (
  expansionIds: readonly ExpansionId[],
  build: HunterBuild,
  hunter: Hunter,
  monster?: Monster | null,
): DeckContext => ({
  availableCardIds: actionCardIds(hunterCards(hunter)),
  availableEquipmentIds: new Set(eligibleEquipment(expansionIds, hunter, monster).map((piece) => piece.id)),
  availableMasteryIds: masteryCardIds(masteryCards(hunter)),
  availablePotionIds: new Set(enabledContent(potions, expansionIds).map((potion) => potion.id)),
  equipment: build.equipment,
  hunter,
  huntPool: enabledContent(monsters, expansionIds),
  monster: monster ?? null,
});

export function expeditionDeckContext(expedition: Expedition, member: ExpeditionHunter, hunter: Hunter): DeckContext {
  const monster = carrierMonster(expedition) ?? null;
  const context = { ...sandboxContext(expedition.expansionIds, member, hunter, monster), monster };
  // A trial card can forbid an element outright: those pieces leave the wearable pool.
  const hunt = trialHuntForScenario(expedition.scenarioId);
  if (hunt && hunt.forbiddenElementIds.length > 0) {
    const forbidden = new Set(hunt.forbiddenElementIds);
    context.availableEquipmentIds = new Set(
      [...context.availableEquipmentIds].filter((id) => {
        const piece = forgeById(id);
        return !piece || piece.element === null || !forbidden.has(piece.element);
      }),
    );
  }
  return context;
}

/**
 * What an ascent chapter lets a hunter wear: class-eligible pieces at the chapter's level, plus any
 * piece whose family has no card at that level: the basic weapons and base armor keep serving.
 */
export function ascentEquipmentPool(
  expansionIds: readonly ExpansionId[],
  hunter: Hunter,
  chapter: number,
): ForgeEquipment[] {
  const eligible = eligibleEquipment(expansionIds, hunter);
  return eligible.filter(
    (piece) =>
      piece.level === chapter ||
      (piece.level < chapter &&
        !eligible.some((other) => other.familyId === piece.familyId && other.level === chapter)),
  );
}

/** Potions brewed at the chapter's level: the ascent forages fresh stock each chapter. */
export const ascentPotionPool = (expansionIds: readonly ExpansionId[], chapter: number): Potion[] =>
  enabledContent(potions, expansionIds).filter((potion) => potion.level === chapter);

export function ascentDeckContext(ascent: Ascent, member: AscentHunter, hunter: Hunter): DeckContext {
  return {
    availableCardIds: campaignCardPool(member, hunter),
    availableEquipmentIds: new Set(ascentEquipmentPool(ascent.expansionIds, hunter, ascent.chapter).map((p) => p.id)),
    availableMasteryIds: campaignMasteryPool(member, hunter),
    availablePotionIds: new Set(ascentPotionPool(ascent.expansionIds, ascent.chapter).map((potion) => potion.id)),
    equipment: member.equipment,
    hunter,
    huntPool: enabledContent(monsters, ascent.expansionIds),
    monster: carrierMonster(ascent) ?? null,
  };
}

/** What a Winds series' level lets a hunter wear: class-eligible pieces at or below the aggression. */
export function challengeEquipmentPool(
  expansionIds: readonly ExpansionId[],
  aggression: number,
  hunter: Hunter,
): ForgeEquipment[] {
  // A Winds series allows only what its sheet drafts and its rewards grant: the base starting
  // gear (and the reward-only legendaries) carry no cost and stay out of the pool.
  return eligibleEquipment(expansionIds, hunter).filter((piece) => piece.level <= aggression && piece.cost !== null);
}

/** The potions a Winds series' level offers: the reward phase's three-slot refill. */
export function challengePotionPool(expansionIds: readonly ExpansionId[], aggression: number): Potion[] {
  return enabledContent(potions, expansionIds).filter((potion) => potion.level === aggression);
}

export function challengeDeckContext(run: Challenge, member: ChallengeHunter, hunter: Hunter): DeckContext {
  return {
    availableCardIds: campaignCardPool(member, hunter),
    availableEquipmentIds: new Set(challengeEquipmentPool(run.expansionIds, run.aggression, hunter).map((p) => p.id)),
    availableMasteryIds: campaignMasteryPool(member, hunter),
    availablePotionIds: new Set(challengePotionPool(run.expansionIds, run.aggression).map((potion) => potion.id)),
    equipment: member.equipment,
    hunter,
    huntPool: enabledContent(monsters, run.expansionIds),
    monster: carrierMonster(run) ?? null,
  };
}

/** Validates one party against its kind's deck contexts. */
function partyDeckStatus<S extends HuntSubject>(
  subject: S,
  context: (subject: S, member: S['hunters'][number], hunter: Hunter) => DeckContext,
): Record<string, boolean> {
  const status: Record<string, boolean> = {};
  for (const member of subject.hunters) {
    const hunter = hunterById(member.hunterId);
    if (hunter) status[member.hunterId] = validateDeck(member.deckCardIds, context(subject, member, hunter)).valid;
  }
  return status;
}

/**
 * Every party hunter's saved-deck validity, keyed by hunter id: what a roster marks
 * "not legal". Like `setSubjectDeck`, the kind dispatch lives in the domain, so no view
 * re-derives the four deck contexts. The saved build is what's measured: staged edits on
 * the deck page validate through their own draft context.
 */
export function subjectHuntersDeckStatus(subject: HuntSubject): Record<string, boolean> {
  if (isCampaignSubject(subject)) return partyDeckStatus(subject, campaignDeckContext);
  if (isAscentSubject(subject)) return partyDeckStatus(subject, ascentDeckContext);
  if (isChallengeSubject(subject)) return partyDeckStatus(subject, challengeDeckContext);
  return partyDeckStatus(subject, expeditionDeckContext);
}

/** Saved builds are edited against the owned boxes with no hunt target. */
export const loadoutDeckContext = (
  expansionIds: readonly ExpansionId[],
  build: HunterBuild,
  hunter: Hunter,
): DeckContext => sandboxContext(expansionIds, build, hunter);

/**
 * Wears a piece from the context's pool (or clears the slot). A new weapon prints a new composition, so the
 * deck is refitted to keep the stored build legal while preserving the cards that still fit.
 */
export function wearEquipment<T extends HunterBuild>(
  build: T,
  slot: EquipmentSlot,
  equipmentId: string | null,
  context: DeckContext,
): T {
  if (equipmentId) {
    const piece = forgeById(equipmentId);
    if (!piece || !context.availableEquipmentIds.has(equipmentId)) {
      throw new PrimalDomainError('equipment-restricted', 'That hunter cannot equip this card.');
    }
    if (piece.type !== slot) {
      throw new PrimalDomainError('equipment-invalid', 'That card does not fit this equipment slot.');
    }
  }
  const equipment = { ...build.equipment, [`${slot}Id`]: equipmentId };
  if (slot !== 'weapon') return { ...build, equipment };
  return { ...build, deckCardIds: fitDeck(build.deckCardIds, { ...context, equipment }), equipment };
}

/** The class's basic weapon plus base armor and helm: what every hunter starts a hunt with. */
export function baseEquipment(hunter: Hunter): EquipmentIds {
  const weapon = forgeEquipment.find(
    (piece) =>
      piece.type === 'weapon' && piece.level === 1 && piece.cost === null && piece.classRestriction === hunter.classId,
  );
  return {
    armorId: 'forge-anyone-base-armor-l1',
    helmId: 'forge-anyone-base-helm-l1',
    itemId: null,
    weaponId: weapon?.id ?? null,
  };
}

/** The mastery a new build plays: the hunter's starter mastery, before any branch-2 upgrade. */
export function starterMasteryId(hunter: Hunter): string {
  const mastery = starterMastery(hunter);
  if (!mastery) throw new PrimalDomainError('loadout-invalid', `No starter mastery is catalogued for ${hunter.id}.`);
  return mastery.id;
}

// ---------------------------------------------------------------------------
// Loadouts against a context
// ---------------------------------------------------------------------------

export interface BuildAvailability {
  available: boolean;
  missingCardIds: string[];
  missingEquipmentIds: string[];
  missingPotionIds: string[];
}

/** Which pieces of a build the context cannot supply: the reason a loadout cannot be applied. */
export function buildAvailability(build: BoardBuild, context: DeckContext): BuildAvailability {
  const missingEquipmentIds = wornEquipment(build.equipment)
    .map((piece) => piece.id)
    .filter((id) => !context.availableEquipmentIds.has(id));
  const missingCardIds = build.deckCardIds.filter((id) => !context.availableCardIds.has(id));
  if (!context.availableMasteryIds.has(build.masteryCardId)) missingCardIds.push(build.masteryCardId);
  const missingPotionIds = build.potionLoadoutIds.filter(
    (id): id is string => id !== null && !context.availablePotionIds.has(id),
  );
  return {
    available: !missingCardIds.length && !missingEquipmentIds.length && !missingPotionIds.length,
    missingCardIds,
    missingEquipmentIds,
    missingPotionIds,
  };
}

const sortedIds = (ids: readonly string[]) => [...ids].sort().join('\n');

/** Two builds match when they wear the same pieces, slot the same potions, play the same mastery and hold the same cards in any order. */
export const sameBuild = (left: BoardBuild, right: BoardBuild): boolean =>
  EQUIPMENT_SLOTS.every((slot) => left.equipment[`${slot}Id`] === right.equipment[`${slot}Id`]) &&
  left.potionLoadoutIds.every((id, index) => id === right.potionLoadoutIds[index]) &&
  left.masteryCardId === right.masteryCardId &&
  sortedIds(left.deckCardIds) === sortedIds(right.deckCardIds);
