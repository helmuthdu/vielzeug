import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { potions, questId } from '../content';
import { commitQuestSelection, createCampaign, sendChapterEvent, unlockQuest } from '../domain/campaign';
import { PrimalDomainError } from '../domain/errors';
import { snapshotFightStart } from '../domain/fight-events';
import { encodeLoadoutCode } from '../domain/loadout';
import { woundThreshold } from '../domain/monster-state';
import { requiredExpansionsFor } from '../domain/prerequisites';
import type { SubjectRef } from '../domain/types';
import { createMemoryPrimalStore, type PrimalStore, SETTINGS_ID } from './database';
import { type AppEvents, bus } from './events';
import { i18n, setLocale } from './i18n';
import { APP_VERSION, DEFAULT_SETTINGS } from './persistence';
import {
  ascentById,
  campaignById,
  challengeById,
  createLoadout,
  duplicateLoadout,
  type ExpeditionDraft,
  expeditionById,
  exportSavedData,
  findMatchingLoadout,
  hydratePrimalStore,
  importLoadout,
  importSavedData,
  loadoutById,
  loadoutsForHunter,
  notifyError,
  patchSettings,
  removeLoadout,
  removeSubject,
  renameLoadout,
  resetSettings,
  restartChallenge,
  runCommand,
  saveExpedition,
  saveHunterBuild,
  saveLoadout,
  setLoadoutEquipment,
  setLoadoutPotion,
  settings,
  startAscent,
  startChallenge,
  updateLoadoutBuild,
} from './store';
import { applySubjectCommand } from './subject-run';
import { flush, openTestStore, putCampaign } from './test-harness';

const SEED: SubjectRef = { id: 'campaign-seed', kind: 'campaign' };

let store: PrimalStore;
let unsubscribe: (() => void) | undefined;

beforeEach(async () => {
  store = await openTestStore();
});

afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
});

describe('settings', () => {
  it('updates the color-theme preference', () => {
    patchSettings({ theme: 'dark' });
    expect(settings.value.theme).toBe('dark');
  });

  it('applies the persisted language when the account hydrates', async () => {
    // A previous session left German behind: the stored record arrives through the settings
    // observer, after the boot's in-memory defaults: the locale must follow the record.
    const stored = createMemoryPrimalStore();
    await stored.put('settings', { ...DEFAULT_SETTINGS, id: SETTINGS_ID, language: 'de' });
    await hydratePrimalStore(stored);
    try {
      await vi.waitFor(() => expect(i18n.locale).toBe('de'));
    } finally {
      await setLocale('en');
    }
  });

  it('persists the wide-screen hunter board layout and falls back to the party layout', async () => {
    patchSettings({ hunterBoardLayout: 'hunter' });
    expect(settings.value.hunterBoardLayout).toBe('hunter');

    const backup = exportSavedData();
    patchSettings({ hunterBoardLayout: 'party' });
    await importSavedData(backup);
    await flush();
    expect(settings.value.hunterBoardLayout).toBe('hunter');

    resetSettings();
    expect(settings.value.hunterBoardLayout).toBe('party');
    await flush();
    expect(settings.value.hunterBoardLayout).toBe('party');
  });
});

describe('ascent creation', () => {
  it('uses selected boxes without changing the owned game library', async () => {
    const ownedExpansionIds = [...settings.value.ownedExpansionIds];
    const ascent = startAscent('Library selection', ['daeron', 'ljonar'], ['core', 'mount-havoc'], false);

    try {
      expect(ascent.expansionIds).toEqual(['core', 'mount-havoc']);
      expect(settings.value.ownedExpansionIds).toEqual(ownedExpansionIds);
    } finally {
      removeSubject({ id: ascent.id, kind: 'ascent' });
      await flush();
    }
  });

  it('starts a fresh climb with the finished ascent’s party and boxes', async () => {
    const original = startAscent('First climb', ['daeron', 'ljonar'], ['core', 'mount-havoc'], false);
    await store.put('ascents', { ...original, chapter: 2, phase: 'result', result: 'defeat', status: 'finished' });
    await flush();

    const fresh = startAscent(
      '',
      original.hunters.map((member) => member.hunterId),
      original.expansionIds,
      false,
    );
    expect(fresh).toMatchObject({
      chapter: 1,
      defeatedMonsterIds: [],
      expansionIds: original.expansionIds,
      phase: 'preparing',
      result: null,
      status: 'running',
    });
    expect(fresh.hunters.map((member) => member.hunterId)).toEqual(original.hunters.map((member) => member.hunterId));
    expect(ascentById(original.id)?.result).toBe('defeat');
  });
});

describe('Winds series restarts', () => {
  it('starts over after defeat with the same series, party and boxes', async () => {
    const boxes = ['core', ...requiredExpansionsFor('challenge', 'winds-of-spring')] as const;
    const original = startChallenge('winds-of-spring', 'First attempt', ['daeron', 'ljonar'], [...boxes], false);
    await store.put('challenges', {
      ...original,
      expeditionNumber: 2,
      phase: 'result',
      result: 'defeat',
      status: 'finished',
    });
    await flush();

    const fresh = restartChallenge(original.id);
    expect(fresh).toMatchObject({
      expansionIds: original.expansionIds,
      expeditionNumber: 1,
      phase: 'quest-board',
      result: null,
      scores: [],
      seriesId: original.seriesId,
      status: 'running',
    });
    expect(fresh?.hunters.map((hunter) => hunter.hunterId)).toEqual(original.hunters.map((hunter) => hunter.hunterId));
    expect(challengeById(original.id)?.result).toBe('defeat');
  });
});

describe('saved data', () => {
  it('exports and restores campaigns, expeditions, and settings', async () => {
    const backup = exportSavedData();

    await store.batch(['ascents', 'campaigns', 'expeditions'], async (tx) => {
      await tx.clear('ascents');
      await tx.clear('campaigns');
      await tx.clear('expeditions');
    });
    await flush();
    expect(campaignById('campaign-seed')).toBeUndefined();
    patchSettings({ theme: 'dark' });

    await expect(importSavedData(backup)).resolves.toEqual({
      ascents: 0,
      campaigns: 1,
      challenges: 0,
      expeditions: 0,
    });
    await flush();
    expect(campaignById('campaign-seed')).toBeDefined();
    expect(campaignById('campaign-seed')?.huntHistory).toEqual([]);
    expect(settings.value.theme).toBe('system');
  });

  it('rejects unknown and inherited wire commands without changing saved state', () => {
    const before = campaignById(SEED.id);
    for (const name of ['not-a-command', '__proto__', 'constructor']) {
      expect(applySubjectCommand(name, SEED, [])).toBeUndefined();
    }
    expect(campaignById(SEED.id)).toEqual(before);
  });

  it('rejects malformed command state before updating memory', () => {
    const before = campaignById(SEED.id)!;
    expect(() =>
      applySubjectCommand('adjustHunterCounter', SEED, [before.hunters[0]!.hunterId, 'not-a-track', 1]),
    ).toThrow();
    expect(campaignById(SEED.id)).toEqual(before);
  });

  it('round-trips hunt history through a saved-data backup', async () => {
    const current = campaignById('campaign-seed');
    const hunter = current?.hunters[0];
    if (!current || !hunter) throw new Error('the seed campaign is missing');
    const history = [
      {
        durationMs: 123000,
        events: [],
        fightStart: snapshotFightStart({ ...current, hunters: [hunter] }, 'toramat'),
        hunters: [
          {
            deckCardIds: [...hunter.deckCardIds],
            equipment: { ...hunter.equipment },
            hunterId: hunter.hunterId,
            masteryCardId: hunter.masteryCardId,
          },
        ],
        id: `${current.id}:hunt:1`,
        monsterId: 'toramat',
        outcome: 'victory' as const,
        recordedAt: '2026-01-01T00:12:03.000Z',
      },
    ];
    await putCampaign(store, { ...current, huntHistory: history });
    const backup = exportSavedData();

    await store.batch(['campaigns'], (tx) => tx.clear('campaigns'));
    await flush();
    await importSavedData(backup);
    await flush();

    expect(campaignById(current.id)?.huntHistory).toEqual(history);
  });

  it('captures committed fight events and snapshots them into the completed hunt record', async () => {
    const created = createCampaign({
      config: { expansionIds: ['core'], name: 'Fight event canary', nightmareVariant: false, variants: [] },
      hunterIds: ['daeron', 'mirah'],
      id: 'fight-event-canary',
      now: '2026-01-01T00:00:00.000Z',
    });
    const preparing = commitQuestSelection(created, questId(1), '2026-01-01T00:00:00.000Z');
    const active = sendChapterEvent(preparing, { type: 'FINISH_PREPARING' }, '2026-01-01T00:00:00.000Z');
    const ref: SubjectRef = { id: active.id, kind: 'campaign' };
    await putCampaign(store, active);

    runCommand('adjustHunterCounter', ref, 'daeron', 'damage', 2);
    await flush();
    const updated = campaignById(active.id);
    expect(updated?.fightEvents).toHaveLength(1);
    expect(updated?.fightEvents[0]).toMatchObject({
      actor: { hunterId: 'daeron', kind: 'hunter' },
      delta: 2,
      sequence: 1,
      type: 'damage',
      value: 2,
    });

    const woundCost = woundThreshold(updated!.monsterState, updated!.hunters.length);
    runCommand('adjustMonsterCounter', ref, 'damage', woundCost);
    runCommand('confirmMonsterWound', ref);
    runCommand('setMonsterStance', ref, 2);
    await flush();
    const progressed = campaignById(active.id);
    expect(progressed?.fightEvents.map((event) => event.type)).toEqual([
      'damage',
      'damage',
      'wound-ready',
      'wound',
      'stance',
    ]);

    runCommand('recordHuntResult', ref, 'victory', []);
    await flush();
    expect(campaignById(active.id)?.huntHistory[0]?.events).toEqual(progressed?.fightEvents);
  });

  it('records a quest victory that grants two copies of one reward card', async () => {
    // Quest 6 grants reward card 2 twice ("unlock both copies"), so the recorded campaign's
    // pending-reward pool legitimately holds the same id twice: one entry per copy. The
    // commit-time snapshot validation rejected that pool before the schema allowed it.
    const now = '2026-01-01T00:00:00.000Z';
    let campaign = createCampaign({
      config: { expansionIds: ['core'], name: 'Double Reward', nightmareVariant: false, variants: [] },
      hunterIds: ['daeron', 'mirah'],
      id: 'double-reward',
      now,
    });
    campaign = unlockQuest(campaign, questId(6), now);
    await putCampaign(store, campaign);
    const ref: SubjectRef = { id: 'double-reward', kind: 'campaign' };

    runCommand('commitCampaignQuest', ref, questId(6));
    runCommand('moveChapterPhase', ref, { type: 'FINISH_PREPARING' });
    await flush();

    expect(() => runCommand('recordHuntResult', ref, 'victory', [])).not.toThrow();
    await flush();

    const recorded = campaignById('double-reward');
    expect(recorded?.phase).toBe('result');
    const pending = recorded?.unassignedRewards ?? [];
    expect(pending).toHaveLength(2);
    expect(pending[0]).toBe(pending[1]);
  });

  it('rejects a backup with a history-free saved game', async () => {
    const before = campaignById('campaign-seed');
    const backup = JSON.parse(exportSavedData()) as { data: { campaigns: Array<Record<string, unknown>> } };
    delete backup.data.campaigns[0]!.huntHistory;

    await expect(importSavedData(JSON.stringify(backup))).rejects.toThrow(/contains invalid saved games/);
    await flush();
    expect(campaignById('campaign-seed')).toEqual(before);
  });

  it('rejects unsupported files without replacing saved data', async () => {
    const before = campaignById('campaign-seed');

    await expect(importSavedData('{"format":"other","version":1}')).rejects.toThrow(/not a supported Primal backup/);
    const invalid = JSON.parse(exportSavedData()) as { data: { campaigns: Array<{ hunters: unknown[] }> } };
    invalid.data.campaigns[0].hunters = [null];
    await expect(importSavedData(JSON.stringify(invalid))).rejects.toThrow(/contains invalid saved games/);
    await flush();
    expect(campaignById('campaign-seed')).toEqual(before);
  });
});

describe('revisions', () => {
  it('counts every committed write on the subject', async () => {
    expect(campaignById('campaign-seed')?.rev).toBe(0);
    expect(runCommand('adjustMonsterCounter', SEED, 'damage', 1)?.rev).toBe(1);
    runCommand('adjustMonsterCounter', SEED, 'damage', 1);
    await flush();
    expect(campaignById('campaign-seed')?.rev).toBe(2);
  });

  it('counts every committed write on a saved build', () => {
    const member = campaignById('campaign-seed')?.hunters[0];
    if (!member) throw new Error('the seed campaign is missing');
    const loadout = saveLoadout(member.hunterId, 'Tracked', member);
    expect(loadout.rev).toBe(0);
    expect(renameLoadout(loadout.id, 'Tracked twice')?.rev).toBe(1);
  });

  it('stamps the writer on backups and round-trips revisions', async () => {
    const ascent = startAscent('Revisioned peak', ['daeron', 'mirah'], ['core', 'mount-havoc'], false);
    runCommand('adjustMonsterCounter', SEED, 'damage', 1);
    const backup = exportSavedData();
    expect(JSON.parse(backup).appVersion).toBe(APP_VERSION);

    await store.batch(['ascents', 'campaigns', 'expeditions', 'loadouts'], async (tx) => {
      await tx.clear('ascents');
      await tx.clear('campaigns');
      await tx.clear('expeditions');
      await tx.clear('loadouts');
    });
    await flush();
    await expect(importSavedData(backup)).resolves.toEqual({
      ascents: 1,
      campaigns: 1,
      challenges: 0,
      expeditions: 0,
    });
    await flush();
    expect(campaignById('campaign-seed')?.rev).toBe(1);
    expect(ascentById(ascent.id)?.name).toBe('Revisioned peak');
  });
});

describe('error notices', () => {
  it('localizes domain errors into the active locale by their code', async () => {
    const notices: AppEvents['notify'][] = [];
    unsubscribe = bus.on('notify', (event) => notices.push(event));
    try {
      await setLocale('de');
      notifyError('toasts.saveFailed', new PrimalDomainError('run-name-invalid', 'English fallback'));
      expect(notices.at(-1)?.values).toMatchObject({
        message: 'Gib dem Lauf einen Namen mit 1–40 Zeichen.',
      });
      notifyError('toasts.saveFailed', new PrimalDomainError('ascent-pile-empty', 'English fallback'));
      expect(notices.at(-1)?.values).toMatchObject({
        message: 'In diesem Aufstieg sind keine spielbaren Begegnungen mehr übrig. Beginne einen neuen Aufstieg.',
      });

      await setLocale('en');
      notifyError('toasts.saveFailed', new PrimalDomainError('run-name-invalid', 'English fallback'));
      expect(notices.at(-1)?.values).toMatchObject({
        message: 'Give the run a name of 1–40 characters.',
      });
      notifyError('toasts.saveFailed', new PrimalDomainError('ascent-pile-empty', 'English fallback'));
      expect(notices.at(-1)?.values).toMatchObject({
        message: 'No playable encounters remain in this ascent. Start a new ascent to continue.',
      });
    } finally {
      await setLocale('en');
    }
  });

  it('shows the raw message for non-domain errors and the fallback key for the rest', () => {
    const notices: AppEvents['notify'][] = [];
    unsubscribe = bus.on('notify', (event) => notices.push(event));

    notifyError('toasts.saveFailed', new Error('Plain failure'));
    expect(notices.at(-1)?.values).toMatchObject({ message: 'Plain failure' });

    notifyError('toasts.saveFailed', 'not an error');
    expect(notices.at(-1)?.key).toBe('toasts.saveFailed');
  });
});

describe('loadouts', () => {
  const daeron = () => campaignById('campaign-seed')?.hunters.find((member) => member.hunterId === 'daeron');

  it('saves, renames, duplicates, updates and deletes builds per hunter', async () => {
    const member = daeron();
    expect(member).toBeDefined();
    if (!member) return;
    const saved = saveLoadout('daeron', '  Starter  ', member);
    expect(saved).toMatchObject({ hunterId: 'daeron', name: 'Starter' });
    await flush();
    expect(findMatchingLoadout(loadoutsForHunter('daeron'), 'daeron', member)?.id).toBe(saved.id);
    expect(loadoutsForHunter('ljonar')).toEqual([]);

    expect(renameLoadout(saved.id, 'Great Sword')?.name).toBe('Great Sword');
    expect(renameLoadout(saved.id, '   ')?.name).toBe('Great Sword');

    const copy = duplicateLoadout(saved.id);
    expect(copy).toMatchObject({ name: 'Great Sword copy' });
    await flush();
    expect(loadoutsForHunter('daeron')).toHaveLength(2);

    const updated = updateLoadoutBuild(saved.id, { ...member, equipment: { ...member.equipment, itemId: null } });
    expect(updated?.equipment.itemId).toBeNull();

    removeLoadout(saved.id);
    await flush();
    expect(loadoutsForHunter('daeron').map((entry) => entry.id)).toEqual([copy?.id]);
  });

  it('creates a library build from base equipment and changes its equipment against the owned boxes', () => {
    const created = createLoadout('daeron');
    expect(created).toMatchObject({ hunterId: 'daeron', name: 'Build 1' });
    expect(created.equipment.weaponId).toBe('weapon-daeron-great-sword-l1');
    expect(created.deckCardIds.length).toBeGreaterThan(0);

    const worn = setLoadoutEquipment(created.id, 'weapon', 'weapon-daeron-bloodreef-l1');
    expect(worn?.equipment.weaponId).toBe('weapon-daeron-bloodreef-l1');
    expect(loadoutById(created.id)?.equipment.weaponId).toBe('weapon-daeron-bloodreef-l1');
    expect(() => setLoadoutEquipment(created.id, 'weapon', 'weapon-karah-dancing-bones-l1')).toThrow(PrimalDomainError);
    expect(setLoadoutPotion(created.id, 2, 'herbalist-anyone-alemore-l3')?.potionLoadoutIds).toEqual([
      null,
      null,
      'herbalist-anyone-alemore-l3',
    ]);
    expect(() => setLoadoutPotion(created.id, 0, 'herbalist-anyone-alemore-l3')).toThrow(PrimalDomainError);
    expect(setLoadoutEquipment('missing', 'item', null)).toBeUndefined();
  });

  it('imports a build code as a saved loadout and rejects broken codes', () => {
    const member = daeron();
    if (!member) return;
    const imported = importLoadout(encodeLoadoutCode({ ...member, hunterId: 'daeron', name: 'Shared' }));
    expect(imported).toMatchObject({ hunterId: 'daeron', name: 'Shared' });
    expect([...imported.deckCardIds].sort()).toEqual([...member.deckCardIds].sort());
    expect(() => importLoadout('nope')).toThrow(PrimalDomainError);
  });

  it('applies a loadout to a campaign hunter and to an expedition hunter', async () => {
    const original = campaignById('campaign-seed');
    const member = daeron();
    if (!original || !member) return;
    const loadout = saveLoadout('daeron', 'Lean', { ...member, deckCardIds: member.deckCardIds.slice(1) });
    try {
      const applied = runCommand('applyLoadout', SEED, 'daeron', loadout);
      expect(applied?.hunters.find((entry) => entry.hunterId === 'daeron')?.deckCardIds).toHaveLength(23);
      const restored = runCommand('setHunterDeck', SEED, 'daeron', member.deckCardIds);
      expect(restored?.hunters[0].deckCardIds).toEqual(member.deckCardIds);
    } finally {
      await putCampaign(store, original);
    }

    const expedition = saveExpedition({
      aggression: 1,
      expansionIds: ['core'],
      hunterIds: ['daeron', 'ljonar'],
      monsterId: 'vyraxen',
      nightmareVariant: false,
      scenarioId: 'vyraxen-expedition-1',
    });
    const expeditionRef: SubjectRef = { id: expedition.id, kind: 'expedition' };
    try {
      const worn = runCommand('equipEquipment', expeditionRef, 'daeron', 'item', 'forge-anyone-big-jaws-l1');
      expect(worn?.hunters[0].equipment.itemId).toBe('forge-anyone-big-jaws-l1');
      const applied = runCommand('applyLoadout', expeditionRef, 'daeron', loadout);
      expect(applied?.hunters[0].equipment.itemId).toBeNull();
      expect(applied?.hunters[0].deckCardIds).toHaveLength(23);
    } finally {
      removeSubject(expeditionRef);
      await flush();
      expect(expeditionById(expedition.id)).toBeUndefined();
    }

    const prologueExpedition = saveExpedition({
      aggression: 0,
      expansionIds: ['core'],
      hunterIds: ['daeron', 'ljonar'],
      monsterId: 'vyraxen',
      nightmareVariant: false,
      scenarioId: 'vyraxen-expedition-1',
    });
    const prologueRef: SubjectRef = { id: prologueExpedition.id, kind: 'expedition' };
    try {
      expect(prologueExpedition.aggression).toBe(0);
      expect(expeditionById(prologueExpedition.id)?.aggression).toBe(0);
    } finally {
      removeSubject(prologueRef);
      await flush();
    }
  });
});

describe('expedition drafts', () => {
  const draft: ExpeditionDraft = {
    aggression: 1,
    expansionIds: ['core'],
    hunterIds: ['daeron', 'ljonar'],
    monsterId: 'vyraxen',
    nightmareVariant: false,
    scenarioId: 'vyraxen-expedition-1',
  };

  it("updates the wizard's committed record instead of duplicating it", async () => {
    const saved = saveExpedition(draft);
    const ref: SubjectRef = { id: saved.id, kind: 'expedition' };
    try {
      // A revisited wizard step re-commits the same record: the party change lands on it,
      // and a kept hunter carries the build the first save fitted.
      const updated = saveExpedition({ ...draft, hunterIds: ['daeron', 'mirah'] }, saved.id);
      expect(updated.id).toBe(saved.id);
      expect(updated.hunters.map((member) => member.hunterId)).toEqual(['daeron', 'mirah']);
      expect(updated.hunters.find((member) => member.hunterId === 'daeron')?.deckCardIds).toEqual(
        saved.hunters.find((member) => member.hunterId === 'daeron')?.deckCardIds,
      );
      await flush();
      expect(expeditionById(saved.id)?.hunters).toHaveLength(2);
    } finally {
      removeSubject(ref);
      await flush();
    }
  });

  it('rejects an update for a record that no longer exists', () => {
    expect(() => saveExpedition(draft, 'expedition-gone')).toThrow(PrimalDomainError);
  });
});

describe('quest commitment', () => {
  it('persists the active quest and enters Preparation in one update', async () => {
    const original = campaignById('campaign-seed');
    expect(original).toBeDefined();
    if (!original) return;
    await putCampaign(store, { ...original, phase: 'quest-board' });

    const committed = runCommand('commitCampaignQuest', SEED, 'quest-002');
    expect(committed).toMatchObject({ activeQuestId: 'quest-002', phase: 'preparing' });
    await flush();
    expect(campaignById('campaign-seed')).toMatchObject({ activeQuestId: 'quest-002', phase: 'preparing' });

    await putCampaign(store, original);
  });
});

describe('command undo', () => {
  /** Captures the notices carrying actions: the undoable commands' own toasts. */
  const captureActionNotices = (): (() => AppEvents['notify'][]) => {
    const notices: AppEvents['notify'][] = [];
    unsubscribe = bus.on('notify', (event) => {
      if (event.actions?.length) notices.push(event);
    });
    return () => notices;
  };

  /** Captures warning notices: the polite refusals. */
  const captureWarnings = (): (() => AppEvents['notify'][]) => {
    const notices: AppEvents['notify'][] = [];
    unsubscribe = bus.on('notify', (event) => {
      if (event.variant === 'warning') notices.push(event);
    });
    return () => notices;
  };

  it('tracks potion consumption and its Undo through the real command path', async () => {
    const campaign = structuredClone(campaignById(SEED.id)!);
    const hunter = campaign.hunters[0]!;
    const potionId = potions[0]!.id;
    hunter.potionInventoryIds = [potionId];
    hunter.potionLoadoutIds = [potionId, null, null];
    hunter.consumedPotionIds = [];
    await putCampaign(store, campaign);
    await flush();
    const notices = captureActionNotices();
    runCommand('consumePotion', SEED, hunter.hunterId, potionId);
    expect(campaignById(SEED.id)?.fightEvents.at(-1)).toMatchObject({ consumed: true, potionId, type: 'potion' });
    notices()[0]?.actions?.[0]?.onClick();
    await vi.waitFor(() =>
      expect(campaignById(SEED.id)?.fightEvents.at(-1)).toMatchObject({ consumed: false, potionId, type: 'potion' }),
    );
    await flush();
    expect((await store.get('campaigns', SEED.id))?.fightEvents.at(-1)).toMatchObject({
      consumed: false,
      type: 'potion',
    });
  });

  it('restores the campaign snapshot from the notification action', async () => {
    const campaign = campaignById('campaign-seed');
    expect(campaign?.phase).toBe('hunt');
    const notices = captureActionNotices();

    runCommand('recordHuntResult', SEED, 'victory', []);
    expect(campaignById('campaign-seed')?.phase).toBe('result');
    notices()[0]?.actions?.[0]?.onClick();
    await vi.waitFor(() => expect(campaignById('campaign-seed')?.phase).toBe('hunt'));

    // Undo restores the content; the write counter still advanced (the result and the revert are writes).
    expect(campaignById('campaign-seed')).toEqual(campaign && { ...campaign, rev: campaign.rev + 2 });
  });

  it('restores both reserves after undoing a resource trade', async () => {
    const original = campaignById('campaign-seed');
    expect(original).toBeDefined();
    if (!original) return;
    const prepared = {
      ...original,
      hunters: original.hunters.map((hunter, index) =>
        index === 1 ? { ...hunter, resources: { ...hunter.resources, horn: 1 } } : hunter,
      ),
    };
    await putCampaign(store, prepared);
    const notices = captureActionNotices();

    runCommand('tradeHunterResources', SEED, 'daeron', 'mirah', 'fire', 'horn');
    expect(campaignById('campaign-seed')?.hunters[0].resources.horn).toBe(1);
    expect(campaignById('campaign-seed')?.hunters[1].resources.fire).toBe(3);
    notices()[0]?.actions?.[0]?.onClick();
    await vi.waitFor(() => expect(campaignById('campaign-seed')?.hunters[0].resources.horn).toBeUndefined());

    // The trade reverted; only its timestamp moved, the prepared subject stayed.
    const after = campaignById('campaign-seed');
    expect(after?.hunters[0].resources.fire).toBe(prepared.hunters[0].resources.fire);
    expect(after?.hunters[1].resources.horn).toBe(prepared.hunters[1].resources.horn);
    await putCampaign(store, original);
  });

  it('re-applies the trade when redoing an undo', async () => {
    const notices = captureActionNotices();
    const start = campaignById('campaign-seed')?.hunters[0].resources.bones;

    runCommand('tradeHunterResources', SEED, 'daeron', 'mirah', 'blood', 'bones');
    const traded = campaignById('campaign-seed')?.hunters[0].resources.bones;
    expect(traded).not.toBe(start);
    notices()[0]?.actions?.[0]?.onClick();
    await vi.waitFor(() => expect(campaignById('campaign-seed')?.hunters[0].resources.bones).toBe(start));

    // The undone toast offers Redo; clicking it trades the resources back.
    const undone = notices().at(-1);
    expect(undone?.actions?.[0]?.key).toBe('toasts.redo');
    undone?.actions?.[0]?.onClick();
    await vi.waitFor(() => expect(campaignById('campaign-seed')?.hunters[0].resources.bones).toBe(traded));
  });

  it('offers undo on consecutive undoable commands and reverts the latest', async () => {
    const notices = captureActionNotices();

    runCommand('tradeHunterResources', SEED, 'daeron', 'mirah', 'blood', 'bones');
    const first = campaignById('campaign-seed');
    runCommand('tradeHunterResources', SEED, 'daeron', 'mirah', 'bones', 'blood');

    // Both commands carried an Undo; the second toast's action reverts the latest trade only.
    expect(notices().length).toBeGreaterThanOrEqual(2);
    notices().at(-1)?.actions?.[0]?.onClick();
    await vi.waitFor(() =>
      expect(campaignById('campaign-seed')?.hunters[0].resources.bones).toBe(first?.hunters[0].resources.bones),
    );

    // The first trade survives; the latest trade's exchange came back to both hunters.
    const after = campaignById('campaign-seed');
    expect(after?.hunters[0].resources.blood).toBe(first?.hunters[0].resources.blood);
    expect(after?.hunters[1].resources.bones).toBe(first?.hunters[1].resources.bones);
  });

  it('restores the crafted equipment member from the notification action', async () => {
    const campaign = campaignById('campaign-seed');
    expect(campaign).toBeDefined();
    const notices = captureActionNotices();

    runCommand('craftCampaignEquipment', SEED, 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: true });
    expect(campaignById('campaign-seed')?.hunters[0].equipment.armorId).toBe('forge-anyone-red-scale-armor-l1');
    notices()[0]?.actions?.[0]?.onClick();
    await vi.waitFor(() =>
      expect(campaignById('campaign-seed')?.hunters[0].equipment.armorId).not.toBe('forge-anyone-red-scale-armor-l1'),
    );

    // The member snapshot restores the whole hunter record as it was.
    expect(campaignById('campaign-seed')?.hunters[0]).toEqual(campaign?.hunters[0]);
  });

  it('refuses a hunt-result undo once the subject moved on', async () => {
    const notices = captureActionNotices();
    const warnings = captureWarnings();

    runCommand('recordHuntResult', SEED, 'victory', []);
    runCommand('adjustHunterResource', SEED, 'daeron', 'blood', 1);
    const after = campaignById('campaign-seed');
    notices()[0]?.actions?.[0]?.onClick();
    await vi.waitFor(() => expect(warnings().length).toBeGreaterThan(0));

    expect(campaignById('campaign-seed')).toEqual(after);
  });

  it('takes a build save back as one unit', async () => {
    const original = campaignById('campaign-seed');
    expect(original).toBeDefined();
    if (!original) return;
    runCommand('craftCampaignEquipment', SEED, 'daeron', 'forge-anyone-red-scale-armor-l1', { equip: false });
    const before = campaignById('campaign-seed')?.hunters[0];
    expect(before).toBeDefined();
    if (!before) return;
    const notices = captureActionNotices();

    saveHunterBuild(SEED, 'daeron', {
      deckCardIds: before.deckCardIds,
      equipment: { ...before.equipment, armorId: 'forge-anyone-red-scale-armor-l1' },
      masteryCardId: before.masteryCardId,
      potionLoadoutIds: before.potionLoadoutIds,
    });
    expect(campaignById('campaign-seed')?.hunters[0].equipment.armorId).toBe('forge-anyone-red-scale-armor-l1');
    notices().at(-1)?.actions?.[0]?.onClick();
    await vi.waitFor(() =>
      expect(campaignById('campaign-seed')?.hunters[0].equipment.armorId).toBe(before.equipment.armorId),
    );

    expect(campaignById('campaign-seed')?.hunters[0].deckCardIds).toEqual(before.deckCardIds);
  });
});
