import {
  forgeById,
  hunterById,
  monsterById,
  potionById,
  questById,
  resources,
  stepCards,
  TOTAL_CHAPTERS,
} from '../content';
import {
  advanceAscentChapter,
  beginAscentHunt,
  recordAscentResult,
  renameAscent,
  revealAscentEncounter,
  revisitAscentPhase,
  setAscentHunters,
  setAscentNightmareVariant,
  setAscentWoundCount,
} from '../domain/ascent';
import {
  applySubjectLoadout,
  consumeSubjectPotion,
  equipSubjectEquipment,
  equipSubjectPotion,
  setSubjectDeck,
  setSubjectMastery,
  unlockAscentSkillStep,
  unlockCampaignSkillStep,
  unlockChallengeSkillStep,
} from '../domain/build';
import {
  addNote,
  adjustHunterResource,
  advanceChapter,
  assignRewardCard,
  type CraftEquipmentOptions,
  commitQuestSelection,
  craftHunterEquipment,
  equipmentUpgradeSource,
  huntersTrialCampaignOver,
  prepareHunterPotion,
  renameCampaign,
  sendChapterEvent,
  setCampaignNightmare,
  setHunterProfile,
  tradeHunterResources,
  unlockQuest,
} from '../domain/campaign';
import {
  advanceChallengeSession,
  chooseChallengeBounty,
  finishChallengePreparation,
  recordChallengeResult,
  renameChallenge,
  revisitChallengePhase,
  rollChallengeEncounter,
  setChallengeHunters,
  setChallengeNightmareVariant,
  setChallengeWoundCount,
  takeChallengeEquipment,
} from '../domain/challenge';
import type { ChapterEvent } from '../domain/chapter-machine';
import { PrimalDomainError } from '../domain/errors';
import {
  correctExpeditionTrialScore,
  recordExpeditionResult,
  setExpeditionNightmareVariant,
} from '../domain/expedition';
import type { FightAction } from '../domain/fight-events';
import { pauseSubjectHuntTimer, resetSubjectHuntTimer, startSubjectHuntTimer } from '../domain/hunt-timer';
import {
  adjustHunterCounter,
  resetHunterState,
  setHunterCondition,
  setHunterDepleted,
  setHunterKnockedOut,
} from '../domain/hunter-state';
import {
  adjustMonsterCounter,
  adjustMonsterToken,
  confirmMonsterWound,
  resetMonsterState,
  setMonsterStance,
  unleashMonster,
} from '../domain/monster-state';
import { setPlayerName } from '../domain/party';
import { finishHunt, type HuntOutcome, recordAchievement } from '../domain/scoring';
import { placeTerrain, removeTerrain, transformTerrain } from '../domain/terrain';
import type {
  Ascent,
  AscentPhase,
  Campaign,
  Challenge,
  ChallengePhase,
  DepletedSlot,
  EquipmentSlot,
  Expedition,
  HunterCondition,
  HunterCounter,
  HunterLoadout,
  HuntSubject,
  KoToken,
  MonsterCounter,
  MonsterStance,
  MonsterToken,
  Note,
  PotionSlot,
  ResourceBundle,
  ResourceId,
  Sector,
  SkillBranchId,
} from '../domain/types';
import { isAscentSubject, isCampaignSubject, isChallengeSubject, isExpeditionSubject } from '../domain/types';
import type { MessageKey, Notice } from './events';
import { now, uid } from './ids';
import { notice } from './notices';
import { hunterName } from './subject-state';
// ---------------------------------------------------------------------------
// Subject commands: the single mutation surface
// ---------------------------------------------------------------------------

/** What a command produced: the next subject plus the notices it wants shown. Pure data :
 *  runCommand commits and emits, so the table stays testable without the toast pipeline. */
export interface CommandOutcome {
  fightAction?: FightAction;
  notices: Notice[];
  subject: HuntSubject;
}

/**
 * Every mutation of a campaign, expedition, or ascent, keyed by name. Each entry takes the
 * resolved subject and returns the next one plus the notices to show; nothing here knows
 * about sessions, persistence, storage or toasts. `runCommand` adds those concerns once, and
 * the session protocol reads this same table, so an action can no longer be forgotten on one
 * of the two paths.
 */
export const subjectCommands = {
  adjustHunterCounter(subject: HuntSubject, hunterId: string, counter: HunterCounter, delta: number): CommandOutcome {
    return {
      fightAction: counter === 'damage' ? { hunterId, type: 'hunter-damage' } : undefined,
      notices: [],
      subject: adjustHunterCounter(subject, hunterId, counter, delta, now()),
    };
  },
  adjustHunterResource(subject: HuntSubject, hunterId: string, resourceId: ResourceId, delta: number): CommandOutcome {
    return {
      notices: [
        notice('toasts.resourceAdjusted', 'info', {
          values: {
            delta: Math.abs(delta),
            hunter: hunterName(hunterId),
            name: resources.find((entry) => entry.id === resourceId)?.name ?? resourceId,
            sign: delta >= 0 ? '+' : '-',
          },
        }),
      ],
      subject: adjustHunterResource(requireCampaign(subject), hunterId, resourceId, delta, now()),
    };
  },
  adjustMonsterCounter(subject: HuntSubject, counter: MonsterCounter, delta: number): CommandOutcome {
    return { notices: [], subject: adjustMonsterCounter(subject, counter, delta, now()) };
  },
  adjustMonsterToken(subject: HuntSubject, token: MonsterToken, delta: number): CommandOutcome {
    return { notices: [], subject: adjustMonsterToken(subject, token, delta, now()) };
  },
  advanceAscent(subject: HuntSubject): CommandOutcome {
    const next = advanceAscentChapter(requireAscent(subject), now());
    return {
      notices: [
        notice(next.status === 'finished' ? 'toasts.ascentSummit' : 'toasts.ascentChapter', 'success', {
          values: { chapter: next.chapter },
        }),
      ],
      subject: next,
    };
  },
  advanceChallengeSession(subject: HuntSubject): CommandOutcome {
    return { notices: [], subject: advanceChallengeSession(requireChallenge(subject), now()) };
  },
  applyLoadout(subject: HuntSubject, hunterId: string, loadout: HunterLoadout): CommandOutcome {
    return {
      notices: [notice('toasts.buildEquipped', 'success', { values: { name: loadout.name } })],
      subject: applySubjectLoadout(subject, hunterId, loadout, now()),
    };
  },
  assignRewardCard(subject: HuntSubject, rewardId: string, hunterId: string): CommandOutcome {
    return {
      notices: [
        notice('toasts.rewardAssigned', 'success', {
          values: { name: forgeById(rewardId)?.name ?? potionById(rewardId)?.name ?? rewardId },
        }),
      ],
      subject: assignRewardCard(requireCampaign(subject), rewardId, hunterId),
    };
  },
  beginAscentHunt(subject: HuntSubject): CommandOutcome {
    return { notices: [], subject: beginAscentHunt(requireAscent(subject), now()) };
  },
  chooseChallengeBounty(subject: HuntSubject, choice: 'keep' | 'raise'): CommandOutcome {
    const next = chooseChallengeBounty(requireChallenge(subject), choice, now());
    return {
      notices: [
        notice(choice === 'raise' ? 'toasts.challengeRaised' : 'toasts.challengeKept', 'success', {
          values: { aggression: next.aggression, number: next.expeditionNumber },
        }),
      ],
      subject: next,
    };
  },
  commitCampaignQuest(subject: HuntSubject, questIdentifier: string): CommandOutcome {
    return {
      notices: [notice('toasts.questCommitted', 'success', { values: { number: questNumber(questIdentifier) } })],
      subject: commitQuestSelection(requireCampaign(subject), questIdentifier, now()),
    };
  },
  confirmMonsterWound(subject: HuntSubject): CommandOutcome {
    return { fightAction: { type: 'monster-wound' }, notices: [], subject: confirmMonsterWound(subject, now()) };
  },
  consumePotion(subject: HuntSubject, hunterId: string, potionId: string): CommandOutcome {
    return {
      notices: [
        notice('toasts.potionConsumed', 'success', { values: { name: potionById(potionId)?.name ?? potionId } }),
      ],
      subject: consumeSubjectPotion(subject, hunterId, potionId, now()),
    };
  },
  correctTrialScore(subject: HuntSubject, answers: number[]): CommandOutcome {
    return {
      notices: [notice('toasts.trialScoreCorrected', 'success')],
      subject: correctExpeditionTrialScore(requireExpedition(subject), answers, now()),
    };
  },
  craftCampaignEquipment(
    subject: HuntSubject,
    hunterId: string,
    equipmentId: string,
    options: CraftEquipmentOptions,
  ): CommandOutcome {
    const campaign = requireCampaign(subject);
    const hunter = campaign.hunters.find((entry) => entry.hunterId === hunterId);
    const equipment = forgeById(equipmentId);
    const upgradeSource = equipment ? equipmentUpgradeSource(equipment, hunter) : undefined;
    const discardedIds = new Set([
      ...(upgradeSource ? [upgradeSource.id] : []),
      ...Object.values(options.payment?.allocations ?? {}).flatMap((tender) =>
        tender.kind === 'equipment' ? [tender.equipmentId] : [],
      ),
    ]);
    const discarded = [...discardedIds].map((id) => forgeById(id)?.name ?? id);
    const outcome: MessageKey = options.equip
      ? upgradeSource
        ? 'toasts.equipmentUpgradedAndEquipped'
        : 'toasts.equipmentCraftedAndEquipped'
      : upgradeSource
        ? 'toasts.equipmentUpgraded'
        : 'toasts.equipmentCrafted';
    return {
      notices: [
        notice(outcome, 'success', { values: { name: equipment?.name ?? equipmentId } }),
        ...(discarded.length
          ? [notice('toasts.equipmentReturned', 'info', { values: { names: discarded.join(', ') } })]
          : []),
      ],
      subject: craftHunterEquipment(campaign, hunterId, equipmentId, options, now()),
    };
  },
  equipEquipment(
    subject: HuntSubject,
    hunterId: string,
    slot: EquipmentSlot,
    equipmentId: string | null,
  ): CommandOutcome {
    return {
      notices: [
        equipmentId
          ? notice('toasts.equipmentEquipped', 'info', {
              values: { name: forgeById(equipmentId)?.name ?? equipmentId },
            })
          : notice('toasts.equipmentSlotCleared', 'info', { values: { slot } }),
      ],
      subject: equipSubjectEquipment(subject, hunterId, slot, equipmentId, now()),
    };
  },
  equipPotion(subject: HuntSubject, hunterId: string, slot: PotionSlot, potionId: string | null): CommandOutcome {
    return {
      notices: [
        potionId
          ? notice('toasts.potionSlotted', 'info', { values: { name: potionById(potionId)?.name ?? potionId } })
          : notice('toasts.potionSlotCleared', 'info', { values: { slot: slot + 1 } }),
      ],
      subject: equipSubjectPotion(subject, hunterId, slot, potionId, now()),
    };
  },
  finishChallengePreparation(subject: HuntSubject): CommandOutcome {
    return { notices: [], subject: finishChallengePreparation(requireChallenge(subject), now()) };
  },
  finishExpedition(
    subject: HuntSubject,
    result: 'victory' | 'defeat',
    answers: readonly number[] = [],
  ): CommandOutcome {
    return {
      notices: [
        notice(
          result === 'victory' ? 'toasts.expeditionVictory' : 'toasts.expeditionDefeat',
          result === 'victory' ? 'success' : 'warning',
        ),
      ],
      subject: recordExpeditionResult(requireExpedition(subject), result, now(), answers),
    };
  },
  moveChapterPhase(subject: HuntSubject, event: ChapterEvent): CommandOutcome {
    return { notices: [], subject: sendChapterEvent(requireCampaign(subject), event, now()) };
  },
  nextChapter(subject: HuntSubject): CommandOutcome {
    const next = advanceChapter(requireCampaign(subject), now());
    return {
      notices: [notice('toasts.chapterReady', 'success', { values: { chapter: next.chapter } })],
      subject: next,
    };
  },
  pauseHuntTimer(subject: HuntSubject): CommandOutcome {
    return { notices: [], subject: pauseSubjectHuntTimer(subject, now()) };
  },
  placeTerrain(subject: HuntSubject, sector: Sector | null, terrainId: string): CommandOutcome {
    return { notices: [], subject: placeTerrain(subject, sector, terrainId, now()) };
  },
  prepareCampaignPotion(
    subject: HuntSubject,
    hunterId: string,
    potionId: string,
    payment?: ResourceBundle,
  ): CommandOutcome {
    return {
      notices: [
        notice('toasts.potionPrepared', 'success', { values: { name: potionById(potionId)?.name ?? potionId } }),
      ],
      subject: prepareHunterPotion(requireCampaign(subject), hunterId, potionId, payment, now()),
    };
  },
  recordAscentHunt(subject: HuntSubject, result: 'victory' | 'defeat', answers: number[]): CommandOutcome {
    const next = recordAscentResult(requireAscent(subject), result, answers, now());
    return {
      notices: [
        notice(
          result === 'victory' ? 'toasts.ascentHuntWon' : 'toasts.ascentHuntLost',
          result === 'victory' ? 'success' : 'warning',
        ),
      ],
      subject: next,
    };
  },
  recordCampaignAchievement(subject: HuntSubject, achievement: string): CommandOutcome {
    return {
      notices: [notice('toasts.achievementRecorded', 'success', { values: { achievement } })],
      subject: recordAchievement(requireCampaign(subject), achievement, now()),
    };
  },
  recordChallengeResult(subject: HuntSubject, result: 'victory' | 'defeat', answers: number[]): CommandOutcome {
    const next = recordChallengeResult(requireChallenge(subject), result, answers, now());
    const score = next.scores[next.expeditionNumber - 1];
    return {
      notices: [
        notice(
          result === 'victory' ? 'toasts.challengeHuntWon' : 'toasts.challengeHuntLost',
          result === 'victory' ? 'success' : 'warning',
          result === 'victory' ? { values: { score: score?.total ?? 0 } } : undefined,
        ),
      ],
      subject: next,
    };
  },
  recordHuntResult(subject: HuntSubject, outcome: HuntOutcome, answers: number[]): CommandOutcome {
    const campaign = requireCampaign(subject);
    const next = finishHunt(campaign, outcome, answers, now());
    const notices: Notice[] = [];
    if (outcome === 'victory') {
      const final = campaign.chapter === TOTAL_CHAPTERS;
      notices.push(
        notice(final ? 'toasts.huntVictoryFinal' : 'toasts.huntVictory', 'success', {
          values: {
            monster:
              monsterById(campaign.activeQuestId ? (questById(campaign.activeQuestId)?.monsterId ?? '') : '')?.name ??
              'The monster',
          },
        }),
      );
    } else {
      notices.push(
        notice(huntersTrialCampaignOver(next) ? 'toasts.huntDefeatTrial' : 'toasts.huntDefeat', 'warning', {
          count: next.defeats,
          values: { defeats: next.defeats },
        }),
      );
    }
    const consumed = campaign.hunters.reduce((total, hunter) => total + hunter.consumedPotionIds.length, 0);
    if (consumed)
      notices.push(notice('toasts.huntItemsRestored', 'info', { count: consumed, values: { count: consumed } }));
    return { notices, subject: next };
  },
  removeTerrain(subject: HuntSubject, tokenId: string): CommandOutcome {
    return { notices: [], subject: removeTerrain(subject, tokenId, now()) };
  },
  resetHuntState(subject: HuntSubject, hunterId: string): CommandOutcome {
    return {
      fightAction: { hunterId, type: 'hunter-reset' },
      notices: [],
      subject: resetHunterState(subject, hunterId, now()),
    };
  },
  resetHuntTimer(subject: HuntSubject): CommandOutcome {
    return { notices: [], subject: resetSubjectHuntTimer(subject, now()) };
  },
  resetMonsterState(subject: HuntSubject): CommandOutcome {
    return { fightAction: { type: 'monster-reset' }, notices: [], subject: resetMonsterState(subject, now()) };
  },
  revealAscentEncounter(subject: HuntSubject): CommandOutcome {
    const next = revealAscentEncounter(requireAscent(subject), now());
    return {
      notices: [
        notice('toasts.ascentEncounter', 'info', {
          values: { monster: monsterById(next.pending?.monsterId ?? '')?.name ?? 'A monster' },
        }),
      ],
      subject: next,
    };
  },
  revisitAscent(subject: HuntSubject, phase: AscentPhase): CommandOutcome {
    return { notices: [], subject: revisitAscentPhase(requireAscent(subject), phase, now()) };
  },
  revisitChallenge(subject: HuntSubject, phase: ChallengePhase): CommandOutcome {
    return { notices: [], subject: revisitChallengePhase(requireChallenge(subject), phase, now()) };
  },
  rollChallengeEncounter(subject: HuntSubject, monsterId: string, roll: 1 | 2 | 3 | 4 | 5 | 6): CommandOutcome {
    const next = rollChallengeEncounter(requireChallenge(subject), monsterId, roll, now());
    return {
      notices: [
        notice('toasts.challengeEncounter', 'info', {
          values: { monster: monsterById(monsterId)?.name ?? 'A monster' },
        }),
      ],
      subject: next,
    };
  },
  setHunterCondition(
    subject: HuntSubject,
    hunterId: string,
    condition: HunterCondition,
    active: boolean,
  ): CommandOutcome {
    return { notices: [], subject: setHunterCondition(subject, hunterId, condition, active, now()) };
  },
  setHunterDeck(subject: HuntSubject, hunterId: string, deckCardIds: string[]): CommandOutcome {
    return {
      notices: [notice('toasts.deckSaved', 'success')],
      subject: setSubjectDeck(subject, hunterId, deckCardIds, now()),
    };
  },
  setHunterDepleted(subject: HuntSubject, hunterId: string, slot: DepletedSlot, depleted: boolean): CommandOutcome {
    return { notices: [], subject: setHunterDepleted(subject, hunterId, slot, depleted, now()) };
  },
  setHunterKnockedOut(subject: HuntSubject, hunterId: string, token: KoToken | null): CommandOutcome {
    return {
      fightAction: { hunterId, type: 'hunter-knockout' },
      notices: [],
      subject: setHunterKnockedOut(subject, hunterId, token, now()),
    };
  },
  setHunterMastery(subject: HuntSubject, hunterId: string, masteryCardId: string): CommandOutcome {
    return { notices: [], subject: setSubjectMastery(subject, hunterId, masteryCardId, now()) };
  },
  setHunterPlayerName(subject: HuntSubject, hunterId: string, playerName: string): CommandOutcome {
    return { notices: [], subject: setPlayerName(subject, hunterId, playerName, now()) };
  },
  setMonsterStance(subject: HuntSubject, stance: MonsterStance): CommandOutcome {
    return { fightAction: { type: 'monster-stance' }, notices: [], subject: setMonsterStance(subject, stance, now()) };
  },
  /** Renames the campaign, ascent or Winds challenge: the three subjects that carry a name. */
  setSubjectName(subject: HuntSubject, name: string): CommandOutcome {
    if (isExpeditionSubject(subject)) {
      throw new PrimalDomainError('phase-transition', 'Expeditions are named by their monster and scenario.');
    }
    const next = isCampaignSubject(subject)
      ? renameCampaign(subject, name, now())
      : isAscentSubject(subject)
        ? renameAscent(subject, name, now())
        : renameChallenge(subject, name, now());
    return { notices: [], subject: next };
  },
  /** Toggles the Nightmare variant between quests: the stance cards join the behavior decks
   *  while the run's boxes carry the Nightmare Expansion. A trial card that prints no
   *  Nightmare rows carries no variant — the expedition plays it standard. */
  setSubjectNightmare(subject: HuntSubject, on: boolean): CommandOutcome {
    const next = isCampaignSubject(subject)
      ? setCampaignNightmare(subject, on, now())
      : isAscentSubject(subject)
        ? setAscentNightmareVariant(subject, on, now())
        : isChallengeSubject(subject)
          ? setChallengeNightmareVariant(subject, on, now())
          : setExpeditionNightmareVariant(requireExpedition(subject), on, now());
    return { notices: [], subject: next };
  },

  /** Seats the party on a sudden-death run before its first hunt: ascents and Winds challenges. */
  setSubjectParty(subject: HuntSubject, hunterIds: string[]): CommandOutcome {
    const next = isAscentSubject(subject)
      ? setAscentHunters(subject, hunterIds, now())
      : setChallengeHunters(requireChallenge(subject), hunterIds, now());
    return { notices: [], subject: next };
  },
  /** Records a hunter's carried wounds: both sudden-death run sheets cap them at three. */
  setSubjectWounds(subject: HuntSubject, hunterId: string, woundCount: number): CommandOutcome {
    const next = isAscentSubject(subject)
      ? setAscentWoundCount(subject, hunterId, woundCount, now())
      : setChallengeWoundCount(requireChallenge(subject), hunterId, woundCount, now());
    return { notices: [], subject: next };
  },
  /** Spends one hunter's card-pool upgrade point: campaign, ascent and Winds challenge. */
  spendSkillPoint(subject: HuntSubject, hunterId: string, branchId: SkillBranchId): CommandOutcome {
    const next = isCampaignSubject(subject)
      ? unlockCampaignSkillStep(subject, hunterId, branchId, now())
      : isAscentSubject(subject)
        ? unlockAscentSkillStep(subject, hunterId, branchId, now())
        : unlockChallengeSkillStep(requireChallenge(subject), hunterId, branchId, now());
    return {
      notices: [skillUnlockedNotice(next, hunterId, branchId)],
      subject: next,
    };
  },
  startHuntTimer(subject: HuntSubject): CommandOutcome {
    return { notices: [], subject: startSubjectHuntTimer(subject, now()) };
  },
  takeChallengeEquipment(
    subject: HuntSubject,
    hunterId: string,
    slot: EquipmentSlot,
    equipmentId: string,
  ): CommandOutcome {
    const next = takeChallengeEquipment(requireChallenge(subject), hunterId, slot, equipmentId, now());
    return {
      notices: [
        notice('toasts.equipmentEquipped', 'info', { values: { name: forgeById(equipmentId)?.name ?? equipmentId } }),
      ],
      subject: next,
    };
  },
  tradeHunterResources(
    subject: HuntSubject,
    fromHunterId: string,
    toHunterId: string,
    offeredResourceId: ResourceId,
    requestedResourceId: ResourceId,
  ): CommandOutcome {
    return {
      notices: [
        notice('toasts.resourcesTraded', 'success', {
          values: {
            hunter: hunterName(fromHunterId),
            offered: resourceName(offeredResourceId),
            requested: resourceName(requestedResourceId),
          },
        }),
      ],
      subject: tradeHunterResources(
        requireCampaign(subject),
        fromHunterId,
        toHunterId,
        offeredResourceId,
        requestedResourceId,
        now(),
      ),
    };
  },
  transformTerrain(subject: HuntSubject, tokenId: string): CommandOutcome {
    return { notices: [], subject: transformTerrain(subject, tokenId, now()) };
  },
  unleashMonster(subject: HuntSubject): CommandOutcome {
    return { fightAction: { type: 'monster-unleash' }, notices: [], subject: unleashMonster(subject, now()) };
  },
  unlockCampaignQuest(subject: HuntSubject, questIdentifier: string): CommandOutcome {
    return {
      notices: [notice('toasts.questAvailable', 'success', { values: { number: questNumber(questIdentifier) } })],
      subject: unlockQuest(requireCampaign(subject), questIdentifier, now()),
    };
  },
  updateHunterProfile(
    subject: HuntSubject,
    hunterId: string,
    profile: { notes: string; playerName: string },
  ): CommandOutcome {
    return { notices: [], subject: setHunterProfile(requireCampaign(subject), hunterId, profile, now()) };
  },
  writeCampaignNote(
    subject: HuntSubject,
    scope: Note['scope'],
    text: string,
    targetId: string | null = null,
  ): CommandOutcome {
    const campaign = requireCampaign(subject);
    const target = targetId ?? (scope === 'chapter' ? String(campaign.chapter) : null);
    return {
      notices: [notice('campaignLog.noteSaved', 'success')],
      subject: addNote(campaign, { scope, targetId: target, text: text.trim() }, uid('note'), now()),
    };
  },
};

export type SubjectCommandName = keyof typeof subjectCommands;

export type CommandArgs<K extends SubjectCommandName> =
  Parameters<(typeof subjectCommands)[K]> extends [HuntSubject, ...infer Rest] ? Rest : never;

/** The trailing arguments a given subject command takes after its SubjectRef. */
export type SubjectCommandArgs<K extends SubjectCommandName> = CommandArgs<K>;

export type CommandResult<K extends SubjectCommandName> = ReturnType<(typeof subjectCommands)[K]>['subject'];

export function requireCampaign(subject: HuntSubject): Campaign {
  if (!isCampaignSubject(subject)) throw new PrimalDomainError('phase-transition', 'This action is campaign-only.');
  return subject;
}

export function requireExpedition(subject: HuntSubject): Expedition {
  if (!isExpeditionSubject(subject)) throw new PrimalDomainError('phase-transition', 'This action is expedition-only.');
  return subject;
}

export function requireAscent(subject: HuntSubject): Ascent {
  if (!isAscentSubject(subject)) throw new PrimalDomainError('phase-transition', 'This action is ascent-only.');
  return subject;
}

export function requireChallenge(subject: HuntSubject): Challenge {
  if (!isChallengeSubject(subject)) {
    throw new PrimalDomainError('phase-transition', 'This action is challenge-only.');
  }
  return subject;
}

const questNumber = (identifier: string): number => Number(identifier.replace('quest-', ''));
const resourceName = (id: ResourceId): string => resources.find((entry) => entry.id === id)?.name ?? id;

/** The skill-unlock toast names the cards the step adds; shared by the campaign and ascent variants. */
function skillUnlockedNotice(
  subject: Campaign | Ascent | Challenge,
  hunterId: string,
  branchId: SkillBranchId,
): Notice {
  const content = hunterById(hunterId);
  const step = subject.hunters.find((entry) => entry.hunterId === hunterId)?.skillTree[branchId];
  const cards = content && step ? stepCards(content, branchId, step).map((card) => card.name) : [];
  return notice('toasts.skillUnlocked', 'success', {
    values: {
      branch: branchId,
      cards: cards.length ? cards.join(', ') : 'the new cards',
      hunter: content?.name ?? hunterId,
      step: step ?? 0,
    },
  });
}
