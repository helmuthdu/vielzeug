import { describe, expect, it } from 'vitest';
import { hunterById } from '../content';
import { baseEquipment } from './deck';
import { snapshotFightStart } from './fight-events';
import { fightProgress } from './fight-progress';
import { hunterMaxHealth, idleHunterState } from './hunter-state';
import { idleMonsterState } from './monster-state';
import type { HuntEvent, HuntRecord } from './types';

const hunter = {
  deckCardIds: [],
  equipment: baseEquipment(hunterById('daeron')!),
  hunterId: 'daeron',
  masteryCardId: '',
};
const record = (events: HuntEvent[]): HuntRecord => ({
  durationMs: null,
  events,
  fightStart: snapshotFightStart(
    { hunterState: { daeron: idleHunterState() }, hunters: [hunter], monsterState: idleMonsterState(1) },
    'toramat',
  ),
  hunters: [structuredClone(hunter)],
  id: 'progress',
  monsterId: 'toramat',
  outcome: 'victory',
  recordedAt: '2026-01-01T00:00:00.000Z',
});
const meta = { elapsedMs: null, recordedAt: '2026-01-01T00:00:00.000Z' };

describe('fightProgress', () => {
  it('starts from recorded boards and does not recalculate historical equipment health', () => {
    const input = record([]);
    input.fightStart.hunters.daeron!.state.damage = 2;
    input.fightStart.hunters.daeron!.armorHealth = 10;
    input.fightStart.hunters.daeron!.helmHealth = 3;
    input.fightStart.monsterState.damage = 7;
    input.hunters[0]!.equipment = { armorId: null, helmId: null, itemId: null, weaponId: null };
    expect(fightProgress(input)[0]).toMatchObject({ monsterDamage: 7, partyHealth: 11 });
  });

  it('uses sequence positions for events recorded before the timer started or after reset', () => {
    const input = record([
      { ...meta, actor: { kind: 'monster', monsterId: 'toramat' }, delta: 1, sequence: 1, type: 'damage', value: 1 },
      {
        ...meta,
        actor: { kind: 'monster', monsterId: 'toramat' },
        delta: 1,
        elapsedMs: 100,
        sequence: 2,
        type: 'damage',
        value: 2,
      },
    ]);
    input.durationMs = 200;
    expect(fightProgress(input).map((point) => point.key)).toEqual([0, 1, 2]);
    input.events[0]!.elapsedMs = 150;
    expect(fightProgress(input).map((point) => point.key)).toEqual([0, 1, 2]);
  });

  it('does not erase damage edited while knocked out when the KO token flips or clears', () => {
    const actor = { hunterId: 'daeron', kind: 'hunter' as const };
    const input = record([
      { ...meta, actor, sequence: 1, token: 'red', type: 'knockout' },
      { ...meta, actor, delta: 1, sequence: 2, type: 'damage', value: 1 },
      { ...meta, actor, sequence: 3, token: 'black', type: 'knockout' },
      { ...meta, actor, sequence: 4, token: null, type: 'knockout' },
    ]);
    expect(fightProgress(input).at(-1)?.partyHealth).toBe(hunterMaxHealth(hunter)! - 1);
  });
  it('preserves damage spent on wounds while monster healing reduces net damage', () => {
    const actor = { kind: 'monster' as const, monsterId: 'toramat' };
    const points = fightProgress(
      record([
        { ...meta, actor, delta: 12, sequence: 1, type: 'damage', value: 12 },
        { ...meta, actor, damageRemoved: 10, sequence: 2, stance: 1, type: 'wound' },
        { ...meta, actor, delta: -1, sequence: 3, type: 'damage', value: 1 },
      ]),
    );
    expect(points.map((point) => point.monsterDamage)).toEqual([0, 12, 12, 11]);
  });

  it('reconstructs damage, healing, knockout and recovery without treating cleared KO tracks as health', () => {
    const actor = { hunterId: 'daeron', kind: 'hunter' as const };
    const maximum = hunterMaxHealth(hunter)!;
    const points = fightProgress(
      record([
        { ...meta, actor, delta: 2, sequence: 1, type: 'damage', value: 2 },
        { ...meta, actor, delta: -1, sequence: 2, type: 'damage', value: 1 },
        { ...meta, actor, sequence: 3, token: 'red', type: 'knockout' },
        { ...meta, actor, sequence: 4, token: null, type: 'knockout' },
      ]),
    );
    expect(points.map((point) => point.partyHealth)).toEqual([maximum, maximum - 2, maximum - 1, 0, maximum]);
  });

  it('reduces recovered health when armor is depleted and restores the board on reset', () => {
    const actor = { hunterId: 'daeron', kind: 'hunter' as const };
    const depletedHealth = hunterMaxHealth(hunter, { armor: true, helm: false });
    const points = fightProgress(
      record([
        { ...meta, actor, sequence: 1, token: 'red', type: 'knockout' },
        { ...meta, actor, depleted: true, sequence: 2, slot: 'armor', type: 'depletion' },
        { ...meta, actor, sequence: 3, token: null, type: 'knockout' },
        { ...meta, actor, monsterState: null, scope: 'hunter', sequence: 4, type: 'reset' },
      ]),
    );
    expect(points[3]?.partyHealth).toBe(depletedHealth);
    expect(points[4]?.partyHealth).toBe(hunterMaxHealth(hunter));
  });

  it('does not invent health for unknown equipment', () => {
    const input = record([]);
    input.hunters[0] = { ...hunter, equipment: { armorId: null, helmId: null, itemId: null, weaponId: null } };
    input.fightStart.hunters.daeron!.armorHealth = null;
    input.fightStart.hunters.daeron!.helmHealth = null;
    expect(fightProgress(input)[0]?.partyHealth).toBeNull();
  });

  it('keeps simultaneous events ordered and extends the curve to the recorded finish', () => {
    const input = record([
      {
        ...meta,
        actor: { kind: 'monster', monsterId: 'toramat' },
        delta: 2,
        elapsedMs: 50,
        sequence: 1,
        type: 'damage',
        value: 2,
      },
      {
        ...meta,
        actor: { kind: 'monster', monsterId: 'toramat' },
        delta: -1,
        elapsedMs: 50,
        sequence: 2,
        type: 'damage',
        value: 1,
      },
    ]);
    input.durationMs = 100;
    expect(fightProgress(input).map(({ key, monsterDamage }) => [key, monsterDamage])).toEqual([
      [0, 0],
      [50, 2],
      [50, 1],
      [100, 1],
    ]);
  });
});
