import { s } from '@vielzeug/spell';
import {
  campaignAggression,
  chapterByNumber,
  enabledContent,
  expansions,
  finalBattle,
  forgeById,
  forgeEquipment,
  hunterById,
  monsters,
  potionById,
  potions,
  questById,
  questId,
  quests,
  resources,
  rewardCardEquipment,
  rewardCardPotions,
  TOTAL_CHAPTERS,
  TRIAL_SCORE_LEVELS,
  type TrialRanking,
} from '../content';
import { type ChapterEvent, transitionPhase } from './chapter-machine';
import {
  baseEquipment,
  campaignCardPool,
  campaignDeckContext,
  campaignMasteryPool,
  type DeckReport,
  fitDeck,
  starterMasteryId,
  validateDeck,
} from './deck';
import { PrimalDomainError } from './errors';
import { appendHuntRecord } from './hunt-history';
import { idleHuntTimer, stopHuntTimer } from './hunt-timer';
import { syncHunterState } from './hunter-state';
import { idleMonsterState, setupMonsterState } from './monster-state';
import { assertParty } from './party';
import { emptyPotionLoadout, refillPotion } from './potion';
import { type QuestEvent, transitionQuest } from './quest-machine';
import { rankingFor, scoreRecord, scoreTotal, tier } from './trial-score';
import type {
  Campaign,
  CampaignCondition,
  CampaignConfig,
  CampaignHunter,
  CampaignQuestUnlockRule,
  CarriedItem,
  ElementId,
  ExpansionId,
  ForgeEquipment,
  Hunter,
  HuntResult,
  MaterialId,
  Note,
  Potion,
  Quest,
  QuestState,
  QuestStatus,
  RecipeCost,
  ResourceBundle,
  ResourceId,
  WeaponEquipment,
  WornEquipment,
} from './types';

const expansionIds = expansions.map((expansion) => expansion.id) as [ExpansionId, ...ExpansionId[]];

const suggestedNames = [
  'Crimson Forest',
  'Echoes of Thyrea',
  'Hunters of Alborea',
  'The Keeper’s Path',
  'Ashes of Woltyar',
  'The Verdant Shore',
];

export function suggestCampaignName(random = Math.random): string {
  return suggestedNames[Math.floor(random() * suggestedNames.length)] ?? 'Campaign';
}

/** Campaign configuration rules: validated before a campaign is created and re-usable by forms. */
export const campaignConfigSchema = s
  .object({
    expansionIds: s.array(s.enum(expansionIds)).unique(),
    name: s.string().trim().max(40, 'Keep the name under 40 characters.'),
    nightmareVariant: s.boolean(),
    variants: s.array(s.enum(['hunters-trial'] as const)).unique(),
  })
  .check((config, context) => {
    if (config.nightmareVariant && !config.expansionIds.includes('nightmare')) {
      context.addIssue({
        code: 'custom',
        message: 'Select the Nightmare Expansion to use the Nightmare variant.',
        path: ['nightmareVariant'],
      });
    }
  });

export function validateCampaignConfig(config: unknown): { fieldErrors: Record<string, string>; valid: boolean } {
  const result = campaignConfigSchema.safeParse(config);
  if (result.success) return { fieldErrors: {}, valid: true };
  const fieldErrors: Record<string, string> = {};
  for (const error of result.error.flatten().fieldErrors) {
    fieldErrors[String(error.path[0])] = error.messages[0] ?? 'Invalid value';
  }
  return { fieldErrors, valid: false };
}

export function createCampaignHunter(hunterId: string): CampaignHunter {
  const hunter = hunterById(hunterId);
  if (!hunter) throw new PrimalDomainError('party-unavailable', `Unknown hunter: ${hunterId}`);
  const equipment = baseEquipment(hunter);
  if (!equipment.weaponId) {
    throw new PrimalDomainError('equipment-invalid', `No basic weapon found for hunter: ${hunterId}`);
  }
  const craftedEquipmentIds = [equipment.weaponId, equipment.armorId, equipment.helmId].filter(
    (id): id is string => id !== null,
  );
  const member: Omit<CampaignHunter, 'deckCardIds'> = {
    consumedPotionIds: [],
    craftedEquipmentIds,
    equipment,
    hunterId,
    masteryCardId: starterMasteryId(hunter),
    notes: '',
    playerName: '',
    potionInventoryIds: [],
    potionLoadoutIds: emptyPotionLoadout(),
    resources: {},
    rewardEquipmentIds: [],
    rewardPotionIds: [],
    skillPoints: 0,
    skillTree: { A: 0, B: 0, C: 0, D: 0, E: 0 },
  };
  // The basic weapon asks for six cards of each type: exactly the starter deck.
  const deckCardIds = fitDeck([], {
    availableCardIds: campaignCardPool(member, hunter),
    availableEquipmentIds: new Set(craftedEquipmentIds),
    availableMasteryIds: campaignMasteryPool(member, hunter),
    availablePotionIds: new Set(),
    equipment,
    hunter,
    // No hunt target and no coverage on the basic kit: the pool never decides this budget.
    huntPool: monsters,
    monster: null,
  });
  return { ...member, deckCardIds };
}

/** Quests unlocked unconditionally by a chapter's rewards box for the enabled expansions. */
function chapterUnlocks(chapter: number, enabled: readonly ExpansionId[]): number[] {
  const content = chapterByNumber(chapter);
  if (!content) return [];
  return content.instructions
    .filter((instruction) => instruction.expansionId === null || enabled.includes(instruction.expansionId))
    .flatMap((instruction) => instruction.unlocks);
}

function chapterExpirations(chapter: number, enabled: readonly ExpansionId[]): number[] {
  const content = chapterByNumber(chapter);
  if (!content) return [];
  return content.instructions
    .filter((instruction) => instruction.expansionId === null || enabled.includes(instruction.expansionId))
    .flatMap((instruction) => instruction.expires);
}

function chapterHunterRewards(chapter: number, enabled: readonly ExpansionId[]): ResourceBundle {
  const rewards: ResourceBundle = {};
  for (const instruction of chapterByNumber(chapter)?.instructions ?? []) {
    if (instruction.expansionId && !enabled.includes(instruction.expansionId)) continue;
    for (const [id, amount] of Object.entries(instruction.resources)) {
      const resourceId = id as ResourceId;
      rewards[resourceId] = (rewards[resourceId] ?? 0) + amount;
    }
  }
  return rewards;
}

function matchesCondition(campaign: Campaign, condition: CampaignCondition): boolean {
  if (condition.minChapter && campaign.chapter < condition.minChapter) return false;
  if (condition.maxChapter && campaign.chapter > condition.maxChapter) return false;
  if (condition.allAchievements?.some((achievement) => !campaign.achievements.includes(achievement))) return false;
  if (condition.noAchievements?.some((achievement) => campaign.achievements.includes(achievement))) return false;
  if (condition.unlessAllAchievements?.every((achievement) => campaign.achievements.includes(achievement)))
    return false;
  if (condition.blockedByQuestIds?.some((id) => questStatus(campaign, id) !== 'locked')) return false;
  return true;
}

export function earnedSkillPointsThrough(campaign: Campaign, throughChapter: number): number {
  let total = 0;
  for (let chapter = 1; chapter <= throughChapter; chapter += 1) {
    const context = { ...campaign, chapter };
    for (const instruction of chapterByNumber(chapter)?.instructions ?? []) {
      if (instruction.expansionId && !campaign.expansionIds.includes(instruction.expansionId)) continue;
      if (matchesCondition(context, instruction.condition)) total += instruction.skillPoints;
    }
  }
  return total;
}

function matchesUnlockRule(campaign: Campaign, rule: CampaignQuestUnlockRule): boolean {
  const quest = questById(rule.questId);
  return matchesCondition(campaign, rule) && !!quest && campaign.expansionIds.includes(quest.expansionId);
}

function applyQuestUnlockRules(campaign: Campaign, rules: CampaignQuestUnlockRule[], now: string): Campaign {
  let next = campaign;
  for (const rule of rules) {
    if (matchesUnlockRule(next, rule) && questStatus(next, rule.questId) === 'locked') {
      next = unlockQuest(next, rule.questId, now);
    }
  }
  return next;
}

function questAchievements(campaign: Campaign, quest: Quest, trigger: 'expiration' | 'reward'): string[] {
  const automatic = quest.progressionEffects
    .filter(
      (effect) =>
        effect.trigger === trigger &&
        effect.automatic &&
        (!effect.expansionId || campaign.expansionIds.includes(effect.expansionId)),
    )
    .flatMap((effect) => effect.achievements);
  if (trigger === 'expiration') return automatic;
  return [
    ...automatic,
    ...quest.achievementRules.filter((rule) => matchesCondition(campaign, rule)).map((rule) => rule.achievement),
  ];
}

export interface CreateCampaignInput {
  config: CampaignConfig;
  hunterIds: string[];
  id: string;
  now: string;
}

/** Creates a campaign at the quest board with Chapter 1's reward box already applied. */
export function createCampaign({ config, hunterIds, id, now }: CreateCampaignInput): Campaign {
  const validation = campaignConfigSchema.safeParse(config);
  if (!validation.success) {
    throw new PrimalDomainError('config-invalid', validation.error.issues[0]?.message ?? 'Invalid campaign config.');
  }
  const enabled: ExpansionId[] = ['core', ...validation.data.expansionIds.filter((entry) => entry !== 'core')];
  assertParty(hunterIds, enabled);

  const questStates: QuestState[] = enabledContent(quests, enabled).map((quest) => ({
    chapter: 1,
    questId: quest.id,
    status: 'locked',
  }));

  const campaign: Campaign = {
    achievements: [],
    activeQuestId: null,
    chapter: 1,
    createdAt: now,
    defeats: 0,
    expansionIds: enabled,
    fightEvents: [],
    fightStart: null,
    finalBattleWon: false,
    forge: { level: 0, unlockedElementIds: [] },
    herbalist: { level: 0 },
    hunterState: syncHunterState(hunterIds, {}),
    hunters: hunterIds.map(createCampaignHunter),
    huntHistory: [],
    huntTimer: idleHuntTimer(),
    id,
    kind: 'campaign',
    monsterState: idleMonsterState(),
    name: validation.data.name || 'Campaign',
    nightmareVariant: validation.data.nightmareVariant,
    notes: [],
    phase: 'quest-board',
    quests: questStates,
    resolvedChapter: 0,
    rev: 0,
    scores: [],
    totalDefeats: 0,
    trophies: [],
    unassignedRewards: [],
    updatedAt: now,
    variants: validation.data.variants,
  };
  return resolveChapterRewards(campaign, now);
}

// ---------------------------------------------------------------------------
// Quests
// ---------------------------------------------------------------------------

export function questStatus(campaign: Campaign, questIdOrNumber: string | number): QuestStatus {
  const id = typeof questIdOrNumber === 'number' ? questId(questIdOrNumber) : questIdOrNumber;
  return campaign.quests.find((quest) => quest.questId === id)?.status ?? 'locked';
}

export function questsByStatus(campaign: Campaign, status: QuestStatus): Quest[] {
  return campaign.quests
    .filter((entry) => entry.status === status)
    .map((entry) => questById(entry.questId))
    .filter((quest): quest is Quest => quest !== undefined)
    .sort((a, b) => a.number - b.number);
}

export function questExpirationChapter(campaign: Campaign, questIdOrNumber: string | number): number | undefined {
  const id = typeof questIdOrNumber === 'number' ? questId(questIdOrNumber) : questIdOrNumber;
  const quest = questById(id);
  if (!quest) return undefined;
  for (let chapter = campaign.chapter + 1; chapter <= TOTAL_CHAPTERS; chapter += 1) {
    if (chapterExpirations(chapter, campaign.expansionIds).includes(quest.number)) return chapter;
  }
  return undefined;
}

function sendQuestEvent(campaign: Campaign, id: string, event: QuestEvent, now: string): Campaign {
  const current = campaign.quests.find((quest) => quest.questId === id);
  if (!current) throw new PrimalDomainError('quest-unknown', `Quest ${id} is not part of this campaign.`);
  const status = transitionQuest(current.status, event);
  return {
    ...campaign,
    quests: campaign.quests.map((quest) =>
      quest.questId === id ? { ...quest, chapter: campaign.chapter, status } : quest,
    ),
    updatedAt: now,
  };
}

export function unlockQuest(campaign: Campaign, id: string, now: string): Campaign {
  return sendQuestEvent(campaign, id, { type: 'UNLOCK' }, now);
}

/** Marks the chapter's quest: only one quest can be active per chapter. */
export function activateQuest(campaign: Campaign, id: string, now: string): Campaign {
  const cleared = campaign.activeQuestId
    ? sendQuestEvent(campaign, campaign.activeQuestId, { type: 'DEACTIVATE' }, now)
    : campaign;
  return { ...sendQuestEvent(cleared, id, { type: 'ACTIVATE' }, now), activeQuestId: id };
}

export function commitQuestSelection(campaign: Campaign, id: string, now: string): Campaign {
  if (campaign.phase !== 'quest-board') {
    throw new PrimalDomainError('phase-transition', 'Quests can only be chosen during the Quest Board phase.');
  }
  return sendChapterEvent(activateQuest(campaign, id, now), { type: 'BEGIN_PREPARATION' }, now);
}

function grantQuestRewards(campaign: Campaign, quest: Quest, now: string): Campaign {
  const rewardResources = quest.rewardResources;
  const next: Campaign = {
    ...campaign,
    achievements: [...new Set([...campaign.achievements, ...questAchievements(campaign, quest, 'reward')])],
    hunters: campaign.hunters.map((hunter) => ({
      ...hunter,
      resources: Object.fromEntries(
        [...new Set([...Object.keys(hunter.resources), ...Object.keys(rewardResources)])].map((id) => [
          id,
          (hunter.resources[id as ResourceId] ?? 0) + (rewardResources[id as ResourceId] ?? 0),
        ]),
      ),
    })),
    unassignedRewards: [...campaign.unassignedRewards, ...quest.rewardCards.map(rewardPieceId)],
  };
  return applyQuestUnlockRules(next, quest.rewardUnlocks, now);
}

/** Toggles the Nightmare variant between quests: the stance cards join the behavior decks
 *  while the campaign's boxes carry the Nightmare Expansion. Hunter's Trial stays a
 *  creation stamp — the trial's scoring is its own contract. */
export function setCampaignNightmare(campaign: Campaign, on: boolean, now: string): Campaign {
  if (on && !campaign.expansionIds.includes('nightmare')) {
    throw new PrimalDomainError('expansion-required', 'The Nightmare variant needs the Nightmare Expansion.');
  }
  if (campaign.nightmareVariant === on) return campaign;
  return { ...campaign, nightmareVariant: on, updatedAt: now };
}

export function completeQuest(campaign: Campaign, id: string, now: string): Campaign {
  const quest = questById(id);
  if (!quest) throw new PrimalDomainError('quest-unknown', `Quest ${id} does not exist.`);
  const trophies = campaign.trophies.includes(quest.monsterId)
    ? campaign.trophies
    : [...campaign.trophies, quest.monsterId];
  const unlockedElementIds = [...new Set([...campaign.forge.unlockedElementIds, ...(quest.forgeUnlocks ?? [])])];
  const completed = {
    ...sendQuestEvent(campaign, id, { type: 'COMPLETE' }, now),
    activeQuestId: null,
    forge: { ...campaign.forge, unlockedElementIds },
    trophies,
  };
  return grantQuestRewards(completed, quest, now);
}

/** The equipment or potion id a printed reward-card number refers to. */
function rewardPieceId(card: number): string {
  const item = rewardCardEquipment.get(card);
  if (item) return item.id;
  const potion = rewardCardPotions.get(card);
  if (potion) return potion.id;
  throw new PrimalDomainError('reward-unknown', `Reward card ${card} does not exist.`);
}

/** Hands a pending reward to one hunter: items join their equipment pool, potions their inventory.
 *  The printed copies are the queue entries, so a both-copies grant is two hand-outs. */
export function assignRewardCard(campaign: Campaign, rewardId: string, hunterId: string): Campaign {
  const member = campaign.hunters.find((hunter) => hunter.hunterId === hunterId);
  if (!member) throw new PrimalDomainError('party-unavailable', `Unknown hunter: ${hunterId}.`);
  const index = campaign.unassignedRewards.indexOf(rewardId);
  if (index === -1) throw new PrimalDomainError('reward-unassigned', 'That reward is not waiting to be assigned.');
  const grantTo = (equip: (member: CampaignHunter) => CampaignHunter): Campaign =>
    updateHunter(
      { ...campaign, unassignedRewards: campaign.unassignedRewards.toSpliced(index, 1) },
      hunterId,
      equip,
      campaign.updatedAt,
    );
  const item = forgeEquipment.find(
    (entry): entry is CarriedItem => entry.type === 'item' && entry.id === rewardId && entry.rewardOnly,
  );
  if (item) {
    return grantTo((member) => ({ ...member, rewardEquipmentIds: [...member.rewardEquipmentIds, item.id] }));
  }
  const potion = potions.find((entry) => entry.id === rewardId);
  if (potion) {
    return grantTo((member) => ({
      ...member,
      potionInventoryIds: [...member.potionInventoryIds, potion.id],
      rewardPotionIds: [...member.rewardPotionIds, potion.id],
    }));
  }
  throw new PrimalDomainError('reward-unknown', `Reward ${rewardId} does not exist.`);
}

export function expireQuest(campaign: Campaign, id: string, now: string): Campaign {
  const next = sendQuestEvent(campaign, id, { type: 'EXPIRE' }, now);
  return campaign.activeQuestId === id ? { ...next, activeQuestId: null } : next;
}

function applyExpirationEffects(campaign: Campaign, quest: Quest, now: string): Campaign {
  const next = {
    ...campaign,
    achievements: [...new Set([...campaign.achievements, ...questAchievements(campaign, quest, 'expiration')])],
  };
  return applyQuestUnlockRules(next, quest.expirationUnlocks, now);
}

// ---------------------------------------------------------------------------
// Chapter flow
// ---------------------------------------------------------------------------

/**
 * Applies the chapter's reward box: resources, forge and herbalist levels, quest unlocks, skill
 * points: as the chapter starts. Idempotent: an already-resolved chapter returns unchanged.
 */
export function resolveChapterRewards(campaign: Campaign, now: string): Campaign {
  if (campaign.resolvedChapter >= campaign.chapter) return campaign;
  const chapterData = chapterByNumber(campaign.chapter);
  if (!chapterData) throw new PrimalDomainError('chapter-unknown', `Chapter ${campaign.chapter} does not exist.`);
  const expiring = new Set(chapterExpirations(campaign.chapter, campaign.expansionIds).map(questId));
  const unlocking = new Set(chapterUnlocks(campaign.chapter, campaign.expansionIds).map(questId));
  const rewards = chapterHunterRewards(campaign.chapter, campaign.expansionIds);
  const skillPoints =
    earnedSkillPointsThrough(campaign, campaign.chapter) - earnedSkillPointsThrough(campaign, campaign.chapter - 1);
  let next: Campaign = {
    ...campaign,
    forge: {
      level: chapterData.forgeLevel ?? campaign.forge.level,
      unlockedElementIds: [...new Set([...campaign.forge.unlockedElementIds, ...(chapterData.forgeUnlocks ?? [])])],
    },
    herbalist: { level: chapterData.herbalistLevel ?? campaign.herbalist.level },
    hunters: campaign.hunters.map((hunter) => ({
      ...hunter,
      resources: Object.fromEntries(
        [...new Set([...Object.keys(hunter.resources), ...Object.keys(rewards)])].map((id) => [
          id,
          (hunter.resources[id as ResourceId] ?? 0) + (rewards[id as ResourceId] ?? 0),
        ]),
      ),
      skillPoints: hunter.skillPoints + skillPoints,
    })),
    resolvedChapter: campaign.chapter,
    trophies: [...new Set([...campaign.trophies, ...(chapterData.trophyIds ?? [])])],
    updatedAt: now,
  };
  for (const state of campaign.quests) {
    if ((state.status !== 'available' && state.status !== 'active') || !expiring.has(state.questId)) continue;
    next = expireQuest(next, state.questId, now);
    const quest = questById(state.questId);
    if (quest) next = applyExpirationEffects(next, quest, now);
  }
  for (const questIdentifier of unlocking) {
    if (questStatus(next, questIdentifier) === 'locked') next = unlockQuest(next, questIdentifier, now);
  }
  // Chapter-story reward cards and Awakened-set grants: queued cards wait for hand-out, a toAll
  // card and the set pieces go straight to every hunter, and set weapons to their one matching hunter.
  const cardRules = (chapterData.rewardCardUnlocks ?? []).filter(
    (rule) => (!rule.expansionId || next.expansionIds.includes(rule.expansionId)) && matchesCondition(next, rule),
  );
  const pendingCards: string[] = [];
  for (const rule of cardRules) {
    if (!rule.toAll) {
      for (let copy = 0; copy < (rule.copies ?? 1); copy += 1) pendingCards.push(rewardPieceId(rule.card));
      continue;
    }
    const potion = rewardCardPotions.get(rule.card);
    const item = rewardCardEquipment.get(rule.card);
    if (!potion && !item) continue;
    next = {
      ...next,
      hunters: next.hunters.map((member) => ({
        ...member,
        ...(potion
          ? {
              potionInventoryIds: [...member.potionInventoryIds, potion.id],
              rewardPotionIds: [...member.rewardPotionIds, potion.id],
            }
          : { rewardEquipmentIds: [...member.rewardEquipmentIds, item!.id] }),
      })),
    };
  }
  for (const rule of chapterData.awakenedSetUnlocks ?? []) {
    if (!matchesCondition(next, rule)) continue;
    const pieces = forgeEquipment.filter(
      (piece): piece is WeaponEquipment | WornEquipment =>
        piece.type !== 'item' && piece.awakenedOnly && piece.name.toLowerCase().startsWith(rule.set),
    );
    for (const piece of pieces) {
      // Weapons belong to their one matching hunter; armor and helm are granted to every hunter.
      const owners =
        piece.type === 'weapon'
          ? next.hunters.filter((member) => hunterById(member.hunterId)?.classId === piece.classRestriction)
          : next.hunters;
      next = {
        ...next,
        hunters: next.hunters.map((member) =>
          owners.includes(member)
            ? { ...member, rewardEquipmentIds: [...member.rewardEquipmentIds, piece.id] }
            : member,
        ),
      };
    }
  }
  if (pendingCards.length) {
    next = { ...next, unassignedRewards: [...next.unassignedRewards, ...pendingCards] };
  }
  return applyQuestUnlockRules(next, chapterData.questUnlocks ?? [], now);
}

export interface HunterDeckStatus {
  hunter: Hunter;
  hunterId: string;
  member: CampaignHunter;
  report: DeckReport;
  valid: boolean;
}

export function campaignHuntersDeckStatus(campaign: Campaign): HunterDeckStatus[] {
  return campaign.hunters.flatMap((member) => {
    const hunter = hunterById(member.hunterId);
    if (!hunter) return [];
    const context = campaignDeckContext(campaign, member, hunter);
    const report = validateDeck(member.deckCardIds, context);
    return [{ hunter, hunterId: member.hunterId, member, report, valid: report.valid }];
  });
}

export function isCampaignReadyForHunt(campaign: Campaign): boolean {
  return campaignHuntersDeckStatus(campaign).every((status) => status.valid);
}

export function sendChapterEvent(campaign: Campaign, event: ChapterEvent, now: string): Campaign {
  if (huntersTrialCampaignOver(campaign)) {
    throw new PrimalDomainError('campaign-over', "Hunter's Trial campaign is over after three defeats.");
  }
  if (event.type === 'BEGIN_PREPARATION' && !campaign.activeQuestId) {
    throw new PrimalDomainError('quest-state', 'Choose an active quest before beginning Preparation.');
  }
  if (event.type === 'FINISH_PREPARING') {
    for (const member of campaign.hunters) {
      const hunter = hunterById(member.hunterId);
      if (hunter) {
        const report = validateDeck(member.deckCardIds, campaignDeckContext(campaign, member, hunter));
        if (!report.valid) {
          throw new PrimalDomainError(
            'deck-invalid',
            `Cannot enter the hunt: action deck for ${hunter.name} is not legal.`,
          );
        }
      }
    }
  }
  const phase = transitionPhase(campaign.phase, event);
  return {
    ...campaign,
    fightEvents: phase === 'hunt' ? [] : campaign.fightEvents,
    fightStart: phase === 'hunt' ? null : campaign.fightStart,
    hunterState:
      phase === 'hunt'
        ? syncHunterState(
            campaign.hunters.map((hunter) => hunter.hunterId),
            {},
          )
        : campaign.hunterState,
    huntTimer: phase === 'hunt' ? idleHuntTimer() : campaign.huntTimer,
    monsterState: phase === 'hunt' ? setupMonsterState(campaign) : campaign.monsterState,
    phase,
    updatedAt: now,
  };
}

/** Moves from a completed quest into the next chapter, applying its reward box as the chapter starts. */
export function advanceChapter(campaign: Campaign, now: string): Campaign {
  if (campaign.chapter >= TOTAL_CHAPTERS) {
    throw new PrimalDomainError('campaign-complete', 'The campaign is already at its final chapter.');
  }
  if (campaign.activeQuestId) {
    throw new PrimalDomainError('quest-state', 'Complete the active quest before advancing the chapter.');
  }
  const chapter = campaign.chapter + 1;
  const next: Campaign = {
    ...campaign,
    activeQuestId: null,
    chapter,
    phase: transitionPhase(
      campaign.phase,
      chapter === TOTAL_CHAPTERS ? { type: 'BEGIN_FINALE' } : { type: 'NEXT_CHAPTER' },
    ),
    updatedAt: now,
  };
  return resolveChapterRewards(next, now);
}

export function usesHuntersTrial(campaign: Campaign): boolean {
  return campaign.variants.includes('hunters-trial');
}

export function huntersTrialCampaignOver(campaign: Campaign): boolean {
  return usesHuntersTrial(campaign) && campaign.defeats >= 3 && !campaign.finalBattleWon;
}

export function addNote(campaign: Campaign, note: Omit<Note, 'createdAt' | 'id'>, id: string, now: string): Campaign {
  return { ...campaign, notes: [...campaign.notes, { ...note, createdAt: now, id }], updatedAt: now };
}

export function renameCampaign(campaign: Campaign, name: string, now: string): Campaign {
  const parsed = campaignConfigSchema.shape.name.safeParse(name);
  if (!parsed.success) {
    throw new PrimalDomainError('config-invalid', parsed.error.issues[0]?.message ?? 'Invalid campaign name.');
  }
  return { ...campaign, name: parsed.data, updatedAt: now };
}

/** A fresh copy of a campaign under a new id: the same progress with a new write history. */
export function duplicateCampaign(campaign: Campaign, id: string, now: string): Campaign {
  const { rev: _rev, ...rest } = campaign;
  return {
    ...rest,
    createdAt: now,
    fightEvents: [],
    fightStart: null,
    huntHistory: [],
    id,
    name: `${campaign.name} (copy)`,
    rev: 0,
    updatedAt: now,
  };
}

function updateHunter(
  campaign: Campaign,
  hunterId: string,
  update: (hunter: CampaignHunter) => CampaignHunter,
  now: string,
): Campaign {
  if (!campaign.hunters.some((hunter) => hunter.hunterId === hunterId)) {
    throw new PrimalDomainError('hunter-not-found', `Hunter ${hunterId} is not in this campaign.`);
  }
  return {
    ...campaign,
    hunters: campaign.hunters.map((hunter) => (hunter.hunterId === hunterId ? update(hunter) : hunter)),
    updatedAt: now,
  };
}

export function setHunterProfile(
  campaign: Campaign,
  hunterId: string,
  profile: { notes: string; playerName: string },
  now: string,
): Campaign {
  return updateHunter(
    campaign,
    hunterId,
    (hunter) => ({
      ...hunter,
      notes: profile.notes.trim().slice(0, 400),
      playerName: profile.playerName.trim().slice(0, 24),
    }),
    now,
  );
}

export function adjustHunterResource(
  campaign: Campaign,
  hunterId: string,
  resourceId: ResourceId,
  delta: number,
  now: string,
): Campaign {
  if (!Number.isInteger(delta)) {
    throw new PrimalDomainError('resource-invalid', 'Resource changes must be whole numbers.');
  }
  return updateHunter(
    campaign,
    hunterId,
    (hunter) => {
      const nextValue = Math.max(0, (hunter.resources[resourceId] ?? 0) + delta);
      const resources = { ...hunter.resources };
      if (nextValue === 0) delete resources[resourceId];
      else resources[resourceId] = nextValue;
      return { ...hunter, resources };
    },
    now,
  );
}

export function tradeHunterResources(
  campaign: Campaign,
  fromHunterId: string,
  toHunterId: string,
  offeredResourceId: ResourceId,
  requestedResourceId: ResourceId,
  now: string,
): Campaign {
  if (fromHunterId === toHunterId || offeredResourceId === requestedResourceId) {
    throw new PrimalDomainError('trade-invalid', 'Choose different hunters and resources for the trade.');
  }
  const offeredCategory = resourceCategory(offeredResourceId);
  const requestedCategory = resourceCategory(requestedResourceId);
  if (offeredCategory !== requestedCategory || (offeredCategory !== 'element' && offeredCategory !== 'material')) {
    throw new PrimalDomainError(
      'trade-invalid',
      'Trades must exchange one element for one element or one material for one material.',
    );
  }
  const from = campaign.hunters.find((hunter) => hunter.hunterId === fromHunterId);
  const to = campaign.hunters.find((hunter) => hunter.hunterId === toHunterId);
  if (!from || !to) throw new PrimalDomainError('hunter-not-found', 'Both hunters must belong to this campaign.');
  if ((from.resources[offeredResourceId] ?? 0) < 1 || (to.resources[requestedResourceId] ?? 0) < 1) {
    throw new PrimalDomainError('resource-insufficient', 'Both hunters must own the resource they are trading.');
  }
  const transfer = (hunter: CampaignHunter, spent: ResourceId, received: ResourceId): CampaignHunter => {
    const next = { ...hunter.resources, [received]: (hunter.resources[received] ?? 0) + 1 };
    const remaining = (next[spent] ?? 0) - 1;
    if (remaining === 0) delete next[spent];
    else next[spent] = remaining;
    return { ...hunter, resources: next };
  };
  return {
    ...campaign,
    hunters: campaign.hunters.map((hunter) =>
      hunter.hunterId === fromHunterId
        ? transfer(hunter, offeredResourceId, requestedResourceId)
        : hunter.hunterId === toHunterId
          ? transfer(hunter, requestedResourceId, offeredResourceId)
          : hunter,
    ),
    updatedAt: now,
  };
}

function unlockedEquipment(campaign: Campaign, hunterId: string, equipmentId: string): ForgeEquipment {
  const equipment = forgeById(equipmentId);
  const hunter = hunterById(hunterId);
  if (!equipment) throw new PrimalDomainError('equipment-invalid', 'That card is not supported by the Forge.');
  // Reward items and Awakened-set grants are not forged at all: they are earned regardless of
  // forge level or element.
  if (equipment.type === 'item' && equipment.rewardOnly) return equipment;
  if (equipment.type !== 'item' && equipment.awakenedOnly) {
    if (equipment.type === 'weapon' && equipment.classRestriction !== hunter?.classId) {
      throw new PrimalDomainError('equipment-restricted', 'That hunter cannot equip this card.');
    }
    return equipment;
  }
  // The Forge crafts only its current level: once upgraded, other levels are no longer forgeable.
  if (equipment.level !== campaign.forge.level || !campaign.expansionIds.includes(equipment.expansionId)) {
    throw new PrimalDomainError('equipment-locked', 'That equipment is not unlocked in this campaign.');
  }
  if (equipment.element && !campaign.forge.unlockedElementIds.includes(equipment.element)) {
    throw new PrimalDomainError('equipment-locked', 'That equipment element is not unlocked in this campaign.');
  }
  if (equipment.type === 'weapon' && equipment.classRestriction !== hunter?.classId) {
    throw new PrimalDomainError('equipment-restricted', 'That hunter cannot equip this card.');
  }
  return equipment;
}

const plantIds = ['albalacea', 'anthemon', 'mellis', 'nillea', 'saelicornia', 'tarmaret'] as const;

export function recipeCostOptions(cost: RecipeCost | null): ResourceBundle[] {
  return !cost || 'anyPlants' in cost ? [] : [cost];
}

export function canAffordRecipe(resources: ResourceBundle, cost: RecipeCost | null): boolean {
  if (!cost) return true;
  if ('anyPlants' in cost) {
    return plantIds.reduce((total, id) => total + (resources[id] ?? 0), 0) >= cost.anyPlants;
  }
  return recipeCostOptions(cost).some((option) =>
    (Object.entries(option) as Array<[ResourceId, number]>).every(([id, required]) => (resources[id] ?? 0) >= required),
  );
}

export function equipmentUpgradeSource(equipment: ForgeEquipment, hunter?: CampaignHunter): ForgeEquipment | undefined {
  let source: ForgeEquipment | undefined;
  for (const id of hunter?.craftedEquipmentIds ?? []) {
    const candidate = forgeById(id);
    if (
      candidate?.familyId === equipment.familyId &&
      candidate.level < equipment.level &&
      (!source || candidate.level > source.level)
    ) {
      source = candidate;
    }
  }
  return source;
}

export function equipmentCraftCost(equipment: ForgeEquipment, hunter?: CampaignHunter): RecipeCost | null {
  if (
    !equipment.cost ||
    !equipment.element ||
    equipmentUpgradeSource(equipment, hunter) ||
    'anyPlants' in equipment.cost
  ) {
    return equipment.cost;
  }
  return { ...equipment.cost, [equipment.element]: (equipment.cost[equipment.element] ?? 0) + 1 };
}

export interface CraftRequirement {
  id: string;
  kind: 'element' | 'material';
  resourceId: ElementId | MaterialId;
}

export type CraftTender = { kind: 'equipment'; equipmentId: string } | { kind: 'resources'; resourceIds: ResourceId[] };

export interface EquipmentCraftPayment {
  allocations: Record<string, CraftTender>;
}

const elementIds = new Set(
  resources.filter((resource) => resource.category === 'element').map((resource) => resource.id),
);
const materialIds = new Set(
  resources.filter((resource) => resource.category === 'material').map((resource) => resource.id),
);
const resourceCategory = (id: ResourceId) => resources.find((resource) => resource.id === id)?.category;

export function equipmentCraftRequirements(equipment: ForgeEquipment, hunter?: CampaignHunter): CraftRequirement[] {
  if (!equipment.cost || 'anyPlants' in equipment.cost) return [];
  const requirements: CraftRequirement[] =
    equipment.element && !equipmentUpgradeSource(equipment, hunter)
      ? [{ id: 'element', kind: 'element', resourceId: equipment.element }]
      : [];
  for (const [id, count] of Object.entries(equipment.cost) as Array<[ResourceId, number]>) {
    if (!materialIds.has(id)) continue;
    for (let index = 0; index < count; index += 1) {
      requirements.push({ id: `material:${id}:${index}`, kind: 'material', resourceId: id as MaterialId });
    }
  }
  return requirements;
}

const tenderKey = (tender: CraftTender): string =>
  tender.kind === 'equipment' ? `equipment:${tender.equipmentId}` : `resources:${tender.resourceIds.join('+')}`;

export function craftTenderOptions(
  requirement: CraftRequirement,
  hunter: CampaignHunter,
  excludedEquipmentIds: readonly string[] = [],
): CraftTender[] {
  const excluded = new Set(excludedEquipmentIds);
  const options: CraftTender[] = [];
  if (requirement.kind === 'element') {
    if ((hunter.resources[requirement.resourceId] ?? 0) > 0) {
      options.push({ kind: 'resources', resourceIds: [requirement.resourceId] });
    }
    for (const equipmentId of hunter.craftedEquipmentIds) {
      if (!excluded.has(equipmentId) && forgeById(equipmentId)?.element === requirement.resourceId) {
        options.push({ equipmentId, kind: 'equipment' });
      }
    }
    return options;
  }

  if ((hunter.resources[requirement.resourceId] ?? 0) > 0) {
    options.push({ kind: 'resources', resourceIds: [requirement.resourceId] });
  }
  for (const id of elementIds) {
    if ((hunter.resources[id as ResourceId] ?? 0) > 0) {
      options.push({ kind: 'resources', resourceIds: [id as ResourceId] });
    }
  }
  const materialUnits = [...materialIds].flatMap((id) =>
    Array.from({ length: hunter.resources[id as ResourceId] ?? 0 }, () => id as ResourceId),
  );
  for (let first = 0; first < materialUnits.length; first += 1) {
    for (let second = first + 1; second < materialUnits.length; second += 1) {
      options.push({ kind: 'resources', resourceIds: [materialUnits[first], materialUnits[second]] });
    }
  }
  for (const equipmentId of hunter.craftedEquipmentIds) {
    if (!excluded.has(equipmentId)) options.push({ equipmentId, kind: 'equipment' });
  }
  return [...new Map(options.map((option) => [tenderKey(option), option])).values()];
}

function spendBundle(hunter: CampaignHunter, cost: ResourceBundle): CampaignHunter {
  const resources = { ...hunter.resources };
  for (const [id, required] of Object.entries(cost) as Array<[ResourceId, number]>) {
    const remaining = (resources[id] ?? 0) - required;
    if (remaining === 0) delete resources[id];
    else resources[id] = remaining;
  }
  return { ...hunter, resources };
}

function sameBundle(left: ResourceBundle, right: ResourceBundle): boolean {
  const ids = new Set([...Object.keys(left), ...Object.keys(right)] as ResourceId[]);
  return [...ids].every((id) => (left[id] ?? 0) === (right[id] ?? 0));
}

interface AppliedCraftPayment {
  discardedEquipmentIds: string[];
  resources: ResourceBundle;
}

function applyCraftTender(
  requirement: CraftRequirement,
  tender: CraftTender,
  resources: ResourceBundle,
  equipmentIds: Set<string>,
): AppliedCraftPayment {
  if (tender.kind === 'equipment') {
    if (!equipmentIds.has(tender.equipmentId)) {
      throw new PrimalDomainError('payment-invalid', 'That equipment card is not available to discard.');
    }
    const equipment = forgeById(tender.equipmentId);
    if (requirement.kind === 'element' && equipment?.element !== requirement.resourceId) {
      throw new PrimalDomainError('payment-invalid', 'Discarded equipment must match the required Forge element.');
    }
    equipmentIds.delete(tender.equipmentId);
    return { discardedEquipmentIds: [tender.equipmentId], resources };
  }

  const ids = tender.resourceIds;
  const valid =
    requirement.kind === 'element'
      ? ids.length === 1 && ids[0] === requirement.resourceId
      : (ids.length === 1 && (ids[0] === requirement.resourceId || resourceCategory(ids[0]) === 'element')) ||
        (ids.length === 2 && ids.every((id) => resourceCategory(id) === 'material'));
  if (!valid) throw new PrimalDomainError('payment-invalid', 'That conversion cannot satisfy this requirement.');

  const next = { ...resources };
  for (const id of ids) {
    const remaining = (next[id] ?? 0) - 1;
    if (remaining < 0) throw new PrimalDomainError('resource-insufficient', 'Not enough resources for that payment.');
    if (remaining === 0) delete next[id];
    else next[id] = remaining;
  }
  return { discardedEquipmentIds: [], resources: next };
}

export function equipmentCraftPaymentErrors(
  equipment: ForgeEquipment,
  hunter: CampaignHunter,
  payment: EquipmentCraftPayment,
): Record<string, string> {
  let resources = { ...hunter.resources };
  const equipmentIds = new Set(hunter.craftedEquipmentIds);
  const upgradeSource = equipmentUpgradeSource(equipment, hunter);
  if (upgradeSource) equipmentIds.delete(upgradeSource.id);
  const errors: Record<string, string> = {};
  for (const requirement of equipmentCraftRequirements(equipment, hunter)) {
    const tender = payment.allocations[requirement.id];
    if (!tender) {
      errors[requirement.id] = 'Choose a payment for this requirement.';
      continue;
    }
    try {
      const applied = applyCraftTender(requirement, tender, resources, equipmentIds);
      resources = applied.resources;
    } catch (error) {
      errors[requirement.id] = error instanceof PrimalDomainError ? error.message : 'This payment is not available.';
    }
  }
  return errors;
}

export function applyEquipmentCraftPayment(
  equipment: ForgeEquipment,
  hunter: CampaignHunter,
  payment: EquipmentCraftPayment,
): AppliedCraftPayment {
  const requirements = equipmentCraftRequirements(equipment, hunter);
  const requirementIds = new Set(requirements.map((requirement) => requirement.id));
  if (
    requirements.length === 0 ||
    Object.keys(payment.allocations).length !== requirements.length ||
    Object.keys(payment.allocations).some((id) => !requirementIds.has(id))
  ) {
    throw new PrimalDomainError('payment-invalid', 'Choose one payment for every crafting requirement.');
  }

  let resources = { ...hunter.resources };
  const equipmentIds = new Set(hunter.craftedEquipmentIds);
  const upgradeSource = equipmentUpgradeSource(equipment, hunter);
  if (upgradeSource) equipmentIds.delete(upgradeSource.id);
  const discardedEquipmentIds: string[] = upgradeSource ? [upgradeSource.id] : [];
  for (const requirement of requirements) {
    const tender = payment.allocations[requirement.id];
    if (!tender) throw new PrimalDomainError('payment-invalid', 'Choose one payment for every crafting requirement.');
    const applied = applyCraftTender(requirement, tender, resources, equipmentIds);
    resources = applied.resources;
    discardedEquipmentIds.push(...applied.discardedEquipmentIds);
  }
  return { discardedEquipmentIds, resources };
}

export function exactEquipmentCraftPayment(equipment: ForgeEquipment, hunter?: CampaignHunter): EquipmentCraftPayment {
  return {
    allocations: Object.fromEntries(
      equipmentCraftRequirements(equipment, hunter).map((requirement) => [
        requirement.id,
        { kind: 'resources', resourceIds: [requirement.resourceId] } satisfies CraftTender,
      ]),
    ),
  };
}

export function suggestEquipmentCraftPayment(
  equipment: ForgeEquipment,
  hunter: CampaignHunter,
): EquipmentCraftPayment | null {
  const requirements = equipmentCraftRequirements(equipment, hunter);
  const upgradeSource = equipmentUpgradeSource(equipment, hunter);
  const search = (
    index: number,
    resources: ResourceBundle,
    equipmentIds: Set<string>,
    allocations: Record<string, CraftTender>,
  ): EquipmentCraftPayment | null => {
    const requirement = requirements[index];
    if (!requirement) return { allocations };
    const availableHunter = { ...hunter, craftedEquipmentIds: [...equipmentIds], resources };
    for (const tender of craftTenderOptions(requirement, availableHunter)) {
      try {
        const nextEquipmentIds = new Set(equipmentIds);
        const applied = applyCraftTender(requirement, tender, resources, nextEquipmentIds);
        const result = search(index + 1, applied.resources, nextEquipmentIds, {
          ...allocations,
          [requirement.id]: tender,
        });
        if (result) return result;
      } catch {}
    }
    return null;
  };
  const equipmentIds = new Set(hunter.craftedEquipmentIds);
  if (upgradeSource) equipmentIds.delete(upgradeSource.id);
  return requirements.length ? search(0, hunter.resources, equipmentIds, {}) : null;
}

export function canCraftEquipment(campaign: Campaign, hunterId: string, equipmentId: string): boolean {
  try {
    const equipment = unlockedEquipment(campaign, hunterId, equipmentId);
    const hunter = campaign.hunters.find((entry) => entry.hunterId === hunterId);
    return Boolean(
      equipment.cost &&
        hunter &&
        !hunter.craftedEquipmentIds.includes(equipmentId) &&
        suggestEquipmentCraftPayment(equipment, hunter),
    );
  } catch {
    return false;
  }
}

function spendRecipeCost(
  hunter: CampaignHunter,
  cost: RecipeCost | null,
  selectedPayment?: ResourceBundle,
): CampaignHunter {
  if (!cost) return hunter;
  let payment: ResourceBundle;
  if ('anyPlants' in cost) {
    if (!selectedPayment) throw new PrimalDomainError('payment-invalid', 'Choose which plants to spend.');
    const entries = Object.entries(selectedPayment) as Array<[ResourceId, number]>;
    const total = entries.reduce((sum, [, amount]) => sum + amount, 0);
    if (
      total !== cost.anyPlants ||
      entries.some(([id, amount]) => !plantIds.includes(id as (typeof plantIds)[number]) || amount < 0)
    ) {
      throw new PrimalDomainError('payment-invalid', `Choose exactly ${cost.anyPlants} plants.`);
    }
    payment = selectedPayment;
  } else {
    if (selectedPayment && !sameBundle(cost, selectedPayment)) {
      throw new PrimalDomainError('payment-invalid', 'That payment does not match this recipe.');
    }
    payment = cost;
  }
  if (!canAffordRecipe(hunter.resources, payment)) {
    throw new PrimalDomainError('resource-insufficient', 'Not enough resources to complete this recipe.');
  }
  return spendBundle(hunter, payment);
}

export interface CraftEquipmentOptions {
  equip: boolean;
  payment?: EquipmentCraftPayment;
}

export function craftHunterEquipment(
  campaign: Campaign,
  hunterId: string,
  equipmentId: string,
  options: CraftEquipmentOptions,
  now: string,
): Campaign {
  const equipment = unlockedEquipment(campaign, hunterId, equipmentId);
  return updateHunter(
    campaign,
    hunterId,
    (hunter) => {
      if (hunter.craftedEquipmentIds.includes(equipmentId)) {
        throw new PrimalDomainError('equipment-owned', 'That hunter already owns this equipment.');
      }
      if (!equipment.cost) {
        throw new PrimalDomainError('equipment-invalid', 'Starting equipment cannot be crafted.');
      }
      const applied = applyEquipmentCraftPayment(
        equipment,
        hunter,
        options.payment ?? exactEquipmentCraftPayment(equipment, hunter),
      );
      const discarded = new Set(applied.discardedEquipmentIds);
      const nextEquipment = Object.fromEntries(
        Object.entries(hunter.equipment).map(([slot, id]) => [slot, id && discarded.has(id) ? null : id]),
      ) as CampaignHunter['equipment'];
      const key = `${equipment.type}Id` as const;
      if (options.equip) nextEquipment[key] = equipmentId;
      return {
        ...hunter,
        craftedEquipmentIds: [...hunter.craftedEquipmentIds.filter((id) => !discarded.has(id)), equipmentId],
        equipment: nextEquipment,
        resources: applied.resources,
      };
    },
    now,
  );
}

function unlockedPotion(campaign: Campaign, potionId: string): Potion {
  const potion = potionById(potionId);
  if (!potion) throw new PrimalDomainError('potion-locked', 'That potion is not unlocked in this campaign.');
  // Reward-only potions enter a campaign through quest rewards: never through crafting,
  // regardless of herbalist level or expansion.
  if (potion.rewardOnly) {
    throw new PrimalDomainError('potion-locked', 'That potion is a quest reward and cannot be prepared.');
  }
  // The Herbalist prepares only its current level, mirroring the Forge rule.
  if (potion.level !== campaign.herbalist.level || !campaign.expansionIds.includes(potion.expansionId)) {
    throw new PrimalDomainError('potion-locked', 'That potion is not unlocked in this campaign.');
  }
  return potion;
}

export function prepareHunterPotion(
  campaign: Campaign,
  hunterId: string,
  potionId: string,
  payment: ResourceBundle | undefined,
  now: string,
): Campaign {
  const potion = unlockedPotion(campaign, potionId);
  return updateHunter(
    campaign,
    hunterId,
    (hunter) => {
      if (hunter.potionInventoryIds.includes(potionId)) {
        throw new PrimalDomainError('potion-prepared', 'That potion is already prepared.');
      }
      const paid = spendRecipeCost(hunter, potion.cost, payment);
      return { ...paid, potionInventoryIds: [...paid.potionInventoryIds, potionId] };
    },
    now,
  );
}

// ---------------------------------------------------------------------------
// Hunt results and Hunter's Trial scoring
// ---------------------------------------------------------------------------

/** The trial's running score: the recorded hunt sheets added up, the Winds' own logic. */
export function huntersTrialScore(campaign: Campaign): number | null {
  return usesHuntersTrial(campaign) ? scoreTotal(campaign.scores) : null;
}

/** The Hunter's Trial table, derived from the rulebook's own arithmetic: the campaign's
 *  eleven hunts fight at three aggression tiers (chapters 1–3, 4–7, 8–11), so a clean
 *  sweep — every hunt won, no KO, no cards — sums its bases to 170: Dragon Slayer's bar.
 *  The Nightmare behavior cards never mix levels into one deck (about three ship per
 *  level), so the reference plays stack one card at a time: the stance flag every hunt
 *  reaches 253 (Indomitable), one behavior card each 295 (Primal Beast), two each 337
 *  (Nightmare); every threshold rounds down to the five. The four mortal tiers below
 *  split the clean base evenly, each step a handful of KOs deep. The Rookie row is the
 *  catch-all below Expert, highest first like every ladder. */
export const nightmareHunterTrialLadder: readonly TrialRanking[] = [
  tier('Nightmare', 330),
  tier('Primal Beast', 290),
  tier('Indomitable', 250),
  tier('Dragon Slayer', 170),
  tier('Beast Master', 135),
  tier('Commander', 100),
  tier('Prime Hunter', 65),
  tier('Expert', 30),
  tier('Rookie', null, 30),
];

/** The tier a trial total earns on the Nightmare ladder; the Rookie row is the catch-all. */
export function nightmareHunterTrialRank(score: number): string {
  return rankingFor(nightmareHunterTrialLadder, score)?.name ?? 'Rookie';
}

function settleConsumedPotions(campaign: Campaign, restoreRewardAndCrafted: boolean): Campaign {
  return {
    ...campaign,
    hunters: campaign.hunters.map((hunter) => {
      if (restoreRewardAndCrafted || !hunter.consumedPotionIds.length) return { ...hunter, consumedPotionIds: [] };
      // Reward potions refill after every hunt: only crafted ones are spent on victory.
      const reward = new Set(hunter.rewardPotionIds);
      const spent = new Set(hunter.consumedPotionIds.filter((id) => !reward.has(id)));
      return {
        ...hunter,
        consumedPotionIds: [],
        potionInventoryIds: hunter.potionInventoryIds.filter((id) => !spent.has(id)),
        // Spelled out per slot: the loadout is a fixed three-slot tuple, and map would widen it.
        potionLoadoutIds: [
          refillPotion(hunter.potionLoadoutIds[0], spent),
          refillPotion(hunter.potionLoadoutIds[1], spent),
          refillPotion(hunter.potionLoadoutIds[2], spent),
        ],
      };
    }),
  };
}

/**
 * Records the outcome of the chapter's hunt with its score sheet. Victory completes the
 * active quest and moves to the Result phase; defeat counts against the campaign and keeps
 * the quest active so the hunt can be retried after another Preparation phase unless
 * Hunter's Trial ends the campaign. A trial quest victory carries the sheet's answers and
 * their tally — the standard series worksheet at the chapter's aggression — while the
 * final battle completes the campaign without a sheet: the trial's score is its eleven
 * quest hunts' sheets summed.
 */
export function finishHunt(campaign: Campaign, outcome: HuntResult, answers: readonly number[], now: string): Campaign {
  if (campaign.phase !== 'hunt') {
    throw new PrimalDomainError('phase-transition', 'Results can only be recorded during the Hunt phase.');
  }
  const isFinalBattle = campaign.chapter === TOTAL_CHAPTERS && campaign.resolvedChapter === TOTAL_CHAPTERS;
  if (!campaign.activeQuestId && !isFinalBattle) {
    throw new PrimalDomainError('quest-state', 'No quest is active for this hunt.');
  }
  const activeQuest = campaign.activeQuestId ? questById(campaign.activeQuestId) : undefined;
  const monsterId = activeQuest?.monsterId ?? (isFinalBattle ? finalBattle.monsterId : null);
  if (!monsterId) throw new PrimalDomainError('quest-state', 'No monster is active for this hunt.');
  const next = sendChapterEvent(campaign, { type: 'RECORD_RESULT' }, now);
  const timed = {
    ...next,
    huntHistory: appendHuntRecord(campaign, monsterId, outcome, now),
    huntTimer: stopHuntTimer(campaign.huntTimer, now),
  };
  if (outcome === 'defeat') return recordDefeat(settleConsumedPotions(timed, true), now);

  const completed = isFinalBattle
    ? { ...timed, finalBattleWon: true }
    : completeQuest(timed, campaign.activeQuestId as string, now);
  const settled = settleConsumedPotions(completed, false);
  if (!usesHuntersTrial(campaign) || isFinalBattle) {
    return { ...settled, defeats: 0, totalDefeats: campaign.totalDefeats + campaign.defeats };
  }

  // The quest hunt's worksheet, the standard series sheet at the chapter's aggression
  // (chapters 1–3 the first level, 4–7 the second, 8–11 the summit's): the eleven sheets
  // sum to the trial's score, so a retried or re-recorded hunt re-fills its own slot. The
  // final battle completes the campaign without a sheet of its own. The recorded answers
  // clamp at the sheet's own caps, whatever the wire carried.
  const scores = [...settled.scores];
  scores[campaign.chapter - 1] = scoreRecord(
    TRIAL_SCORE_LEVELS[campaignAggression(campaign.chapter)],
    { monsterId, partySize: campaign.hunters.length },
    answers,
  );
  return {
    ...settled,
    defeats: 0,
    scores,
    totalDefeats: campaign.totalDefeats + campaign.defeats,
  };
}

export function recordAchievement(campaign: Campaign, achievement: string, now: string): Campaign {
  if (campaign.achievements.includes(achievement)) return campaign;
  return { ...campaign, achievements: [...campaign.achievements, achievement], updatedAt: now };
}

function recordDefeat(campaign: Campaign, now: string): Campaign {
  return { ...campaign, defeats: campaign.defeats + 1, updatedAt: now };
}

export interface CampaignStatistics {
  achievements: number;
  chaptersCompleted: number;
  huntersTrialScore: number | null;
  questsCompleted: number;
  questsExpired: number;
  totalDefeats: number;
  trophies: number;
}

export function campaignStatistics(campaign: Campaign): CampaignStatistics {
  return {
    achievements: campaign.achievements.length,
    chaptersCompleted: campaign.chapter - 1,
    huntersTrialScore: huntersTrialScore(campaign),
    questsCompleted: campaign.quests.filter((quest) => quest.status === 'completed').length,
    questsExpired: campaign.quests.filter((quest) => quest.status === 'expired').length,
    totalDefeats: campaign.totalDefeats,
    trophies: campaign.trophies.length,
  };
}
