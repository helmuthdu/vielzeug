import { forgeById, hunterCardById, hunters, starterCards } from '../content';
import { baseEquipment, type DeckType, deckTypeOf, starterMasteryId } from './deck';
import type { ForgeEquipment, Hunter, HunterBuild, HunterCard, HunterStrengthAxis, HunterStrengths } from './types';

/**
 * Strength profiles. Every card and equipment piece carries raw signal points per axis, derived
 * from its printed data (subtype, stamina, damage, vitality) and the glossary effects its text
 * names. A build's raw signal
 * is the sum of its deck, mastery and worn pieces, and its profile scales that sum against the
 * roster's starter builds (see `buildProfile`). A hunter's printed profile is simply their starter
 * build's profile.
 */
export const STRENGTH_AXES: readonly HunterStrengthAxis[] = [
  'power',
  'defense',
  'mobility',
  'speed',
  'control',
  'support',
];

export type StrengthSignal = Record<HunterStrengthAxis, number>;

const emptySignal = (): StrengthSignal => ({ control: 0, defense: 0, mobility: 0, power: 0, speed: 0, support: 0 });

function addSignal(target: StrengthSignal, source: Readonly<Partial<StrengthSignal>>, weight = 1): StrengthSignal {
  for (const axis of STRENGTH_AXES) target[axis] += (source[axis] ?? 0) * weight;
  return target;
}

/** One effect the printed text can name: matched at most once per text, worth `points` on `axis`. */
interface TextRule {
  axis: HunterStrengthAxis;
  pattern: RegExp;
  /** Fixed points, or points read from the match (usually its printed magnitude). */
  points: number | ((match: RegExpMatchArray) => number);
}

const magnitude = (match: RegExpMatchArray): number => Number(match.slice(1).find((group) => group !== undefined) ?? 1);
const capped = (base: number, perUnit: number, cap: number) => (match: RegExpMatchArray) =>
  Math.min(cap, base + perUnit * magnitude(match));

const TEXT_RULES: readonly TextRule[] = [
  // Power: damage the hunter deals. Card multiples scale with the weapon level ([weapon]); item
  // numbers are flat damage, so they weigh less per point.
  {
    axis: 'power',
    pattern: /(\d+)\s*\[weapon\]\s*(?:additional\s+)?damage|damage[^.|]*?\bby\s+(\d+)\s*\[weapon\]/i,
    points: capped(0, 0.5, 3),
  },
  { axis: 'power', pattern: /damage[^.|]*?\bby\s+x\b|\bby x\s*\[weapon\]/i, points: 2 },
  {
    axis: 'power',
    pattern: /(?:gets|has) \+(\d+)(?:\s*\[weapon\])? damage|weapon (?:gets|has) \+(\d+)/i,
    points: capped(0, 0.4, 3),
  },
  { axis: 'power', pattern: /damage equal to your weapon level/i, points: 1.25 },
  { axis: 'power', pattern: /\bdeals? (?:your |their )?(?:base )?(?:weapon|wepaon) damage/i, points: 1.25 },
  {
    axis: 'power',
    pattern: /\bdeal (\d+) damage|increase (?:the|that) damage[^.|]*?by (\d+)(?!\s*\[)/i,
    points: capped(0.5, 0.1, 2.5),
  },
  { axis: 'power', pattern: /damage for each/i, points: 0.5 },
  { axis: 'power', pattern: /vulnerable/i, points: 1.5 },
  { axis: 'power', pattern: /battle dance|\bvolley\b|double (?:the|that) damage/i, points: 1.5 },
  { axis: 'power', pattern: /finisher/i, points: 1 },
  { axis: 'power', pattern: /berserker/i, points: 0.5 },
  { axis: 'power', pattern: /\bpierc/i, points: 1 },
  // A stun lets a player reveal up to two attack cards and deal weapon damage for each.
  { axis: 'power', pattern: /\bstun/i, points: 1 },
  // Defense: damage the hunter avoids or absorbs themself. Shielding another player is support,
  // and "if you avoid attrition damage" is a trigger, not protection.
  {
    axis: 'defense',
    pattern:
      /\byou(?: or another player[^.|]*)? would suffer[^.|]*prevent|when you would suffer[^|]*?prevent that damage|prevent[^.|]*damage you would suffer|ignore[^.|]*damage|reduce (?:the|any) damage you|damage you suffer by/i,
    points: 2,
  },
  { axis: 'defense', pattern: /(?<!player to gain a )defense token/i, points: 1.5 },
  {
    axis: 'defense',
    pattern: /for the attrition check|counts as \[(?:dodge|parry)/i,
    points: 1.5,
  },
  { axis: 'defense', pattern: /health value is increased by (\d+)/i, points: (match) => 0.25 * magnitude(match) },
  { axis: 'defense', pattern: /(?<!player (?:to|may) )\bheal\b/i, points: 1.5 },
  { axis: 'defense', pattern: /ko token|deplete token/i, points: 1.5 },
  { axis: 'defense', pattern: /resilience/i, points: 1 },
  { axis: 'defense', pattern: /stealth/i, points: 1 },
  // Mobility: repositioning around the monster.
  { axis: 'mobility', pattern: /\bmove\b|movement/i, points: 1.5 },
  { axis: 'mobility', pattern: /overrun|ignore the movement cost/i, points: 1.5 },
  { axis: 'mobility', pattern: /flank|rear sector|front sector|adjacent sector|exposed sector/i, points: 0.5 },
  { axis: 'mobility', pattern: /threatened/i, points: 0.5 },
  // Terrain immunity: free passage widens with every terrain the piece lists.
  {
    axis: 'mobility',
    pattern: /ignore the effects of ([^.|]+?) terrains?/i,
    points: (match) => 0.5 * (match[1] ?? '').split(/,|\band\b/).filter((name) => name.trim()).length,
  },
  // Speed: tempo — cards drawn, stamina saved, cards recovered.
  { axis: 'speed', pattern: /\bdraw (\d+)/i, points: capped(0.5, 0.5, 2.5) },
  { axis: 'speed', pattern: /\bdraw (?:x\b|cards equal|that many)|draw up to your hand size/i, points: 2 },
  { axis: 'speed', pattern: /berserker/i, points: 1.5 },
  {
    axis: 'speed',
    pattern:
      /reduce[^.|]*stamina cost|without paying[^.|]*stamina|stamina cost[^.|]*(?:to 0|reduced)|ignore the stamina cost|\bchain\b/i,
    points: 1.5,
  },
  { axis: 'speed', pattern: /stamina tokens?|generate[^.|]*stamina/i, points: 1 },
  { axis: 'speed', pattern: /recycle|reclaim/i, points: 1 },
  { axis: 'speed', pattern: /search your|to your hand\b|into your deck/i, points: 0.75 },
  { axis: 'speed', pattern: /hand size limit/i, points: 1 },
  { axis: 'speed', pattern: /look at the top|\breload\b|rhythm/i, points: 0.5 },
  // Control: the monster's behavior, struggle and facing.
  { axis: 'control', pattern: /\bstun/i, points: 2 },
  { axis: 'control', pattern: /confuse|turn the monster/i, points: 2 },
  { axis: 'control', pattern: /cancel the effects|prevent it\b/i, points: 2 },
  { axis: 'control', pattern: /\bblind/i, points: 1.5 },
  { axis: 'control', pattern: /\bslow/i, points: 1.5 },
  {
    axis: 'control',
    pattern: /remove (\d+) struggle|remove (?:all )?struggle|struggle[^.|]*removes?|struggle the monster gains/i,
    points: capped(1, 0.5, 2.5),
  },
  { axis: 'control', pattern: /behavior card|behavior deck|attrition deck/i, points: 0.75 },
  { axis: 'control', pattern: /vulnerable|taunt/i, points: 0.5 },
  // Support: what the hunter does for the rest of the party.
  {
    axis: 'support',
    pattern:
      /another player|other players?\b|choose a player|a player in|each player|all players|that player|players ignore|active player/i,
    points: 2,
  },
  { axis: 'support', pattern: /\bassist\b/i, points: 1.5 },
  { axis: 'support', pattern: /\bguard\b/i, points: 1.5 },
  // Taunt hands the active player a card and pulls the monster's aggro off them.
  { axis: 'support', pattern: /\btaunt\b/i, points: 1.5 },
  { axis: 'support', pattern: /would suffer[^.|]*prevent|by any source|player (?:to|may) heal/i, points: 1 },
  { axis: 'support', pattern: /\brevive\b|inspiration/i, points: 1 },
];

/** The raw signal of a printed effect text: every rule it matches, counted once. */
export function textSignal(text: string): StrengthSignal {
  const signal = emptySignal();
  for (const rule of TEXT_RULES) {
    const match = text.match(rule.pattern);
    if (match) signal[rule.axis] += typeof rule.points === 'number' ? rule.points : rule.points(match);
  }
  return signal;
}

/** The deck type a card fills: attacks hit, parries and dodges guard, maneuvers reposition.
 *  Keyed by the canonical `DeckType` and read through `deckTypeOf`, so strength and the deck
 *  rules share one card classification instead of two parallel subtype strings. */
const SUBTYPE_SIGNAL: Readonly<Partial<Record<DeckType, Partial<StrengthSignal>>>> = {
  attack: { power: 1 },
  dodge: { defense: 0.5, mobility: 0.5 },
  maneuver: { control: 0.5, mobility: 0.5 },
  parry: { defense: 1 },
};

/** Resonate resolves a Resonance card's effect twice when chained: weighed as half again. */
const RESONANCE_WEIGHT = 1.5;

/** A weapon's printed damage is its power signal: normal damage at full weight, and the
 *  piercing value — which only lands on a Pierce action — at a tenth, capped so a legendary
 *  50-pierce spear adds bounded power instead of dominating the axis. */
const NORMAL_DAMAGE_WEIGHT = 0.75;
const PIERCING_WEIGHT = 0.1;
const PIERCING_CAP = 3;

/**
 * A mastery's unfocused face charges it: each leading "When …," / "At the end of …," clause names
 * what places a counter, not what the card does, so only the effects after it score.
 */
const chargeEffects = (text: string) => text.replace(/(^|[.|]\s*)\*?(?:when|at the (?:end|start) of)[^,]*,\s*/gi, '$1');

/** A card's raw signal: its deck type, its stamina economy and every effect its faces print. */
export function cardSignal(card: HunterCard): StrengthSignal {
  const faces = [card.text, card.unfocused && chargeEffects(card.unfocused.text), card.focused?.text];
  const effects = textSignal(faces.filter(Boolean).join(' | '));
  const signal = addSignal(emptySignal(), effects, card.trait === 'Resonance' ? RESONANCE_WEIGHT : 1);
  const deckType = deckTypeOf(card);
  if (deckType) addSignal(signal, SUBTYPE_SIGNAL[deckType] ?? {});
  if (card.staminaIcons !== null && card.staminaIcons > 1) signal.speed += 0.5 * (card.staminaIcons - 1);
  if (card.staminaCost === 0) signal.speed += 0.25;
  // Aggro symbols pull the monster's attention onto this hunter and off the party.
  if (card.aggro) signal.support += 0.25;
  return signal;
}

/** A piece's raw signal: weapon damage feeds power, worn vitality feeds defense, its text the rest. */
export function equipmentSignal(piece: ForgeEquipment): StrengthSignal {
  const signal = textSignal(piece.description);
  if (piece.type === 'weapon' && piece.damage !== null) {
    signal.power +=
      typeof piece.damage === 'number'
        ? NORMAL_DAMAGE_WEIGHT * piece.damage
        : NORMAL_DAMAGE_WEIGHT * piece.damage[0] + Math.min(PIERCING_CAP, PIERCING_WEIGHT * piece.damage[1]);
  }
  if ((piece.type === 'armor' || piece.type === 'helm') && piece.health !== null) signal.defense += 0.25 * piece.health;
  return signal;
}

/** The raw signal of a whole build: deck cards, the mastery and every worn piece, summed. */
function buildSignal(build: HunterBuild, hunter: Hunter): StrengthSignal {
  const signal = emptySignal();
  for (const id of [...build.deckCardIds, build.masteryCardId]) {
    const card = hunterCardById(hunter, id);
    if (card) addSignal(signal, cardSignal(card));
  }
  for (const id of Object.values(build.equipment)) {
    const piece = id === null ? undefined : forgeById(id);
    if (piece) addSignal(signal, equipmentSignal(piece));
  }
  return signal;
}

/** The build every hunter starts from: the printed starter deck, starter mastery and base gear. */
export const starterBuild = (hunter: Hunter): HunterBuild => ({
  deckCardIds: starterCards(hunter)
    .filter((card) => card.kind === 'action')
    .map((card) => card.id),
  equipment: baseEquipment(hunter),
  masteryCardId: starterMasteryId(hunter),
});

/** Per axis, the weakest and strongest starter builds' raw signal: the roster's reference span.
 *  Content is static, so the span is computed once at load — no lazy cache to invalidate. */
const STARTER_REFERENCE: { max: StrengthSignal; min: StrengthSignal } = (() => {
  const signals = hunters.map((hunter) => buildSignal(starterBuild(hunter), hunter));
  const max = emptySignal();
  const min = emptySignal();
  for (const axis of STRENGTH_AXES) {
    max[axis] = Math.max(...signals.map((signal) => signal[axis]));
    min[axis] = Math.min(...signals.map((signal) => signal[axis]));
  }
  return { max, min };
})();

/** The weakest starter on an axis reads this; the strongest reads `STARTER_CEILING`. */
const STARTER_FLOOR = 1.5;
const STARTER_CEILING = 3.5;

/**
 * Profiles a build on the 1–5 scale shared by every hunter. The scale is anchored on the roster's
 * starter builds — the weakest reads 1.5, the strongest 3.5 — so stripped builds can fall to 1 and
 * upgraded ones can climb to 5.
 */
export function buildProfile(build: HunterBuild, hunter: Hunter): HunterStrengths {
  const signal = buildSignal(build, hunter);
  const { max, min } = STARTER_REFERENCE;
  const profile = emptySignal();
  for (const axis of STRENGTH_AXES) {
    const span = max[axis] - min[axis];
    const value =
      span > 0
        ? STARTER_FLOOR + ((STARTER_CEILING - STARTER_FLOOR) * (signal[axis] - min[axis])) / span
        : STARTER_FLOOR;
    profile[axis] = Math.round(Math.min(5, Math.max(1, value)) * 10) / 10;
  }
  return profile;
}

/** A hunter's printed profile: the profile of the build they start every game with. */
export const hunterProfile = (hunter: Hunter): HunterStrengths => buildProfile(starterBuild(hunter), hunter);
