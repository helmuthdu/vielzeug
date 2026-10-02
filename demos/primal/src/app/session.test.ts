// @vitest-environment jsdom

import { createFakeRtc } from '@vielzeug/mesh/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createAscent, setAscentHunters } from '../domain/ascent';
import { createCampaign } from '../domain/campaign';
import { createChallenge, setChallengeHunters } from '../domain/challenge';
import { createExpedition, setExpeditionHunters } from '../domain/expedition';
import type { GameMode, SubjectRef } from '../domain/types';
import type { PrimalStore } from './database';
import { type AppEvents, bus, sessionState } from './events';
import {
  acceptSessionAnswer,
  beginSessionJoin,
  createSessionInvitation,
  endSession,
  sessionJoinLink,
  startSessionHost,
} from './session';
import {
  ascentById,
  campaignById,
  challengeById,
  expeditionById,
  exportSavedData,
  isRemoteSubject,
  mountRemoteSubject,
  runCommand,
  setSessionCommandSender,
  unmountRemoteSubject,
} from './store';
import { flush, openTestStore } from './test-harness';

const SEED: SubjectRef = { id: 'campaign-seed', kind: 'campaign' };

let store: PrimalStore;

const remoteCampaign = (id: string) =>
  createCampaign({
    config: { expansionIds: ['core'], name: `Remote ${id}`, nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah'],
    id,
    now: new Date().toISOString(),
  });

const remoteExpedition = (id: string) => {
  const stamp = new Date().toISOString();
  // A host's record as it lives in the database: written, so it carries a rev.
  return { ...setExpeditionHunters(createExpedition(id, ['core'], stamp), ['daeron', 'mirah'], stamp), rev: 0 };
};

/** All boxes enabled, so the Winds series' full monster pool is available. */
const ALL_BOXES = [
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
] as const;

const remoteChallenge = (id: string) => {
  const stamp = new Date().toISOString();
  const created = createChallenge(id, 'winds-of-spring', `Remote ${id}`, ALL_BOXES, stamp);
  return { ...setChallengeHunters(created, ['daeron', 'mirah'], stamp), rev: 0 };
};

const remoteAscent = (id: string) => {
  const stamp = new Date().toISOString();
  // The Mount Havoc climb needs its box; the party carries the wound trackers.
  return {
    ...setAscentHunters(createAscent(id, `Remote ${id}`, ['core', 'mount-havoc'], stamp), ['daeron', 'mirah'], stamp),
    rev: 0,
  };
};

/** The id every pairing case seeds and hosts. */
const pairId = (kind: GameMode) => `pair-${kind}`;

beforeEach(async () => {
  store = await openTestStore();
});

afterEach(async () => {
  endSession();
  for (const id of [
    'other-campaign',
    'remote-1',
    'remote-ascent',
    'remote-campaign',
    'remote-challenge',
    'remote-expedition',
    ...(['ascent', 'campaign', 'challenge', 'expedition'] as const).map(pairId),
  ])
    unmountRemoteSubject(id);
  await Promise.all([
    store.delete('ascents', pairId('ascent')),
    store.delete('campaigns', pairId('campaign')),
    store.delete('challenges', pairId('challenge')),
    store.delete('expeditions', pairId('expedition')),
  ]);
  setSessionCommandSender(null);
});

describe('remote subject mirror', () => {
  it('mounts a remote campaign and restores a shadowed local copy on unmount', () => {
    const original = campaignById(SEED.id);
    expect(original).toBeDefined();
    const mirror = { ...original!, name: 'Shared session copy' };

    mountRemoteSubject(mirror);
    expect(campaignById(SEED.id)?.name).toBe('Shared session copy');
    expect(isRemoteSubject(SEED.id)).toBe(true);

    unmountRemoteSubject(SEED.id);
    expect(campaignById(SEED.id)?.name).toBe(original!.name);
    expect(isRemoteSubject(SEED.id)).toBe(false);
  });

  it.each([
    { factory: () => remoteAscent('remote-ascent'), id: 'remote-ascent', table: 'ascents' },
    { factory: () => remoteCampaign('remote-campaign'), id: 'remote-campaign', kept: SEED.id, table: 'campaigns' },
    { factory: () => remoteChallenge('remote-challenge'), id: 'remote-challenge', table: 'challenges' },
    { factory: () => remoteExpedition('remote-expedition'), id: 'remote-expedition', table: 'expeditions' },
  ])('excludes remote $table mirrors from exports', ({ factory, id, kept, table }) => {
    mountRemoteSubject(factory());
    const backup = JSON.parse(exportSavedData()) as { data: Record<string, Array<{ id: string }>> };
    expect(backup.data[table].some((entry) => entry.id === id)).toBe(false);
    // The device's own records of the kind stay exported.
    if (kept) expect(backup.data[table].some((entry) => entry.id === kept)).toBe(true);
    unmountRemoteSubject(id);
    expect(isRemoteSubject(id)).toBe(false);
  });

  it('forwards commands on a remote mirror instead of applying them', () => {
    const remote = remoteCampaign('remote-1');
    mountRemoteSubject(remote);
    const sent: Array<{ args: unknown[]; name: string; subjectId: string }> = [];
    setSessionCommandSender((subjectId, name, args) => sent.push({ args, name, subjectId }));

    const hunterId = remote.hunters[0]!.hunterId;
    runCommand('adjustHunterResource', { id: 'remote-1', kind: 'campaign' }, hunterId, 'blood', 3);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ name: 'adjustHunterResource', subjectId: 'remote-1' });
    expect(sent[0]?.args).toEqual([hunterId, 'blood', 3]);
    // The mirror is untouched: only a host snapshot may change it.
    expect(campaignById('remote-1')).toBe(remote);
  });

  it('applies commands locally for non-remote subjects', () => {
    const sent: unknown[] = [];
    setSessionCommandSender(() => sent.push(true));
    const hunterId = campaignById(SEED.id)!.hunters[0]!.hunterId;
    const before = campaignById(SEED.id)!.hunters[0]!.resources.blood ?? 0;

    runCommand('adjustHunterResource', SEED, hunterId, 'blood', 1);

    expect(sent).toHaveLength(0);
    expect(campaignById(SEED.id)!.hunters[0]!.resources.blood).toBe(before + 1);
  });
});

describe('session pairing', () => {
  /**
   * One kind's full pairing exercise: the seeded record, a command a guest can forward,
   * and the effect it must have once the host applied it. Every subject kind travels
   * the same wire: the table keeps the four cases honest about their differences.
   */
  interface PairingCase {
    assertEffect(): void;
    readonly kind: GameMode;
    run(ref: SubjectRef): void;
    seed(): Promise<void>;
  }

  const cases: PairingCase[] = [
    {
      assertEffect: () => expect(campaignById(pairId('campaign'))?.hunters[0]?.resources.blood).toBe(2),
      kind: 'campaign',
      run: (ref) => runCommand('adjustHunterResource', ref, 'daeron', 'blood', 2),
      seed: async () => {
        // Creation applies chapter 1's rewards, so the starting resources vary by hunter :
        // pin daeron's blood to keep the assertion absolute.
        const campaign = remoteCampaign(pairId('campaign'));
        await store.put('campaigns', {
          ...campaign,
          hunters: campaign.hunters.map((hunter) =>
            hunter.hunterId === 'daeron' ? { ...hunter, resources: { ...hunter.resources, blood: 0 } } : hunter,
          ),
          rev: 0,
        });
      },
    },
    {
      assertEffect: () => expect(expeditionById(pairId('expedition'))?.hunterState.daeron?.damage).toBe(1),
      kind: 'expedition',
      run: (ref) => runCommand('adjustHunterCounter', ref, 'daeron', 'damage', 1),
      seed: async () => {
        await store.put('expeditions', remoteExpedition(pairId('expedition')));
      },
    },
    {
      assertEffect: () => expect(ascentById(pairId('ascent'))?.hunters[0]?.woundCount).toBe(2),
      kind: 'ascent',
      run: (ref) => runCommand('setSubjectWounds', ref, 'daeron', 2),
      seed: async () => {
        await store.put('ascents', remoteAscent(pairId('ascent')));
      },
    },
    {
      assertEffect: () => expect(challengeById(pairId('challenge'))?.hunters[0]?.woundCount).toBe(2),
      kind: 'challenge',
      run: (ref) => runCommand('setSubjectWounds', ref, 'daeron', 2),
      seed: async () => {
        await store.put('challenges', remoteChallenge(pairId('challenge')));
      },
    },
  ];

  it.each(cases.map((entry) => [entry.kind, entry] as const))(
    'pairs a guest on a %s and applies the forwarded command on the host',
    async (_kind, entry) => {
      const ref = { id: pairId(entry.kind), kind: entry.kind };
      await entry.seed();
      const fake = createFakeRtc();
      startSessionHost(ref, { rtc: fake.rtc });
      const invitation = await createSessionInvitation();

      const joined = new Promise<SubjectRef>((resolve) => {
        const off = bus.on('session:joined', (event) => {
          off();
          resolve(event.subject);
        });
      });
      // The guest joins through the join link, the way every handover surface carries it.
      const answer = await beginSessionJoin(sessionJoinLink(invitation), 'Sam', { rtc: fake.rtc });
      await acceptSessionAnswer(answer);

      const subject = await joined;
      expect(subject).toEqual(ref);
      await flush();
      expect(isRemoteSubject(ref.id)).toBe(true);
      expect(sessionState.value).toEqual({ mode: 'guest', subject: ref });

      // A command on the mirror forwards to the host; the next snapshot carries the result back.
      entry.run(subject);
      await flush();
      entry.assertEffect();
    },
  );

  it('ends a guest session when the tab starts hosting another subject', async () => {
    const fake = createFakeRtc();
    startSessionHost(SEED, { rtc: fake.rtc });
    const invitation = await createSessionInvitation();
    const answer = await beginSessionJoin(invitation, 'Sam', { rtc: fake.rtc });
    await acceptSessionAnswer(answer);
    await flush();
    expect(isRemoteSubject(SEED.id)).toBe(true);

    // One session per tab: hosting while being a guest ends the guest session first.
    startSessionHost(SEED, { rtc: createFakeRtc().rtc });
    await flush();
    expect(isRemoteSubject(SEED.id)).toBe(false);
    expect(sessionState.value).toEqual({ mode: 'host', subject: SEED });
  });

  it('rejects commands targeting a subject outside the hosted session', async () => {
    const fake = createFakeRtc();
    startSessionHost(SEED, { rtc: fake.rtc });
    const invitation = await createSessionInvitation();
    const answer = await beginSessionJoin(invitation, 'Sam', { rtc: fake.rtc });
    await acceptSessionAnswer(answer);
    await flush();

    const notices: AppEvents['notify'][] = [];
    const off = bus.on('notify', (notice) => notices.push(notice));
    mountRemoteSubject(remoteCampaign('other-campaign'));
    runCommand('adjustHunterResource', { id: 'other-campaign', kind: 'campaign' }, 'daeron', 'blood', 1);
    await flush();
    off();

    expect(notices.some((notice) => notice.key === 'toasts.sessionActionRejected')).toBe(true);
  });
});
