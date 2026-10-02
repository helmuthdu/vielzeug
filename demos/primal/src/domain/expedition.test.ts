import { describe, expect, it } from 'vitest';
import {
  availableScenarios,
  CORE_EXPEDITIONS,
  EXPEDITION_SPECIAL_RULES,
  expeditionScenarios,
  hunterById,
  hunterCards,
  monsterById,
  scenarioById,
  scenariosByMonster,
  terrainById,
  terrainRuleText,
} from '../content';
import {
  applySubjectLoadout,
  consumeSubjectPotion,
  equipSubjectEquipment,
  equipSubjectPotion,
  setSubjectDeck,
  setSubjectMastery,
} from './build';
import { baseEquipment, expeditionDeckContext, validateDeck } from './deck';
import { PrimalDomainError } from './errors';
import {
  availableMonsters,
  buildSetupChecklist,
  correctExpeditionTrialScore,
  createExpedition,
  expeditionPotions,
  recordExpeditionResult,
  replayExpedition,
  setExpeditionAggression,
  setExpeditionHunters,
  setExpeditionMonster,
  setExpeditionNightmareVariant,
  setExpeditionScenario,
  validateExpedition,
} from './expedition';
import { pauseSubjectHuntTimer, resetSubjectHuntTimer, startSubjectHuntTimer } from './hunt-timer';
import {
  adjustHunterCounter,
  hunterMaxHealth,
  idleHunterState,
  resetHunterState,
  setHunterCondition,
  setHunterDepleted,
  setHunterKnockedOut,
} from './hunter-state';
import type { Expedition, Hunter, HunterLoadout } from './types';

const NOW = '2026-01-01T00:00:00.000Z';
const daeron = hunterById('daeron') as Hunter;

function ready() {
  let expedition = createExpedition('e1', ['core'], NOW);
  expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
  expedition = setExpeditionMonster(expedition, 'vyraxen', NOW);
  expedition = setExpeditionAggression(expedition, 1, NOW);
  return setExpeditionScenario(expedition, 'vyraxen-expedition-1', NOW);
}

describe('expedition setup', () => {
  it('starts as a draft listing every missing step', () => {
    const expedition = createExpedition('e1', ['core'], NOW);
    expect(expedition.status).toBe('draft');
    expect(validateExpedition(expedition).map((issue) => issue.step)).toEqual([
      'hunters',
      'monster',
      'aggression',
      'scenario',
    ]);
  });

  it('becomes ready once every step is valid', () => {
    const expedition = ready();
    expect(expedition.status).toBe('ready');
    expect(validateExpedition(expedition)).toEqual([]);
  });

  it('reports invalid hunter action decks and marks status as draft', () => {
    let expedition = ready();
    expedition = setSubjectDeck(expedition, 'daeron', [], NOW) as Expedition;
    expect(expedition.status).toBe('draft');
    expect(validateExpedition(expedition)).toContainEqual({
      message: expect.stringMatching(/action deck.*not legal/i),
      step: 'hunters',
    });
  });

  it('only offers monsters from enabled expansions', () => {
    expect(availableMonsters(['core']).some((monster) => monster.id === 'pazis')).toBe(false);
    expect(availableMonsters(['core', 'feather']).some((monster) => monster.id === 'pazis')).toBe(true);
    expect(() => setExpeditionMonster(createExpedition('e1', ['core'], NOW), 'pazis', NOW)).toThrow(PrimalDomainError);
  });

  it('resets aggression and scenario when the monster changes', () => {
    const expedition = setExpeditionMonster(ready(), 'toramat', NOW);
    expect(expedition.aggression).toBeNull();
    expect(expedition.scenarioId).toBeNull();
    expect(expedition.status).toBe('draft');
  });

  it('rejects aggression levels the monster does not have', () => {
    const expedition = setExpeditionMonster(createExpedition('e1', ['core'], NOW), 'vyraxen', NOW);
    expect(() => setExpeditionAggression(expedition, 7 as never, NOW)).toThrow(/aggression level/);
  });

  it('rejects scenarios that belong to another monster', () => {
    expect(() => setExpeditionScenario(ready(), 'toramat-expedition-1', NOW)).toThrow(PrimalDomainError);
  });

  it('records a result only for a ready expedition', () => {
    expect(() => recordExpeditionResult(createExpedition('e1', ['core'], NOW), 'victory', NOW)).toThrow(
      PrimalDomainError,
    );
    const expedition = ready();
    const played = recordExpeditionResult(expedition, 'victory', NOW);
    expect(played.status).toBe('played');
    expect(played.result).toBe('victory');
    expect(played.huntHistory?.[0]).toMatchObject({
      durationMs: null,
      monsterId: expedition.monsterId,
      outcome: 'victory',
      recordedAt: NOW,
    });
    expect(() => recordExpeditionResult(played, 'defeat', NOW)).toThrow(/already recorded/);
  });
});

describe('hunt timer', () => {
  const LATER = '2026-01-01T00:12:30.000Z';

  it('starts idle on a new expedition', () => {
    expect(createExpedition('e1', ['core'], NOW).huntTimer).toEqual({
      durationMs: null,
      elapsedMs: 0,
      startedAt: null,
    });
  });

  it('tracks start, pause, and reset', () => {
    const started = startSubjectHuntTimer(ready(), NOW);
    expect(started.huntTimer.startedAt).toBe(NOW);
    const paused = pauseSubjectHuntTimer(started, LATER);
    expect(paused.huntTimer).toEqual({ durationMs: null, elapsedMs: 750000, startedAt: null });
    expect(resetSubjectHuntTimer(paused, LATER).huntTimer.elapsedMs).toBe(0);
  });

  it('freezes the recorded duration when the result is recorded', () => {
    const started = startSubjectHuntTimer(ready(), NOW);
    const played = recordExpeditionResult(started, 'victory', LATER);
    expect(played.huntTimer).toEqual({ durationMs: 750000, elapsedMs: 750000, startedAt: null });
  });

  it('records no duration when the timer never ran', () => {
    expect(recordExpeditionResult(ready(), 'victory', LATER).huntTimer.durationMs).toBeNull();
  });
});

describe('hunter builds', () => {
  const LATER = '2026-01-01T00:12:30.000Z';
  const actionIds = (type: string) =>
    hunterCards(daeron)
      .filter((card) => card.kind === 'action' && card.subtype === type)
      .map((card) => card.id);

  it('joins with base equipment and the starter deck it asks for', () => {
    const expedition = setExpeditionHunters(createExpedition('e1', ['core'], NOW), ['daeron', 'ljonar'], NOW);
    const member = expedition.hunters[0];
    expect(member).toMatchObject({ equipment: baseEquipment(daeron), hunterId: 'daeron' });
    expect(member.deckCardIds).toHaveLength(24);
    expect(validateDeck(member.deckCardIds, expeditionDeckContext(expedition, member, daeron)).valid).toBe(true);
    expect(hunterMaxHealth(member)).toBeGreaterThan(0);
  });

  it('keeps existing builds when the party changes', () => {
    let expedition = setExpeditionHunters(createExpedition('e1', ['core'], NOW), ['daeron', 'ljonar'], NOW);
    expedition = equipSubjectEquipment(expedition, 'daeron', 'weapon', 'weapon-daeron-bloodreef-l1', NOW) as Expedition;
    expedition = setExpeditionHunters(expedition, ['daeron', 'mirah'], LATER);
    expect(expedition.hunters.map((member) => member.hunterId)).toEqual(['daeron', 'mirah']);
    expect(expedition.hunters[0].equipment.weaponId).toBe('weapon-daeron-bloodreef-l1');
  });

  it('wears any class-eligible piece from the enabled boxes, in the matching slot', () => {
    const expedition = ready();
    const worn = equipSubjectEquipment(expedition, 'daeron', 'item', 'forge-anyone-big-jaws-l1', NOW) as Expedition;
    expect(worn.hunters[0].equipment.itemId).toBe('forge-anyone-big-jaws-l1');
    expect(equipSubjectEquipment(worn, 'daeron', 'item', null, NOW).hunters[0].equipment.itemId).toBeNull();
    expect(() => equipSubjectEquipment(expedition, 'daeron', 'helm', 'forge-anyone-big-jaws-l1', NOW)).toThrow(/slot/);
    // Ljonar's weapon belongs to another class.
    expect(() => equipSubjectEquipment(expedition, 'daeron', 'weapon', 'weapon-ljonar-brass-wall-l1', NOW)).toThrow(
      PrimalDomainError,
    );
  });

  it('refits the deck to the new weapon and empties it without one', () => {
    const swapped = equipSubjectEquipment(ready(), 'daeron', 'weapon', 'weapon-daeron-bloodreef-l1', NOW) as Expedition;
    const member = swapped.hunters[0];
    const report = validateDeck(member.deckCardIds, expeditionDeckContext(swapped, member, daeron));
    expect(report.valid).toBe(true);
    expect(report.selected).toEqual({ attack: 5, dodge: 6, maneuver: 5, parry: 4 });
    expect(equipSubjectEquipment(swapped, 'daeron', 'weapon', null, NOW).hunters[0].deckCardIds).toEqual([]);
  });

  it('replaces the deck and reports its composition against the worn weapon', () => {
    const expedition = equipSubjectEquipment(
      ready() as Expedition,
      'daeron',
      'weapon',
      'weapon-daeron-bloodreef-l1',
      NOW,
    );
    const deck = [
      ...actionIds('Attack').slice(0, 5),
      ...actionIds('Maneuver').slice(0, 5),
      ...actionIds('Parry').slice(0, 4),
      ...actionIds('Dodge').slice(0, 6),
    ];
    const updated = setSubjectDeck(expedition, 'daeron', deck, LATER) as Expedition;
    expect(updated.hunters[0].deckCardIds).toEqual(deck);
    expect(validateDeck(deck, expeditionDeckContext(updated, updated.hunters[0], daeron)).valid).toBe(true);
    expect(() => setSubjectDeck(expedition, 'daeron', [...deck, deck[0]], LATER)).toThrow(
      expect.objectContaining({ code: 'deck-invalid' }),
    );
    expect(() => setSubjectDeck(expedition, 'daeron', ['hero-ljonar-nothing'], LATER)).toThrow(PrimalDomainError);
  });

  it('starts with the starter mastery and swaps it for any catalogued mastery of the hunter', () => {
    const expedition = ready();
    expect(expedition.hunters[0].masteryCardId).toBe('hero-daeron-relentless-assault-s');
    const branchMastery = 'hero-daeron-sword-master-e2';
    expect(
      expeditionDeckContext(expedition, expedition.hunters[0], daeron).availableMasteryIds.has(branchMastery),
    ).toBe(true);
    expect(setSubjectMastery(expedition, 'daeron', branchMastery, LATER).hunters[0].masteryCardId).toBe(branchMastery);
    expect(() => setSubjectMastery(expedition, 'daeron', 'hero-ljonar-nothing', LATER)).toThrow(
      expect.objectContaining({ code: 'loadout-invalid' }),
    );
  });

  it('applies a saved loadout for the same hunter and rejects pieces outside the enabled boxes', () => {
    const expedition = ready();
    const loadout: HunterLoadout = {
      createdAt: NOW,
      deckCardIds: expedition.hunters[0].deckCardIds,
      equipment: { ...baseEquipment(daeron), itemId: 'forge-anyone-big-jaws-l1' },
      hunterId: 'daeron',
      id: 'l1',
      masteryCardId: 'hero-daeron-relentless-assault-s',
      name: 'Jaws',
      potionLoadoutIds: ['herbalist-anyone-alemore-l3', null, null],
      rev: 0,
      strategy: '',
      updatedAt: NOW,
    };
    const applied = (applySubjectLoadout(expedition, 'daeron', loadout, LATER) as Expedition).hunters[0];
    expect(applied.equipment.itemId).toBe('forge-anyone-big-jaws-l1');
    expect(applied.potionLoadoutIds).toEqual(['herbalist-anyone-alemore-l3', null, null]);
    expect(() => applySubjectLoadout(expedition, 'ljonar', loadout, LATER)).toThrow(
      expect.objectContaining({ code: 'loadout-invalid' }),
    );
    const feather = { ...loadout, equipment: { ...loadout.equipment, itemId: 'forge-anyone-boomerang-l1' } };
    expect(() => applySubjectLoadout(expedition, 'daeron', feather, LATER)).toThrow(
      expect.objectContaining({ code: 'loadout-unavailable' }),
    );
  });

  it('offers every potion from the enabled boxes and keeps each in one slot', () => {
    const expedition = ready();
    expect(expedition.hunters[0]).toMatchObject({ consumedPotionIds: [], potionLoadoutIds: [null, null, null] });
    expect(expeditionPotions(expedition).map((potion) => potion.id)).toContain('herbalist-anyone-alemore-l3');
    const loaded = equipSubjectPotion(expedition, 'daeron', 1, 'herbalist-anyone-alemore-l3', NOW) as Expedition;
    expect(loaded.hunters[0].potionLoadoutIds).toEqual([null, 'herbalist-anyone-alemore-l3', null]);
    expect(() => equipSubjectPotion(loaded, 'daeron', 0, 'herbalist-anyone-alemore-l3', NOW)).toThrow(
      PrimalDomainError,
    );
    expect(() => equipSubjectPotion(expedition, 'daeron', 0, 'no-such-potion', NOW)).toThrow(PrimalDomainError);
    expect(equipSubjectPotion(loaded, 'daeron', 1, null, NOW).hunters[0].potionLoadoutIds).toEqual([null, null, null]);
  });

  it('consumes a loaded potion once', () => {
    const loaded = equipSubjectPotion(ready() as Expedition, 'daeron', 0, 'herbalist-anyone-evok-l1', NOW);
    const consumed = consumeSubjectPotion(loaded, 'daeron', 'herbalist-anyone-evok-l1', LATER) as Expedition;
    expect(consumed.hunters[0].consumedPotionIds).toEqual(['herbalist-anyone-evok-l1']);
    expect(() => consumeSubjectPotion(consumed, 'daeron', 'herbalist-anyone-evok-l1', LATER)).toThrow(
      PrimalDomainError,
    );
    expect(() => consumeSubjectPotion(loaded, 'daeron', 'herbalist-anyone-alemore-l1', LATER)).toThrow(
      PrimalDomainError,
    );
  });

  it('freezes builds once the result is recorded', () => {
    const played = recordExpeditionResult(ready(), 'victory', NOW);
    expect(() => equipSubjectEquipment(played, 'daeron', 'item', null, LATER)).toThrow(PrimalDomainError);
    expect(() => setSubjectDeck(played, 'daeron', [], LATER)).toThrow(PrimalDomainError);
    expect(() => equipSubjectPotion(played, 'daeron', 0, 'herbalist-anyone-evok-l1', LATER)).toThrow(PrimalDomainError);
  });
});

describe('hunter state', () => {
  const LATER = '2026-01-01T00:12:30.000Z';

  it('starts empty and materializes an idle state per hunter when the party is set', () => {
    expect(createExpedition('e1', ['core'], NOW).hunterState).toEqual({});
    const expedition = setExpeditionHunters(createExpedition('e1', ['core'], NOW), ['daeron', 'ljonar'], NOW);
    expect(expedition.hunterState).toEqual({ daeron: idleHunterState(), ljonar: idleHunterState() });
  });

  it('follows party changes, preserving existing entries', () => {
    let expedition = setExpeditionHunters(createExpedition('e1', ['core'], NOW), ['daeron', 'ljonar'], NOW);
    expedition = adjustHunterCounter(expedition, 'daeron', 'damage', 1, NOW);
    expedition = setExpeditionHunters(expedition, ['daeron', 'mirah'], LATER);
    expect(expedition.hunterState.ljonar).toBeUndefined();
    expect(expedition.hunterState.daeron?.damage).toBe(1);
    expect(expedition.hunterState.mirah).toEqual(idleHunterState());
  });

  it('adjusts counters per hunter, clamped at zero', () => {
    let expedition = ready();
    expedition = adjustHunterCounter(expedition, 'daeron', 'strain', 1, NOW);
    expedition = adjustHunterCounter(expedition, 'daeron', 'strain', 1, NOW);
    expedition = adjustHunterCounter(expedition, 'daeron', 'strain', -1, NOW);
    expedition = adjustHunterCounter(expedition, 'daeron', 'mastery', 2, NOW);
    expedition = adjustHunterCounter(expedition, 'daeron', 'weapon', 3, NOW);
    expect(expedition.hunterState.daeron?.strain).toBe(1);
    expect(expedition.hunterState.daeron?.mastery).toBe(2);
    expect(expedition.hunterState.daeron?.weapon).toBe(3);
    expect(expedition.hunterState.ljonar?.strain).toBe(0);
    expect(expedition.hunterState.ljonar?.mastery).toBe(0);
    expect(expedition.hunterState.ljonar?.weapon).toBe(0);
    expect(adjustHunterCounter(expedition, 'daeron', 'strain', -1, NOW).hunterState.daeron?.strain).toBe(0);
    expect(adjustHunterCounter(expedition, 'daeron', 'strain', -1, NOW).hunterState.daeron?.strain).toBe(0);
  });

  it('toggles conditions as booleans, never counts', () => {
    const expedition = setHunterCondition(ready(), 'daeron', 'burning', true, NOW);
    expect(expedition.hunterState.daeron?.burning).toBe(true);
    expect(setHunterCondition(expedition, 'daeron', 'burning', false, LATER).hunterState.daeron?.burning).toBe(false);
  });

  it('grants aggro to one hunter at a time, clearing the previous holder', () => {
    let expedition = setHunterCondition(ready(), 'daeron', 'aggro', true, NOW);
    expect(expedition.hunterState.daeron?.aggro).toBe(true);
    expect(expedition.hunterState.ljonar?.aggro).toBe(false);
    expedition = setHunterCondition(expedition, 'ljonar', 'aggro', true, LATER);
    expect(expedition.hunterState.ljonar?.aggro).toBe(true);
    expect(expedition.hunterState.daeron?.aggro).toBe(false);
    // Turning aggro off only affects the hunter toggled.
    expedition = setHunterCondition(expedition, 'ljonar', 'aggro', false, LATER);
    expect(expedition.hunterState.ljonar?.aggro).toBe(false);
    expect(expedition.hunterState.daeron?.aggro).toBe(false);
  });

  it('resets a hunter back to idle without touching the rest of the party', () => {
    let expedition = ready();
    expedition = adjustHunterCounter(expedition, 'daeron', 'damage', 1, NOW);
    expedition = setHunterCondition(expedition, 'ljonar', 'threatened', true, NOW);
    expedition = resetHunterState(expedition, 'daeron', LATER);
    expect(expedition.hunterState.daeron).toEqual(idleHunterState());
    expect(expedition.hunterState.ljonar?.threatened).toBe(true);
  });

  it('knocks a hunter out when damage reaches the health of the worn armor and helm', () => {
    let expedition = equipSubjectEquipment(ready() as Expedition, 'daeron', 'armor', 'forge-anyone-base-armor-l1', NOW);
    expedition = equipSubjectEquipment(expedition, 'daeron', 'helm', 'forge-anyone-base-helm-l1', NOW) as Expedition;
    expect(hunterMaxHealth(expedition.hunters[0])).toBe(9);
    expedition = adjustHunterCounter(expedition, 'daeron', 'stamina', 2, NOW);
    expedition = setHunterCondition(expedition, 'daeron', 'burning', true, NOW);
    expedition = adjustHunterCounter(expedition, 'daeron', 'damage', 8, NOW);
    expect(expedition.hunterState.daeron?.knockedOut).toBeNull();
    expedition = adjustHunterCounter(expedition, 'daeron', 'damage', 3, LATER);
    // The rules remove every damage and other token; only the KO token (red side up) remains.
    expect(expedition.hunterState.daeron).toEqual({ ...idleHunterState(), knockedOut: 'red' });
    expect(expedition.hunterState.ljonar).toEqual(idleHunterState());
  });

  it('keeps the damage track unbounded when no worn piece prints health', () => {
    let expedition = equipSubjectEquipment(ready() as Expedition, 'daeron', 'armor', null, NOW);
    expedition = equipSubjectEquipment(expedition, 'daeron', 'helm', null, NOW) as Expedition;
    expect(hunterMaxHealth(expedition.hunters[0])).toBeUndefined();
    expedition = adjustHunterCounter(expedition, 'daeron', 'damage', 40, NOW);
    expect(expedition.hunterState.daeron?.damage).toBe(40);
    expect(expedition.hunterState.daeron?.knockedOut).toBeNull();
  });

  it('walks the KO token from red to black to standing, clearing tokens only when knocked out', () => {
    let expedition = adjustHunterCounter(ready(), 'daeron', 'defense', 1, NOW);
    expedition = setHunterKnockedOut(expedition, 'daeron', 'red', NOW);
    expect(expedition.hunterState.daeron).toEqual({ ...idleHunterState(), knockedOut: 'red' });
    expedition = adjustHunterCounter(expedition, 'daeron', 'stamina', 1, NOW);
    expedition = setHunterKnockedOut(expedition, 'daeron', 'black', LATER);
    expect(expedition.hunterState.daeron).toEqual({ ...idleHunterState(), knockedOut: 'black', stamina: 1 });
    expedition = setHunterKnockedOut(expedition, 'daeron', null, LATER);
    expect(expedition.hunterState.daeron).toEqual({ ...idleHunterState(), stamina: 1 });
    expect(
      resetHunterState(setHunterKnockedOut(expedition, 'daeron', 'red', NOW), 'daeron', NOW).hunterState.daeron,
    ).toEqual(idleHunterState());
  });

  it('depletes one piece of a knocked-out hunter, shrinking the health the next knockout requires', () => {
    let expedition = ready();
    expect(hunterMaxHealth(expedition.hunters[0])).toBe(9);
    // The token is placed while the hunter is knocked out, and survives the rise.
    expedition = setHunterKnockedOut(expedition, 'daeron', 'red', NOW);
    expedition = setHunterDepleted(expedition, 'daeron', 'armor', true, NOW);
    expect(hunterMaxHealth(expedition.hunters[0], expedition.hunterState.daeron?.depleted)).toBe(4);
    expedition = setHunterKnockedOut(expedition, 'daeron', null, LATER);
    expect(expedition.hunterState.daeron?.depleted).toEqual({ armor: true, helm: false });
  });

  it('requires a knockout and a worn piece before depleting, and only one piece per fight', () => {
    let expedition = equipSubjectEquipment(ready() as Expedition, 'daeron', 'helm', null, NOW);
    expect(() => setHunterDepleted(expedition, 'daeron', 'armor', true, NOW)).toThrow(/knocked out/);
    expedition = setHunterKnockedOut(expedition, 'daeron', 'red', NOW);
    expect(() => setHunterDepleted(expedition, 'daeron', 'helm', true, NOW)).toThrow(/wears no helm/);
    expedition = setHunterDepleted(expedition, 'daeron', 'armor', true, NOW);
    expect(() => setHunterDepleted(expedition, 'daeron', 'helm', true, NOW)).toThrow(/only one piece/);
  });

  it('takes the hunter out of the game on the second knockout, with nothing left to deplete', () => {
    let expedition = ready();
    expedition = setHunterKnockedOut(expedition, 'daeron', 'red', NOW);
    expedition = setHunterDepleted(expedition, 'daeron', 'armor', true, NOW);
    expedition = setHunterKnockedOut(expedition, 'daeron', null, NOW);
    // Four damage reaches the reduced health: no piece left to deplete, so this knockout is final.
    expedition = adjustHunterCounter(expedition, 'daeron', 'damage', 4, NOW);
    expect(expedition.hunterState.daeron).toEqual({
      ...idleHunterState(),
      depleted: { armor: true, helm: false },
      knockedOut: 'dead',
    });
    expect(() => setHunterKnockedOut(expedition, 'daeron', null, LATER)).toThrow(/out of the game/);
  });

  it('rejects updates for hunters outside the party', () => {
    expect(() => adjustHunterCounter(ready(), 'mirah', 'damage', 1, NOW)).toThrow(PrimalDomainError);
    expect(() => setHunterKnockedOut(ready(), 'mirah', 'red', NOW)).toThrow(PrimalDomainError);
    expect(() => setHunterCondition(ready(), 'mirah', 'dazed', true, NOW)).toThrow(PrimalDomainError);
  });

  it('freezes fight state once the result is recorded', () => {
    const played = recordExpeditionResult(ready(), 'victory', NOW);
    expect(() => adjustHunterCounter(played, 'daeron', 'damage', 1, LATER)).toThrow(PrimalDomainError);
    expect(() => setHunterCondition(played, 'daeron', 'burning', true, LATER)).toThrow(PrimalDomainError);
    expect(() => resetHunterState(played, 'daeron', LATER)).toThrow(PrimalDomainError);
  });
});

describe('scenario content', () => {
  it('includes gameplay effects for core terrain references', () => {
    expect(terrainById('rock')?.rule.effect).toContain('prevent that damage');
    expect(terrainById('water')?.rule.effect).toContain('sequence limit is 3 instead of 5');
    expect(terrainById('brush')?.rule.effect).toContain('recycle a Dodge card');
    expect(terrainById('swamp')?.rule.timing).toContain('stamina cost for a Dodge card');
    expect(terrainById('ice')?.rule).toMatchObject({
      condition: expect.stringContaining('threatened'),
      effect: expect.stringContaining('Exile the top card'),
      status: 'verified',
      timing: 'At the end of your turn',
    });
    expect(terrainById('jungle-brush')?.rule).toMatchObject({
      condition: expect.stringContaining('Jungle Brush terrain token'),
      effect: expect.stringContaining('recycle an Aggro card'),
      status: 'verified',
      timing: 'At the start of your Movement phase',
    });
    expect(terrainById('deep-water')?.rule).toMatchObject({
      effect: expect.stringContaining('hand-size limit is reduced by 1'),
      status: 'verified',
      timing: 'While in this sector',
    });
    expect(terrainRuleText(terrainById('brush')!)).toContain('Only one player at a time can hide');
    expect(terrainRuleText(terrainById('jungle-brush')!)).toContain('Only one player at a time can hide');
    expect(terrainRuleText(terrainById('deep-water')!)).toContain('hand-size limit is reduced by 1');
    expect(terrainById('fire')?.rule.status).toBe('verified');
    expect(terrainRuleText(terrainById('fire')!)).toContain('red side up');
  });

  it('maps expansion terrain to its token artwork', () => {
    expect(terrainById('ice')?.icon).toBe('/terrain_tokens/ice.png');
    expect(terrainById('jungle-brush')?.icon).toBe('/terrain_tokens/jungle_brush.png');
    expect(terrainById('swamp')?.icon).toBe('/terrain_tokens/swamp.png');
  });

  it('ships at least two scenarios per monster', () => {
    expect(scenariosByMonster('toramat')).toHaveLength(4);
    expect(scenariosByMonster('toramat')[0]?.terrain.length).toBeGreaterThan(0);
    // Six printed expeditions plus the "Ice and Fire" trial card.
    expect(scenariosByMonster('vyraxen')).toHaveLength(7);
  });

  it('offers only the scenarios whose box is enabled', () => {
    expect(availableScenarios('toramat', ['core']).map((scenario) => scenario.id)).toEqual([
      'toramat-expedition-1',
      'toramat-expedition-2',
    ]);
    expect(availableScenarios('toramat', ['core', 'biome-niz-maraga-sunset-plains'])).toHaveLength(4);
    expect(availableScenarios('pazis', ['feather']).map((scenario) => scenario.id)).toEqual([
      'pazis-expedition-1',
      'pazis-expedition-2',
    ]);
    // A trial card joins the pool only when every box it needs is enabled.
    expect(availableScenarios('vyraxen', ['core']).map((scenario) => scenario.id)).toEqual([
      'vyraxen-expedition-1',
      'vyraxen-expedition-2',
    ]);
    expect(availableScenarios('vyraxen', ['core', 'ice']).map((scenario) => scenario.id)).toContain(
      'trial-ice-and-fire',
    );
  });

  it('rejects scenarios from boxes the expedition does not include', () => {
    const core = setExpeditionMonster(createExpedition('e2', ['core'], NOW), 'tarragua', NOW);
    expect(() => setExpeditionScenario(core, 'tarragua-biome-goldarks-expedition-1', NOW)).toThrow(
      expect.objectContaining({ code: 'scenario-unavailable' }),
    );
    expect(() => setExpeditionScenario(core, 'tarragua-expedition-1', NOW)).not.toThrow();
  });

  it('validates the expedition catalog', () => {
    expect(CORE_EXPEDITIONS).toHaveLength(24);
    expect(expeditionScenarios).toHaveLength(96);

    const ids = expeditionScenarios.map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const scenario of expeditionScenarios) {
      const monster = monsterById(scenario.monsterId);
      expect(monster).toBeDefined();
      expect(scenario.number).toBeGreaterThanOrEqual(1);
      expect(scenario.number).toBeLessThanOrEqual(2);
      expect(scenario.rulebookPage).toBeGreaterThan(0);
      expect(scenario.terrain.length).toBeGreaterThan(0);
      expect(scenario.specialRules.length).toBeGreaterThanOrEqual(0);
      for (const placement of scenario.terrain) {
        expect(terrainById(placement.terrainId)).toBeDefined();
      }
    }

    const coreGrouped = new Map<string, number>();
    for (const scenario of CORE_EXPEDITIONS) {
      const monster = monsterById(scenario.monsterId);
      expect(monster?.expansionId).toBe('core');
      expect(scenario.specialRules.every((ruleId) => ruleId in EXPEDITION_SPECIAL_RULES)).toBe(true);
      coreGrouped.set(scenario.monsterId, (coreGrouped.get(scenario.monsterId) ?? 0) + 1);
    }
    expect([...coreGrouped.entries()].every(([, count]) => count === 2)).toBe(true);
    expect(coreGrouped.size).toBe(12);
  });

  it('creates expedition sessions from any scenario with required expansions', () => {
    const allBoxes: import('./types').ExpansionId[] = [
      'core',
      'nightmare',
      'nightmare-2',
      'feather',
      'venom',
      'ice',
      'heart-of-the-wild',
      'mount-havoc',
      'biome-endless-swamp-nightmare',
      'biome-goldarks-thunder-mountains',
      'biome-niz-maraga-sunset-plains',
      'biome-woltyar-frozen-wastes',
      'biome-crystal-caves-flooded-wilds',
    ];
    for (const scenario of expeditionScenarios) {
      const initial = createExpedition(`session-${scenario.id}`, allBoxes, NOW);
      const withHunters = setExpeditionHunters(initial, ['daeron', 'ljonar'], NOW);
      const withMonster = setExpeditionMonster(withHunters, scenario.monsterId, NOW);
      const withAggression = setExpeditionAggression(withMonster, 1, NOW);
      expect(() => setExpeditionScenario(withAggression, scenario.id, NOW)).not.toThrow();
    }
  });

  it('builds a grouped setup checklist', () => {
    const sections = buildSetupChecklist(
      scenarioById('vyraxen-expedition-1')!,
      monsterById('vyraxen')!,
      ['daeron', 'ljonar'],
      1,
    );
    expect(sections.map((section) => section.id)).toEqual(['general', 'monster', 'terrain', 'hunters']);
    const monsterSection = sections.find((section) => section.id === 'monster');
    expect(monsterSection?.items.some((item) => item.label.includes('aggression 1'))).toBe(true);
    expect(monsterSection?.items.find((item) => item.id === 'monster-board')?.detail).toBe(
      'Set health for the selected aggression level',
    );
    const hunterSection = sections.find((section) => section.id === 'hunters');
    expect(hunterSection?.items.map((item) => item.label)).toContain('Daeron');
  });
});

describe('trial hunts', () => {
  const withIce = ['core', 'ice'] as const;
  const trialExpedition = () => {
    let expedition = createExpedition('c1', ['core', 'ice'], NOW);
    expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
    return setExpeditionMonster(expedition, 'korowon', NOW);
  };

  it('coerces the aggression the card fixes', () => {
    let expedition = trialExpedition();
    expedition = setExpeditionAggression(expedition, 1, NOW);
    expect(expedition.aggression).toBe(1);
    // Korowon Stole Christmas! is printed at aggression 3: picking it settles the level.
    expedition = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    expect(expedition.aggression).toBe(3);
    expect(expedition.status).toBe('ready');
  });

  it('rejects a different aggression once the card is chosen', () => {
    let expedition = trialExpedition();
    expedition = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    expect(() => setExpeditionAggression(expedition, 1, NOW)).toThrow(
      expect.objectContaining({ code: 'aggression-unavailable' }),
    );
  });

  it('needs every box the card requires', () => {
    const core = setExpeditionMonster(createExpedition('c2', ['core'], NOW), 'vyraxen', NOW);
    expect(() => setExpeditionScenario(core, 'trial-ice-and-fire', NOW)).toThrow(
      expect.objectContaining({ code: 'scenario-unavailable' }),
    );
    const iced = setExpeditionMonster(createExpedition('c3', withIce, NOW), 'vyraxen', NOW);
    expect(() => setExpeditionScenario(iced, 'trial-ice-and-fire', NOW)).not.toThrow();
  });

  it('flags equipment the card forbids', () => {
    let expedition = trialExpedition();
    expedition = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    const issues = validateExpedition(expedition);
    // Korowon's card forbids Ice equipment; any worn piece would surface as a hunter issue.
    expect(issues.every((issue) => issue.step === 'hunters' || issue.step === 'scenario')).toBe(true);
    expect(issues.length).toBe(0);
  });

  it('lists the placed terrain tokens in the terrain section of the checklist', () => {
    const scenario = scenarioById('trial-trial-by-fire')!;
    const sections = buildSetupChecklist(scenario, monsterById('kharja')!, ['daeron'], 1);
    const terrain = sections.find((section) => section.id === 'terrain');
    // The card's board diagram: the Fire terrain and the Damage token both sit up front;
    // the miniature stays a listed component because the diagram does not place it.
    expect(terrain?.items.map((item) => item.label)).toEqual(['Fire ×1', 'Damage token ×1', 'Kharja miniature ×1']);
    expect(terrain?.items[0]?.detail).toBe('Front');
    expect(terrain?.items[2]?.detail).toBe('Per the trial card');
    const monster = sections.find((section) => section.id === 'monster');
    expect(monster?.items.filter((item) => item.id.startsWith('rule-'))).toHaveLength(3);
  });

  it("tallies the trial card's score with the recorded result", () => {
    let expedition = trialExpedition();
    expedition = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    expedition = recordExpeditionResult(expedition, 'victory', NOW, [1, 0, 0, 1, 0]);
    expect(expedition.trialScore?.total).toBe(70 + 20 - 5);
    expect(expedition.trialScore?.answers).toEqual([1, 0, 0, 1, 0]);
  });

  it('records results without a score where none is printed', () => {
    // Korowon's card scores only on victory: a defeat carries no sheet.
    let expedition = trialExpedition();
    expedition = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    expect(recordExpeditionResult(expedition, 'defeat', NOW, [1, 0, 0, 1, 0]).trialScore).toBeUndefined();
    // A regular expedition scenario has no score table at all.
    expect(recordExpeditionResult(ready(), 'victory', NOW, [1, 0, 0, 1, 0]).trialScore).toBeUndefined();
  });

  it("tallies cards that print 'even in case of defeat' on a defeat too", () => {
    let expedition = createExpedition('c4', ['core', 'nightmare'], NOW);
    expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
    expedition = setExpeditionMonster(expedition, 'taraska', NOW);
    expedition = setExpeditionScenario(expedition, 'trial-fire-beneath-the-mountain', NOW);
    const defeated = recordExpeditionResult(expedition, 'defeat', NOW, [2, 1, 0]);
    expect(defeated.trialScore?.total).toBe(30 + 2 * 10 - 5);
  });

  it("corrects a played hunt's score sheet when a table fact was mis-entered", () => {
    let expedition = trialExpedition();
    expedition = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    expedition = recordExpeditionResult(expedition, 'victory', NOW, [1, 0, 0, 0, 0]);
    expect(expedition.trialScore?.total).toBe(70 + 20);
    const corrected = correctExpeditionTrialScore(expedition, [1, 0, 0, 1, 0], NOW);
    expect(corrected.trialScore?.total).toBe(70 + 20 - 5);
    expect(corrected.trialScore?.answers).toEqual([1, 0, 0, 1, 0]);
    // Only a played trial hunt has a sheet to correct.
    expect(() => correctExpeditionTrialScore(trialExpedition(), [1, 0, 0, 1, 0], NOW)).toThrow(PrimalDomainError);
    expect(() => correctExpeditionTrialScore(ready(), [1, 0, 0, 1, 0], NOW)).toThrow(PrimalDomainError);
  });

  it('replays a played expedition with the setup intact and the fight reset', () => {
    let expedition = trialExpedition();
    expedition = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    expedition = recordExpeditionResult(expedition, 'victory', NOW, [1, 0, 0, 1, 0]);
    const replay = replayExpedition(expedition, 'r9', NOW);
    expect(replay.id).toBe('r9');
    expect(expedition.huntHistory).toHaveLength(1);
    expect(replay.huntHistory).toEqual([]);
    expect(replay.status).toBe('ready');
    expect(replay.result).toBeNull();
    expect(replay.trialScore).toBeUndefined();
    expect(replay.huntTimer.durationMs).toBeNull();
    // The setup carries over untouched: the party with its builds, target, aggression, scenario.
    expect(replay.hunters).toEqual(expedition.hunters);
    expect(replay.monsterId).toBe(expedition.monsterId);
    expect(replay.scenarioId).toBe(expedition.scenarioId);
    expect(replay.aggression).toBe(expedition.aggression);
    // Only a played hunt can be set up again.
    expect(() => replayExpedition(ready(), 'r10', NOW)).toThrow(PrimalDomainError);
  });
});

describe('nightmare variant', () => {
  /** A Kharja hunt with the Nightmare box on the table: Trial by Fire prints the
   *  Nightmare rows, so the variant rides it. */
  const variantHunt = () => {
    let expedition = createExpedition('c5', ['core', 'nightmare'], NOW);
    expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
    expedition = setExpeditionMonster(expedition, 'kharja', NOW);
    return setExpeditionScenario(expedition, 'trial-trial-by-fire', NOW);
  };

  it('needs the Nightmare Expansion to turn on', () => {
    let expedition = createExpedition('c6', ['core'], NOW);
    expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
    expedition = setExpeditionMonster(expedition, 'kharja', NOW);
    expect(() => setExpeditionNightmareVariant(expedition, true, NOW)).toThrow(
      expect.objectContaining({ code: 'expansion-required' }),
    );
  });

  it('carries the variant on a card that prints the Nightmare rows, reseeding the stance card', () => {
    // The card settles aggression 1: the standard stance I card seeds toughness 5.
    expect(variantHunt().monsterState.toughness).toBe(5);
    // Kharja's nightmare stance I card prints 6, not the standard 5.
    expect(setExpeditionNightmareVariant(variantHunt(), true, NOW)).toMatchObject({
      monsterState: { toughness: 6 },
      nightmareVariant: true,
    });
  });

  it('stays standard on a card that prints no Nightmare rows', () => {
    let expedition = createExpedition('c7', ['core', 'ice', 'nightmare'], NOW);
    expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
    expedition = setExpeditionMonster(expedition, 'korowon', NOW);
    expedition = setExpeditionNightmareVariant(expedition, true, NOW);
    // Korowon Stole Christmas! prints no Nightmare rows: the card vetoes the variant, and
    // its stance I seed is the standard 20, not the nightmare 22.
    const played = setExpeditionScenario(expedition, 'trial-korowon-stole-christmas', NOW);
    expect(played).toMatchObject({ monsterState: { toughness: 20 }, nightmareVariant: false });
  });

  it('keeps the variant on a generic scenario with the box on the table', () => {
    let expedition = createExpedition('c8', ['core', 'nightmare'], NOW);
    expedition = setExpeditionHunters(expedition, ['daeron', 'ljonar'], NOW);
    expedition = setExpeditionMonster(expedition, 'vyraxen', NOW);
    expedition = setExpeditionAggression(expedition, 1, NOW);
    expedition = setExpeditionScenario(expedition, 'vyraxen-expedition-1', NOW);
    expect(setExpeditionNightmareVariant(expedition, true, NOW).nightmareVariant).toBe(true);
  });

  it('records the clamped answers the tally scored', () => {
    let expedition = variantHunt();
    expedition = setExpeditionNightmareVariant(expedition, true, NOW);
    // The first-try flag row cannot hold more than one; the wire's 3 records as 1.
    const played = recordExpeditionResult(expedition, 'victory', NOW, [3, 0, 0, 1, 0]);
    expect(played.trialScore?.answers).toEqual([1, 0, 0, 1, 0]);
    expect(played.trialScore?.total).toBe(70 + 20 - 5);
  });

  it('carries the variant into a replay', () => {
    let expedition = variantHunt();
    expedition = setExpeditionNightmareVariant(expedition, true, NOW);
    expedition = recordExpeditionResult(expedition, 'victory', NOW, [1, 0, 0, 0, 0]);
    const replay = replayExpedition(expedition, 'r11', NOW);
    expect(replay.nightmareVariant).toBe(true);
    // The replay seeds at the variant's own stance card, like the hunt it repeats.
    expect(replay.monsterState.toughness).toBe(6);
  });
});
