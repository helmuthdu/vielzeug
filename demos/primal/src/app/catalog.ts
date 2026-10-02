import type { UserPrincipal } from '@vielzeug/ward';
import { forgeById } from '../content';
import type { CatalogEntry, CatalogListQuery, CatalogPort, CatalogSort } from '../domain/catalog';
import { createLoadout, encodeLoadoutCode, type SharedBuild } from '../domain/loadout';
import { availableHunters } from '../domain/party';
import { now, uid } from './ids';
import { campaignLogger } from './logger';
import type { CatalogOwnEntry, CatalogPendingOp, CatalogRecord } from './persistence';
import { loadCatalogRecord, persistCatalogRecord } from './subject-state';

// ---------------------------------------------------------------------------
// The community catalog: an in-process stub backend. It implements the catalog
// port against the local vault, so the whole online feature runs and tests
// before a real backend (Cloudflare D1 or Supabase) is chosen: swapping the
// factory's product for a real port swaps the backend, nothing else. The
// stub's own entries, likes and pending unpublishes live in one vault row;
// seeded "other players" are deterministic code, not data.
// ---------------------------------------------------------------------------

/** The catalog port plus the app-side no-orphan queue the stub also persists. */
export interface CatalogService extends CatalogPort {
  /** Queues an unpublish durably; see {@link CatalogService.enqueueUnpublish}. */
  enqueueUnpublish(entryId: string, port?: CatalogPort): void;
  flushQueue(port?: CatalogPort): Promise<void>;
  /** Re-reads the vault row and drains any queue an earlier session left behind. */
  hydrate(): Promise<void>;
}

const EMPTY_RECORD: CatalogRecord = { id: 'app', likedEntryIds: [], own: [], pending: [], principalId: null };

/**
 * Builds a catalog stub over the vault-backed catalog row. All state lives inside the
 * instance: tests create isolated stubs against a freshly hydrated store, the app uses
 * the exported singleton.
 */
export function createCatalogStub(): CatalogService {
  let record: CatalogRecord = EMPTY_RECORD;
  let loading: Promise<void> | null = null;

  /**
   * Loads the catalog row once per hydration; concurrent callers await the same load. A
   * principal minted before the row arrives (an `identity()` call ahead of hydration)
   * survives the merge; everything else takes the stored state, because the stored
   * state is the durable one.
   */
  function ensureLoaded(): Promise<void> {
    loading ??= (async () => {
      const stored = await loadCatalogRecord();
      record = stored ? { ...stored, principalId: stored.principalId ?? record.principalId } : record;
    })();
    return loading;
  }

  /** Applies one edit to the stub's row and mirrors it into the vault. */
  function mutate(next: CatalogRecord): CatalogRecord {
    record = next;
    persistCatalogRecord(next);
    return next;
  }

  /** The device principal, minted on first use and kept for stable authorship. */
  function principal(): UserPrincipal {
    const existing = record.principalId;
    if (existing) return { id: existing, roles: ['player'] };
    const minted = uid('catalog-author');
    record = { ...record, principalId: minted };
    return { id: minted, roles: ['player'] };
  }

  /** The viewer-facing entry: the stored row plus the derived like flag. */
  function toEntry(stored: CatalogOwnEntry): CatalogEntry {
    const liked = record.likedEntryIds.includes(stored.id);
    // A viewer's like on a seed rides on top of its fixed count; on an own entry the
    // persisted count already includes it.
    const own = record.own.some((entry) => entry.id === stored.id);
    return { ...stored, likeCount: own ? stored.likeCount : stored.likeCount + (liked ? 1 : 0), liked };
  }

  function allEntries(): CatalogOwnEntry[] {
    return [...record.own, ...SEEDS];
  }

  function byId(id: string): CatalogOwnEntry | undefined {
    return allEntries().find((entry) => entry.id === id);
  }

  /** `recent` ranks newest first; `liked` ranks most liked first, recency breaking ties. */
  function sortEntries(entries: CatalogOwnEntry[], sort: CatalogSort): CatalogOwnEntry[] {
    const ordered = [...entries].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
    if (sort === 'liked') ordered.sort((left, right) => toEntry(right).likeCount - toEntry(left).likeCount);
    return ordered;
  }

  const port: CatalogPort = {
    async get(id) {
      await ensureLoaded();
      const stored = byId(id);
      return stored ? toEntry(stored) : null;
    },

    identity() {
      // No I/O: the mint persists with the next port write, after hydration.
      return principal();
    },

    async like(id) {
      await ensureLoaded();
      const stored = byId(id);
      if (!stored) throw new Error(`No catalog entry "${id}".`);
      // Idempotent per principal: a repeated like never counts twice.
      if (record.likedEntryIds.includes(id)) return toEntry(stored);
      const own = record.own.some((entry) => entry.id === id);
      mutate({
        ...record,
        likedEntryIds: [...record.likedEntryIds, id],
        own: own
          ? record.own.map((entry) => (entry.id === id ? { ...entry, likeCount: entry.likeCount + 1 } : entry))
          : record.own,
      });
      return toEntry(byId(id)!);
    },

    async list(query: CatalogListQuery) {
      await ensureLoaded();
      const limit = Math.min(Math.max(query.limit ?? 10, 1), 50);
      const start = Math.max(Number.parseInt(query.cursor ?? '0', 10) || 0, 0);
      const needle = query.search?.trim().toLowerCase() ?? '';
      const ranked = sortEntries(
        allEntries().filter((entry) => {
          if (query.hunterId && entry.hunterId !== query.hunterId) return false;
          if (query.elementId && !entry.elementIds.includes(query.elementId)) return false;
          if (needle && !entry.name.toLowerCase().includes(needle)) return false;
          return true;
        }),
        query.sort,
      );
      const entries = ranked.slice(start, start + limit);
      return {
        cursor: start + entries.length < ranked.length ? String(start + entries.length) : null,
        entries: entries.map(toEntry),
        previous: start > 0 ? String(Math.max(0, start - limit)) : null,
        totalItems: ranked.length,
      };
    },

    async publish(input) {
      await ensureLoaded();
      const author = { id: principal().id, name: '' };
      const snapshot: CatalogOwnEntry = {
        author,
        code: encodeLoadoutCode(input.build),
        elementIds: elementsOf(input.build),
        hunterId: input.build.hunterId,
        id: input.entryId ?? uid('catalog-entry'),
        likeCount: 0,
        name: input.build.name,
        publishedAt: now(),
      };
      const existing = input.entryId ? record.own.find((entry) => entry.id === input.entryId) : undefined;
      mutate({
        ...record,
        // Republishing replaces the snapshot but keeps the entry's id and likes.
        own: existing
          ? record.own.map((entry) => (entry.id === existing.id ? { ...snapshot, likeCount: entry.likeCount } : entry))
          : [...record.own, snapshot],
      });
      return toEntry(byId(snapshot.id)!);
    },

    async unlike(id) {
      await ensureLoaded();
      const stored = byId(id);
      if (!stored) throw new Error(`No catalog entry "${id}".`);
      if (!record.likedEntryIds.includes(id)) return toEntry(stored);
      const own = record.own.some((entry) => entry.id === id);
      mutate({
        ...record,
        likedEntryIds: record.likedEntryIds.filter((entryId) => entryId !== id),
        own: own
          ? record.own.map((entry) =>
              entry.id === id ? { ...entry, likeCount: Math.max(entry.likeCount - 1, 0) } : entry,
            )
          : record.own,
      });
      return toEntry(byId(id)!);
    },

    async unpublish(id) {
      await ensureLoaded();
      // Idempotent by design: a retried queue flush must not fail on an entry already gone.
      if (!record.own.some((entry) => entry.id === id)) return;
      mutate({
        ...record,
        likedEntryIds: record.likedEntryIds.filter((entryId) => entryId !== id),
        own: record.own.filter((entry) => entry.id !== id),
      });
    },
  };

  return {
    ...port,

    /**
     * Records an unpublish durably, then tries to flush it at once. Call before deleting
     * the local build: the op survives reloads and offline spells, so a published entry
     * can never outlive its build unnoticed (the catalog's own hard delete removes its
     * likes with it). Assumes `hydrate` ran, which app boot guarantees. The optional
     * port overrides the flush target (tests inject an unreachable backend).
     */
    enqueueUnpublish(entryId: string, portOverride?: CatalogPort): void {
      if (record.pending.some((op) => op.entryId === entryId)) return;
      mutate({
        ...record,
        pending: [...record.pending, { entryId, op: 'unpublish', queuedAt: now() } satisfies CatalogPendingOp],
      });
      void this.flushQueue(portOverride).catch((error) =>
        campaignLogger.warn('Catalog queue flush failed', { error: String(error) }),
      );
    },

    /** Drains the queue: every op that reaches the catalog leaves it, the rest stay queued. */
    async flushQueue(portOverride?: CatalogPort): Promise<void> {
      await ensureLoaded();
      if (!record.pending.length) return;
      const target = portOverride ?? port;
      const remaining: CatalogPendingOp[] = [];
      for (const op of record.pending) {
        try {
          await target.unpublish(op.entryId);
        } catch {
          remaining.push(op);
        }
      }
      if (remaining.length !== record.pending.length) mutate({ ...record, pending: remaining });
    },

    /**
     * Re-reads the vault row and drains the queue. Boot calls it once; account switches
     * and tests call it again to rebind a fresh store. Re-reads by design: a second
     * hydration is a new account's truth, not a repeat of the first.
     */
    async hydrate(): Promise<void> {
      loading = null;
      await ensureLoaded();
      await this.flushQueue();
    },
  };
}

// ---------------------------------------------------------------------------
// Seeds: the "other players" whose builds fill the online list. Deterministic
// base-game builds so every device browses the same catalog.
// ---------------------------------------------------------------------------

/** The distinct elements a snapshot's worn equipment carries: the filterable metadata. */
function elementsOf(build: SharedBuild): readonly string[] {
  return [...new Set(Object.values(build.equipment).flatMap((id) => (id ? (forgeById(id)?.element ?? []) : [])))];
}

interface SeedSpec {
  authorId: string;
  authorName: string;
  hunterIndex: number;
  likeCount: number;
  name: string;
  publishedAt: string;
}

const SEED_SPECS: readonly SeedSpec[] = [
  {
    authorId: 'seed-author-mara',
    authorName: 'Mara',
    hunterIndex: 0,
    likeCount: 12,
    name: 'Ember Vanguard',
    publishedAt: '2026-09-02T10:00:00.000Z',
  },
  {
    authorId: 'seed-author-tobias',
    authorName: 'Tobias',
    hunterIndex: 1,
    likeCount: 7,
    name: 'River Warden',
    publishedAt: '2026-09-05T10:00:00.000Z',
  },
  {
    authorId: 'seed-author-ines',
    authorName: 'Ines',
    hunterIndex: 2,
    likeCount: 3,
    name: 'Stone Circle',
    publishedAt: '2026-09-08T10:00:00.000Z',
  },
  {
    authorId: 'seed-author-kelvin',
    authorName: 'Kelvin',
    hunterIndex: 3,
    likeCount: 1,
    name: 'First Steps',
    publishedAt: '2026-09-11T10:00:00.000Z',
  },
];

/** Seeded entries are computed once: base-game hunters, starter builds, fixed metadata. */
function seedEntries(): readonly CatalogOwnEntry[] {
  const hunters = availableHunters([]);
  return SEED_SPECS.flatMap((spec) => {
    const hunter = hunters[spec.hunterIndex];
    if (!hunter) return [];
    const loadout = createLoadout(hunter.id, [], {
      id: `catalog-seed-${spec.authorId}`,
      name: spec.name,
      now: spec.publishedAt,
    });
    return [
      {
        author: { id: spec.authorId, name: spec.authorName },
        code: encodeLoadoutCode(loadout),
        elementIds: elementsOf(loadout),
        hunterId: loadout.hunterId,
        id: `catalog-entry-${spec.authorId}`,
        likeCount: spec.likeCount,
        name: loadout.name,
        publishedAt: spec.publishedAt,
      } satisfies CatalogOwnEntry,
    ];
  });
}

const SEEDS: readonly CatalogOwnEntry[] = seedEntries();

/** The catalog the app talks to: the stub until a real backend implements the port. */
export const catalog: CatalogService = createCatalogStub();
