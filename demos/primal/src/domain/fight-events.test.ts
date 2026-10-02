import { describe, expect, it } from 'vitest';
import { potions, questId } from '../content';
import { commitQuestSelection, createCampaign, sendChapterEvent } from './campaign';
import { createExpedition, setExpeditionHunters } from './expedition';
import { deriveFightEvents, fightHistoryIssue, trackFightChange } from './fight-events';
import { fightProgress } from './fight-progress';
import { appendHuntRecord } from './hunt-history';
import { startSubjectHuntTimer } from './hunt-timer';
import { adjustHunterCounter, hunterMaxHealth, setHunterCondition } from './hunter-state';
import {
  adjustMonsterCounter,
  adjustMonsterToken,
  confirmMonsterWound,
  resetMonsterState,
  setMonsterStance,
  unleashMonster,
  woundThreshold,
} from './monster-state';
import type { Campaign } from './types';

const START = '2026-01-01T00:00:00.000Z';
const LATER = '2026-01-01T00:00:05.000Z';

const hunting = (): Campaign => {
  const campaign = createCampaign({
    config: { expansionIds: ['core'], name: 'Test hunt', nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah'],
    id: 'fight-events',
    now: START,
  });

  return sendChapterEvent(commitQuestSelection(campaign, questId(1), START), { type: 'FINISH_PREPARING' }, START);
};

describe('deriveFightEvents', () => {
  it('records a consumed potion once without inventing its tabletop effects', () => {
    const before = hunting();
    const potionId = potions[0]!.id;
    const after = {
      ...before,
      hunters: before.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, consumedPotionIds: [potionId] } : hunter,
      ),
    };
    const events = deriveFightEvents(before, after, { recordedAt: LATER });
    expect(events).toMatchObject([
      { actor: { hunterId: before.hunters[0]!.hunterId, kind: 'hunter' }, consumed: true, potionId, type: 'potion' },
    ]);
    expect(deriveFightEvents(after, after, { recordedAt: LATER })).toEqual([]);
    expect(deriveFightEvents(after, before, { recordedAt: LATER })).toMatchObject([
      { consumed: false, potionId, type: 'potion' },
    ]);
  });

  it('records unleash before the struggle reset to party size', () => {
    const before = adjustMonsterCounter(hunting(), 'struggle', 8, LATER);
    const events = deriveFightEvents(before, unleashMonster(before, LATER), {
      action: { type: 'monster-unleash' },
      recordedAt: LATER,
    });
    expect(events).toMatchObject([
      { type: 'unleash' },
      { counter: 'struggle', type: 'counter', value: before.hunters.length },
    ]);
  });
  it('restarts tracking on a roster change but keeps events when the same party is reordered', () => {
    const created = setExpeditionHunters(createExpedition('roster', ['core'], START), ['daeron', 'mirah'], START);
    const before = { ...created, monsterId: 'toramat', status: 'ready' as const };
    const tracked = trackFightChange(before, adjustHunterCounter(before, 'daeron', 'damage', 1, LATER), {
      action: { hunterId: 'daeron', type: 'hunter-damage' },
      recordedAt: LATER,
    });
    const reordered = setExpeditionHunters(tracked, ['mirah', 'daeron'], LATER);
    expect(reordered.fightEvents).toEqual(tracked.fightEvents);
    const changed = setExpeditionHunters(tracked, ['daeron', 'thoreg'], LATER);
    expect(changed.fightEvents).toEqual([]);
    expect(changed.fightStart).toBeNull();
    expect(changed.huntHistory).toEqual(tracked.huntHistory);
  });
  it('records equipment health facts changed during a fight and replays their effect', () => {
    const before = hunting();
    const after: Campaign = {
      ...before,
      hunters: before.hunters.map((hunter, index) =>
        index === 0 ? { ...hunter, equipment: { ...hunter.equipment, helmId: null } } : hunter,
      ),
    };
    const tracked = trackFightChange(before, after, { recordedAt: LATER });
    expect(tracked.fightEvents[0]).toMatchObject({ facts: { helmHealth: null }, type: 'build' });
    const history = appendHuntRecord(tracked, tracked.fightStart!.monsterId, 'victory', LATER);
    const points = fightProgress(history[0]!);
    expect(points.at(-1)!.partyHealth).toBe(points[0]!.partyHealth! - tracked.fightStart!.hunters.daeron!.helmHealth!);
    expect(
      fightHistoryIssue({
        events: tracked.fightEvents,
        hunterIds: tracked.hunters.map((hunter) => hunter.hunterId),
        monsterId: tracked.fightStart!.monsterId,
        start: tracked.fightStart,
      }),
    ).toBeNull();
  });
  it('records the reset monster board exactly and validates wounds after resetting a later stance', () => {
    const before = setMonsterStance(hunting(), 3, LATER);
    const reset = trackFightChange(before, resetMonsterState(before, LATER), {
      action: { type: 'monster-reset' },
      recordedAt: LATER,
    });
    expect(reset.fightEvents[0]).toMatchObject({ monsterState: reset.monsterState, type: 'reset' });
    const threshold = woundThreshold(reset.monsterState, reset.hunters.length);
    const ready = trackFightChange(reset, adjustMonsterCounter(reset, 'damage', threshold, LATER), {
      recordedAt: LATER,
    });
    const wounded = trackFightChange(ready, confirmMonsterWound(ready, LATER), {
      action: { type: 'monster-wound' },
      recordedAt: LATER,
    });
    expect(
      fightHistoryIssue({
        events: wounded.fightEvents,
        hunterIds: wounded.hunters.map((hunter) => hunter.hunterId),
        monsterId: wounded.fightStart!.monsterId,
        start: wounded.fightStart,
      }),
    ).toBeNull();
  });
  it('captures equivalent copied states and keeps the initial snapshot independent', () => {
    const before = hunting();
    const after = structuredClone(adjustHunterCounter(before, 'daeron', 'damage', 2, LATER));
    const tracked = trackFightChange(before, after, {
      action: { hunterId: 'daeron', type: 'hunter-damage' },
      recordedAt: LATER,
    });
    expect(tracked.fightEvents).toHaveLength(1);
    before.hunterState.daeron!.damage = 99;
    expect(tracked.fightStart?.hunters.daeron?.state.damage).toBe(0);
  });
  it('records a committed hunter damage delta with timer position', () => {
    const before = startSubjectHuntTimer(hunting(), START);
    const after = adjustHunterCounter(before, 'daeron', 'damage', 2, LATER);

    expect(
      deriveFightEvents(before, after, {
        action: { hunterId: 'daeron', type: 'hunter-damage' },
        recordedAt: LATER,
      }),
    ).toEqual([
      {
        actor: { hunterId: 'daeron', kind: 'hunter' },
        delta: 2,
        elapsedMs: 5000,
        recordedAt: LATER,
        sequence: 1,
        type: 'damage',
        value: 2,
      },
    ]);
  });

  it('records the damage that caused automatic knockout and the resulting KO token', () => {
    const before = hunting();
    const health = hunterMaxHealth(before.hunters[0]!);
    if (health === undefined) throw new Error('Daeron should have board health');
    const after = adjustHunterCounter(before, 'daeron', 'damage', health + 5, LATER);
    const events = deriveFightEvents(before, after, {
      action: { hunterId: 'daeron', type: 'hunter-damage' },
      recordedAt: LATER,
    });

    expect(events).toMatchObject([
      { delta: health, type: 'damage', value: health },
      { token: 'red', type: 'knockout' },
    ]);
  });

  it('records wound readiness and an explicitly confirmed physical wound', () => {
    const before = hunting();
    const threshold = woundThreshold(before.monsterState, before.hunters.length);
    const ready = adjustMonsterCounter(before, 'damage', threshold, LATER);
    const readyEvents = deriveFightEvents(before, ready, {
      recordedAt: LATER,
    });

    expect(readyEvents).toMatchObject([
      { delta: threshold, type: 'damage', value: threshold },
      { damage: threshold, threshold, type: 'wound-ready' },
    ]);

    const confirmed = confirmMonsterWound(ready, '2026-01-01T00:00:06.000Z');
    expect(
      deriveFightEvents(ready, confirmed, {
        action: { type: 'monster-wound' },
        recordedAt: '2026-01-01T00:00:06.000Z',
      }),
    ).toMatchObject([{ damageRemoved: threshold, stance: 1, type: 'wound' }]);
  });

  it('records monster effects and explicit stance changes', () => {
    const before = hunting();
    const tokenized = adjustMonsterToken(before, 'stun', 1, LATER);
    expect(
      deriveFightEvents(before, tokenized, {
        recordedAt: LATER,
      }),
    ).toMatchObject([{ active: true, effect: 'stun', type: 'effect' }]);

    const changed = setMonsterStance(before, 2, LATER);
    expect(deriveFightEvents(before, changed, { action: { type: 'monster-stance' }, recordedAt: LATER })).toMatchObject(
      [{ from: 1, to: 2, toughness: changed.monsterState.toughness, type: 'stance' }],
    );
  });

  it('records healing and hunter status changes from the state diff', () => {
    const damaged = adjustHunterCounter(hunting(), 'daeron', 'damage', 3, LATER);
    const healed = adjustHunterCounter(damaged, 'daeron', 'damage', -2, '2026-01-01T00:00:06.000Z');

    expect(
      deriveFightEvents(damaged, healed, {
        action: { hunterId: 'daeron', type: 'hunter-damage' },
        recordedAt: '2026-01-01T00:00:06.000Z',
      }),
    ).toMatchObject([{ delta: -2, type: 'damage', value: 1 }]);

    const before = hunting();
    const after = setHunterCondition(before, 'daeron', 'burning', true, LATER);
    expect(
      deriveFightEvents(before, after, {
        recordedAt: LATER,
      }),
    ).toMatchObject([{ active: true, effect: 'burning', type: 'effect' }]);
  });

  it('omits commands that do not change tracked state', () => {
    const before = hunting();
    const after = adjustMonsterCounter(before, 'damage', 0, LATER);

    expect(deriveFightEvents(before, after, { recordedAt: LATER })).toEqual([]);
  });

  it('does not record board cleanup when a command leaves the fight', () => {
    const before = adjustHunterCounter(hunting(), 'daeron', 'damage', 2, LATER);
    const after: Campaign = {
      ...before,
      hunterState: hunting().hunterState,
      phase: 'result',
    };
    expect(deriveFightEvents(before, after, { recordedAt: LATER })).toEqual([]);
  });
});
