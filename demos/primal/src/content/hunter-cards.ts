import { type Infer, s } from '@vielzeug/spell';
import type { Hunter, HunterCard, SkillBranchId, SkillStep, SkillTreeBranch } from '../domain/types';
import daeronCards from './data/heroes/daeron.json';
import druskCards from './data/heroes/drusk.json';
import helerenCards from './data/heroes/heleren.json';
import karahCards from './data/heroes/karah.json';
import ljonarCards from './data/heroes/ljonar.json';
import mirahCards from './data/heroes/mirah.json';
import heroScanData from './data/heroes/scans.json';
import thoregCards from './data/heroes/thoreg.json';
import zarayaCards from './data/heroes/zaraya.json';

export const SKILL_BRANCH_IDS: readonly SkillBranchId[] = ['A', 'B', 'C', 'D', 'E'];
export const SKILL_STEPS: readonly SkillStep[] = [1, 2];

/** Cards a step adds by rule: step 1 adds two action cards, step 2 adds two action cards and the branch mastery. */
export const stepCardCount = (step: SkillStep): 2 | 3 => (step === 1 ? 2 : 3);

type StepCode = HunterCard['step'];
type HunterRef = Pick<Hunter, 'cardFolder' | 'id'>;

// Schemas are the single description of the hero data files' shapes: spell validates at load and
// Infer types the records without hand-maintained mirror interfaces.
const cardEntrySchema = s.object({
  aggro: s.boolean(),
  cardType: s.string(),
  faq: s.string().nullable().optional(),
  focused: s.object({ text: s.string() }).nullable().optional(),
  id: s.string(),
  name: s.string(),
  staminaCost: s.union(s.number(), s.literal('X'), s.null()),
  staminaIcons: s.number().nullable(),
  subtype: s.string().nullable(),
  text: s.string().nullable(),
  trait: s.string().nullable(),
  unfocused: s
    .object({ counters: s.number().int().min(0), text: s.string() })
    .nullable()
    .optional(),
});

const heroCardsSchema = s.record(
  s.string(),
  s.object({
    starter: s.array(cardEntrySchema),
    upgrades: s.record(s.string(), s.array(cardEntrySchema)),
  }),
);

const heroScansSchema = s.record(
  s.string(),
  s.object({
    art: s.string().nullable(),
    artFocused: s.string().nullable(),
  }),
);

const heroCards = heroCardsSchema.parse({
  daeron: daeronCards,
  drusk: druskCards,
  heleren: helerenCards,
  karah: karahCards,
  ljonar: ljonarCards,
  mirah: mirahCards,
  thoreg: thoregCards,
  zaraya: zarayaCards,
});
const scans = heroScansSchema.parse(heroScanData);

/** One catalog card entry as parsed from a hunter document. */
type CardEntry = Infer<typeof heroCardsSchema>[string]['starter'][number];

function toCard(entry: CardEntry, hunterId: string, step: StepCode): HunterCard {
  const scan = scans[entry.id] ?? { art: null, artFocused: null };
  return {
    aggro: entry.aggro,
    art: scan.art ? `/cards/${scan.art}` : null,
    artFocused: scan.artFocused ? `/cards/${scan.artFocused}` : null,
    cardType: entry.cardType,
    faq: entry.faq ?? null,
    focused: entry.focused ?? null,
    hunterId,
    id: entry.id,
    kind: entry.cardType === 'Mastery' ? 'mastery' : 'action',
    name: entry.name,
    staminaCost: entry.staminaCost,
    staminaIcons: entry.staminaIcons,
    step,
    subtype: entry.subtype,
    text: entry.text,
    trait: entry.trait,
    unfocused: entry.unfocused ?? null,
  };
}

function buildCards(hunter: HunterRef): HunterCard[] {
  const data = heroCards[hunter.id];
  if (!data) return [];
  const upgrades = SKILL_BRANCH_IDS.flatMap((branch) =>
    SKILL_STEPS.flatMap((step) => {
      const code = `${branch}${step}` as StepCode;
      return (data.upgrades[`${branch}${step}`] ?? []).map((entry) => toCard(entry, hunter.id, code));
    }),
  );
  return [...data.starter.map((entry) => toCard(entry, hunter.id, 'S')), ...upgrades];
}

const cardsByHunter = new Map<string, HunterCard[]>();

/** Every known card for a hunter: the catalog with its starter deck and upgrade card art. */
export function hunterCards(hunter: HunterRef): HunterCard[] {
  let cards = cardsByHunter.get(hunter.id);
  if (!cards) {
    cards = buildCards(hunter);
    cardsByHunter.set(hunter.id, cards);
  }
  return cards;
}

export const starterCards = (hunter: HunterRef): HunterCard[] =>
  hunterCards(hunter).filter((card) => card.step === 'S');

/** Every mastery card the hunter owns in the catalog, starter first then by branch. */
export const masteryCards = (hunter: HunterRef): HunterCard[] =>
  hunterCards(hunter).filter((card) => card.kind === 'mastery');

/** The mastery a hunter joins a hunt with: the starter deck's mastery, before any branch-2 upgrade. */
export const starterMastery = (hunter: HunterRef): HunterCard | undefined =>
  starterCards(hunter).find((card) => card.kind === 'mastery');

/** Cards a branch step adds, action cards first and the mastery last. */
export function stepCards(hunter: HunterRef, branch: SkillBranchId, step: SkillStep): HunterCard[] {
  const code: StepCode = `${branch}${step}`;
  return hunterCards(hunter)
    .filter((card) => card.step === code)
    .sort((left, right) => Number(left.kind === 'mastery') - Number(right.kind === 'mastery'));
}

export const hunterCardById = (hunter: HunterRef, cardId: string): HunterCard | undefined =>
  hunterCards(hunter).find((card) => card.id === cardId);

/** Derives the printed five-branch, two-step tree from the catalog; counts stay rule-based when cards are missing. */
export function buildSkillTree(hunter: HunterRef): SkillTreeBranch[] {
  return SKILL_BRANCH_IDS.map((branch) => ({
    id: branch,
    steps: [
      { cardCount: stepCardCount(1), cardIds: stepCards(hunter, branch, 1).map((card) => card.id) },
      { cardCount: stepCardCount(2), cardIds: stepCards(hunter, branch, 2).map((card) => card.id) },
    ],
  }));
}
