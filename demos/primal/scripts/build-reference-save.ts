/**
 * Builds fixtures/reference-save.json: the restorable reference save for testing the
 * companion without playing. Regenerate with `pnpm reference:save`, then import the file
 * through Settings → Backups → Import (a restore replaces every saved game).
 *
 * The save carries the reference campaign ("The Long Hunt", whose curated hunt history fills
 * the Chronicle) and one finished expedition. Every hunt includes a deterministic event trace
 * for timeline testing. The whole file is validated through the backup parser before it is
 * written, so the save is playable the moment it is imported.
 */
import { mkdirSync, writeFileSync } from 'node:fs';

import { questId } from '../src/content';
import { activateQuest, createCampaign } from '../src/domain/campaign';
import { createExpedition, setExpeditionHunters } from '../src/domain/expedition';
import { type FightAction, snapshotFightStart, trackFightChange } from '../src/domain/fight-events';
import { fightProgress } from '../src/domain/fight-progress';
import { adjustHunterCounter, hunterMaxHealth, setHunterCondition, setHunterDepleted, setHunterKnockedOut } from '../src/domain/hunter-state';
import { adjustMonsterCounter, adjustMonsterToken, canWound, confirmMonsterWound, idleMonsterState, setMonsterStance, setupMonsterState, unleashMonster, woundThreshold } from '../src/domain/monster-state';
import type { Campaign, Expedition, HuntEvent, HuntRecord, HuntRecordHunter, HuntResult, MonsterStance } from '../src/domain/types';
import { APP_VERSION, BACKUP_FORMAT, BACKUP_VERSION, DEFAULT_SETTINGS, parseBackup } from '../src/app/persistence';

interface ReferenceHuntSpec {
  durationMs: number | null;
  eventCount?: number;
  monsterId: string;
  outcome: HuntResult;
  recordedAt: string;
}

function referenceEvents(
  party: readonly HuntRecordHunter[],
  spec: ReferenceHuntSpec,
  huntIndex: number,
): Pick<HuntRecord, 'events' | 'fightStart'> {
  const now = spec.recordedAt;
  const created = setExpeditionHunters(
    createExpedition('reference-fight', ['core', 'mount-havoc'], now),
    party.map((hunter) => hunter.hunterId),
    now,
  );
  let subject: Expedition = {
    ...created,
    aggression: 1,
    hunters: created.hunters.map((hunter, index) => ({ ...hunter, equipment: { ...party[index]!.equipment }, masteryCardId: party[index]!.masteryCardId })),
    monsterId: spec.monsterId,
    status: 'ready',
  };
  subject.monsterState = setupMonsterState(subject);
  const fightStart = snapshotFightStart(subject, spec.monsterId);
  const batches: HuntEvent[][] = [];
  const apply = (action: FightAction | undefined, mutate: (current: Expedition) => Expedition): void => {
    const next = trackFightChange(subject, mutate(subject), { action, recordedAt: now });
    const events = next.fightEvents.slice(subject.fightEvents.length);
    if (events.length) batches.push(events);
    subject = next;
  };
  const damageHunter = (hunterId: string, delta: number): void => {
    apply({ type: 'hunter-damage', hunterId }, (current) => adjustHunterCounter(current, hunterId, 'damage', delta, now));
  };
  const damageMonster = (delta: number): void => {
    apply(undefined, (current) => adjustMonsterCounter(current, 'damage', delta, now));
  };
  const wound = (): void => {
    const threshold = woundThreshold(subject.monsterState, party.length);
    if (threshold === 0) return;
    damageMonster(threshold - subject.monsterState.damage);
    if (canWound(subject.monsterState, party.length)) apply({ type: 'monster-wound' }, (current) => confirmMonsterWound(current, now));
  };
  const recover = (hunterId: string): void => {
    const build = subject.hunters.find((hunter) => hunter.hunterId === hunterId)!;
    const state = subject.hunterState[hunterId]!;
    damageHunter(hunterId, hunterMaxHealth(build, state.depleted)! - state.damage);
    apply(undefined, (current) => setHunterDepleted(current, hunterId, 'armor', true, now));
    apply({ type: 'hunter-knockout', hunterId }, (current) => setHunterKnockedOut(current, hunterId, 'black', now));
    apply({ type: 'hunter-knockout', hunterId }, (current) => setHunterKnockedOut(current, hunterId, null, now));
  };

  const rounds = Math.max(8, Math.ceil((spec.eventCount ?? 40) / 4));
  for (let round = 0; round < rounds; round += 1) {
    const hunter = subject.hunters[(round + huntIndex) % party.length]!;
    const state = subject.hunterState[hunter.hunterId]!;
    const maximum = hunterMaxHealth(hunter, state.depleted)!;
    const delta = state.damage > 0 && round % 3 === 0 ? -state.damage : Math.min(1 + round % 2, Math.max(0, maximum - 1 - state.damage));
    damageHunter(hunter.hunterId, delta);
    apply(undefined, (current) => adjustHunterCounter(current, hunter.hunterId, 'stamina', state.stamina >= 3 ? -3 : 1, now));

    const threshold = woundThreshold(subject.monsterState, party.length);
    const monsterDelta = round % 7 === 0
      ? -Math.min(2, subject.monsterState.damage)
      : Math.min(2 + round % 3, Math.max(0, threshold - 1 - subject.monsterState.damage));
    damageMonster(monsterDelta);
    if (round % 5 === 0) {
      const delta = subject.monsterState.tokens.stun ? -1 : 1;
      apply(undefined, (current) => adjustMonsterToken(current, 'stun', delta, now));
    }
    if (round === Math.floor(rounds / 2)) recover(party[huntIndex % party.length]!.hunterId);
    if (round % 9 === 4) {
      const active = !subject.hunterState[hunter.hunterId]!.burning;
      apply(undefined, (current) => setHunterCondition(current, hunter.hunterId, 'burning', active, now));
      apply({ type: 'monster-unleash' }, (current) => unleashMonster(current, now));
    }
    if (round === Math.floor(rounds / 3) || round === Math.floor(2 * rounds / 3)) {
      wound();
      const stance = (subject.monsterState.stance + 1) as MonsterStance;
      apply({ type: 'monster-stance' }, (current) => setMonsterStance(current, stance, now));
    }
  }

  if (spec.outcome === 'victory') wound();
  else {
    for (const hunter of subject.hunters) {
      const state = subject.hunterState[hunter.hunterId]!;
      damageHunter(hunter.hunterId, hunterMaxHealth(hunter, state.depleted)! - state.damage);
    }
  }
  const endTime = Date.parse(spec.recordedAt);
  const events = batches.flatMap((events, index) => {
    const elapsedMs = spec.durationMs === null ? null : Math.round(spec.durationMs * (index + 1) / batches.length);
    const eventTime = spec.durationMs === null ? endTime - (batches.length - index - 1) * 60_000 : endTime - spec.durationMs + elapsedMs!;
    return events.map((event) => ({
      ...event,
      elapsedMs,
      recordedAt: new Date(eventTime).toISOString(),
    }));
  });
  return { events, fightStart };
}

/**
 * One reference record: each member's real loadout, with the deck thinned by the hunt index so
 * the Chronicle's armory rankings carry variety instead of every card counting every hunt.
 */
function referenceRecords(
  party: readonly HuntRecordHunter[],
  specs: readonly ReferenceHuntSpec[],
  idPrefix: string,
): HuntRecord[] {
  return specs.map((spec, index) => ({
    durationMs: spec.durationMs,
    hunters: party.map((member, seat) => ({
      deckCardIds: member.deckCardIds.slice(0, Math.max(12, member.deckCardIds.length - ((index + seat) % 3) * 4)),
      equipment: member.equipment,
      hunterId: member.hunterId,
      masteryCardId: member.masteryCardId,
    })),
    ...referenceEvents(party, spec, index),
    id: `${idPrefix}-${index}`,
    monsterId: spec.monsterId,
    outcome: spec.outcome,
    recordedAt: spec.recordedAt,
  }));
}

/** Curated so every Chronicle section has shape: six creatures with distinct standings,
 *  mostly-timed coverage with one untimed hunt, and medians that spread across the pace. */
const REFERENCE_CAMPAIGN_HUNTS: readonly ReferenceHuntSpec[] = [
  { durationMs: 720000, monsterId: 'toramat', outcome: 'victory', recordedAt: '2026-08-03T20:00:00.000Z' },
  { durationMs: 1140000, monsterId: 'sirkaaj', outcome: 'victory', recordedAt: '2026-08-10T20:00:00.000Z' },
  { durationMs: 2640000, monsterId: 'orouxen', outcome: 'victory', recordedAt: '2026-08-17T20:00:00.000Z' },
  { durationMs: 1980000, monsterId: 'vyraxen', outcome: 'defeat', recordedAt: '2026-08-24T20:00:00.000Z' },
  { durationMs: 900000, monsterId: 'toramat', outcome: 'defeat', recordedAt: '2026-08-31T20:00:00.000Z' },
  { durationMs: 1500000, monsterId: 'tarragua', outcome: 'victory', recordedAt: '2026-09-05T20:00:00.000Z' },
  { durationMs: 960000, monsterId: 'sirkaaj', outcome: 'victory', recordedAt: '2026-09-07T20:00:00.000Z' },
  { durationMs: null, eventCount: 180, monsterId: 'korowon', outcome: 'victory', recordedAt: '2026-09-10T20:00:00.000Z' },
  { durationMs: 1800000, monsterId: 'vyraxen', outcome: 'victory', recordedAt: '2026-09-12T20:00:00.000Z' },
  { durationMs: 2820000, monsterId: 'orouxen', outcome: 'defeat', recordedAt: '2026-09-14T20:00:00.000Z' },
  { durationMs: 660000, monsterId: 'toramat', outcome: 'victory', recordedAt: '2026-09-16T20:00:00.000Z' },
  { durationMs: 1050000, monsterId: 'sirkaaj', outcome: 'victory', recordedAt: '2026-09-18T20:00:00.000Z' },
  { durationMs: 1320000, monsterId: 'korowon', outcome: 'defeat', recordedAt: '2026-09-20T20:00:00.000Z' },
  { durationMs: 840000, monsterId: 'tarragua', outcome: 'victory', recordedAt: '2026-09-22T20:00:00.000Z' },
  { durationMs: 2160000, eventCount: 280, monsterId: 'vyraxen', outcome: 'defeat', recordedAt: '2026-09-24T20:00:00.000Z' },
  {
    durationMs: 3120000,
    eventCount: 360,
    monsterId: 'sirkaaj',
    outcome: 'victory',
    recordedAt: '2026-09-26T20:00:00.000Z',
  },
];

const REFERENCE_EXPEDITION_HUNTS: readonly ReferenceHuntSpec[] = [
  { durationMs: 2280000, monsterId: 'orouxen', outcome: 'defeat', recordedAt: '2026-09-13T20:00:00.000Z' },
  { durationMs: 1860000, monsterId: 'tarragua', outcome: 'victory', recordedAt: '2026-09-19T20:00:00.000Z' },
  { durationMs: 1440000, monsterId: 'toramat', outcome: 'victory', recordedAt: '2026-09-21T20:00:00.000Z' },
  { durationMs: 2460000, monsterId: 'orouxen', outcome: 'defeat', recordedAt: '2026-09-25T20:00:00.000Z' },
];

function chronicleReferenceCampaign(): Campaign {
  const created = '2026-08-02T17:00:00.000Z';
  let campaign = createCampaign({
    config: { expansionIds: ['core', 'mount-havoc'], name: 'The Long Hunt', variants: [] },
    hunterIds: ['daeron', 'mirah', 'karah', 'thoreg'],
    id: 'campaign-reference',
    now: created,
  });
  campaign = activateQuest(campaign, questId(1), created);
  return {
    ...campaign,
    hunters: campaign.hunters.map((hunter, index) => ({
      ...hunter,
      playerName: ['Ines', 'Jonas', 'Kaya', 'Liam'][index] ?? '',
    })),
    huntHistory: referenceRecords(campaign.hunters, REFERENCE_CAMPAIGN_HUNTS, 'reference-campaign-hunt'),
    monsterState: idleMonsterState(campaign.hunters.length),
    phase: 'hunt',
    rev: 0,
    trophies: ['korowon', 'orouxen', 'sirkaaj', 'tarragua', 'toramat', 'vyraxen'],
    updatedAt: '2026-09-26T21:00:00.000Z',
  };
}

function chronicleReferenceExpedition(): Expedition {
  const created = '2026-09-13T15:00:00.000Z';
  const draft = createExpedition('expedition-reference', ['mount-havoc'], created);
  const party = setExpeditionHunters(draft, ['ljonar', 'heleren'], created);

  return {
    ...party,
    huntHistory: referenceRecords(party.hunters, REFERENCE_EXPEDITION_HUNTS, 'reference-expedition-hunt'),
    monsterId: 'orouxen',
    result: 'defeat',
    status: 'played',
    updatedAt: '2026-09-25T21:00:00.000Z',
  };
}

const backup = {
  appVersion: APP_VERSION,
  data: {
    ascents: [],
    campaigns: [chronicleReferenceCampaign()],
    challenges: [],
    expeditions: [chronicleReferenceExpedition()],
    loadouts: [],
    settings: { ...DEFAULT_SETTINGS },
  },
  exportedAt: '2026-09-26T21:00:00.000Z',
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
};

// The same validation the Settings import runs: a save that cannot be parsed is not written.
const text = JSON.stringify(backup, null, 2);
const parsed = parseBackup(text);
const records = [...parsed.campaigns.flatMap((subject) => subject.huntHistory), ...parsed.expeditions.flatMap((subject) => subject.huntHistory)];
for (const record of records) {
  const points = fightProgress(record);
  const finalHealth = points.at(-1)!.partyHealth;
  if (finalHealth === null || (record.outcome === 'defeat' ? finalHealth !== 0 : finalHealth <= 0)) {
    throw new Error(`${record.id}: remaining party health must agree with the hunt outcome.`);
  }
  for (const [index, event] of record.events.entries()) {
    const previous = record.events[index - 1];
    if (event.sequence !== index + 1 || Date.parse(event.recordedAt) > Date.parse(record.recordedAt) || (previous && Date.parse(previous.recordedAt) > Date.parse(event.recordedAt))) {
      throw new Error(`${record.id}: fight events must be ordered and finish no later than the result.`);
    }
    if (record.durationMs === null ? event.elapsedMs !== null : event.elapsedMs === null || event.elapsedMs > record.durationMs || (previous?.elapsedMs !== null && previous?.elapsedMs !== undefined && previous.elapsedMs > event.elapsedMs)) {
      throw new Error(`${record.id}: event positions must match the recorded timer mode.`);
    }
  }
}

mkdirSync(new URL('../fixtures/', import.meta.url), { recursive: true });
writeFileSync(new URL('../fixtures/reference-save.json', import.meta.url), `${text}\n`);

console.log(
  `fixtures/reference-save.json: ${parsed.campaigns[0]?.huntHistory.length ?? 0} campaign hunts, ${parsed.expeditions[0]?.huntHistory.length ?? 0} expedition hunts`,
);
console.log(`Validated health/outcomes and event ordering; ${records.filter((record) => record.events.length >= 100).length} histories have 100+ events.`);
