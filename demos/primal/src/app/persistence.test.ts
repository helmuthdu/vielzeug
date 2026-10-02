import { describe, expect, it } from 'vitest';
import { createAscent, createAscentHunter } from '../domain/ascent';
import { createCampaign } from '../domain/campaign';
import { createChallenge, createChallengeHunter } from '../domain/challenge';
import { createExpedition, createExpeditionHunter } from '../domain/expedition';
import { idleHunterState } from '../domain/hunter-state';
import { idleMonsterState } from '../domain/monster-state';
import type { HuntRecord } from '../domain/types';
import {
  BACKUP_FORMAT,
  DEFAULT_SETTINGS,
  parseBackup,
  sanitizeAscentSnapshot,
  sanitizeCampaignSnapshot,
  sanitizeChallengeSnapshot,
  sanitizeExpeditionSnapshot,
  settingsCodec,
} from './persistence';

const NOW = '2026-01-01T00:00:00.000Z';

const record: HuntRecord = {
  durationMs: null,
  events: [
    {
      actor: { hunterId: 'daeron', kind: 'hunter' },
      delta: 1,
      elapsedMs: null,
      recordedAt: NOW,
      sequence: 1,
      type: 'damage',
      value: 1,
    },
  ],
  fightStart: {
    hunters: { daeron: { armorHealth: null, helmHealth: null, masteryGoal: null, state: idleHunterState() } },
    monsterId: 'xitheros',
    monsterState: idleMonsterState(1),
  },
  hunters: [
    {
      deckCardIds: [],
      equipment: { armorId: null, helmId: null, itemId: null, weaponId: null },
      hunterId: 'daeron',
      masteryCardId: 'hero-daeron-relentless-assault-s',
    },
  ],
  id: 'subject-canary:hunt:1',
  monsterId: 'xitheros',
  outcome: 'victory',
  recordedAt: NOW,
};

/** The Winds series prints one expedition per biome, so a playable run owns every biome box. */
const WINDS_BOXES = [
  'biome-crystal-caves-flooded-wilds',
  'biome-endless-swamp-nightmare',
  'biome-goldarks-thunder-mountains',
  'biome-niz-maraga-sunset-plains',
  'biome-woltyar-frozen-wastes',
] as const;

function freshCampaign() {
  return createCampaign({
    config: { expansionIds: ['core'], name: 'Canary', nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah'],
    id: 'c-canary',
    now: NOW,
  });
}

function freshChallenge() {
  const base = createChallenge('ch-canary', 'winds-of-spring', 'Canary', [...WINDS_BOXES], NOW);
  return { ...base, hunters: [createChallengeHunter(base, 'daeron')] };
}

function withoutPlayerName<T extends { playerName: string }>(member: T): Omit<T, 'playerName'> {
  const { playerName, ...legacyMember } = member;
  void playerName;
  return legacyMember;
}

function withoutHuntHistory<T extends { huntHistory: HuntRecord[] }>(subject: T): Omit<T, 'huntHistory'> {
  const { huntHistory, ...incompatibleSubject } = subject;
  void huntHistory;
  return incompatibleSubject;
}

function withoutFightEvents<T extends { fightEvents: unknown[] }>(subject: T): Omit<T, 'fightEvents'> {
  const { fightEvents, ...legacySubject } = subject;
  void fightEvents;
  return legacySubject;
}

describe('the persisted contract', () => {
  it('preserves sequence order when the wall clock moves backwards', () => {
    const event = record.events[0]!;
    const history = {
      ...record,
      events: [
        { ...event, recordedAt: '2026-01-01T00:01:00.000Z' },
        { ...event, recordedAt: NOW, sequence: 2, value: 2 },
      ],
    };
    expect(sanitizeCampaignSnapshot({ ...freshCampaign(), huntHistory: [history] }).huntHistory[0]?.events).toEqual(
      history.events,
    );
  });
  it('rejects histories with foreign actors, sequence gaps, or contradictory deltas', () => {
    const campaign = freshCampaign();
    const event = record.events[0]!;
    for (const changed of [
      { ...event, actor: { hunterId: 'mirah', kind: 'hunter' } },
      { ...event, sequence: 2 },
      { ...event, delta: 2 },
    ]) {
      expect(() =>
        sanitizeCampaignSnapshot({ ...campaign, huntHistory: [{ ...record, events: [changed] }] }),
      ).toThrow();
    }
  });

  it('rejects live events without a recorded starting board', () => {
    expect(() => sanitizeCampaignSnapshot({ ...freshCampaign(), fightEvents: record.events })).toThrow();
  });

  it('rejects a completed hunt without its required starting snapshot', () => {
    const { fightStart, ...incompatible } = record;
    void fightStart;
    expect(() => sanitizeCampaignSnapshot({ ...freshCampaign(), huntHistory: [incompatible] })).toThrow();
  });
  it("parses the domain's own records unchanged", () => {
    const campaign = freshCampaign();
    expect(sanitizeCampaignSnapshot(campaign)).toEqual(campaign);
    const challenge = freshChallenge();
    expect(sanitizeChallengeSnapshot(challenge)).toEqual(challenge);
  });

  it('requires hunt history in every saved game kind', () => {
    const campaign = freshCampaign();
    const expedition = createExpedition('e-canary', ['core'], NOW);
    const ascent = createAscent('a-canary', 'Canary', ['core', 'mount-havoc'], NOW, () => 0);
    const challenge = freshChallenge();

    expect(campaign.huntHistory).toEqual([]);
    expect(expedition.huntHistory).toEqual([]);
    expect(ascent.huntHistory).toEqual([]);
    expect(challenge.huntHistory).toEqual([]);
    expect(() => sanitizeCampaignSnapshot(withoutHuntHistory(campaign))).toThrow();
    expect(() => sanitizeExpeditionSnapshot(withoutHuntHistory(expedition))).toThrow();
    expect(() =>
      sanitizeAscentSnapshot(withoutHuntHistory({ ...ascent, hunters: [createAscentHunter(ascent, 'daeron')] })),
    ).toThrow();
    expect(() => sanitizeChallengeSnapshot(withoutHuntHistory(challenge))).toThrow();

    expect(sanitizeCampaignSnapshot({ ...campaign, huntHistory: [record] }).huntHistory).toEqual([record]);
    expect(sanitizeExpeditionSnapshot({ ...expedition, huntHistory: [record] }).huntHistory).toEqual([record]);
    expect(
      sanitizeAscentSnapshot({ ...ascent, hunters: [createAscentHunter(ascent, 'daeron')], huntHistory: [record] })
        .huntHistory,
    ).toEqual([record]);
    expect(sanitizeChallengeSnapshot({ ...challenge, huntHistory: [record] }).huntHistory).toEqual([record]);
  });

  it('requires the new live fight-event buffer in every saved game kind', () => {
    const campaign = freshCampaign();
    const expedition = createExpedition('e-canary', ['core'], NOW);
    const ascent = createAscent('a-canary', 'Canary', ['core', 'mount-havoc'], NOW, () => 0);
    const challenge = freshChallenge();

    for (const subject of [campaign, expedition, ascent, challenge]) expect(subject.fightEvents).toEqual([]);
    expect(() => sanitizeCampaignSnapshot(withoutFightEvents(campaign))).toThrow();
    expect(() => sanitizeExpeditionSnapshot(withoutFightEvents(expedition))).toThrow();
    expect(() => sanitizeAscentSnapshot(withoutFightEvents(ascent))).toThrow();
    expect(() => sanitizeChallengeSnapshot(withoutFightEvents(challenge))).toThrow();
  });

  it.each([1, 2])('rejects backup version %s instead of migrating it', (version) => {
    expect(() =>
      parseBackup(
        JSON.stringify({
          appVersion: '1.0.0',
          data: {},
          exportedAt: NOW,
          format: BACKUP_FORMAT,
          version,
        }),
      ),
    ).toThrowError(expect.objectContaining({ code: 'backup-unsupported' }));
  });

  it('defaults automatic game setup for older settings records', () => {
    const { autoOpenGameSetup: ignored, ...legacySettings } = DEFAULT_SETTINGS;
    void ignored;

    expect(settingsCodec.parse({ ...legacySettings, id: 'app' }).autoOpenGameSetup).toBe(true);
  });

  it('defaults missing player names when loading older non-campaign runs', () => {
    const expedition = createExpedition('e-canary', ['core'], NOW);
    const oldExpedition = {
      ...expedition,
      hunters: [withoutPlayerName(createExpeditionHunter(expedition, 'daeron'))],
    };
    const ascent = createAscent('a-canary', 'Canary', ['core', 'mount-havoc'], NOW, () => 0);
    const oldAscent = {
      ...ascent,
      hunters: [withoutPlayerName(createAscentHunter(ascent, 'daeron'))],
    };
    const challenge = freshChallenge();
    const oldChallenge = { ...challenge, hunters: challenge.hunters.map(withoutPlayerName) };

    expect(sanitizeExpeditionSnapshot(oldExpedition).hunters[0]?.playerName).toBe('');
    expect(sanitizeAscentSnapshot(oldAscent).hunters[0]?.playerName).toBe('');
    expect(sanitizeChallengeSnapshot(oldChallenge).hunters[0]?.playerName).toBe('');
  });

  it('rejects removed-cycle shapes: the boot reset owns those databases', () => {
    expect(() => sanitizeCampaignSnapshot({ ...freshCampaign(), phase: 'story' })).toThrow();
    expect(() => sanitizeChallengeSnapshot({ ...freshChallenge(), phase: 'reward' })).toThrow();
    expect(() => sanitizeChallengeSnapshot({ ...freshChallenge(), foughtAggression: 1 })).toThrow();
    expect(() =>
      sanitizeChallengeSnapshot({
        ...freshChallenge(),
        hunters: freshChallenge().hunters.map(({ equipmentRewardTaken: _taken, ...hunter }) => hunter),
      }),
    ).toThrow();
  });
});
