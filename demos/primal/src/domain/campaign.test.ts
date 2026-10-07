import { describe, expect, it } from 'vitest';
import {
  campaignAggression,
  finalBattle,
  forgeEquipment,
  hunterById,
  hunterCards,
  potions,
  questId,
  TOTAL_CHAPTERS,
} from '../content';
import {
  applySubjectLoadout,
  consumeSubjectPotion,
  equipSubjectEquipment,
  equipSubjectPotion,
  setSubjectDeck,
  setSubjectMastery,
  unlockCampaignSkillStep,
} from './build';
import {
  activateQuest,
  adjustHunterResource,
  advanceChapter,
  assignRewardCard,
  campaignHuntersDeckStatus,
  campaignStatistics,
  canAffordRecipe,
  canCraftEquipment,
  commitQuestSelection,
  completeQuest,
  craftHunterEquipment,
  createCampaign,
  createCampaignHunter,
  duplicateCampaign,
  type EquipmentCraftPayment,
  earnedSkillPointsThrough,
  equipmentCraftPaymentErrors,
  equipmentCraftRequirements,
  exactEquipmentCraftPayment,
  expireQuest,
  finishHunt,
  huntersTrialCampaignOver,
  huntersTrialScore,
  isCampaignReadyForHunt,
  nightmareHunterTrialRank,
  prepareHunterPotion,
  questExpirationChapter,
  questStatus,
  recipeCostOptions,
  recordAchievement,
  resolveChapterRewards,
  sendChapterEvent,
  setCampaignNightmare,
  setHunterProfile,
  suggestCampaignName,
  tradeHunterResources,
  unlockQuest,
  validateCampaignConfig,
} from './campaign';
import { baseEquipment, campaignDeckContext, validateDeck } from './deck';
import { PrimalDomainError } from './errors';
import { pauseSubjectHuntTimer, resetSubjectHuntTimer, startSubjectHuntTimer } from './hunt-timer';
import {
  adjustHunterCounter,
  idleHunterState,
  resetHunterState,
  setHunterCondition,
  setHunterDepleted,
  setHunterKnockedOut,
} from './hunter-state';
import type { Campaign, Hunter, HunterLoadout } from './types';

const NOW = '2026-01-01T00:00:00.000Z';
const STARTING_RESOURCES = {
  albalacea: 1,
  anthemon: 1,
  blood: 2,
  bones: 1,
  fire: 2,
  mellis: 1,
  nillea: 2,
  scales: 1,
};

function campaign(
  overrides: {
    expansionIds?: Campaign['expansionIds'];
    hunterIds?: string[];
    nightmareVariant?: boolean;
    variants?: Campaign['variants'];
  } = {},
): Campaign {
  return createCampaign({
    config: {
      expansionIds: overrides.expansionIds ?? ['core'],
      name: 'Crimson Forest',
      nightmareVariant: overrides.nightmareVariant ?? false,
      variants: overrides.variants ?? [],
    },
    hunterIds: overrides.hunterIds ?? ['daeron', 'mirah'],
    id: 'c1',
    now: NOW,
  });
}

describe('campaign duplication', () => {
  it('starts a copied campaign with fresh hunt history', () => {
    const active = activateQuest(campaign(), questId(1), NOW);
    const finished = finishHunt({ ...active, phase: 'hunt' }, 'victory', [], NOW);
    const copy = duplicateCampaign(finished, 'copy', '2026-02-01T00:00:00.000Z');

    expect(finished.huntHistory).toHaveLength(1);
    expect(copy.huntHistory).toEqual([]);
  });
});

describe('quest reward cards', () => {
  const rewardItem = (card: number) => {
    const piece = forgeEquipment.find(
      (entry) =>
        entry.type === 'item' &&
        entry.rewardOnly &&
        entry.artwork === `/cards/rewards/item_${String(card).padStart(2, '0')}.webp`,
    );
    if (!piece) throw new Error(`missing reward item for card ${card}`);
    return piece;
  };

  it('grants no reward cards until the granting quest completes', () => {
    const base = campaign();
    expect(base.unassignedRewards).toEqual([]);
    expect(
      campaignDeckContext(base, base.hunters[0], hunterById('daeron')!).availableEquipmentIds.has(rewardItem(1).id),
    ).toBe(false);
  });

  it('queues the earned card, then hands it to one hunter who can wear it', () => {
    const questNumber = 5; // "Claws of Silver": Unlock Reward card 1.
    const completed = completeQuest(
      activateQuest(unlockQuest(campaign(), questId(questNumber), NOW), questId(questNumber), NOW),
      questId(questNumber),
      NOW,
    );
    expect(completed.unassignedRewards).toEqual([rewardItem(1).id]);
    const [first, second] = completed.hunters;
    expect(
      campaignDeckContext(completed, first, hunterById(first.hunterId)!).availableEquipmentIds.has(rewardItem(1).id),
    ).toBe(false);
    const assigned = assignRewardCard(completed, rewardItem(1).id, first.hunterId);
    expect(assigned.unassignedRewards).toEqual([]);
    expect(assigned.hunters[0].rewardEquipmentIds).toEqual([rewardItem(1).id]);
    expect(assigned.hunters[1].rewardEquipmentIds).toEqual([]);
    const equipped = equipSubjectEquipment(assigned, first.hunterId, 'item', rewardItem(1).id, NOW);
    expect(equipped.hunters[0].equipment.itemId).toBe(rewardItem(1).id);
    expect(() => equipSubjectEquipment(assigned, second.hunterId, 'item', rewardItem(1).id, NOW)).toThrow(/equip/);
  });

  it('grants the Awakened set and the chapter-11 reward card to every hunter when the finale starts', () => {
    const finale: Campaign = {
      ...campaign(),
      achievements: ['The Bones of the Ancient', 'The Dragon Star', 'The Lake of the Celestial'],
      chapter: 11,
      expansionIds: ['core', 'ice'],
      resolvedChapter: 10,
    };
    const result = resolveChapterRewards(finale, NOW);
    // Set weapons go straight to their one matching hunter.
    expect(result.hunters[0].rewardEquipmentIds).toContain('weapon-daeron-ancient-sword-l3');
    expect(result.hunters[0].rewardEquipmentIds).toContain('weapon-daeron-celestial-sword-l3');
    expect(result.hunters[1].rewardEquipmentIds).toContain('weapon-mirah-ancient-bow-l3');
    // The set armor and helm, and the ice reward card, are copies for every hunter.
    for (const member of result.hunters) {
      expect(member.rewardEquipmentIds).toEqual(
        expect.arrayContaining([
          'reward-anyone-ancient-armor-l3',
          'reward-anyone-ancient-helm-l3',
          'reward-anyone-celestial-armor-l3',
          'reward-anyone-celestial-helm-l3',
        ]),
      );
      expect(member.potionInventoryIds).toContain('reward-anyone-celestia-l3');
    }
    expect(result.unassignedRewards).toEqual([]);
    const equipped = equipSubjectEquipment(
      result,
      result.hunters[0].hunterId,
      'armor',
      'reward-anyone-ancient-armor-l3',
      NOW,
    ) as Campaign;
    expect(equipped.hunters[0].equipment.armorId).toBe('reward-anyone-ancient-armor-l3');
    const alsoEquipped = equipSubjectEquipment(
      result,
      result.hunters[1].hunterId,
      'armor',
      'reward-anyone-ancient-armor-l3',
      NOW,
    ) as Campaign;
    expect(alsoEquipped.hunters[1].equipment.armorId).toBe('reward-anyone-ancient-armor-l3');
  });

  it('queues the feather chapter story reward as two copies', () => {
    const story: Campaign = {
      ...campaign(),
      achievements: ['The Poison of the Pazis'],
      chapter: 4,
      expansionIds: ['core', 'feather'],
      resolvedChapter: 3,
    };
    const result = resolveChapterRewards(story, NOW);
    expect(result.unassignedRewards).toEqual(['reward-anyone-netheris-l2', 'reward-anyone-netheris-l2']);
    const [first, second] = result.hunters;
    const assigned = assignRewardCard(
      assignRewardCard(result, 'reward-anyone-netheris-l2', first.hunterId),
      'reward-anyone-netheris-l2',
      second.hunterId,
    );
    expect(assigned.hunters[0].potionInventoryIds).toContain('reward-anyone-netheris-l2');
    expect(assigned.hunters[1].potionInventoryIds).toContain('reward-anyone-netheris-l2');
  });

  it('hands both copies of a potion card to two hunters and drains the queue', () => {
    // Quest 17 grants card 7 (Draconis, a potion) twice: every both-copies reward is a potion.
    const completed = completeQuest(
      activateQuest(
        unlockQuest(campaign({ hunterIds: ['daeron', 'mirah', 'thoreg'] }), questId(17), NOW),
        questId(17),
        NOW,
      ),
      questId(17),
      NOW,
    );
    expect(completed.unassignedRewards).toEqual(['reward-anyone-draconis-l3', 'reward-anyone-draconis-l3']);
    const [first, second, third] = completed.hunters;
    const assigned = assignRewardCard(
      assignRewardCard(completed, 'reward-anyone-draconis-l3', first.hunterId),
      'reward-anyone-draconis-l3',
      second.hunterId,
    );
    expect(assigned.unassignedRewards).toEqual([]);
    expect(assigned.hunters[0].potionInventoryIds).toHaveLength(1);
    expect(assigned.hunters[1].potionInventoryIds).toHaveLength(1);
    expect(assigned.hunters[2].potionInventoryIds).toHaveLength(0);
    expect(() => assignRewardCard(assigned, 'reward-anyone-draconis-l3', third.hunterId)).toThrow(/reward/);
  });
});

function advanceAndResolve(campaign: Campaign): Campaign {
  return advanceChapter({ ...campaign, phase: 'result' }, NOW);
}

describe('createCampaign', () => {
  it('starts at the quest board with Chapter 1 rewards already applied', () => {
    const result = campaign();
    expect(result).toMatchObject({
      chapter: 1,
      forge: { level: 1, unlockedElementIds: ['fire'] },
      herbalist: { level: 1 },
      phase: 'quest-board',
      resolvedChapter: 1,
      trophies: ['vyraxen'],
    });
    expect(result.hunters.map((hunter) => hunter.resources)).toEqual([STARTING_RESOURCES, STARTING_RESOURCES]);
    expect(questStatus(result, 1)).toBe('available');
  });

  it('applies the chapter box once: resolving it again changes nothing', () => {
    const result = campaign();
    expect(resolveChapterRewards(result, NOW)).toEqual(result);
  });

  it.each([
    ['daeron', 'weapon-daeron-great-sword-l1'],
    ['mirah', 'weapon-mirah-great-bow-l1'],
    ['thoreg', 'weapon-thoreg-hammer-l1'],
    ['ljonar', 'weapon-ljonar-sword-and-shield-l1'],
    ['karah', 'weapon-karah-dual-blade-l1'],
    ['heleren', 'weapon-heleren-gunbow-l1'],
    ['zaraya', 'weapon-zaraya-greatspear-l1'],
    ['drusk', 'weapon-drusk-wardrum-l1'],
  ])('%s starts with basic equipment owned and equipped', (hunterId, weaponId) => {
    const hunter = createCampaignHunter(hunterId);
    expect(hunter.equipment).toEqual({
      armorId: 'forge-anyone-base-armor-l1',
      helmId: 'forge-anyone-base-helm-l1',
      itemId: null,
      weaponId,
    });
    expect(hunter.craftedEquipmentIds).toEqual([weaponId, 'forge-anyone-base-armor-l1', 'forge-anyone-base-helm-l1']);
  });

  it('unlocks Quest 1 and 2 and keeps every other core quest locked', () => {
    const result = campaign();
    expect(questStatus(result, 1)).toBe('available');
    expect(questStatus(result, 2)).toBe('available');
    expect(questStatus(result, 3)).toBe('locked');
    expect(result.quests).toHaveLength(30);
  });

  it('adds expansion quests only when the expansion is enabled', () => {
    expect(questStatus(campaign(), 36)).toBe('locked');
    const feather = campaign({ expansionIds: ['core', 'feather'] });
    expect(questStatus(feather, 36)).toBe('available');
    expect(feather.quests).toHaveLength(35);
  });

  it('rejects parties outside 2–4 hunters', () => {
    expect(() => campaign({ hunterIds: ['daeron'] })).toThrow(PrimalDomainError);
    expect(() => campaign({ hunterIds: ['daeron', 'mirah', 'thoreg', 'ljonar', 'daeron'] })).toThrow(PrimalDomainError);
  });

  it('rejects hunters from disabled expansions', () => {
    expect(() => campaign({ hunterIds: ['daeron', 'karah'] })).toThrow(/not part of the enabled expansions/);
    expect(
      campaign({ expansionIds: ['core', 'mount-havoc'], hunterIds: ['daeron', 'karah', 'heleren'] }).hunters,
    ).toHaveLength(3);
    expect(
      campaign({ expansionIds: ['core', 'heart-of-the-wild'], hunterIds: ['daeron', 'zaraya', 'drusk'] }).hunters,
    ).toHaveLength(3);
  });

  it('validates the configuration', () => {
    expect(validateCampaignConfig({ expansionIds: [], name: '  ', nightmareVariant: false, variants: [] })).toEqual({
      fieldErrors: {},
      valid: true,
    });
    expect(
      validateCampaignConfig({ expansionIds: [], name: 'A'.repeat(41), nightmareVariant: false, variants: [] }).valid,
    ).toBe(false);
    expect(
      validateCampaignConfig({ expansionIds: ['ice'], name: 'Alborea', nightmareVariant: false, variants: [] }).valid,
    ).toBe(true);
    expect(
      validateCampaignConfig({ expansionIds: ['core'], name: 'Alborea', nightmareVariant: true, variants: [] }),
    ).toEqual({
      fieldErrors: { nightmareVariant: 'Select the Nightmare Expansion to use the Nightmare variant.' },
      valid: false,
    });
    expect(
      validateCampaignConfig({
        expansionIds: ['core', 'nightmare'],
        name: 'Alborea',
        nightmareVariant: true,
        variants: [],
      }).valid,
    ).toBe(true);
  });

  it('auto-names a campaign when the name is blank', () => {
    expect(
      createCampaign({
        config: { expansionIds: ['core'], name: '   ', nightmareVariant: false, variants: [] },
        hunterIds: ['daeron', 'mirah'],
        id: 'unnamed',
        now: NOW,
      }).name,
    ).toBe('Campaign');
    expect(campaign().name).toBe('Crimson Forest');
  });

  it('chooses a suggested name from the campaign list', () => {
    expect(suggestCampaignName(() => 0)).toBe('Crimson Forest');
    expect(suggestCampaignName(() => 0.99)).toBe('The Verdant Shore');
  });
});

describe('campaign aggression', () => {
  it.each([
    [1, 1],
    [3, 1],
    [4, 2],
    [7, 2],
    [8, 3],
    [11, 3],
  ])('chapter %i uses aggression %i', (chapter, aggression) => {
    expect(campaignAggression(chapter)).toBe(aggression);
  });
});

describe('quests', () => {
  it('activates an available quest and swaps the previous active one back', () => {
    let result = activateQuest(campaign(), questId(1), NOW);
    expect(result.activeQuestId).toBe(questId(1));
    result = activateQuest(result, questId(2), NOW);
    expect(questStatus(result, 1)).toBe('available');
    expect(questStatus(result, 2)).toBe('active');
  });

  it('refuses to activate locked quests', () => {
    expect(() => activateQuest(campaign(), questId(3), NOW)).toThrow(PrimalDomainError);
  });

  it('derives the next configured expiration from chapter and expansion rules', () => {
    const core = { ...campaign(), chapter: 2 };
    const nightmare = { ...campaign({ expansionIds: ['core', 'nightmare'] }), chapter: 2 };
    expect(questExpirationChapter(core, 2)).toBe(4);
    expect(questExpirationChapter(nightmare, 2)).toBe(3);
    expect(questExpirationChapter(core, questId(1))).toBe(4);
    expect(questExpirationChapter(core, 'quest-unknown')).toBeUndefined();
  });

  it('commits one available quest and begins Preparation atomically', () => {
    const committed = commitQuestSelection(campaign(), questId(2), NOW);
    expect(committed).toMatchObject({ activeQuestId: questId(2), phase: 'preparing' });
    expect(questStatus(committed, 1)).toBe('available');
    expect(questStatus(committed, 2)).toBe('active');
    expect(() => commitQuestSelection(campaign(), questId(3), NOW)).toThrow(PrimalDomainError);
    expect(() => commitQuestSelection({ ...campaign(), phase: 'preparing' }, questId(1), NOW)).toThrow(
      /Quest Board phase/,
    );
  });

  it('completes the active quest and resolves its chapter-dependent unlock', () => {
    const result = completeQuest(activateQuest(campaign(), questId(1), NOW), questId(1), NOW);
    expect(questStatus(result, 1)).toBe('completed');
    expect(questStatus(result, 4)).toBe('available');
    expect(questStatus(result, 6)).toBe('locked');
    expect(result.activeQuestId).toBeNull();
    expect(result.trophies).toContain('toramat');
    expect(result.hunters[0].resources).toEqual({
      ...STARTING_RESOURCES,
      albalacea: 2,
      bones: 3,
      horn: 2,
      kobaureo: 2,
      nillea: 4,
      saelicornia: 1,
      tarmaret: 1,
    });
  });

  it('uses the later Quest 1 branch after Chapter 2', () => {
    const later = { ...campaign(), chapter: 3, resolvedChapter: 3 };
    const result = completeQuest(activateQuest(later, questId(1), NOW), questId(1), NOW);
    expect(questStatus(result, 4)).toBe('locked');
    expect(questStatus(result, 6)).toBe('available');
  });

  it('applies unconditional quest unlocks and achievements', () => {
    let result = unlockQuest(campaign(), questId(6), NOW);
    result = completeQuest(activateQuest(result, questId(6), NOW), questId(6), NOW);
    expect(questStatus(result, 14)).toBe('available');

    result = unlockQuest(result, questId(7), NOW);
    result = completeQuest(activateQuest(result, questId(7), NOW), questId(7), NOW);
    expect(result.achievements).toEqual(expect.arrayContaining(['The Burning Ember', 'The Tome of Creatures']));
  });

  it('applies conditional quest achievements automatically', () => {
    let result = recordAchievement(campaign(), 'The Voice of Woltyar', NOW);
    result = unlockQuest(result, questId(29), NOW);
    result = completeQuest(activateQuest(result, questId(29), NOW), questId(29), NOW);
    expect(result.achievements).toContain('Ouroboros');
  });

  it('unlocks and expires quests with state checks', () => {
    const unlocked = unlockQuest(campaign(), questId(3), NOW);
    expect(questStatus(unlocked, 3)).toBe('available');
    expect(() => unlockQuest(unlocked, questId(3), NOW)).toThrow(PrimalDomainError);
    const expired = expireQuest(unlocked, questId(3), NOW);
    expect(questStatus(expired, 3)).toBe('expired');
    expect(() => expireQuest(expired, questId(3), NOW)).toThrow(PrimalDomainError);
  });
});

describe('forge and herbalist progression', () => {
  it('starts at level 1 with fire unlocked and the herbalist ready', () => {
    const result = campaign();
    expect(result.forge.level).toBe(1);
    expect(result.forge.unlockedElementIds).toContain('fire');
    expect(result.herbalist.level).toBe(1);
  });

  it('makes multiple Forge and Herbalist recipes affordable after Quest 1', () => {
    const completed = completeQuest(activateQuest(campaign(), questId(1), NOW), questId(1), NOW);
    const hunter = completed.hunters[0];
    const equipment = forgeEquipment.filter(
      (entry) =>
        entry.level === 1 &&
        !hunter.craftedEquipmentIds.includes(entry.id) &&
        (!entry.element || completed.forge.unlockedElementIds.includes(entry.element)) &&
        (entry.type !== 'weapon' || entry.classRestriction === 'great-sword') &&
        canAffordRecipe(hunter.resources, entry.cost),
    );
    const affordablePotions = potions.filter(
      (entry) => entry.level === 1 && canAffordRecipe(hunter.resources, entry.cost),
    );
    expect(equipment.length).toBeGreaterThanOrEqual(2);
    expect(affordablePotions.length).toBeGreaterThanOrEqual(2);
    const canCraftTwoItems = equipment.some((first, index) =>
      equipment.slice(index + 1).some((second) => {
        if (!first.cost || !second.cost || 'anyPlants' in first.cost || 'anyPlants' in second.cost) return false;
        const combined = { ...first.cost };
        for (const [id, amount] of Object.entries(second.cost)) {
          const resourceId = id as keyof typeof combined;
          combined[resourceId] = (combined[resourceId] ?? 0) + amount;
        }
        return canAffordRecipe(hunter.resources, combined);
      }),
    );
    expect(canCraftTwoItems).toBe(true);

    const firstPotion = prepareHunterPotion(completed, hunter.hunterId, 'herbalist-anyone-imperia-l1', undefined, NOW);
    expect(() =>
      prepareHunterPotion(firstPotion, hunter.hunterId, 'herbalist-anyone-vydia-l1', undefined, NOW),
    ).not.toThrow();
  });

  it('adds quest rewarded forge elements to the campaign and tracks chapter upgrades', () => {
    let result = campaign();
    result = activateQuest(result, questId(1), NOW);
    result = completeQuest(result, questId(1), NOW);
    expect(result.forge.unlockedElementIds).toContain('horn');

    for (let index = 0; index < 3; index += 1) result = advanceAndResolve(result);
    expect(result.chapter).toBe(4);
    expect(result.forge.level).toBe(2);
    expect(result.herbalist.level).toBe(2);

    for (let index = 0; index < 4; index += 1) result = advanceAndResolve(result);
    expect(result.chapter).toBe(8);
    expect(result.forge.level).toBe(3);
    expect(result.herbalist.level).toBe(3);
  });
});

describe('chapter flow', () => {
  it('walks through the rulebook phases in order', () => {
    let result = campaign();
    expect(result.phase).toBe('quest-board');
    expect(() => sendChapterEvent(result, { type: 'BEGIN_PREPARATION' }, NOW)).toThrow(/active quest/);
    result = commitQuestSelection(result, questId(1), NOW);
    expect(result).toMatchObject({ activeQuestId: questId(1), phase: 'preparing' });
    result = sendChapterEvent(result, { type: 'FINISH_PREPARING' }, NOW);
    expect(result.phase).toBe('hunt');
    result = sendChapterEvent(result, { type: 'RECORD_RESULT' }, NOW);
    expect(result.phase).toBe('result');
  });

  it('rejects skipping phases but allows revisiting earlier ones', () => {
    const board = campaign();
    expect(() => sendChapterEvent(board, { type: 'FINISH_PREPARING' }, NOW)).toThrow(PrimalDomainError);
    const preparing = commitQuestSelection(board, questId(1), NOW);
    expect(sendChapterEvent(preparing, { phase: 'quest-board', type: 'REVISIT' }, NOW).phase).toBe('quest-board');
  });

  it('refuses to enter the hunt if any hunter has an invalid action deck', () => {
    let prep = commitQuestSelection(campaign(), questId(1), NOW);
    expect(isCampaignReadyForHunt(prep)).toBe(true);
    expect(campaignHuntersDeckStatus(prep).every((s) => s.valid)).toBe(true);

    prep = setSubjectDeck(prep, prep.hunters[0].hunterId, [], NOW) as Campaign;
    expect(isCampaignReadyForHunt(prep)).toBe(false);
    expect(campaignHuntersDeckStatus(prep).find((s) => s.hunterId === prep.hunters[0].hunterId)?.valid).toBe(false);
    expect(() => sendChapterEvent(prep, { type: 'FINISH_PREPARING' }, NOW)).toThrow(PrimalDomainError);
    expect(() => sendChapterEvent(prep, { type: 'FINISH_PREPARING' }, NOW)).toThrow(
      /cannot enter the hunt: action deck/i,
    );
  });

  it('advances to an unread chapter and applies its box as the chapter starts', () => {
    let result = campaign({ expansionIds: ['core', 'nightmare'] });
    result = advanceChapter({ ...result, phase: 'result' }, NOW);
    expect(result).toMatchObject({ chapter: 2, phase: 'quest-board', resolvedChapter: 2 });
    expect(questStatus(result, 3)).toBe('available');

    result = advanceAndResolve(result);
    expect(questStatus(result, 2)).toBe('expired'); // Nightmare rule: Quest 2 expires at Chapter 3.
    expect(questStatus(result, 31)).toBe('available');
    expect(questStatus(result, 1)).toBe('available');

    result = advanceAndResolve(result);
    expect(questStatus(result, 1)).toBe('expired');
    expect(questStatus(result, 10)).toBe('available');
    expect(questStatus(result, 11)).toBe('available');
    expect(result.phase).toBe('quest-board');
  });

  it('resolves mutually exclusive chapter unlocks from achievements', () => {
    let withoutAchievements = campaign();
    for (let chapter = 2; chapter <= 4; chapter += 1) withoutAchievements = advanceAndResolve(withoutAchievements);
    expect(questStatus(withoutAchievements, 7)).toBe('available');
    expect(questStatus(withoutAchievements, 8)).toBe('locked');
    expect(questStatus(withoutAchievements, 9)).toBe('available');

    let withAchievements = recordAchievement(campaign(), 'The Goldarks People', NOW);
    withAchievements = recordAchievement(withAchievements, 'Calm the Sea', NOW);
    for (let chapter = 2; chapter <= 4; chapter += 1) withAchievements = advanceAndResolve(withAchievements);
    expect(questStatus(withAchievements, 7)).toBe('locked');
    expect(questStatus(withAchievements, 8)).toBe('available');
    expect(questStatus(withAchievements, 9)).toBe('locked');
  });

  it('records achievements declared by quest expiration text', () => {
    let result = unlockQuest(campaign({ expansionIds: ['core', 'ice'] }), questId(47), NOW);
    result = resolveChapterRewards({ ...result, chapter: 8, resolvedChapter: 7 }, NOW);
    expect(questStatus(result, 47)).toBe('expired');
    expect(result.achievements).toContain('Glaciation');
  });

  it('clears a stale active quest when the chapter box expires it', () => {
    const active = activateQuest(campaign(), questId(1), NOW);
    const result = resolveChapterRewards({ ...active, chapter: 4, resolvedChapter: 3 }, NOW);
    expect(result.activeQuestId).toBeNull();
    expect(questStatus(result, 1)).toBe('expired');
    expect(questStatus(result, 6)).toBe('available');
  });

  it('cannot advance past the final chapter', () => {
    let result = campaign();
    for (let index = 1; index < 11; index += 1) result = advanceAndResolve(result);
    expect(result.chapter).toBe(11);
    expect(() => advanceChapter(result, NOW)).toThrow(/final chapter/);
  });

  it('advances from the final result straight into the final battle preparation, box applied', () => {
    let result = campaign();
    for (let index = 1; index < 10; index += 1) result = advanceAndResolve(result);
    expect(result.chapter).toBe(10);
    result = advanceChapter({ ...result, phase: 'result' }, NOW);
    expect(result).toMatchObject({ chapter: 11, phase: 'preparing', resolvedChapter: 11 });
  });
});

describe('bookkeeping', () => {
  it('records each achievement once', () => {
    const result = recordAchievement(recordAchievement(campaign(), 'The Herbarium', NOW), 'The Herbarium', NOW);
    expect(result.achievements).toEqual(['The Herbarium']);
  });

  it('toggles the Nightmare variant between quests, box permitting', () => {
    const withBox = campaign({ expansionIds: ['core', 'nightmare'] });
    expect(setCampaignNightmare(withBox, true, NOW).nightmareVariant).toBe(true);
    // The trial stamp stays untouched: the variant rides its own flag, never the stamps.
    const trial = campaign({ expansionIds: ['core', 'nightmare'], variants: ['hunters-trial'] });
    expect(setCampaignNightmare(trial, true, NOW)).toMatchObject({
      nightmareVariant: true,
      variants: ['hunters-trial'],
    });
    expect(setCampaignNightmare(trial, false, NOW)).toMatchObject({
      nightmareVariant: false,
      variants: ['hunters-trial'],
    });
    expect(() => setCampaignNightmare(campaign(), true, NOW)).toThrow(/Nightmare Expansion/);
  });

  it('summarises statistics', () => {
    const result = completeQuest(activateQuest(campaign(), questId(1), NOW), questId(1), NOW);
    expect(campaignStatistics(result)).toMatchObject({ chaptersCompleted: 0, questsCompleted: 1, trophies: 2 });
  });

  it('tracks hunter profile and resources without breaking the party', () => {
    const withResources = adjustHunterResource(campaign(), 'daeron', 'blood', 2, NOW);
    const withProfile = setHunterProfile(
      withResources,
      'daeron',
      { notes: 'Need more Scales before dusk.', playerName: 'Astra' },
      NOW,
    );
    const hunter = withProfile.hunters.find((entry) => entry.hunterId === 'daeron');

    expect(hunter?.playerName).toBe('Astra');
    expect(hunter?.notes).toBe('Need more Scales before dusk.');
    expect(hunter?.resources.blood).toBe(4);
  });

  it('awards and permanently spends chapter skill points', () => {
    const rewarded = campaign();
    expect(rewarded.hunters.every((hunter) => hunter.skillPoints === 1)).toBe(true);

    const spent = unlockCampaignSkillStep(rewarded, 'daeron', 'A', NOW);
    expect(spent.hunters[0]).toMatchObject({ skillPoints: 0, skillTree: { A: 1 } });
    expect(() => unlockCampaignSkillStep(spent, 'daeron', 'A', NOW)).toThrow(/no card-pool upgrade/);

    const funded = {
      ...rewarded,
      hunters: rewarded.hunters.map((hunter, index) => (index === 0 ? { ...hunter, skillPoints: 2 } : hunter)),
    };
    const complete = unlockCampaignSkillStep(unlockCampaignSkillStep(funded, 'daeron', 'A', NOW), 'daeron', 'A', NOW);
    expect(complete.hunters[0]).toMatchObject({ skillPoints: 0, skillTree: { A: 2 } });
    expect(() => unlockCampaignSkillStep(complete, 'daeron', 'A', NOW)).toThrow(/already fully upgraded/);
  });

  it('awards conditional skill points only when their achievement is present', () => {
    const base = campaign();
    const withoutVoice = earnedSkillPointsThrough(base, 10);
    const withVoice = earnedSkillPointsThrough({ ...base, achievements: ['The Voice of Woltyar'] }, 10);
    expect(withVoice - withoutVoice).toBe(2);
  });

  it('starts every hunter with base equipment and the 24-card starter deck', () => {
    const daeron = hunterById('daeron') as Hunter;
    const member = createCampaignHunter('daeron');
    expect(member.equipment).toEqual(baseEquipment(daeron));
    expect(member.deckCardIds).toHaveLength(24);
    expect(member.deckCardIds.every((id) => id.endsWith('-s'))).toBe(true);
    expect(validateDeck(member.deckCardIds, campaignDeckContext(campaign(), member, daeron)).valid).toBe(true);
  });

  it('starts a hunter with the starter mastery and swaps it only for an unlocked one', () => {
    const daeron = hunterById('daeron') as Hunter;
    const base = campaign();
    expect(base.hunters[0].masteryCardId).toBe('hero-daeron-relentless-assault-s');
    const branchMastery = 'hero-daeron-dragon-guard-a2';
    expect(() => setSubjectMastery(base, 'daeron', branchMastery, NOW)).toThrow(
      expect.objectContaining({ code: 'loadout-invalid' }),
    );
    expect(() => setSubjectMastery(base, 'daeron', 'hero-ljonar-nothing', NOW)).toThrow(
      expect.objectContaining({ code: 'loadout-invalid' }),
    );
    const funded = { ...base, hunters: base.hunters.map((h, i) => (i === 0 ? { ...h, skillPoints: 2 } : h)) };
    const unlocked = unlockCampaignSkillStep(unlockCampaignSkillStep(funded, 'daeron', 'A', NOW), 'daeron', 'A', NOW);
    expect(campaignDeckContext(unlocked, unlocked.hunters[0], daeron).availableMasteryIds.has(branchMastery)).toBe(
      true,
    );
    expect(setSubjectMastery(unlocked, 'daeron', branchMastery, NOW).hunters[0].masteryCardId).toBe(branchMastery);
  });

  it('replaces the deck with cards from the unlocked pool only', () => {
    const daeron = hunterById('daeron') as Hunter;
    const base = campaign();
    const starter = base.hunters[0].deckCardIds;
    const locked = hunterCards(daeron).find((card) => card.kind === 'action' && !card.id.endsWith('-s'))?.id as string;
    expect(setSubjectDeck(base, 'daeron', starter.slice(1), NOW).hunters[0].deckCardIds).toEqual(starter.slice(1));
    expect(() => setSubjectDeck(base, 'daeron', [...starter, locked], NOW)).toThrow(
      expect.objectContaining({ code: 'deck-invalid' }),
    );
    expect(() => setSubjectDeck(base, 'daeron', [...starter, starter[0]], NOW)).toThrow(
      expect.objectContaining({ code: 'deck-invalid' }),
    );
    const funded = { ...base, hunters: base.hunters.map((h, i) => (i === 0 ? { ...h, skillPoints: 1 } : h)) };
    const unlocked = unlockCampaignSkillStep(funded, 'daeron', 'A', NOW);
    const [added] = [...campaignDeckContext(unlocked, unlocked.hunters[0], daeron).availableCardIds].filter(
      (id) => !starter.includes(id),
    );
    expect(setSubjectDeck(unlocked, 'daeron', [...starter.slice(1), added], NOW).hunters[0].deckCardIds).toContain(
      added,
    );
  });

  it('refits the deck when the weapon changes and empties it without a weapon', () => {
    const daeron = hunterById('daeron') as Hunter;
    const base = campaign();
    const crafted = {
      ...base,
      forge: { ...base.forge, unlockedElementIds: [...base.forge.unlockedElementIds, 'coral' as const] },
      hunters: base.hunters.map((member, index) =>
        index === 0
          ? { ...member, craftedEquipmentIds: [...member.craftedEquipmentIds, 'weapon-daeron-bloodreef-l1'] }
          : member,
      ),
    };
    const swapped = equipSubjectEquipment(crafted, 'daeron', 'weapon', 'weapon-daeron-bloodreef-l1', NOW) as Campaign;
    const member = swapped.hunters[0];
    const report = validateDeck(member.deckCardIds, campaignDeckContext(swapped, member, daeron));
    expect(report.valid).toBe(true);
    expect(report.selected).toEqual({ attack: 5, dodge: 6, maneuver: 5, parry: 4 });
    expect(equipSubjectEquipment(swapped, 'daeron', 'weapon', null, NOW).hunters[0].deckCardIds).toEqual([]);
  });

  it('applies a loadout only when every piece is crafted and every card unlocked', () => {
    const base = campaign();
    const member = base.hunters[0];
    const loadout: HunterLoadout = {
      createdAt: NOW,
      deckCardIds: member.deckCardIds,
      equipment: { ...member.equipment, armorId: 'forge-anyone-red-scale-armor-l1' },
      hunterId: 'daeron',
      id: 'l1',
      masteryCardId: 'hero-daeron-relentless-assault-s',
      name: 'Scales',
      potionLoadoutIds: [null, null, null],
      rev: 0,
      strategy: '',
      updatedAt: NOW,
    };
    expect(() => applySubjectLoadout(base, 'daeron', loadout, NOW)).toThrow(
      expect.objectContaining({ code: 'loadout-unavailable' }),
    );
    expect(() => applySubjectLoadout(base, 'mirah', loadout, NOW)).toThrow(
      expect.objectContaining({ code: 'loadout-invalid' }),
    );
    let current = adjustHunterResource(base, 'daeron', 'blood', 1, NOW);
    current = adjustHunterResource(current, 'daeron', 'scales', 1, NOW);
    current = craftHunterEquipment(current, 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: false }, NOW);
    const applied = applySubjectLoadout(current, 'daeron', loadout, NOW) as Campaign;
    expect(applied.hunters[0].equipment.armorId).toBe('forge-anyone-red-scale-armor-l1');
    expect(applied.hunters[0].deckCardIds).toEqual(member.deckCardIds);
  });

  it('spends resources to craft and equip an unlocked card', () => {
    let current = adjustHunterResource(campaign(), 'daeron', 'blood', 1, NOW);
    current = adjustHunterResource(current, 'daeron', 'scales', 1, NOW);
    const crafted = craftHunterEquipment(current, 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: true }, NOW);
    const hunter = crafted.hunters.find((entry) => entry.hunterId === 'daeron');

    expect(hunter?.craftedEquipmentIds).toContain('forge-anyone-red-scale-armor-l1');
    expect(hunter?.equipment.armorId).toBe('forge-anyone-red-scale-armor-l1');
    expect(hunter?.resources).toEqual({ ...STARTING_RESOURCES, fire: 1 });
    expect(equipSubjectEquipment(crafted, 'daeron', 'armor', null, NOW).hunters[0].equipment.armorId).toBeNull();
  });

  it('equips an owned weapon for its matching hunter class', () => {
    const unequipped = equipSubjectEquipment(campaign() as Campaign, 'daeron', 'weapon', null, NOW);
    const updated = equipSubjectEquipment(
      unequipped,
      'daeron',
      'weapon',
      'weapon-daeron-great-sword-l1',
      NOW,
    ) as Campaign;

    expect(updated.hunters[0].equipment.weaponId).toBe('weapon-daeron-great-sword-l1');
    expect(() => craftHunterEquipment(campaign(), 'daeron', 'weapon-mirah-great-bow-l1', { equip: true }, NOW)).toThrow(
      /cannot equip/,
    );
  });

  it('equips one owned item at a time', () => {
    const base = campaign();
    const items = forgeEquipment
      .filter(
        (equipment) =>
          equipment.type === 'item' &&
          equipment.level === 1 &&
          equipment.expansionId === 'core' &&
          (equipment.element === null || base.forge.unlockedElementIds.includes(equipment.element)),
      )
      .slice(0, 2);
    expect(items).toHaveLength(2);
    const withItems = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0
          ? { ...hunter, craftedEquipmentIds: [...hunter.craftedEquipmentIds, ...items.map((item) => item.id)] }
          : hunter,
      ),
    };
    const firstEquipped = equipSubjectEquipment(withItems, 'daeron', 'item', items[0].id, NOW) as Campaign;
    const replaced = equipSubjectEquipment(firstEquipped, 'daeron', 'item', items[1].id, NOW) as Campaign;

    expect(replaced.hunters[0].equipment.itemId).toBe(items[1].id);
    expect(replaced.hunters[0].craftedEquipmentIds).toEqual(expect.arrayContaining(items.map((item) => item.id)));
  });

  it('spends plants to prepare and consume a potion', () => {
    let current = adjustHunterResource(campaign(), 'daeron', 'anthemon', 1, NOW);
    current = adjustHunterResource(current, 'daeron', 'nillea', 1, NOW);
    const prepared = prepareHunterPotion(current, 'daeron', 'herbalist-anyone-imperia-l1', undefined, NOW);

    expect(prepared.hunters[0].potionInventoryIds).toEqual(['herbalist-anyone-imperia-l1']);
    expect(prepared.hunters[0].resources).toEqual(STARTING_RESOURCES);
    expect(() => consumeSubjectPotion(prepared, 'daeron', 'herbalist-anyone-imperia-l1', NOW)).toThrow(
      /active loadout/,
    );

    const loaded = equipSubjectPotion(prepared, 'daeron', 0, 'herbalist-anyone-imperia-l1', NOW) as Campaign;
    const consumed = consumeSubjectPotion(loaded, 'daeron', 'herbalist-anyone-imperia-l1', NOW) as Campaign;
    expect(consumed.hunters[0].consumedPotionIds).toEqual(['herbalist-anyone-imperia-l1']);
    expect(consumed.hunters[0].potionInventoryIds).toEqual(['herbalist-anyone-imperia-l1']);
    expect(consumed.hunters[0].potionLoadoutIds).toEqual(['herbalist-anyone-imperia-l1', null, null]);
    expect(() => consumeSubjectPotion(consumed, 'daeron', 'herbalist-anyone-imperia-l1', NOW)).toThrow(
      /already been consumed/,
    );
  });

  it('refuses to prepare reward-only potions: they are quest grants, not recipes', () => {
    expect(() => prepareHunterPotion(campaign(), 'daeron', 'reward-anyone-lumenera-l2', undefined, NOW)).toThrow(
      /quest reward/,
    );
  });

  it('allows different levels of one potion but rejects the same card twice', () => {
    let current = campaign();
    current = adjustHunterResource(current, 'daeron', 'anthemon', 2, NOW);
    current = adjustHunterResource(current, 'daeron', 'nillea', 2, NOW);
    current = prepareHunterPotion(current, 'daeron', 'herbalist-anyone-imperia-l1', undefined, NOW);
    current = { ...current, herbalist: { level: 2 } };
    current = prepareHunterPotion(current, 'daeron', 'herbalist-anyone-imperia-l2', undefined, NOW);

    expect(current.hunters[0].potionInventoryIds).toEqual([
      'herbalist-anyone-imperia-l1',
      'herbalist-anyone-imperia-l2',
    ]);
    expect(() => prepareHunterPotion(current, 'daeron', 'herbalist-anyone-imperia-l2', undefined, NOW)).toThrow(
      /already prepared/,
    );
  });

  it('keeps every created potion while limiting the hunt loadout to three unique cards', () => {
    const base = campaign();
    const potionIds = potions
      .filter((potion) => potion.level === 1 && potion.expansionId === 'core')
      .slice(0, 4)
      .map((potion) => potion.id);
    expect(potionIds).toHaveLength(4);
    const inventory = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, potionInventoryIds: potionIds } : hunter,
      ),
    };
    let loaded = equipSubjectPotion(inventory, 'daeron', 0, potionIds[0], NOW) as Campaign;
    loaded = equipSubjectPotion(loaded, 'daeron', 1, potionIds[1], NOW) as Campaign;
    loaded = equipSubjectPotion(loaded, 'daeron', 2, potionIds[2], NOW) as Campaign;

    expect(loaded.hunters[0].potionInventoryIds).toEqual(potionIds);
    expect(loaded.hunters[0].potionLoadoutIds).toEqual(potionIds.slice(0, 3));
    expect(() => equipSubjectPotion(loaded, 'daeron', 1, potionIds[0], NOW)).toThrow(/another loadout slot/);
    expect(() => equipSubjectPotion(loaded, 'daeron', 0, 'not-owned', NOW)).toThrow(/Prepare that potion/);
  });

  it('supports fixed and any-plant recipe costs', () => {
    const fixed = { anthemon: 1, tarmaret: 1 };
    expect(recipeCostOptions(fixed)).toEqual([fixed]);
    expect(canAffordRecipe({ anthemon: 1, tarmaret: 1 }, fixed)).toBe(true);
    expect(canAffordRecipe({ albalacea: 1, nillea: 1 }, { anyPlants: 2 })).toBe(true);
  });

  it('crafts an unlocked higher-level recipe from scratch with its element and materials', () => {
    const base = campaign();
    const levelThree = { ...base, forge: { ...base.forge, level: 3 } };
    const crafted = craftHunterEquipment(levelThree, 'daeron', 'forge-anyone-red-scale-armor-l3', { equip: true }, NOW);

    expect(crafted.hunters[0].craftedEquipmentIds).toContain('forge-anyone-red-scale-armor-l3');
    expect(crafted.hunters[0].resources).toMatchObject({ blood: 1, fire: 1 });
    expect(crafted.hunters[0].resources.scales).toBeUndefined();
  });

  it('discards the lower-level card and waives the element when upgrading', () => {
    let current = craftHunterEquipment(campaign(), 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: true }, NOW);
    current = { ...current, forge: { ...current.forge, level: 3 } };
    current = adjustHunterResource(current, 'daeron', 'scales', 1, NOW);
    const equipment = forgeEquipment.find((entry) => entry.id === 'forge-anyone-red-scale-armor-l3')!;
    expect(
      equipmentCraftRequirements(equipment, current.hunters[0]).every((requirement) => requirement.kind === 'material'),
    ).toBe(true);
    const invalidPayment = exactEquipmentCraftPayment(equipment, current.hunters[0]);
    invalidPayment.allocations.element = { kind: 'resources', resourceIds: ['fire'] };
    expect(() =>
      craftHunterEquipment(current, 'daeron', equipment.id, { equip: false, payment: invalidPayment }, NOW),
    ).toThrow(/one payment for every crafting requirement/);
    const upgraded = craftHunterEquipment(current, 'daeron', equipment.id, { equip: false }, NOW);

    expect(upgraded.hunters[0].craftedEquipmentIds).toContain(equipment.id);
    expect(upgraded.hunters[0].craftedEquipmentIds).not.toContain('forge-anyone-red-scale-armor-l1');
    expect(upgraded.hunters[0].equipment.armorId).toBeNull();
    expect(upgraded.hunters[0].resources.fire).toBe(1);
  });

  it('replaces the equipped lower-level card when an upgrade is equipped immediately', () => {
    let current = craftHunterEquipment(campaign(), 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: true }, NOW);
    current = { ...current, forge: { ...current.forge, level: 3 } };
    current = adjustHunterResource(current, 'daeron', 'scales', 1, NOW);
    const upgraded = craftHunterEquipment(current, 'daeron', 'forge-anyone-red-scale-armor-l3', { equip: true }, NOW);

    expect(upgraded.hunters[0].craftedEquipmentIds).not.toContain('forge-anyone-red-scale-armor-l1');
    expect(upgraded.hunters[0].craftedEquipmentIds).toContain('forge-anyone-red-scale-armor-l3');
    expect(upgraded.hunters[0].equipment.armorId).toBe('forge-anyone-red-scale-armor-l3');
    expect(upgraded.hunters[0].resources.fire).toBe(1);
  });

  it('rejects crafting recipes from other levels once the forge is upgraded', () => {
    const base = campaign();
    const upgraded = { ...base, forge: { ...base.forge, level: 3 } };
    expect(() =>
      craftHunterEquipment(upgraded, 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: true }, NOW),
    ).toThrow(/not unlocked/);
  });

  it('uses an extra element or two materials in place of a required material', () => {
    const equipment = forgeEquipment.find((entry) => entry.id === 'forge-anyone-red-scale-armor-l1')!;
    const base = campaign();
    const withElements = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, resources: { blood: 1, fire: 2 } } : hunter,
      ),
    };
    const elementPayment: EquipmentCraftPayment = {
      allocations: {
        element: { kind: 'resources', resourceIds: ['fire'] },
        'material:blood:0': { kind: 'resources', resourceIds: ['blood'] },
        'material:scales:0': { kind: 'resources', resourceIds: ['fire'] },
      },
    };
    const elementCraft = craftHunterEquipment(
      withElements,
      'daeron',
      equipment.id,
      { equip: false, payment: elementPayment },
      NOW,
    );
    expect(elementCraft.hunters[0].resources).toEqual({});

    const withMaterials = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, resources: { blood: 1, bones: 1, fire: 1, zima: 1 } } : hunter,
      ),
    };
    const materialPayment: EquipmentCraftPayment = {
      allocations: {
        element: { kind: 'resources', resourceIds: ['fire'] },
        'material:blood:0': { kind: 'resources', resourceIds: ['blood'] },
        'material:scales:0': { kind: 'resources', resourceIds: ['bones', 'zima'] },
      },
    };
    const materialCraft = craftHunterEquipment(
      withMaterials,
      'daeron',
      equipment.id,
      { equip: false, payment: materialPayment },
      NOW,
    );
    expect(materialCraft.hunters[0].resources).toEqual({});

    const withRepeatedMaterial = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, resources: { blood: 1, bones: 2, fire: 1 } } : hunter,
      ),
    };
    const repeatedPayment: EquipmentCraftPayment = {
      allocations: {
        element: { kind: 'resources', resourceIds: ['fire'] },
        'material:blood:0': { kind: 'resources', resourceIds: ['blood'] },
        'material:scales:0': { kind: 'resources', resourceIds: ['bones', 'bones'] },
      },
    };
    const repeatedCraft = craftHunterEquipment(
      withRepeatedMaterial,
      'daeron',
      equipment.id,
      { equip: false, payment: repeatedPayment },
      NOW,
    );
    expect(repeatedCraft.hunters[0].resources).toEqual({});
  });

  it('rejects plants, wrong-element cards, and reused equipment as payment', () => {
    const equipment = forgeEquipment.find((entry) => entry.id === 'forge-anyone-red-scale-armor-l1')!;
    const base = campaign();
    const resourcesOnly = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, resources: { blood: 1, fire: 1, nillea: 1 } } : hunter,
      ),
    };
    const plantPayment: EquipmentCraftPayment = {
      allocations: {
        element: { kind: 'resources', resourceIds: ['fire'] },
        'material:blood:0': { kind: 'resources', resourceIds: ['blood'] },
        'material:scales:0': { kind: 'resources', resourceIds: ['nillea'] },
      },
    };
    expect(() =>
      craftHunterEquipment(resourcesOnly, 'daeron', equipment.id, { equip: false, payment: plantPayment }, NOW),
    ).toThrow(/cannot satisfy/);

    const wrongElementPayment: EquipmentCraftPayment = {
      allocations: {
        element: { equipmentId: 'weapon-daeron-great-sword-l1', kind: 'equipment' },
        'material:blood:0': { kind: 'resources', resourceIds: ['blood'] },
        'material:scales:0': { kind: 'resources', resourceIds: ['scales'] },
      },
    };
    expect(() =>
      craftHunterEquipment(base, 'daeron', equipment.id, { equip: false, payment: wrongElementPayment }, NOW),
    ).toThrow(/match the required Forge element/);

    const levelThree = forgeEquipment.find((entry) => entry.id === 'forge-anyone-red-scale-armor-l3')!;
    const withFireCard = {
      ...base,
      forge: { ...base.forge, level: 3 },
      hunters: base.hunters.map((hunter, index) =>
        index === 0
          ? {
              ...hunter,
              craftedEquipmentIds: [...hunter.craftedEquipmentIds, 'forge-anyone-red-scale-armor-l1'],
              resources: { blood: 1, scales: 1 },
            }
          : hunter,
      ),
    };
    const reusedCardPayment: EquipmentCraftPayment = {
      allocations: {
        'material:blood:0': { equipmentId: 'forge-anyone-red-scale-armor-l1', kind: 'equipment' },
        'material:scales:0': { kind: 'resources', resourceIds: ['scales'] },
      },
    };
    expect(() =>
      craftHunterEquipment(withFireCard, 'daeron', levelThree.id, { equip: false, payment: reusedCardPayment }, NOW),
    ).toThrow(/not available/);
  });

  it('reports the requirement that has an unavailable payment', () => {
    const equipment = forgeEquipment.find((entry) => entry.id === 'forge-anyone-red-scale-armor-l1')!;
    const base = campaign();
    const hunter = {
      ...base.hunters[0],
      resources: { blood: 1, fire: 1 },
    };
    const payment: EquipmentCraftPayment = {
      allocations: {
        element: { kind: 'resources', resourceIds: ['fire'] },
        'material:blood:0': { kind: 'resources', resourceIds: ['blood'] },
        'material:scales:0': { kind: 'resources', resourceIds: ['fire'] },
      },
    };

    expect(equipmentCraftPaymentErrors(equipment, hunter, payment)).toEqual({
      'material:scales:0': 'Not enough resources for that payment.',
    });
    expect(equipmentCraftPaymentErrors(equipment, hunter, { allocations: {} })).toEqual({
      element: 'Choose a payment for this requirement.',
      'material:blood:0': 'Choose a payment for this requirement.',
      'material:scales:0': 'Choose a payment for this requirement.',
    });
  });

  it('discards owned equipment for a material and clears it from the loadout', () => {
    const equipment = forgeEquipment.find((entry) => entry.id === 'forge-anyone-red-scale-armor-l1')!;
    const base = campaign();
    const current = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, resources: { blood: 1, fire: 1 } } : hunter,
      ),
    };
    const payment: EquipmentCraftPayment = {
      allocations: {
        element: { kind: 'resources', resourceIds: ['fire'] },
        'material:blood:0': { kind: 'resources', resourceIds: ['blood'] },
        'material:scales:0': { equipmentId: 'weapon-daeron-great-sword-l1', kind: 'equipment' },
      },
    };
    const crafted = craftHunterEquipment(current, 'daeron', equipment.id, { equip: false, payment }, NOW);

    expect(crafted.hunters[0].craftedEquipmentIds).not.toContain('weapon-daeron-great-sword-l1');
    expect(crafted.hunters[0].equipment.weaponId).toBeNull();
    expect(crafted.hunters[0].craftedEquipmentIds).toContain(equipment.id);
  });

  it('detects recipes affordable through conversions', () => {
    const base = campaign();
    const converted = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, resources: { blood: 1, fire: 2 } } : hunter,
      ),
    };
    expect(canCraftEquipment(converted, 'daeron', 'forge-anyone-red-scale-armor-l1')).toBe(true);
  });

  it('trades one resource within the same category atomically', () => {
    const base = campaign();
    const current = {
      ...base,
      hunters: base.hunters.map((hunter, index) =>
        index === 0
          ? { ...hunter, resources: { fire: 1 } }
          : index === 1
            ? { ...hunter, resources: { horn: 1 } }
            : hunter,
      ),
    };
    const traded = tradeHunterResources(current, 'daeron', 'mirah', 'fire', 'horn', NOW);
    expect(traded.hunters[0].resources).toEqual({ horn: 1 });
    expect(traded.hunters[1].resources).toEqual({ fire: 1 });
    expect(() => tradeHunterResources(current, 'daeron', 'mirah', 'fire', 'blood', NOW)).toThrow(/one element/);
    expect(() => tradeHunterResources(current, 'daeron', 'mirah', 'fire', 'nillea', NOW)).toThrow(/one element/);
  });

  it('can craft equipment without changing the active loadout', () => {
    let current = adjustHunterResource(campaign(), 'daeron', 'blood', 1, NOW);
    current = adjustHunterResource(current, 'daeron', 'scales', 1, NOW);
    const updated = craftHunterEquipment(current, 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: false }, NOW);
    expect(updated.hunters[0].craftedEquipmentIds).toContain('forge-anyone-red-scale-armor-l1');
    expect(updated.hunters[0].equipment.armorId).toBe('forge-anyone-base-armor-l1');
  });

  it('requires an explicit payment for flexible potion costs', () => {
    let current = adjustHunterResource(campaign(), 'daeron', 'albalacea', 1, NOW);
    current = adjustHunterResource(current, 'daeron', 'nillea', 1, NOW);
    expect(() => prepareHunterPotion(current, 'daeron', 'herbalist-anyone-alemore-l1', undefined, NOW)).toThrow(
      /Choose which plants/,
    );
    const prepared = prepareHunterPotion(
      current,
      'daeron',
      'herbalist-anyone-alemore-l1',
      { albalacea: 1, nillea: 1 },
      NOW,
    );
    expect(prepared.hunters[0].resources).toEqual(STARTING_RESOURCES);
  });

  it('spends the exact fixed potion recipe', () => {
    let current = adjustHunterResource(campaign(), 'daeron', 'tarmaret', 1, NOW);
    current = adjustHunterResource(current, 'daeron', 'anthemon', 1, NOW);
    current = adjustHunterResource(current, 'daeron', 'mellis', 1, NOW);
    const prepared = prepareHunterPotion(current, 'daeron', 'herbalist-anyone-evok-l1', undefined, NOW);
    expect(prepared.hunters[0].resources).toEqual({ ...STARTING_RESOURCES, mellis: 2 });
  });

  it('rejects locked or unaffordable recipes', () => {
    expect(() =>
      craftHunterEquipment(campaign(), 'daeron', 'forge-anyone-frost-armor-l1', { equip: true }, NOW),
    ).toThrow(/not unlocked/);
    const withResources = campaign();
    const withoutResources = {
      ...withResources,
      hunters: withResources.hunters.map((hunter) => ({ ...hunter, resources: {} })),
    };
    expect(() =>
      craftHunterEquipment(withoutResources, 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: true }, NOW),
    ).toThrow(/Not enough/);
    expect(() => prepareHunterPotion(campaign(), 'daeron', 'herbalist-anyone-imperia-l2', undefined, NOW)).toThrow(
      /not unlocked/,
    );
  });
});

describe('final battle', () => {
  const finale = (): Campaign => {
    let result = campaign();
    for (let chapter = 2; chapter <= 11; chapter += 1) result = advanceAndResolve(result);
    return sendChapterEvent(result, { type: 'FINISH_PREPARING' }, NOW);
  };

  it('places the Awakening rocks by combat position and ballistae on the board edges', () => {
    expect(finalBattle.terrain.map(({ sector }) => sector)).toEqual(['rear', 'right-flank', 'left-flank']);
    expect(finalBattle.battlefieldObjects).toEqual([
      expect.objectContaining({
        count: 4,
        name: 'Ballista',
        rule: expect.objectContaining({ status: 'verified', timing: 'At the end of each round' }),
        sector: 'edges',
      }),
    ]);
    expect(finalBattle.rules.every((rule) => rule.title && rule.text)).toBe(true);
  });

  it('skips the Chapter 11 quest board and completes the campaign on victory', () => {
    const hunting = finale();
    expect(hunting).toMatchObject({ activeQuestId: null, chapter: 11, phase: 'hunt', resolvedChapter: 11 });
    const result = finishHunt(hunting, 'victory', [], NOW);
    expect(result).toMatchObject({ defeats: 0, finalBattleWon: true, phase: 'result' });
    expect(result.huntHistory?.[0]).toMatchObject({
      durationMs: null,
      monsterId: finalBattle.monsterId,
      outcome: 'victory',
      recordedAt: NOW,
    });
  });

  it('returns to preparation after losing the final battle', () => {
    const result = finishHunt(finale(), 'defeat', [], NOW);
    expect(result).toMatchObject({ finalBattleWon: false, phase: 'result' });
    expect(result.huntHistory?.[0]).toMatchObject({ monsterId: finalBattle.monsterId, outcome: 'defeat' });
    expect(sendChapterEvent(result, { type: 'RETRY_HUNT' }, NOW).phase).toBe('preparing');
  });
});

describe('finishHunt', () => {
  const hunting = (): Campaign => {
    const active = activateQuest(campaign(), questId(1), NOW);
    return { ...active, phase: 'hunt' };
  };
  const huntingWithConsumedPotion = (): Campaign => {
    const current = hunting();
    const potionId = 'herbalist-anyone-imperia-l1';
    const loaded = {
      ...current,
      hunters: current.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, potionInventoryIds: [potionId], potionLoadoutIds: [potionId, null, null] } : hunter,
      ),
    } as Campaign;
    return consumeSubjectPotion(loaded, 'daeron', potionId, NOW) as Campaign;
  };

  it('completes the active quest on victory and awards the trophy', () => {
    const next = finishHunt(hunting(), 'victory', [], NOW);
    expect(next.phase).toBe('result');
    expect(questStatus(next, 1)).toBe('completed');
    expect(next.activeQuestId).toBeNull();
    expect(next.trophies).toContain('toramat');
    expect(next.defeats).toBe(0);
    expect(next.huntHistory?.[0]).toMatchObject({ monsterId: 'toramat', outcome: 'victory', recordedAt: NOW });
  });

  it('counts a defeat but keeps the quest active for a retry', () => {
    const next = finishHunt(hunting(), 'defeat', [], NOW);
    expect(next.phase).toBe('result');
    expect(next.defeats).toBe(1);
    expect(next.totalDefeats).toBe(0);
    expect(questStatus(next, 1)).toBe('active');
    expect(next.huntHistory?.[0]).toMatchObject({ monsterId: 'toramat', outcome: 'defeat', recordedAt: NOW });
    expect(() => advanceChapter(next, NOW)).toThrow(/Complete the active quest/);
    expect(sendChapterEvent(next, { type: 'RETRY_HUNT' }, NOW).phase).toBe('preparing');
  });

  it('restores consumed potions after a defeat', () => {
    const defeated = finishHunt(huntingWithConsumedPotion(), 'defeat', [], NOW);
    expect(defeated.hunters[0]).toMatchObject({
      consumedPotionIds: [],
      potionInventoryIds: ['herbalist-anyone-imperia-l1'],
      potionLoadoutIds: ['herbalist-anyone-imperia-l1', null, null],
    });
  });

  it('removes consumed potions after a victory', () => {
    const victory = finishHunt(huntingWithConsumedPotion(), 'victory', [], NOW);
    expect(victory.hunters[0]).toMatchObject({
      consumedPotionIds: [],
      potionInventoryIds: [],
      potionLoadoutIds: [null, null, null],
    });
  });

  it('refills reward potions after a victory: only crafted ones are spent', () => {
    const potionId = 'herbalist-anyone-imperia-l1';
    const withReward = {
      ...hunting(),
      hunters: hunting().hunters.map((hunter, index) =>
        index === 0
          ? {
              ...hunter,
              potionInventoryIds: [potionId],
              potionLoadoutIds: [potionId, null, null],
              rewardPotionIds: [potionId],
            }
          : hunter,
      ),
    } as Campaign;
    const consumed = consumeSubjectPotion(withReward, 'daeron', potionId, NOW) as Campaign;
    const victory = finishHunt(consumed, 'victory', [], NOW);
    expect(victory.hunters[0]).toMatchObject({
      consumedPotionIds: [],
      potionInventoryIds: [potionId],
      potionLoadoutIds: [potionId, null, null],
    });
  });

  it("settles Hunter's Trial defeats without scoring them", () => {
    const trial = (): Campaign => {
      const active = activateQuest(campaign({ variants: ['hunters-trial'] }), questId(1), NOW);
      return { ...active, phase: 'hunt' };
    };
    const firstDefeat = finishHunt(trial(), 'defeat', [], NOW);
    const secondDefeat = finishHunt({ ...firstDefeat, phase: 'hunt' }, 'defeat', [], NOW);
    const victory = finishHunt({ ...secondDefeat, phase: 'hunt' }, 'victory', [0, 0, 0, 0], NOW);

    expect(firstDefeat).toMatchObject({ defeats: 1, scores: [], totalDefeats: 0 });
    expect(secondDefeat).toMatchObject({ defeats: 2, scores: [], totalDefeats: 0 });
    expect(victory).toMatchObject({ defeats: 0, totalDefeats: 2 });
    expect(huntersTrialScore(victory)).toBe(10);
  });

  it("scores the trial's hunt by the standard worksheet at the chapter's tier", () => {
    const active = activateQuest(campaign({ variants: ['hunters-trial'] }), questId(1), NOW);
    const victory = finishHunt({ ...active, phase: 'hunt' }, 'victory', [1, 2, 0, 1], NOW);
    // The standard level-one sheet: base 10, the stance flag +5, two behavior cards +4,
    // one other hunter KO'd −3.
    expect(victory.scores).toEqual([{ answers: [1, 2, 0, 1], total: 10 + 5 + 4 - 3 }]);
    expect(huntersTrialScore(victory)).toBe(16);
  });

  it("scores each hunt at its chapter's campaign aggression", () => {
    // The eleven quest hunts split 3/4/4 across the worksheet's three levels.
    expect(campaignAggression(1)).toBe(1);
    expect(campaignAggression(3)).toBe(1);
    expect(campaignAggression(4)).toBe(2);
    expect(campaignAggression(7)).toBe(2);
    expect(campaignAggression(8)).toBe(3);
    expect(campaignAggression(11)).toBe(3);
  });

  it('completes the final battle without a sheet of its own', () => {
    const active: Campaign = {
      ...campaign({ variants: ['hunters-trial'] }),
      activeQuestId: null,
      chapter: TOTAL_CHAPTERS,
      phase: 'hunt',
      resolvedChapter: TOTAL_CHAPTERS,
    };
    const victory = finishHunt(active, 'victory', [1, 3, 0, 0], NOW);
    // The trial's score is its eleven quest hunts' sheets: the final battle completes the
    // campaign without adding one.
    expect(victory.finalBattleWon).toBe(true);
    expect(victory.scores).toHaveLength(0);
  });

  it('re-fills a re-recorded hunt sheet into its own slot', () => {
    const active = activateQuest(campaign({ variants: ['hunters-trial'] }), questId(1), NOW);
    const first = finishHunt({ ...active, phase: 'hunt' }, 'victory', [0, 0, 0, 0], NOW);
    expect(huntersTrialScore(first)).toBe(10);
    // The undo-and-re-record path: the ledger restores the pre-record state, and the fight's
    // sheet re-fills its own slot instead of stacking a second one.
    const reRecorded = finishHunt({ ...active, phase: 'hunt' }, 'victory', [1, 0, 0, 0], NOW);
    expect(reRecorded.scores).toHaveLength(1);
    expect(huntersTrialScore(reRecorded)).toBe(15);
  });

  it('uses the rulebook-derived Nightmare Hunter’s Trial rankings', () => {
    expect(nightmareHunterTrialRank(330)).toBe('Nightmare');
    // One below the nightmare play's bar: stance and two cards every hunt reach 337,
    // the threshold rounds under to 330.
    expect(nightmareHunterTrialRank(329)).toBe('Primal Beast');
    expect(nightmareHunterTrialRank(290)).toBe('Primal Beast');
    expect(nightmareHunterTrialRank(289)).toBe('Indomitable');
    expect(nightmareHunterTrialRank(250)).toBe('Indomitable');
    // The clean eleven-hunt sweep — 170 base points, no KO — is Dragon Slayer's bar.
    expect(nightmareHunterTrialRank(170)).toBe('Dragon Slayer');
    expect(nightmareHunterTrialRank(135)).toBe('Beast Master');
    expect(nightmareHunterTrialRank(100)).toBe('Commander');
    expect(nightmareHunterTrialRank(65)).toBe('Prime Hunter');
    expect(nightmareHunterTrialRank(30)).toBe('Expert');
    // The Rookie row is the bounded catch-all: any value lower than Expert.
    expect(nightmareHunterTrialRank(29)).toBe('Rookie');
  });

  it('does not apply the three-defeat limit to a standard campaign', () => {
    const active = activateQuest(campaign(), questId(1), NOW);
    const first = finishHunt({ ...active, phase: 'hunt' }, 'defeat', [], NOW);
    const second = finishHunt({ ...first, phase: 'hunt' }, 'defeat', [], NOW);
    const third = finishHunt({ ...second, phase: 'hunt' }, 'defeat', [], NOW);

    expect(huntersTrialCampaignOver(third)).toBe(false);
    expect(sendChapterEvent(third, { type: 'RETRY_HUNT' }, NOW).phase).toBe('preparing');
  });

  it("ends Hunter's Trial after the third consecutive defeat", () => {
    const active = activateQuest(campaign({ variants: ['hunters-trial'] }), questId(1), NOW);
    const first = finishHunt({ ...active, phase: 'hunt' }, 'defeat', [], NOW);
    const second = finishHunt({ ...first, phase: 'hunt' }, 'defeat', [], NOW);
    const third = finishHunt({ ...second, phase: 'hunt' }, 'defeat', [], NOW);

    expect(third).toMatchObject({ defeats: 3, totalDefeats: 0 });
    expect(huntersTrialCampaignOver(third)).toBe(true);
    expect(() => sendChapterEvent(third, { type: 'RETRY_HUNT' }, NOW)).toThrow(/campaign is over/i);
  });

  it('calculates the running Hunter’s Trial score from the recorded sheets', () => {
    const trial = campaign({ variants: ['hunters-trial'] });
    expect(huntersTrialScore(trial)).toBe(0);
    expect(huntersTrialScore(campaign())).toBeNull();
    const scored = {
      ...trial,
      scores: [
        { answers: [0, 0, 0, 0], total: 10 },
        { answers: [1, 0, 0, 0], total: 15 },
      ],
    };
    expect(huntersTrialScore(scored)).toBe(25);
  });

  it('refuses to record a result outside the Hunt phase', () => {
    expect(() => finishHunt(campaign(), 'victory', [], NOW)).toThrow(PrimalDomainError);
  });
});

describe('hunt timer', () => {
  const LATER = '2026-01-01T00:12:30.000Z';
  const preparing = (): Campaign => commitQuestSelection(campaign(), questId(1), NOW);
  const hunting = (): Campaign => sendChapterEvent(preparing(), { type: 'FINISH_PREPARING' }, NOW);

  it('starts idle on a new campaign', () => {
    expect(campaign().huntTimer).toEqual({ durationMs: null, elapsedMs: 0, startedAt: null });
  });

  it('tracks start, pause, and reset during the Hunt phase', () => {
    const started = startSubjectHuntTimer(hunting(), NOW);
    expect(started.huntTimer.startedAt).toBe(NOW);
    const paused = pauseSubjectHuntTimer(started, LATER);
    expect(paused.huntTimer).toEqual({ durationMs: null, elapsedMs: 750000, startedAt: null });
    expect(resetSubjectHuntTimer(paused, LATER).huntTimer.elapsedMs).toBe(0);
  });

  it('is only available during the Hunt phase', () => {
    for (const action of [startSubjectHuntTimer, pauseSubjectHuntTimer, resetSubjectHuntTimer]) {
      expect(() => action(preparing(), NOW)).toThrow(PrimalDomainError);
      expect(() => action(finishHunt(hunting(), 'victory', [], NOW), NOW)).toThrow(PrimalDomainError);
    }
  });

  it('freezes the recorded duration when the result is recorded', () => {
    const played = finishHunt(startSubjectHuntTimer(hunting(), NOW), 'defeat', [], LATER);
    expect(played.huntTimer).toEqual({ durationMs: 750000, elapsedMs: 750000, startedAt: null });
  });

  it('resets when the Hunt phase is entered again after a retry', () => {
    const played = finishHunt(startSubjectHuntTimer(hunting(), NOW), 'defeat', [], LATER);
    const retrying = sendChapterEvent(played, { type: 'RETRY_HUNT' }, NOW);
    const rehunting = sendChapterEvent(retrying, { type: 'FINISH_PREPARING' }, NOW);
    expect(rehunting.phase).toBe('hunt');
    expect(rehunting.huntTimer).toEqual({ durationMs: null, elapsedMs: 0, startedAt: null });
  });
});

describe('hunter state', () => {
  const LATER = '2026-01-01T00:12:30.000Z';
  const preparing = (): Campaign => commitQuestSelection(campaign(), questId(1), NOW);
  const hunting = (): Campaign => sendChapterEvent(preparing(), { type: 'FINISH_PREPARING' }, NOW);

  it('starts idle for every hunter on a new campaign', () => {
    expect(campaign().hunterState).toEqual({ daeron: idleHunterState(), mirah: idleHunterState() });
  });

  it('adjusts counters and toggles conditions during the Hunt phase', () => {
    let result = adjustHunterCounter(hunting(), 'daeron', 'damage', 1, NOW);
    result = setHunterCondition(result, 'daeron', 'threatened', true, NOW);
    expect(result.hunterState.daeron?.damage).toBe(1);
    expect(result.hunterState.daeron?.threatened).toBe(true);
    expect(result.hunterState.mirah).toEqual(idleHunterState());
  });

  it('is only editable during the Hunt phase', () => {
    for (const entity of [campaign(), preparing(), finishHunt(hunting(), 'victory', [], NOW)]) {
      expect(() => adjustHunterCounter(entity, 'daeron', 'damage', 1, NOW)).toThrow(PrimalDomainError);
      expect(() => setHunterCondition(entity, 'daeron', 'dazed', true, NOW)).toThrow(PrimalDomainError);
      expect(() => resetHunterState(entity, 'daeron', NOW)).toThrow(PrimalDomainError);
    }
  });

  it('resets when the Hunt phase is entered again after a retry', () => {
    let result = adjustHunterCounter(hunting(), 'daeron', 'damage', 1, NOW);
    result = finishHunt(result, 'defeat', [], LATER);
    const rehunting = sendChapterEvent(
      sendChapterEvent(result, { type: 'RETRY_HUNT' }, NOW),
      { type: 'FINISH_PREPARING' },
      NOW,
    );
    expect(rehunting.hunterState.daeron).toEqual(idleHunterState());
  });

  it('rejects hunters outside the party', () => {
    expect(() => adjustHunterCounter(hunting(), 'ljonar', 'damage', 1, NOW)).toThrow(PrimalDomainError);
  });

  it('applies multi-step deltas, clamps at zero and rejects non-integers', () => {
    let result = adjustHunterCounter(hunting(), 'daeron', 'damage', 5, NOW);
    expect(result.hunterState.daeron?.damage).toBe(5);
    result = adjustHunterCounter(result, 'daeron', 'damage', -9, NOW);
    expect(result.hunterState.daeron?.damage).toBe(0);
    expect(() => adjustHunterCounter(hunting(), 'daeron', 'damage', 0.5, NOW)).toThrow(PrimalDomainError);
    expect(() => adjustHunterCounter(hunting(), 'daeron', 'damage', Number.NaN, NOW)).toThrow(PrimalDomainError);
  });

  it('places the KO token during the Hunt phase, clearing the other tokens, and resets with the board', () => {
    let result = adjustHunterCounter(hunting(), 'daeron', 'damage', 3, NOW);
    result = setHunterKnockedOut(result, 'daeron', 'red', NOW);
    expect(result.hunterState.daeron).toEqual({ ...idleHunterState(), knockedOut: 'red' });
    expect(resetHunterState(result, 'daeron', NOW).hunterState.daeron).toEqual(idleHunterState());
    expect(() => setHunterKnockedOut(preparing(), 'daeron', 'red', NOW)).toThrow(PrimalDomainError);
  });

  it('takes a depleted hunter out of the game on the second knockout', () => {
    let result = setHunterKnockedOut(hunting(), 'daeron', 'red', NOW);
    result = setHunterDepleted(result, 'daeron', 'armor', true, NOW);
    result = setHunterKnockedOut(result, 'daeron', null, NOW);
    result = adjustHunterCounter(result, 'daeron', 'damage', 40, NOW);
    expect(result.hunterState.daeron).toEqual({
      ...idleHunterState(),
      depleted: { armor: true, helm: false },
      knockedOut: 'dead',
    });
    expect(() => setHunterKnockedOut(result, 'daeron', null, NOW)).toThrow(PrimalDomainError);
  });
});
