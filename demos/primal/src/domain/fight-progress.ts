import { idleHunterState } from './hunter-state';
import type { HuntRecord } from './types';

export interface FightProgressPoint {
  key: number;
  masteryFocused: boolean;
  monsterDamage: number;
  partyHealth: number | null;
  sequence: number;
}

export function fightProgress(record: HuntRecord): FightProgressPoint[] {
  const states = new Map(
    Object.entries(record.fightStart.hunters).map(([id, hunter]) => [id, structuredClone(hunter.state)]),
  );
  const factsByHunter = new Map(
    Object.entries(record.fightStart.hunters).map(([id, hunter]) => [
      id,
      { armorHealth: hunter.armorHealth, helmHealth: hunter.helmHealth, masteryGoal: hunter.masteryGoal },
    ]),
  );
  let monsterTrack = record.fightStart.monsterState.damage;
  let woundedDamage = 0;
  const health = (): number | null => {
    let total = 0;
    for (const hunter of record.hunters) {
      const state = states.get(hunter.hunterId)!;
      const facts = factsByHunter.get(hunter.hunterId);
      if (!facts || !state || (facts.armorHealth === null && facts.helmHealth === null)) return null;
      const maximum =
        (state.depleted.armor ? 0 : (facts.armorHealth ?? 0)) + (state.depleted.helm ? 0 : (facts.helmHealth ?? 0));
      total += state.knockedOut === null ? Math.max(0, maximum - state.damage) : 0;
    }
    return record.hunters.length ? total : null;
  };
  const mode = fightTimelineMode(record);
  const points: FightProgressPoint[] = [
    { key: 0, masteryFocused: false, monsterDamage: monsterTrack, partyHealth: health(), sequence: 0 },
  ];
  for (const event of record.events) {
    let masteryFocused = false;
    if (event.actor.kind === 'hunter') {
      const state = states.get(event.actor.hunterId);
      if (state) {
        if (event.type === 'build') factsByHunter.set(event.actor.hunterId, { ...event.facts });
        if (event.type === 'damage') state.damage = event.value;
        if (event.type === 'knockout') {
          if (state.knockedOut === null && event.token !== null) {
            states.set(event.actor.hunterId, {
              ...idleHunterState(),
              depleted: { ...state.depleted },
              knockedOut: event.token,
            });
          } else {
            state.knockedOut = event.token;
          }
        }
        if (event.type === 'counter') {
          const goal = factsByHunter.get(event.actor.hunterId)?.masteryGoal;
          masteryFocused =
            event.counter === 'mastery' &&
            goal !== null &&
            goal !== undefined &&
            goal > 0 &&
            event.value >= goal &&
            event.value - event.delta < goal;
        }
        if (event.type === 'depletion') state.depleted[event.slot] = event.depleted;
        if (event.type === 'reset') states.set(event.actor.hunterId, idleHunterState());
      }
    } else {
      if (event.type === 'damage') monsterTrack = event.value;
      if (event.type === 'wound') {
        woundedDamage += event.damageRemoved;
        monsterTrack = Math.max(0, monsterTrack - event.damageRemoved);
      }
      if (event.type === 'reset') monsterTrack = event.monsterState?.damage ?? 0;
    }
    points.push({
      key: mode === 'sequence' ? event.sequence : event.elapsedMs!,
      masteryFocused,
      monsterDamage: woundedDamage + monsterTrack,
      partyHealth: health(),
      sequence: event.sequence,
    });
  }
  const finalPoint = points.at(-1)!;
  if (mode === 'time' && record.durationMs !== null && record.durationMs > finalPoint.key) {
    points.push({ ...finalPoint, key: record.durationMs });
  }
  return points;
}

export function fightTimelineMode(record: Pick<HuntRecord, 'durationMs' | 'events'>): 'time' | 'sequence' {
  return record.durationMs !== null &&
    record.events.every(
      (event, index) =>
        event.elapsedMs !== null && (index === 0 || event.elapsedMs >= (record.events[index - 1]!.elapsedMs ?? 0)),
    )
    ? 'time'
    : 'sequence';
}
