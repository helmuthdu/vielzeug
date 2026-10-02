import { hunterById, potions, trialHuntForScenario } from '../content';
import {
  ascentDeckContext,
  ascentPotionPool,
  buildAvailability,
  campaignDeckContext,
  challengeDeckContext,
  challengePotionPool,
  type DeckContext,
  expeditionDeckContext,
  validateDeck,
  wearEquipment,
} from './deck';
import { PrimalDomainError } from './errors';
import { validateExpedition } from './expedition';
import { consumePotion, setPotionSlot } from './potion';
import type {
  AppliedBuild,
  Ascent,
  AscentHunter,
  Campaign,
  CampaignHunter,
  Challenge,
  ChallengeHunter,
  EquipmentSlot,
  Expedition,
  ExpeditionHunter,
  Hunter,
  HuntSubject,
  PotionSlot,
  SkillBranchId,
  SubjectHunter,
} from './types';
import { isAscentSubject, isCampaignSubject, isChallengeSubject } from './types';

/**
 * The hunter-build operations every run mode shares: deck, mastery, equipment, potion slots,
 * saved loadouts, and card-pool upgrades. The modes differ only in which pool is legal for a
 * hunter, so each rule is written once against a per-mode carrier: the deck-context factory,
 * the finished-run guard, and the potion pool, and the exported operations dispatch on the
 * subject's kind. The store calls them with a `HuntSubject` directly, so board edits take one
 * code path for all three modes and a rule change lands in exactly one place.
 */

/** The progression fields of the modes that spend card-pool upgrade points. */
interface SkillMember extends SubjectHunter {
  skillPoints: number;
  skillTree: Record<SkillBranchId, 0 | 1 | 2>;
}

/** A subject the shared build operations can act on. */
interface BuildSubject<M extends SubjectHunter> {
  hunters: readonly M[];
  updatedAt: string;
}

/** Everything mode-specific about the shared build operations. */
interface BuildCarrier<S extends BuildSubject<M>, M extends SubjectHunter> {
  /** The per-hunter legality context: also the equipment, mastery, deck, and loadout pool. */
  context: (subject: S, member: M, hunter: Hunter) => DeckContext;
  /** Runs before every mutation: the mode's finished-run guard. */
  guard: (subject: S) => void;
  /** Caps how many potion slots may be filled at once; absent means all three. */
  maxPotionSlots?: (subject: S) => number;
  /** The player-facing message when a potion is outside the mode's pool. */
  potionMessage: string;
  /** Whether this subject offers the potion to this hunter. */
  potionOffered: (subject: S, member: M, potionId: string) => boolean;
  /** Writes one hunter's member record back, keeping the mode's own bookkeeping. */
  replace: (subject: S, hunterId: string, member: M, now: string) => S;
}

/** A carrier for a mode whose hunters spend card-pool upgrade points. */
interface SkillCarrier<S extends BuildSubject<M>, M extends SkillMember> extends BuildCarrier<S, M> {
  /** The player-facing message when a hunter has no upgrade point left. */
  skillMessage: string;
}

/** The one shape every operation needs: guard, resolve the hunter, update, write back. */
function updateMember<S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  carrier: BuildCarrier<S, M>,
  now: string,
  update: (member: M, hunter: Hunter) => M,
): S {
  carrier.guard(subject);
  const member = subject.hunters.find((entry) => entry.hunterId === hunterId);
  const hunter = hunterById(hunterId);
  if (!member || !hunter) {
    throw new PrimalDomainError('hunter-not-found', `Hunter "${hunterId}" is not in this party.`);
  }
  return carrier.replace(subject, hunterId, update(member, hunter), now);
}

/** Replaces the action deck. Cards must be unique and in the hunter's pool; the composition is reported, not enforced. */
function replaceDeck<S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  deckCardIds: string[],
  now: string,
  carrier: BuildCarrier<S, M>,
): S {
  return updateMember(subject, hunterId, carrier, now, (member, hunter) => {
    const report = validateDeck(deckCardIds, carrier.context(subject, member, hunter));
    const structural = report.issues.find((issue) => 'cardId' in issue);
    if (structural) {
      throw new PrimalDomainError('deck-invalid', `Card "${structural.cardId}" is not available to this hunter.`);
    }
    return { ...member, deckCardIds: [...deckCardIds] };
  });
}

/** Replaces the mastery card. It must be one this hunter has unlocked in this subject. */
function pickMastery<S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  masteryCardId: string,
  now: string,
  carrier: BuildCarrier<S, M>,
): S {
  return updateMember(subject, hunterId, carrier, now, (member, hunter) => {
    if (!carrier.context(subject, member, hunter).availableMasteryIds.has(masteryCardId)) {
      throw new PrimalDomainError('loadout-invalid', `Mastery "${masteryCardId}" is not available to this hunter.`);
    }
    return { ...member, masteryCardId };
  });
}

/**
 * Wears a piece from the subject's pool (or clears the slot). The pool is the whole gate: a
 * piece the hunter has not crafted or earned (campaign), that the chapter does not forage
 * (ascent), or that sits outside the enabled boxes (expedition) is simply not in the hunter's
 * context. A new weapon prints a new composition, so the deck is refitted to stay legal.
 */
function wearPiece<S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  slot: EquipmentSlot,
  equipmentId: string | null,
  now: string,
  carrier: BuildCarrier<S, M>,
): S {
  return updateMember(subject, hunterId, carrier, now, (member, hunter) =>
    wearEquipment(member, slot, equipmentId, carrier.context(subject, member, hunter)),
  );
}

/** Slots a potion this subject offers into a hunt slot. */
function slotPotion<S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  slot: PotionSlot,
  potionId: string | null,
  now: string,
  carrier: BuildCarrier<S, M>,
): S {
  return updateMember(subject, hunterId, carrier, now, (member) => {
    if (potionId && !carrier.potionOffered(subject, member, potionId)) {
      throw new PrimalDomainError('potion-loadout', carrier.potionMessage);
    }
    // A mode (a trial card) can cap how many slots the party may fill.
    const limit = carrier.maxPotionSlots?.(subject);
    if (potionId && limit !== undefined && member.potionLoadoutIds[slot] === null) {
      const filled = member.potionLoadoutIds.filter((id) => id !== null).length;
      if (filled >= limit) {
        throw new PrimalDomainError('potion-loadout', `This hunt allows at most ${limit} equipped potions.`);
      }
    }
    return { ...member, potionLoadoutIds: setPotionSlot(member.potionLoadoutIds, slot, potionId) };
  });
}

/** Marks a loadout potion consumed for this hunt. */
function drinkPotion<S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  potionId: string,
  now: string,
  carrier: BuildCarrier<S, M>,
): S {
  return updateMember(subject, hunterId, carrier, now, (member) => consumePotion(member, potionId));
}

/** Wears a saved loadout: every piece must be available in this subject. */
function wearLoadout<S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  loadout: AppliedBuild,
  now: string,
  carrier: BuildCarrier<S, M>,
): S {
  if (loadout.hunterId !== hunterId) {
    throw new PrimalDomainError('loadout-invalid', 'That loadout belongs to a different hunter.');
  }
  return updateMember(subject, hunterId, carrier, now, (member, hunter) => {
    if (!buildAvailability(loadout, carrier.context(subject, member, hunter)).available) {
      throw new PrimalDomainError(
        'loadout-unavailable',
        'That build uses equipment, cards or potions this hunter has not unlocked in this run.',
      );
    }
    return {
      ...member,
      deckCardIds: [...loadout.deckCardIds],
      equipment: { ...loadout.equipment },
      masteryCardId: loadout.masteryCardId,
      potionLoadoutIds: [...loadout.potionLoadoutIds],
    };
  });
}

/** Unlocks one card-pool upgrade step on a branch, spending one point. */
function chooseUpgrade<S extends BuildSubject<M>, M extends SkillMember>(
  subject: S,
  hunterId: string,
  branchId: SkillBranchId,
  now: string,
  carrier: SkillCarrier<S, M>,
): S {
  return updateMember(subject, hunterId, carrier, now, (member) => {
    const current = member.skillTree[branchId];
    if (current >= 2) throw new PrimalDomainError('skill-invalid', 'That branch is already fully upgraded.');
    if (member.skillPoints < 1) throw new PrimalDomainError('skill-points', carrier.skillMessage);
    return {
      ...member,
      skillPoints: member.skillPoints - 1,
      skillTree: { ...member.skillTree, [branchId]: (current + 1) as 1 | 2 },
    };
  });
}

// ---------------------------------------------------------------------------
// Mode carriers: each mode is its context factory, guard, and potion pool.
// ---------------------------------------------------------------------------

const partyReplace = <S extends BuildSubject<M>, M extends SubjectHunter>(
  subject: S,
  hunterId: string,
  member: M,
  now: string,
): S => ({
  ...subject,
  hunters: subject.hunters.map((entry) => (entry.hunterId === hunterId ? member : entry)),
  updatedAt: now,
});

/** Campaigns gate gear through the Forge and the Herbalist: a hunter wears what it crafted or earned. */
const campaignCarrier: SkillCarrier<Campaign, CampaignHunter> = {
  context: campaignDeckContext,
  guard: () => {},
  potionMessage: 'Prepare that potion before adding it to the loadout.',
  potionOffered: (_campaign, member, potionId) => member.potionInventoryIds.includes(potionId),
  replace: partyReplace,
  skillMessage: 'That hunter has no card-pool upgrade to choose.',
};

/** Ascents forage fresh gear and potions at the current chapter's level. */
const ascentCarrier: SkillCarrier<Ascent, AscentHunter> = {
  context: ascentDeckContext,
  guard: (ascent) => {
    if (ascent.status === 'finished') throw new PrimalDomainError('run-finished', 'This run has already ended.');
  },
  potionMessage: 'That potion is not brewed at this chapter level.',
  potionOffered: (ascent, _member, potionId) =>
    ascentPotionPool(ascent.expansionIds, ascent.chapter).some((potion) => potion.id === potionId),
  replace: partyReplace,
  skillMessage: 'That hunter has no upgrade to choose.',
};

/** Challenges wear what their aggression level allows; potions refill per level. */
const challengeCarrier: SkillCarrier<Challenge, ChallengeHunter> = {
  context: challengeDeckContext,
  guard: (run) => {
    if (run.status === 'finished') {
      throw new PrimalDomainError('run-finished', 'This run has already ended.');
    }
  },
  potionMessage: 'That potion is not brewed at this aggression level.',
  potionOffered: (run, _member, potionId) =>
    challengePotionPool(run.expansionIds, run.aggression).some((potion) => potion.id === potionId),
  replace: partyReplace,
  skillMessage: 'That hunter has no card-pool upgrade to choose.',
};

/** Expeditions unlock every card in the enabled boxes and re-check readiness after each edit. */
const expeditionCarrier: BuildCarrier<Expedition, ExpeditionHunter> = {
  context: expeditionDeckContext,
  guard: (expedition) => {
    if (expedition.status === 'played') {
      throw new PrimalDomainError('expedition-finished', 'The result is already recorded for this expedition.');
    }
  },
  // A trial card can ration the potion slots (#9 caps the party at two).
  maxPotionSlots: (expedition) => trialHuntForScenario(expedition.scenarioId)?.maxPotionSlots ?? 3,
  potionMessage: 'That potion is not in the enabled boxes.',
  potionOffered: (expedition, _member, potionId) =>
    potions.some((potion) => potion.id === potionId && expedition.expansionIds.includes(potion.expansionId)),
  replace: (subject, hunterId, member, now) => {
    const next = partyReplace(subject, hunterId, member, now);
    return { ...next, status: validateExpedition(next).length === 0 ? 'ready' : 'draft' };
  },
};

// ---------------------------------------------------------------------------
// Kind dispatch: each operation picks its carrier from the subject's discriminator.
// ---------------------------------------------------------------------------

/** Replaces the action deck of a subject's hunter. */
export function setSubjectDeck(
  subject: HuntSubject,
  hunterId: string,
  deckCardIds: string[],
  now: string,
): HuntSubject {
  if (isCampaignSubject(subject)) return replaceDeck(subject, hunterId, deckCardIds, now, campaignCarrier);
  if (isAscentSubject(subject)) return replaceDeck(subject, hunterId, deckCardIds, now, ascentCarrier);
  if (isChallengeSubject(subject)) return replaceDeck(subject, hunterId, deckCardIds, now, challengeCarrier);
  return replaceDeck(subject, hunterId, deckCardIds, now, expeditionCarrier);
}

/** Replaces the mastery card of a subject's hunter. */
export function setSubjectMastery(
  subject: HuntSubject,
  hunterId: string,
  masteryCardId: string,
  now: string,
): HuntSubject {
  if (isCampaignSubject(subject)) return pickMastery(subject, hunterId, masteryCardId, now, campaignCarrier);
  if (isAscentSubject(subject)) return pickMastery(subject, hunterId, masteryCardId, now, ascentCarrier);
  if (isChallengeSubject(subject)) return pickMastery(subject, hunterId, masteryCardId, now, challengeCarrier);
  return pickMastery(subject, hunterId, masteryCardId, now, expeditionCarrier);
}

/** Wears a piece from the subject's pool (or clears the slot); a new weapon refits the deck. */
export function equipSubjectEquipment(
  subject: HuntSubject,
  hunterId: string,
  slot: EquipmentSlot,
  equipmentId: string | null,
  now: string,
): HuntSubject {
  if (isCampaignSubject(subject)) return wearPiece(subject, hunterId, slot, equipmentId, now, campaignCarrier);
  if (isAscentSubject(subject)) return wearPiece(subject, hunterId, slot, equipmentId, now, ascentCarrier);
  if (isChallengeSubject(subject)) return wearPiece(subject, hunterId, slot, equipmentId, now, challengeCarrier);
  return wearPiece(subject, hunterId, slot, equipmentId, now, expeditionCarrier);
}

/** Slots a potion this subject offers into a hunt slot. */
export function equipSubjectPotion(
  subject: HuntSubject,
  hunterId: string,
  slot: PotionSlot,
  potionId: string | null,
  now: string,
): HuntSubject {
  if (isCampaignSubject(subject)) return slotPotion(subject, hunterId, slot, potionId, now, campaignCarrier);
  if (isAscentSubject(subject)) return slotPotion(subject, hunterId, slot, potionId, now, ascentCarrier);
  if (isChallengeSubject(subject)) return slotPotion(subject, hunterId, slot, potionId, now, challengeCarrier);
  return slotPotion(subject, hunterId, slot, potionId, now, expeditionCarrier);
}

/** Marks a loadout potion consumed for this hunt. */
export function consumeSubjectPotion(
  subject: HuntSubject,
  hunterId: string,
  potionId: string,
  now: string,
): HuntSubject {
  if (isCampaignSubject(subject)) return drinkPotion(subject, hunterId, potionId, now, campaignCarrier);
  if (isAscentSubject(subject)) return drinkPotion(subject, hunterId, potionId, now, ascentCarrier);
  if (isChallengeSubject(subject)) return drinkPotion(subject, hunterId, potionId, now, challengeCarrier);
  return drinkPotion(subject, hunterId, potionId, now, expeditionCarrier);
}

/** Wears a saved loadout; every piece must be available in this subject. */
export function applySubjectLoadout(
  subject: HuntSubject,
  hunterId: string,
  loadout: AppliedBuild,
  now: string,
): HuntSubject {
  if (isCampaignSubject(subject)) return wearLoadout(subject, hunterId, loadout, now, campaignCarrier);
  if (isAscentSubject(subject)) return wearLoadout(subject, hunterId, loadout, now, ascentCarrier);
  if (isChallengeSubject(subject)) return wearLoadout(subject, hunterId, loadout, now, challengeCarrier);
  return wearLoadout(subject, hunterId, loadout, now, expeditionCarrier);
}

/** Unlocks one campaign skill step. */
export function unlockCampaignSkillStep(
  campaign: Campaign,
  hunterId: string,
  branchId: SkillBranchId,
  now: string,
): Campaign {
  return chooseUpgrade(campaign, hunterId, branchId, now, campaignCarrier);
}

/** Unlocks one ascent skill step. */
export function unlockAscentSkillStep(ascent: Ascent, hunterId: string, branchId: SkillBranchId, now: string): Ascent {
  return chooseUpgrade(ascent, hunterId, branchId, now, ascentCarrier);
}

/** Unlocks one challenge skill step: the reward phase's card-pool upgrade. */
export function unlockChallengeSkillStep(
  run: Challenge,
  hunterId: string,
  branchId: SkillBranchId,
  now: string,
): Challenge {
  return chooseUpgrade(run, hunterId, branchId, now, challengeCarrier);
}
