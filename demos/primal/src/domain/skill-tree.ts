import { starterCards, stepCards } from '../content';
import type { Hunter, HunterCard, SkillBranchId, SkillStep } from './types';

/** The progression a skill-tree helper reads: a campaign or ascent hunter's unlocked steps and unspent points. */
export interface SkillProgress {
  skillPoints: number;
  skillTree: Record<SkillBranchId, 0 | 1 | 2>;
}

/** A hunter's skill tree before any upgrade: every mode that tracks one starts here. */
export const emptySkillTree = (): Record<SkillBranchId, 0 | 1 | 2> => ({ A: 0, B: 0, C: 0, D: 0, E: 0 });

/**
 * Card-pool upgrades: the campaign grants one each time a chapter instructs "Each player upgrades their
 * card pool"; the player then picks a branch step while the party is preparing. `CampaignHunter.skillPoints`
 * persists the granted-but-unchosen count: this module is the only place that reads it by that name.
 */
export type SkillStepStatus = 'available' | 'locked' | 'unlocked';

/** Every hunter starts with the same 25-card deck; used when the catalog has no cards for the hunter. */
const STARTER_DECK_SIZE = 25;

export const pendingUpgrades = (hunter: SkillProgress): number => hunter.skillPoints;

export function stepStatus(
  hunter: SkillProgress,
  branch: SkillBranchId,
  step: SkillStep,
  canChoose: boolean,
): SkillStepStatus {
  const progress = hunter.skillTree[branch];
  if (progress >= step) return 'unlocked';
  if (canChoose && pendingUpgrades(hunter) > 0 && progress + 1 === step) return 'available';
  return 'locked';
}

/** The step a branch would move to on its next upgrade, or null when both steps are unlocked. */
export const nextStep = (hunter: SkillProgress, branch: SkillBranchId): SkillStep | null => {
  const progress = hunter.skillTree[branch];
  return progress >= 2 ? null : ((progress + 1) as SkillStep);
};

/** Upgrade cards the hunter has added so far, in branch then step order. */
export function unlockedCards(hunter: SkillProgress, content: Hunter): HunterCard[] {
  return content.skillTree.flatMap((branch) =>
    ([1, 2] as const)
      .filter((step) => hunter.skillTree[branch.id] >= step)
      .flatMap((step) => stepCards(content, branch.id, step)),
  );
}

/** Starter deck plus every unlocked upgrade card; counts stay rule-based when the catalog has no cards. */
export function cardPoolSize(hunter: SkillProgress, content: Hunter): number {
  const starter = starterCards(content).length || STARTER_DECK_SIZE;
  const upgrades = content.skillTree.reduce(
    (total, branch) =>
      total + branch.steps.slice(0, hunter.skillTree[branch.id]).reduce((sum, step) => sum + step.cardCount, 0),
    0,
  );
  return starter + upgrades;
}
