import { beforeEach, describe, expect, it } from 'vitest';
import { forgeEquipment } from '../content';
import type { CatalogPort } from '../domain/catalog';
import { createLoadout, decodeLoadoutCode, type SharedBuild } from '../domain/loadout';
import { availableHunters } from '../domain/party';
import { catalog, createCatalogStub } from './catalog';
import { bus } from './events';
import {
  createLoadout as createSavedBuild,
  hasUnpublishedChanges,
  loadoutById,
  publishLoadout,
  removeLoadout,
  renameLoadout,
  unpublishLoadout,
} from './store';
import { loadCatalogRecord } from './subject-state';
import { flush, openTestStore } from './test-harness';

/** A catalog port double that fails every unpublish: the offline backend. */
const failingUnpublish: CatalogPort = {
  get: async () => null,
  identity: () => null,
  like: async () => {
    throw new Error('offline');
  },
  list: async () => ({ cursor: null, entries: [], previous: null, totalItems: 0 }),
  publish: async () => {
    throw new Error('offline');
  },
  unlike: async () => {
    throw new Error('offline');
  },
  unpublish: async () => {
    throw new Error('offline');
  },
};

/** A real, publishable build for the first base-game hunter, built through the domain's starter path. */
const sharedBuild = (name = 'Test Build'): SharedBuild => {
  const hunter = availableHunters([])[0]!;
  const loadout = createLoadout(hunter.id, [], { id: 'test-loadout', name, now: '2026-10-01T00:00:00.000Z' });
  return {
    deckCardIds: loadout.deckCardIds,
    equipment: loadout.equipment,
    hunterId: loadout.hunterId,
    masteryCardId: loadout.masteryCardId,
    name: loadout.name,
    potionLoadoutIds: loadout.potionLoadoutIds,
  };
};

beforeEach(async () => {
  await openTestStore();
});

describe('catalog stub identity', () => {
  it('mints one stable player principal', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const first = service.identity();
    expect(first?.roles).toEqual(['player']);
    expect(service.identity()?.id).toBe(first?.id);
  });

  it('keeps the principal and publications across instances', async () => {
    const first = createCatalogStub();
    await first.hydrate();
    const entry = await first.publish({ build: sharedBuild() });
    await flush();

    const second = createCatalogStub();
    await second.hydrate();
    const page = await second.list({ sort: 'recent' });
    expect(page.entries.find((candidate) => candidate.id === entry.id)?.author.id).toBe(first.identity()?.id);
  });
});

describe('catalog stub list', () => {
  it('ranks seeded entries newest first', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const page = await service.list({ sort: 'recent' });
    expect(page.entries.map((entry) => entry.name)).toEqual([
      'First Steps',
      'Stone Circle',
      'River Warden',
      'Ember Vanguard',
    ]);
    expect(page.cursor).toBeNull();
  });

  it('ranks by likes first, recency breaking ties', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const page = await service.list({ sort: 'liked' });
    expect(page.entries[0]?.name).toBe('Ember Vanguard');
  });

  it('filters to one hunter and pages by cursor', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const hunter = availableHunters([])[0]!;
    // The hunter's own seed plus one publication of ours make two filtered pages.
    await service.publish({ build: sharedBuild() });

    const page = await service.list({ hunterId: hunter.id, limit: 1, sort: 'recent' });
    expect(page.entries).toHaveLength(1);
    expect(page.entries.every((entry) => entry.hunterId === hunter.id)).toBe(true);
    expect(page.cursor).not.toBeNull();
    expect(page.totalItems).toBe(2);

    const next = await service.list({ cursor: page.cursor!, hunterId: hunter.id, limit: 1, sort: 'recent' });
    expect(next.entries).toHaveLength(1);
    expect(next.previous).not.toBeNull();
  });

  it('searches entries by name, case-insensitively', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const page = await service.list({ search: '  EMBER  ', sort: 'recent' });
    expect(page.entries.map((entry) => entry.name)).toEqual(['Ember Vanguard']);
    expect(page.totalItems).toBe(1);
  });

  it('filters entries by the element their equipment carries', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    // Starter gear carries no element; an elemental weapon is what tags a build.
    const elemental = forgeEquipment.find((piece) => piece.type === 'weapon' && piece.element)!;
    const build = sharedBuild();
    await service.publish({ build: { ...build, equipment: { ...build.equipment, weaponId: elemental.id } } });
    const published = (await service.list({ sort: 'recent' })).entries[0]!;
    expect(published.elementIds).toEqual([elemental.element]);

    const matching = await service.list({ elementId: elemental.element!, sort: 'recent' });
    expect(matching.entries.map((entry) => entry.id)).toContain(published.id);

    const none = await service.list({ elementId: 'element-nothing-carries', sort: 'recent' });
    expect(none.entries).toHaveLength(0);
  });
});

describe('catalog stub publish', () => {
  it('stores an immutable, decodable snapshot under the publishing principal', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const build = sharedBuild();
    const entry = await service.publish({ build });

    expect(entry.author.id).toBe(service.identity()?.id);
    expect(entry.likeCount).toBe(0);
    const decoded = decodeLoadoutCode(entry.code);
    expect(decoded.hunterId).toBe(build.hunterId);
    expect(decoded.name).toBe(build.name);
  });

  it('republishes a new snapshot under the same id and likes', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const entry = await service.publish({ build: sharedBuild() });
    await service.like(entry.id);

    const renamed = { ...sharedBuild(), name: 'Renamed' };
    const republished = await service.publish({ build: renamed, entryId: entry.id });

    expect(republished.id).toBe(entry.id);
    expect(republished.name).toBe('Renamed');
    expect(republished.likeCount).toBe(1);
    expect((await service.get(entry.id))?.code).toBe(republished.code);
  });

  it('hard-deletes the entry and its likes on unpublish, idempotently', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const entry = await service.publish({ build: sharedBuild() });
    await service.like(entry.id);

    await service.unpublish(entry.id);
    await service.unpublish(entry.id);

    expect(await service.get(entry.id)).toBeNull();
    const page = await service.list({ sort: 'recent' });
    expect(page.entries.some((candidate) => candidate.id === entry.id)).toBe(false);
  });
});

describe('catalog stub likes', () => {
  it('toggles a like on a seeded entry and never counts twice', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const seed = (await service.list({ sort: 'recent' })).entries[0]!;

    const liked = await service.like(seed.id);
    expect(liked.liked).toBe(true);
    expect(liked.likeCount).toBe(seed.likeCount + 1);

    const again = await service.like(seed.id);
    expect(again.likeCount).toBe(seed.likeCount + 1);

    const unliked = await service.unlike(seed.id);
    expect(unliked.liked).toBe(false);
    expect(unliked.likeCount).toBe(seed.likeCount);
  });
});

describe('catalog no-orphan queue', () => {
  it('keeps a queued unpublish while the catalog is unreachable and drains it later', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const entry = await service.publish({ build: sharedBuild() });

    // The enqueue's immediate flush runs against the offline double and fails:
    // the op must survive it…
    service.enqueueUnpublish(entry.id, failingUnpublish);
    await flush();
    const stored = await loadCatalogRecord();
    expect(stored?.pending.map((op) => op.entryId)).toEqual([entry.id]);
    expect(await service.get(entry.id)).not.toBeNull();

    // …so the next session's hydration drains it against the reachable catalog.
    const next = createCatalogStub();
    await next.hydrate();
    expect(await next.get(entry.id)).toBeNull();
    expect((await loadCatalogRecord())?.pending).toHaveLength(0);
  });

  it('drops the queue entry once the catalog confirms the unpublish', async () => {
    const service = createCatalogStub();
    await service.hydrate();
    const entry = await service.publish({ build: sharedBuild() });

    service.enqueueUnpublish(entry.id);
    await flush();
    // The enqueue's own flush ran against the stub: nothing stays queued.
    const stored = await loadCatalogRecord();
    expect(stored?.pending).toHaveLength(0);
    expect(await service.get(entry.id)).toBeNull();
  });
});

describe('loadout catalog commands', () => {
  /** The commands run against the singleton, so each test rebinds it to the fresh store. */
  beforeEach(async () => {
    await catalog.hydrate();
  });

  it('publishes a build and stamps the entry link without drift', async () => {
    const build = createSavedBuild(availableHunters([])[0]!.id);
    const published = await publishLoadout(build.id);

    expect(published?.catalogEntryId).toBeTruthy();
    expect(published?.publishedRev).toBe(published?.rev);
    expect(hasUnpublishedChanges(published!)).toBe(false);

    const page = await catalog.list({ sort: 'recent' });
    expect(page.entries.some((entry) => entry.id === published?.catalogEntryId)).toBe(true);
  });

  it('marks local edits as unpublished drift and republishing clears it', async () => {
    const build = createSavedBuild(availableHunters([])[0]!.id);
    const published = (await publishLoadout(build.id))!;

    const renamed = renameLoadout(build.id, 'Drifted name')!;
    expect(hasUnpublishedChanges(renamed)).toBe(true);

    const republished = (await publishLoadout(build.id))!;
    expect(republished.catalogEntryId).toBe(published.catalogEntryId);
    expect(hasUnpublishedChanges(republished)).toBe(false);
  });

  it('unpublishing removes the catalog entry and clears the link', async () => {
    const build = createSavedBuild(availableHunters([])[0]!.id);
    const published = (await publishLoadout(build.id))!;

    const unpublished = unpublishLoadout(build.id)!;
    expect(unpublished.catalogEntryId).toBeUndefined();
    await flush();
    expect(await catalog.get(published.catalogEntryId!)).toBeNull();
  });

  it('deleting a published build removes its entry; undo restores it unpublished', async () => {
    const build = createSavedBuild(availableHunters([])[0]!.id);
    const published = (await publishLoadout(build.id))!;
    const notices: Array<{ actions?: Array<{ onClick: () => void }> }> = [];
    const unsubscribe = bus.on('notify', (notice) => notices.push(notice));

    try {
      removeLoadout(build.id);
      await flush();
      expect(await catalog.get(published.catalogEntryId!)).toBeNull();

      notices.at(-1)?.actions?.[0]?.onClick();
      await flush();
      const restored = loadoutById(build.id);
      expect(restored).toBeDefined();
      expect(restored?.catalogEntryId).toBeUndefined();
    } finally {
      unsubscribe();
    }
  });
});
