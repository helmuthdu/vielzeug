import {
  availableScenarios,
  enabledContent,
  hunterById,
  monsterById,
  monsters,
  potions,
  scenarioById,
  TRIAL_TOKEN_LABELS,
  type TrialTerrainPlacement,
  type TrialTokenId,
  terrainById,
  trialHuntById,
  trialHuntForScenario,
  weaponClassById,
} from '../content';
import { baseEquipment, expeditionDeckContext, fitDeck, starterMasteryId, validateDeck, wornEquipment } from './deck';
import { PrimalDomainError } from './errors';
import { appendHuntRecord } from './hunt-history';
import { idleHuntTimer, stopHuntTimer } from './hunt-timer';
import { syncHunterState } from './hunter-state';
import { idleMonsterState, isIdleMonsterState, setupMonsterState } from './monster-state';
import { assertParty, validateParty } from './party';
import { emptyPotionLoadout } from './potion';
import { tallyTrial } from './trial-score';
import type {
  AggressionLevel,
  ExpansionId,
  Expedition,
  ExpeditionHunter,
  ExpeditionScenario,
  Monster,
  Potion,
  Sector,
} from './types';

export function createExpedition(id: string, expansionIds: readonly ExpansionId[], now: string): Expedition {
  return {
    aggression: null,
    createdAt: now,
    expansionIds: ['core', ...expansionIds.filter((entry) => entry !== 'core')],
    fightEvents: [],
    fightStart: null,
    hunterState: {},
    hunters: [],
    huntHistory: [],
    huntTimer: idleHuntTimer(),
    id,
    kind: 'expedition',
    monsterId: null,
    monsterState: idleMonsterState(),
    nightmareVariant: false,
    result: null,
    rev: 0,
    scenarioId: null,
    status: 'draft',
    updatedAt: now,
  };
}

export function availableMonsters(expansionIds: readonly ExpansionId[]): Monster[] {
  return enabledContent(monsters, expansionIds);
}

export const expeditionHunterIds = (expedition: Pick<Expedition, 'hunters'>): string[] =>
  expedition.hunters.map((member) => member.hunterId);

/** A hunter joins with the class's basic weapon, base armor and helm, and the starter deck they ask for. */
export function createExpeditionHunter(expedition: Expedition, hunterId: string): ExpeditionHunter {
  const hunter = hunterById(hunterId);
  if (!hunter) throw new PrimalDomainError('party-unavailable', `Unknown hunter: ${hunterId}`);
  const member: ExpeditionHunter = {
    consumedPotionIds: [],
    deckCardIds: [],
    equipment: baseEquipment(hunter),
    hunterId,
    masteryCardId: starterMasteryId(hunter),
    playerName: '',
    potionLoadoutIds: emptyPotionLoadout(),
  };
  return { ...member, deckCardIds: fitDeck([], expeditionDeckContext(expedition, member, hunter)) };
}

/** Sets the party; hunters already in it keep their build. */
export function setExpeditionHunters(expedition: Expedition, hunterIds: string[], now: string): Expedition {
  assertParty(hunterIds, expedition.expansionIds);
  const partyChanged =
    hunterIds.length !== expedition.hunters.length ||
    hunterIds.some((id) => !expedition.hunters.some((hunter) => hunter.hunterId === id));
  const hunters = hunterIds.map(
    (hunterId) =>
      expedition.hunters.find((member) => member.hunterId === hunterId) ?? createExpeditionHunter(expedition, hunterId),
  );
  // A board still at setup follows the party; one already in play keeps its counts.
  const monsterState = isIdleMonsterState(expedition.monsterState, expedition.hunters.length)
    ? setupMonsterState({ ...expedition, hunters })
    : expedition.monsterState;
  return refreshStatus({
    ...expedition,
    fightEvents: partyChanged ? [] : expedition.fightEvents,
    fightStart: partyChanged ? null : expedition.fightStart,
    hunterState: syncHunterState(hunterIds, expedition.hunterState),
    hunters,
    monsterState,
    updatedAt: now,
  });
}

/** Every potion from the enabled boxes: expeditions have no Herbalist progression. */
export const expeditionPotions = (expedition: Pick<Expedition, 'expansionIds'>): Potion[] =>
  potions.filter((potion) => expedition.expansionIds.includes(potion.expansionId));

/** Choosing a different monster invalidates the aggression and scenario chosen for the previous one. */
export function setExpeditionMonster(expedition: Expedition, monsterId: string, now: string): Expedition {
  if (!availableMonsters(expedition.expansionIds).some((monster) => monster.id === monsterId)) {
    throw new PrimalDomainError('monster-unavailable', `Monster "${monsterId}" is not part of the enabled expansions.`);
  }
  if (expedition.monsterId === monsterId) return expedition;
  return refreshStatus({
    ...expedition,
    aggression: null,
    fightEvents: [],
    fightStart: null,
    monsterId,
    monsterState: idleMonsterState(expedition.hunters.length),
    scenarioId: null,
    updatedAt: now,
  });
}

export function setExpeditionAggression(expedition: Expedition, aggression: AggressionLevel, now: string): Expedition {
  const monster = expedition.monsterId ? monsterById(expedition.monsterId) : undefined;
  if (!monster) throw new PrimalDomainError('monster-unavailable', 'Choose a monster before its aggression level.');
  if (!monster.aggressionLevels.includes(aggression)) {
    throw new PrimalDomainError('aggression-unavailable', `${monster.name} has no aggression level ${aggression}.`);
  }
  // A trial card fixes the level: the choice is not the player's to make.
  const hunt = trialHuntForScenario(expedition.scenarioId);
  if (hunt && aggression !== hunt.aggression) {
    throw new PrimalDomainError(
      'aggression-unavailable',
      `${hunt.name} is played at aggression level ${hunt.aggression}.`,
    );
  }
  // Aggression decides the stance I card's toughness: seed it while the board is still at setup.
  const monsterState = isIdleMonsterState(expedition.monsterState, expedition.hunters.length)
    ? setupMonsterState({ ...expedition, aggression })
    : expedition.monsterState;
  return refreshStatus({ ...expedition, aggression, monsterState, updatedAt: now });
}

/** Toggles the Nightmare variant while the boxes carry the expansion: the stance cards
 *  join the behavior decks. A trial card that prints no Nightmare rows carries no
 *  variant — the card plays standard whatever the toggle says. The stance I seed follows
 *  the flip while the board is still at setup. */
export function setExpeditionNightmareVariant(expedition: Expedition, on: boolean, now: string): Expedition {
  if (on && !expedition.expansionIds.includes('nightmare')) {
    throw new PrimalDomainError('expansion-required', 'The Nightmare variant needs the Nightmare Expansion.');
  }
  const next = on && trialHuntForScenario(expedition.scenarioId)?.nightmareVariant !== 'none';
  if (expedition.nightmareVariant === next) return expedition;
  const monsterState = isIdleMonsterState(expedition.monsterState, expedition.hunters.length)
    ? setupMonsterState({ ...expedition, nightmareVariant: next })
    : expedition.monsterState;
  return { ...expedition, monsterState, nightmareVariant: next, updatedAt: now };
}

export function setExpeditionScenario(expedition: Expedition, scenarioId: string, now: string): Expedition {
  const scenario = scenarioById(scenarioId);
  if (!scenario || scenario.monsterId !== expedition.monsterId) {
    throw new PrimalDomainError('scenario-mismatch', 'The scenario does not belong to the selected monster.');
  }
  const missing = scenario.requiredExpansionIds.filter((id) => id !== 'core' && !expedition.expansionIds.includes(id));
  if (missing.length > 0) {
    throw new PrimalDomainError(
      'scenario-unavailable',
      'That scenario needs an expansion this expedition does not include.',
    );
  }
  // Picking a trial card settles its fixed aggression: the stance seed follows the level.
  const hunt = scenario.trialId ? trialHuntById(scenario.trialId) : undefined;
  const aggression = hunt ? hunt.aggression : expedition.aggression;
  // A trial card that prints no Nightmare rows carries no variant: the card plays standard.
  const nightmareVariant = hunt?.nightmareVariant === 'none' ? false : expedition.nightmareVariant;
  // The stance seed follows the level and the variant: reseed while the board is still at setup.
  const monsterState =
    (aggression !== expedition.aggression || nightmareVariant !== expedition.nightmareVariant) &&
    isIdleMonsterState(expedition.monsterState, expedition.hunters.length)
      ? setupMonsterState({ ...expedition, aggression, nightmareVariant })
      : expedition.monsterState;
  return refreshStatus({ ...expedition, aggression, monsterState, nightmareVariant, scenarioId, updatedAt: now });
}

/**
 * Records the fight's result. A trial card's score is tallied once, in the same confirm :
 * the worksheet's answers ride with the result (cards that score only on victory, or a plain
 * non-trial hunt, record without a score).
 */
export function recordExpeditionResult(
  expedition: Expedition,
  result: 'victory' | 'defeat',
  now: string,
  answers: readonly number[] = [],
): Expedition {
  if (expedition.status === 'draft') {
    throw new PrimalDomainError('expedition-incomplete', 'Finish the expedition setup before recording a result.');
  }
  if (expedition.status === 'played') {
    throw new PrimalDomainError('expedition-finished', 'The result is already recorded for this expedition.');
  }
  if (!expedition.monsterId) {
    throw new PrimalDomainError('monster-not-found', 'Choose a monster before recording a result.');
  }
  const hunt = trialHuntForScenario(expedition.scenarioId);
  const tally = hunt ? tallyTrial(hunt, result, answers) : null;
  return {
    ...expedition,
    huntHistory: appendHuntRecord(expedition, expedition.monsterId, result, now),
    huntTimer: stopHuntTimer(expedition.huntTimer, now),
    result,
    status: 'played',
    // The recorded sheet keeps the clamped answers the tally scored, so a correction
    // re-opens exactly what was counted.
    trialScore: tally ? { answers: tally.rows.map((row) => row.count), total: tally.total } : undefined,
    updatedAt: now,
  };
}

/** Re-tallies a played trial card's score sheet: the result dialog records the score
 *  once, with the fight; this corrects it when a table fact was mis-entered. */
export function correctExpeditionTrialScore(
  expedition: Expedition,
  answers: readonly number[],
  now: string,
): Expedition {
  if (expedition.status !== 'played' || expedition.result === null) {
    throw new PrimalDomainError('expedition-incomplete', 'Record the hunt result before correcting its score.');
  }
  const hunt = trialHuntForScenario(expedition.scenarioId);
  if (!hunt) throw new PrimalDomainError('scenario-mismatch', 'This expedition is not a trial hunt.');
  const tally = tallyTrial(hunt, expedition.result, answers);
  return {
    ...expedition,
    trialScore: tally ? { answers: tally.rows.map((row) => row.count), total: tally.total } : undefined,
    updatedAt: now,
  };
}

/** A fresh run of the same quest: the setup: party with its builds, target, aggression and
 *  scenario: carries over untouched; the fight resets (timer, monster and hunter boards,
 *  consumed potions, score) so a new outcome can be recorded. */
export function replayExpedition(expedition: Expedition, id: string, now: string): Expedition {
  if (expedition.status !== 'played') {
    throw new PrimalDomainError('expedition-incomplete', 'Only a played expedition can be set up again.');
  }
  const hunters = expedition.hunters.map((member) => ({ ...member, consumedPotionIds: [] }));
  return refreshStatus({
    ...expedition,
    createdAt: now,
    fightEvents: [],
    fightStart: null,
    hunterState: syncHunterState(expeditionHunterIds(expedition), {}),
    hunters,
    huntHistory: [],
    huntTimer: idleHuntTimer(),
    id,
    monsterState: setupMonsterState({ ...expedition, hunters }),
    result: null,
    status: 'draft',
    trialScore: undefined,
    updatedAt: now,
  });
}

export interface ExpeditionIssue {
  message: string;
  step: 'hunters' | 'monster' | 'aggression' | 'scenario';
}

export function validateExpedition(expedition: Expedition): ExpeditionIssue[] {
  const issues: ExpeditionIssue[] = validateParty(expeditionHunterIds(expedition), expedition.expansionIds).map(
    (issue) => ({
      message: issue.message,
      step: 'hunters' as const,
    }),
  );
  for (const member of expedition.hunters) {
    const hunter = hunterById(member.hunterId);
    if (hunter) {
      const report = validateDeck(member.deckCardIds, expeditionDeckContext(expedition, member, hunter));
      if (!report.valid) {
        issues.push({ message: `Action deck for ${hunter.name} is not legal.`, step: 'hunters' });
      }
    }
  }
  // A trial card can forbid an element outright: worn pieces must follow before the hunt.
  const hunt = trialHuntForScenario(expedition.scenarioId);
  if (hunt && hunt.forbiddenElementIds.length > 0) {
    for (const member of expedition.hunters) {
      const forbidden = wornEquipment(member.equipment).filter(
        (piece) => piece.element !== null && hunt.forbiddenElementIds.includes(piece.element),
      );
      if (forbidden.length > 0) {
        const hunter = hunterById(member.hunterId);
        issues.push({
          message: `${hunter?.name ?? 'A hunter'} wears equipment ${hunt.name} forbids.`,
          step: 'hunters',
        });
      }
    }
  }
  if (!expedition.monsterId) issues.push({ message: 'Choose the monster to hunt.', step: 'monster' });
  if (expedition.aggression === null) issues.push({ message: 'Choose an aggression level.', step: 'aggression' });
  if (!expedition.scenarioId) issues.push({ message: 'Choose one of the two Expedition scenarios.', step: 'scenario' });
  return issues;
}

function refreshStatus(expedition: Expedition): Expedition {
  if (expedition.status === 'played') return expedition;
  return { ...expedition, status: validateExpedition(expedition).length === 0 ? 'ready' : 'draft' };
}

// ---------------------------------------------------------------------------
// Setup checklist
// ---------------------------------------------------------------------------

export interface ChecklistItem {
  detail?: string;
  icon?: string | null;
  id: string;
  label: string;
}

export interface ChecklistSection {
  id: 'general' | 'monster' | 'terrain' | 'hunters';
  items: ChecklistItem[];
  title: string;
}

/** Table-side sector names. */
export const SECTOR_LABEL: Record<Sector, string> = {
  edges: 'Board edges',
  front: 'Front',
  'left-flank': 'Left flank',
  rear: 'Back',
  'right-flank': 'Right flank',
};

/** A placement without a fixed sector: the table decides where the token goes. */
const ANY_SECTOR_LABEL = 'Any sector';

/** A placed token's display name: catalog terrain or one of the cards' special tokens. */
const tokenLabel = (tokenId: string): string =>
  terrainById(tokenId)?.name ?? TRIAL_TOKEN_LABELS[tokenId as TrialTokenId] ?? tokenId;

/** Groups a trial card's placements by sector and token, counting the instances. */
function aggregatePlacements(placements: readonly TrialTerrainPlacement[]): {
  count: number;
  label: string;
  sector: Sector | null;
  tokenId: string;
}[] {
  const grouped = new Map<string, { count: number; label: string; sector: Sector | null; tokenId: string }>();
  for (const placement of placements) {
    const key = `${placement.sector}:${placement.terrainId}`;
    const existing = grouped.get(key);
    if (existing) existing.count += 1;
    else
      grouped.set(key, {
        count: 1,
        label: tokenLabel(placement.terrainId),
        sector: placement.sector as Sector | null,
        tokenId: placement.terrainId,
      });
  }
  return [...grouped.values()];
}

/** Builds the table-side setup checklist for a scenario, mirroring the rulebook's component lists. */
export function buildSetupChecklist(
  scenario: ExpeditionScenario,
  monster: Monster,
  hunterIds: readonly string[],
  aggression: AggressionLevel,
): ChecklistSection[] {
  const hunt = scenario.trialId ? trialHuntById(scenario.trialId) : undefined;
  // A trial card's board setup: every placed token: catalog terrain and the cards' special
  // tokens alike: plus the setup pieces the diagram does not place on the board itself.
  const terrain: ChecklistItem[] = hunt
    ? [
        ...aggregatePlacements(hunt.terrain).map((entry, index) => ({
          detail: entry.sector === null ? ANY_SECTOR_LABEL : SECTOR_LABEL[entry.sector],
          icon: terrainById(entry.tokenId)?.icon ?? null,
          id: `terrain-${index}`,
          label: `${entry.label} ×${entry.count}`,
        })),
        ...hunt.components
          .filter(
            (component) =>
              !component.terrainId &&
              !hunt.terrain.some((placement) => tokenLabel(placement.terrainId) === component.label),
          )
          .map((component, index) => ({
            detail: 'Per the trial card',
            icon: null,
            id: `component-${index}`,
            label: `${component.label}${component.count ? ` ×${component.count}` : ''}`,
          })),
      ]
    : scenario.terrain.map((placement, index) => {
        const token = terrainById(placement.terrainId);
        return {
          detail: placement.sector === null ? ANY_SECTOR_LABEL : SECTOR_LABEL[placement.sector],
          icon: token?.icon ?? null,
          id: `terrain-${index}`,
          label: `${token?.name ?? placement.terrainId} ×${placement.count}`,
        };
      });

  const hunterItems: ChecklistItem[] = hunterIds.flatMap((id) => {
    const hunter = hunterById(id);
    if (!hunter) return [];
    const weapon = weaponClassById(hunter.classId);
    return [
      {
        detail: `${weapon.name} · hunter board, miniature and mastery card`,
        icon: weapon.icon,
        id: `hunter-${id}`,
        label: hunter.name,
      },
    ];
  });

  return [
    {
      id: 'general',
      items: [
        { id: 'board', label: 'Combat board' },
        { id: 'round-marker', label: 'Round marker on space 1' },
        { id: 'first-player', label: 'First player and Aggro tokens' },
        { id: 'attrition', label: 'Attrition deck (10 cards), shuffled' },
        { id: 'tokens', label: 'Stamina, struggle, strain, damage, threatened and KO tokens' },
      ],
      title: 'General',
    },
    {
      id: 'monster',
      items: [
        {
          detail: 'Centre of the board, facing the front sector',
          icon: monster.trophyIcon,
          id: 'miniature',
          label: `${monster.name} miniature`,
        },
        {
          detail: 'Set health for the selected aggression level',
          id: 'monster-board',
          label: `${monster.name} monster board`,
        },
        { detail: 'Top 3 cards face down in the behavior slots', id: 'behavior', label: 'Behavior deck, shuffled' },
        {
          detail: 'With its Peril and Objective cards',
          id: 'stance',
          label: `Stance I card: aggression ${aggression}`,
        },
        ...scenario.specialRules.map((rule, index) => ({ detail: rule.text, id: `rule-${index}`, label: rule.title })),
      ],
      title: 'Monster',
    },
    { id: 'terrain', items: terrain, title: 'Terrain' },
    {
      id: 'hunters',
      items: [
        ...hunterItems,
        { id: 'equipment', label: 'Equipment and Potion cards in the hunter board slots' },
        { id: 'decks', label: 'Action decks shuffled, draw 5 cards each' },
      ],
      title: 'Hunters',
    },
  ];
}

export function expeditionScenarios(expedition: Expedition): ExpeditionScenario[] {
  return expedition.monsterId ? availableScenarios(expedition.monsterId, expedition.expansionIds) : [];
}
