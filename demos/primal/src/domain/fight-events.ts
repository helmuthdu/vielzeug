import { hunterById, hunterCardById, wornById } from '../content';
import { huntTimerMs } from './hunt-timer';
import { HUNTER_CONDITIONS, HUNTER_COUNTERS as HUNTER_TRACKS, hunterMaxHealth } from './hunter-state';
import {
  canWound,
  carrierMonster,
  MONSTER_TOKENS,
  MONSTER_COUNTERS as MONSTER_TRACKS,
  woundThreshold,
} from './monster-state';
import { liveTerrain } from './terrain';
import type { FightHunterFacts, FightStart, HuntEvent, HuntRecordHunter, HuntState, HuntSubject } from './types';
import { isAscentSubject, isCampaignSubject, isChallengeSubject } from './types';

type HuntEventDraft<Event = HuntEvent> = Event extends HuntEvent
  ? Omit<Event, 'elapsedMs' | 'recordedAt' | 'sequence'>
  : never;

export type FightAction =
  | { hunterId: string; type: 'hunter-damage' | 'hunter-knockout' | 'hunter-reset' }
  | { type: 'monster-reset' | 'monster-wound' | 'monster-stance' | 'monster-unleash' };

interface EventOptions {
  action?: FightAction;
  recordedAt: string;
}

function hunterFacts(member: Pick<HuntRecordHunter, 'hunterId' | 'equipment' | 'masteryCardId'>): FightHunterFacts {
  const hunter = hunterById(member.hunterId);
  const mastery = hunter ? hunterCardById(hunter, member.masteryCardId) : undefined;
  return {
    armorHealth: member.equipment.armorId ? (wornById(member.equipment.armorId)?.health ?? null) : null,
    helmHealth: member.equipment.helmId ? (wornById(member.equipment.helmId)?.health ?? null) : null,
    masteryGoal: mastery?.kind === 'mastery' ? (mastery.unfocused?.counters ?? 2) : null,
  };
}

export function snapshotFightStart(
  subject: Pick<HuntState, 'hunterState' | 'monsterState'> & {
    hunters: readonly Pick<HuntRecordHunter, 'hunterId' | 'equipment' | 'masteryCardId'>[];
  },
  monsterId: string,
): FightStart {
  return {
    hunters: Object.fromEntries(
      subject.hunters.map((member) => {
        const state = subject.hunterState[member.hunterId];
        if (!state) throw new Error(`Missing fight state for ${member.hunterId}.`);
        return [
          member.hunterId,
          {
            ...hunterFacts(member),
            state: structuredClone(state),
          },
        ];
      }),
    ),
    monsterId,
    monsterState: structuredClone(subject.monsterState),
  };
}

export function trackFightChange<T extends HuntSubject>(before: T, after: T, options: EventOptions): T {
  if (
    before.fightEvents.length !== after.fightEvents.length ||
    (before.fightStart !== null && after.fightStart === null)
  )
    return after;
  const monster = carrierMonster(before);
  if (!monster) return after;
  const events = deriveFightEvents(before, after, options);
  return events.length
    ? {
        ...after,
        fightEvents: [...before.fightEvents, ...events],
        fightStart: before.fightStart ?? snapshotFightStart(before, monster.id),
      }
    : after;
}

function isActiveFight(subject: HuntSubject): boolean {
  if (isCampaignSubject(subject)) return subject.phase === 'hunt';
  if (isAscentSubject(subject) || isChallengeSubject(subject)) return subject.phase === 'hunt';
  return subject.status === 'ready';
}

export function trackedFightIssue(subject: HuntSubject): string | null {
  if (
    !Array.isArray(subject.hunters) ||
    !Array.isArray(subject.fightEvents) ||
    subject.hunters.some((hunter) => !hunter || typeof hunter.hunterId !== 'string')
  )
    return 'Invalid fight subject structure.';
  const monsterId = subject.fightStart?.monsterId ?? carrierMonster(subject)?.id ?? null;
  if (subject.fightStart && isActiveFight(subject) && monsterId !== carrierMonster(subject)?.id)
    return 'Active fight snapshot names a different monster.';
  return fightHistoryIssue({
    events: subject.fightEvents,
    hunterIds: subject.hunters.map((hunter) => hunter.hunterId),
    monsterId,
    start: subject.fightStart,
  });
}

export function fightHistoryIssue(input: {
  events: readonly HuntEvent[];
  hunterIds: readonly string[];
  monsterId: string | null;
  start: FightStart | null;
  durationMs?: number | null;
}): string | null {
  const { events, hunterIds, monsterId, start } = input;
  if (!Array.isArray(events) || !Array.isArray(hunterIds)) return 'Invalid fight history structure.';
  if (!start) return events.length ? 'Fight events require an initial snapshot.' : null;
  if (!start.hunters || !start.monsterState || Object.values(start.hunters).some((hunter) => !hunter?.state))
    return 'Invalid fight snapshot structure.';
  if (
    start.monsterId !== monsterId ||
    new Set(hunterIds).size !== hunterIds.length ||
    Object.keys(start.hunters).length !== hunterIds.length ||
    hunterIds.some((id) => !Object.hasOwn(start.hunters, id))
  )
    return 'Fight snapshot actors do not match the party and monster.';
  const values = new Map<string, number>();
  const knockouts = new Map(hunterIds.map((id) => [id, start.hunters[id]!.state.knockedOut]));
  const key = (id: string, counter: string): string => `${id}:${counter}`;
  for (const id of hunterIds)
    for (const counter of HUNTER_TRACKS) values.set(key(id, counter), start.hunters[id]!.state[counter]);
  for (const counter of MONSTER_TRACKS) values.set(key(monsterId!, counter), start.monsterState[counter]);
  let stance = start.monsterState.stance;
  for (const [index, event] of events.entries()) {
    if (!event?.actor || typeof event.recordedAt !== 'string') return 'Invalid fight event structure.';
    const id = event.actor.kind === 'hunter' ? event.actor.hunterId : event.actor.monsterId;
    if (event.actor.kind === 'hunter' ? !hunterIds.includes(id) : id !== monsterId)
      return 'Event actor does not belong to this fight.';
    const time = Date.parse(event.recordedAt);
    if (!Number.isFinite(time) || event.sequence !== index + 1) return 'Fight event order is invalid.';
    if (
      input.durationMs !== undefined &&
      input.durationMs !== null &&
      event.elapsedMs !== null &&
      event.elapsedMs > input.durationMs
    )
      return 'Event timer position exceeds the recorded duration.';
    if (event.type === 'counter' || event.type === 'damage') {
      const counter = event.type === 'damage' ? 'damage' : event.counter;
      const tracks = event.actor.kind === 'hunter' ? HUNTER_TRACKS : MONSTER_TRACKS;
      if (!tracks.some((track) => track === counter)) return 'Event counter does not belong to its actor.';
      const previous = values.get(key(id, counter));
      if ((previous !== undefined && previous + event.delta !== event.value) || event.value - event.delta < 0)
        return 'Event delta contradicts its track value.';
      values.set(key(id, counter), event.value);
    }
    if (event.type === 'effect') {
      const effects = event.actor.kind === 'hunter' ? HUNTER_CONDITIONS : MONSTER_TOKENS;
      if (!effects.some((effect) => effect === event.effect)) return 'Event effect does not belong to its actor.';
    }
    if (event.type === 'knockout') {
      if (knockouts.get(id) === null && event.token !== null)
        for (const counter of HUNTER_TRACKS) values.set(key(id, counter), 0);
      knockouts.set(id, event.token);
    }
    if (event.type === 'depletion' && event.depleted && knockouts.get(id) === null)
      return 'Equipment depletion requires a knocked-out hunter.';
    if (event.type === 'reset') {
      if (
        event.scope !== event.actor.kind ||
        (event.scope === 'hunter' ? event.monsterState !== null : !event.monsterState)
      )
        return 'Reset scope does not match its recorded board.';
      const tracks = event.scope === 'hunter' ? HUNTER_TRACKS : MONSTER_TRACKS;
      for (const counter of tracks) values.set(key(id, counter), 0);
      if (event.scope === 'hunter') knockouts.set(id, null);
      else {
        stance = event.monsterState!.stance;
        for (const counter of MONSTER_TRACKS) values.set(key(id, counter), event.monsterState![counter]);
      }
    }
    if (event.type === 'stance') {
      if (event.from !== stance) return 'Stance event contradicts the current stance.';
      stance = event.to;
      values.set(key(id, 'toughness'), event.toughness);
    }
    if (event.type === 'wound') {
      const damage = values.get(key(id, 'damage'))!;
      const threshold = values.get(key(id, 'toughness'))! * hunterIds.length;
      if (
        event.stance !== stance ||
        event.damageRemoved <= 0 ||
        event.damageRemoved !== threshold ||
        event.damageRemoved > damage
      )
        return 'Confirmed wound contradicts the current threshold, damage or stance.';
      values.set(key(id, 'damage'), damage - event.damageRemoved);
    }
    if (
      event.type === 'wound-ready' &&
      (event.damage !== values.get(key(id, 'damage')) ||
        event.threshold <= 0 ||
        event.threshold !== values.get(key(id, 'toughness'))! * hunterIds.length ||
        event.damage < event.threshold)
    )
      return 'Wound readiness contradicts the current tracks.';
  }
  return null;
}

/** Derives timeline events from the committed hunt-state diff, never from UI gestures. */
export function deriveFightEvents(before: HuntSubject, after: HuntSubject, options: EventOptions): HuntEvent[] {
  if (!isActiveFight(before) || !isActiveFight(after) || before.id !== after.id) return [];
  if (
    carrierMonster(before)?.id !== carrierMonster(after)?.id ||
    before.hunters.length !== after.hunters.length ||
    before.hunters.some((hunter) => !after.hunters.some((next) => next.hunterId === hunter.hunterId))
  )
    return [];

  const monster = carrierMonster(before) ?? carrierMonster(after);
  const events: HuntEvent[] = [];
  const elapsedMs =
    after.huntTimer.startedAt || after.huntTimer.elapsedMs > 0
      ? huntTimerMs(after.huntTimer, options.recordedAt)
      : null;

  const push = (event: HuntEventDraft): void => {
    events.push({
      ...event,
      elapsedMs,
      recordedAt: options.recordedAt,
      sequence: before.fightEvents.length + events.length + 1,
    } as HuntEvent);
  };
  const hunterActor = (hunterId: string): Extract<HuntEvent, { type: 'knockout' }>['actor'] => ({
    hunterId,
    kind: 'hunter',
  });
  const monsterActor: Extract<HuntEvent, { type: 'wound' }>['actor'] | null = monster
    ? { kind: 'monster', monsterId: monster.id }
    : null;

  for (const hunterId of new Set([...Object.keys(before.hunterState), ...Object.keys(after.hunterState)])) {
    const previous = before.hunterState[hunterId];
    const current = after.hunterState[hunterId];
    if (!previous || !current) continue;
    const previousBuild = before.hunters.find((hunter) => hunter.hunterId === hunterId)!;
    const currentBuild = after.hunters.find((hunter) => hunter.hunterId === hunterId)!;
    if (previousBuild && currentBuild) {
      for (const potionId of currentBuild.consumedPotionIds) {
        if (!previousBuild.consumedPotionIds.includes(potionId))
          push({ actor: hunterActor(hunterId), consumed: true, potionId, type: 'potion' });
      }
      for (const potionId of previousBuild.consumedPotionIds) {
        if (!currentBuild.consumedPotionIds.includes(potionId))
          push({ actor: hunterActor(hunterId), consumed: false, potionId, type: 'potion' });
      }
    }
    if (
      previousBuild &&
      currentBuild &&
      (previousBuild.masteryCardId !== currentBuild.masteryCardId ||
        Object.keys(previousBuild.equipment).some(
          (slot) =>
            previousBuild.equipment[slot as keyof typeof previousBuild.equipment] !==
            currentBuild.equipment[slot as keyof typeof currentBuild.equipment],
        ))
    ) {
      push({ actor: hunterActor(hunterId), facts: hunterFacts(currentBuild), type: 'build' });
    }

    if (options.action?.type === 'hunter-reset' && options.action.hunterId === hunterId) {
      push({ actor: hunterActor(hunterId), monsterState: null, scope: 'hunter', type: 'reset' });
      continue;
    }

    const automaticKnockout = previous.knockedOut === null && current.knockedOut !== null;
    const lethalDamageCommand =
      automaticKnockout && options.action?.type === 'hunter-damage' && options.action.hunterId === hunterId;
    if (
      (previous.damage !== current.damage || lethalDamageCommand) &&
      options.action?.type !== 'hunter-knockout' &&
      options.action?.type !== 'hunter-reset'
    ) {
      const build = lethalDamageCommand ? before.hunters.find((entry) => entry.hunterId === hunterId) : undefined;
      const maxHealth = build ? hunterMaxHealth(build, previous.depleted) : undefined;
      if (lethalDamageCommand && maxHealth === undefined) throw new Error('Lethal damage requires hunter health.');
      const commandedDamage = lethalDamageCommand
        ? Math.max(0, maxHealth! - previous.damage)
        : current.damage - previous.damage;
      const attemptedValue = previous.damage + commandedDamage;
      push({
        actor: hunterActor(hunterId),
        delta: commandedDamage,
        type: 'damage',
        value: automaticKnockout ? Math.max(0, attemptedValue) : current.damage,
      });
    }

    if (!automaticKnockout) {
      for (const counter of HUNTER_TRACKS) {
        if (counter === 'damage') continue;
        if (previous[counter] !== current[counter]) {
          push({
            actor: hunterActor(hunterId),
            counter,
            delta: current[counter] - previous[counter],
            type: 'counter',
            value: current[counter],
          });
        }
      }
    }

    if (previous.knockedOut !== current.knockedOut) {
      push({ actor: hunterActor(hunterId), token: current.knockedOut, type: 'knockout' });
    }
    if (previous.depleted.armor !== current.depleted.armor) {
      push({ actor: hunterActor(hunterId), depleted: current.depleted.armor, slot: 'armor', type: 'depletion' });
    }
    if (previous.depleted.helm !== current.depleted.helm) {
      push({ actor: hunterActor(hunterId), depleted: current.depleted.helm, slot: 'helm', type: 'depletion' });
    }
    if (automaticKnockout) continue;
    for (const effect of HUNTER_CONDITIONS) {
      if (previous[effect] !== current[effect]) {
        push({ active: current[effect], actor: hunterActor(hunterId), effect, type: 'effect' });
      }
    }
  }

  const beforeMonster = before.monsterState;
  const afterMonster = after.monsterState;
  const actor = monsterActor;

  if (options.action?.type === 'monster-reset' && actor) {
    push({ actor, monsterState: structuredClone(afterMonster), scope: 'monster', type: 'reset' });
    return events;
  }

  if (actor && options.action?.type === 'monster-unleash') push({ actor, type: 'unleash' });

  if (actor && beforeMonster.damage !== afterMonster.damage && options.action?.type !== 'monster-wound') {
    push({
      actor,
      delta: afterMonster.damage - beforeMonster.damage,
      type: 'damage',
      value: afterMonster.damage,
    });
  }
  for (const counter of MONSTER_TRACKS) {
    if (counter === 'damage') continue;
    if (
      beforeMonster[counter] !== afterMonster[counter] &&
      actor &&
      !(options.action?.type === 'monster-stance' && counter === 'toughness')
    ) {
      push({
        actor,
        counter,
        delta: afterMonster[counter] - beforeMonster[counter],
        type: 'counter',
        value: afterMonster[counter],
      });
    }
  }
  for (const effect of MONSTER_TOKENS) {
    if (beforeMonster.tokens[effect] !== afterMonster.tokens[effect] && actor) {
      push({ active: afterMonster.tokens[effect] > 0, actor, effect, type: 'effect' });
    }
  }
  if (actor && beforeMonster.stance !== afterMonster.stance) {
    push({
      actor,
      from: beforeMonster.stance,
      to: afterMonster.stance,
      toughness: afterMonster.toughness,
      type: 'stance',
    });
  }
  if (actor && !canWound(beforeMonster, before.hunters.length) && canWound(afterMonster, after.hunters.length)) {
    push({
      actor,
      damage: afterMonster.damage,
      threshold: woundThreshold(afterMonster, after.hunters.length),
      type: 'wound-ready',
    });
  }
  if (actor && options.action?.type === 'monster-wound' && beforeMonster.damage > afterMonster.damage) {
    push({
      actor,
      damageRemoved: beforeMonster.damage - afterMonster.damage,
      stance: beforeMonster.stance,
      type: 'wound',
    });
  }
  const beforeTerrain = new Map(liveTerrain(before).map((token) => [token.id, token]));
  const afterTerrain = new Map(liveTerrain(after).map((token) => [token.id, token]));
  if (actor) {
    for (const [tokenId, token] of afterTerrain) {
      const previous = beforeTerrain.get(tokenId);
      if (!previous) {
        push({ action: 'placed', actor, sector: token.sector, terrainId: token.terrainId, tokenId, type: 'terrain' });
      } else if (previous.terrainId !== token.terrainId) {
        push({
          action: 'transformed',
          actor,
          sector: token.sector,
          terrainId: token.terrainId,
          tokenId,
          type: 'terrain',
        });
      }
    }
    for (const [tokenId, token] of beforeTerrain) {
      if (!afterTerrain.has(tokenId)) {
        push({ action: 'removed', actor, sector: token.sector, terrainId: token.terrainId, tokenId, type: 'terrain' });
      }
    }
  }

  return events;
}
