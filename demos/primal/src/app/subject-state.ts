import { computed, type Readable, type Signal, signal } from '@vielzeug/ripple';
import { hunterById, questId } from '../content';
import { activateQuest, createCampaign } from '../domain/campaign';
import { PrimalDomainError } from '../domain/errors';
import { type FightAction, trackFightChange } from '../domain/fight-events';
import { idleMonsterState } from '../domain/monster-state';
import type { Ascent, Campaign, Challenge, Expedition, HunterLoadout, HuntSubject, SubjectRef } from '../domain/types';
import { openPrimalStore, type PrimalStore, primalDatabaseName, SETTINGS_ID } from './database';
import { bus, notify as emitNotice } from './events';
import { setLocale } from './i18n';
import { now } from './ids';
import { campaignLogger, expeditionLogger } from './logger';
import { notifyError } from './notices';
import {
  APP_VERSION,
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type CatalogRecord,
  DEFAULT_SETTINGS,
  loadoutCodec,
  type PersistedState,
  parseBackup,
  type SavedDataBackup,
  type Settings,
  sanitizeAscentSnapshot,
  sanitizeCampaignSnapshot,
  sanitizeChallengeSnapshot,
  sanitizeExpeditionSnapshot,
} from './persistence';
import type { SyncDeletion, SyncEntity, SyncRecord, SyncStateRecord } from './sync';
// ---------------------------------------------------------------------------
// Subject state: the Vault database mirrored into memory, plus the per-kind registry
// ---------------------------------------------------------------------------

/**
 * Application state lives in the Vault database and is mirrored into memory by table
 * observers, so campaigns and expeditions survive reloads without a backend. The observers
 * own the raw record lists; the exported signals add mounted session mirrors on top, so a
 * database change from any tab or command always lands on one source of truth.
 */
export const ascents: Signal<Ascent[]> = signal<Ascent[]>([]);
export const campaigns: Signal<Campaign[]> = signal<Campaign[]>([]);
export const challenges: Signal<Challenge[]> = signal<Challenge[]>([]);
export const expeditions: Signal<Expedition[]> = signal<Expedition[]>([]);
/** Saved builds per hunter: device-local, shared across campaigns and expeditions. */
export const loadouts: Signal<HunterLoadout[]> = signal<HunterLoadout[]>([]);
export const settings: Signal<Settings> = signal<Settings>({ ...DEFAULT_SETTINGS });

let store: PrimalStore | null = null;
const stoppers: Array<() => void> = [];

type SubjectKind = SubjectRef['kind'];

export type { SubjectKind };

/** The vault table one subject kind persists to. */
type SubjectTable = 'ascents' | 'campaigns' | 'challenges' | 'expeditions';

/** The record one subject kind stores: kind and record stay correlated through this map. */
type SubjectOf<K extends SubjectKind> = K extends 'campaign'
  ? Campaign
  : K extends 'ascent'
    ? Ascent
    : K extends 'challenge'
      ? Challenge
      : Expedition;

/** Database records plus mounted mirrors: mirrors replace same-id locals in the display list. */
function withMirrors<K extends SubjectKind>(kind: K, records: SubjectOf<K>[]): SubjectOf<K>[] {
  const mirrors = [...remoteSubjects.values()].filter((entry) => entry.kind === kind);
  if (!mirrors.length) return records;
  const replaced = records.map((entry) => mirrors.find((mirror) => mirror.subject.id === entry.id)?.subject ?? entry);
  const extra = mirrors.map((mirror) => mirror.subject).filter((subject) => !records.some((r) => r.id === subject.id));
  // Each mirror is mounted with its kind, so the shapes line up.
  return [...replaced, ...extra] as SubjectOf<K>[];
}

/** Inserts or replaces a record in a kind's record list: the shared list edit behind upsert. */
function upsertRecord<T extends HuntSubject>(records: T[], next: T): T[] {
  return records.some((entry) => entry.id === next.id)
    ? records.map((entry) => (entry.id === next.id ? next : entry))
    : [...records, next];
}

/** Republishes every kind's display signal: called whenever the mounted mirrors change. */
function publishSubjects(): void {
  for (const def of Object.values(SUBJECTS)) def.publish();
}

/**
 * Subject announcements on the application bus. One pair of kind-carrying events replaces the
 * per-kind set: consumers filter on `kind`, and adding a subject kind costs no new events.
 */
const emitSubjectUpdated = (kind: SubjectKind, id: string, reason: string): void =>
  bus.emit('subject:updated', { id, kind, reason });
export const emitSubjectRemoved = (kind: SubjectKind, id: string): void => bus.emit('subject:removed', { id, kind });

/**
 * Everything that differs per subject kind, one row per kind. The store, the session wiring,
 * the sync gateway and the board views resolve through this table instead of switching on the
 * kind: the row is the ONLY per-kind code, so adding a fifth subject means adding one row
 * here and touching nothing else.
 */
interface SubjectDef {
  /** The record from the display signal (mirrors included). */
  display(id: string): HuntSubject | undefined;
  /** Drops the record from the vault-backed list and republishes. */
  drop(id: string): void;
  /** The kind this row owns: the record's `kind` discriminator. */
  readonly kind: SubjectKind;
  /** The vault-backed record, ignoring any mounted mirror. */
  local(id: string): HuntSubject | undefined;
  /** Records the write in the log. */
  log(id: string, reason: string): void;
  /** The deletion toast; expeditions confirm inline in their list, so they stay silent. */
  notifyRemoved?(subject: HuntSubject): void;
  /** Carries vault records into the backed list and the display signal. */
  observe(account: PrimalStore): () => void;
  /** Republishes the display signal: needed when the mounted mirrors change. */
  publish(): void;
  /** Writes the record to the kind's vault table. The table's codec validates it on every read. */
  put(account: PrimalStore, record: HuntSubject): Promise<unknown>;
  /** Removes the record from the kind's vault table. */
  remove(account: PrimalStore, id: string): Promise<unknown>;
  /** Validates an untrusted record (sync pull, session snapshot) through the kind's schema. */
  sanitize(record: unknown): HuntSubject;
  /** The vault table (and sync entity) the kind persists to. */
  readonly table: SubjectTable;
  /** Inserts or replaces the record in the vault-backed list and republishes. */
  upsert(next: HuntSubject): void;
}

/** The kind-typed view of a registry row: static consumers (backups, sync payloads) read the
 *  kind's own record type; dynamic consumers use the kind-erased SubjectDef surface. */
interface SubjectRecords<K extends SubjectKind> {
  /** Every vault-backed record of the kind: mounted mirrors are excluded, so sync and backups
   *  speak to the device's own data only. */
  all(): readonly SubjectOf<K>[];
}

/** One registry row. The factory owns the record list, the signal and every vault touch, so
 *  a row carries only the genuinely per-kind data: its table, signal, log line, toast and schema. */
function createSubjectDef<K extends SubjectKind>(config: {
  kind: K;
  log(id: string, reason: string): void;
  notifyRemoved?(subject: SubjectOf<K>): void;
  sanitize(record: unknown): SubjectOf<K>;
  signal: Signal<SubjectOf<K>[]>;
  table: SubjectTable;
}): SubjectDef & SubjectRecords<K> {
  let records: SubjectOf<K>[] = [];
  const publish = (): void => {
    config.signal.update(() => withMirrors(config.kind, records));
  };
  return {
    all: () => records,
    display: (id) => config.signal.value.find((entry) => entry.id === id),
    drop: (id) => {
      records = records.filter((entry) => entry.id !== id);
      publish();
    },
    kind: config.kind,
    local: (id) => records.find((entry) => entry.id === id),
    log: config.log,
    notifyRemoved: config.notifyRemoved && ((subject) => config.notifyRemoved?.(subject as SubjectOf<K>)),
    observe: (account) =>
      account.observe(config.table, (next) => {
        // The observer hands over the table's records; the row's kind keeps them correlated.
        records = next as SubjectOf<K>[];
        publish();
      }),
    publish,
    put: (account, record) => account.put(config.table, record as SubjectOf<K>),
    remove: (account, id) => account.delete(config.table, id),
    sanitize: config.sanitize,
    table: config.table,
    upsert: (next) => {
      if (next.kind === config.kind) records = upsertRecord(records, next as SubjectOf<K>);
      publish();
    },
  };
}

export const SUBJECTS: { [K in SubjectKind]: SubjectDef & SubjectRecords<K> } = {
  ascent: createSubjectDef({
    kind: 'ascent',
    log: (id, reason) => expeditionLogger.debug(reason, { ascentId: id }),
    notifyRemoved: (subject) => emitNotice('toasts.ascentDeleted', 'warning', { values: { name: subject.name } }),
    sanitize: sanitizeAscentSnapshot,
    signal: ascents,
    table: 'ascents',
  }),
  campaign: createSubjectDef({
    kind: 'campaign',
    log: (id, reason) => campaignLogger.info(reason, { campaignId: id }),
    notifyRemoved: (subject) => emitNotice('toasts.campaignDeleted', 'warning', { values: { name: subject.name } }),
    sanitize: sanitizeCampaignSnapshot,
    signal: campaigns,
    table: 'campaigns',
  }),
  challenge: createSubjectDef({
    kind: 'challenge',
    log: (id, reason) => expeditionLogger.debug(reason, { challengeId: id }),
    notifyRemoved: (subject) => emitNotice('toasts.challengeDeleted', 'warning', { values: { name: subject.name } }),
    sanitize: sanitizeChallengeSnapshot,
    signal: challenges,
    table: 'challenges',
  }),
  expedition: createSubjectDef({
    kind: 'expedition',
    log: (id, reason) => expeditionLogger.debug(reason, { expeditionId: id }),
    sanitize: sanitizeExpeditionSnapshot,
    signal: expeditions,
    table: 'expeditions',
  }),
};

/** The sync layer's table names resolve to the same registry rows the kinds use. */
const SUBJECT_BY_TABLE: Record<SubjectTable, SubjectDef> = {
  ascents: SUBJECTS.ascent,
  campaigns: SUBJECTS.campaign,
  challenges: SUBJECTS.challenge,
  expeditions: SUBJECTS.expedition,
};

/**
 * Opens (or injects) the account database and starts the table observers. The app must await
 * this before mounting.
 */
/**
 * True when a boot failure is the records themselves, not the storage. A DOMException anywhere
 * in the cause chain is an IndexedDB-level failure (a connection from a previous tab still
 * closing, a blocked transaction): transient, and the next boot reads the records fine.
 * Only a codec rejection means this build genuinely cannot read the data.
 */
const isRecordValidationFailure = (error: unknown): boolean => {
  for (let cause: unknown = error, depth = 0; cause && depth < 6; depth += 1) {
    if (cause instanceof DOMException) return false;
    cause = (cause as { cause?: unknown }).cause;
  }
  return true;
};

export async function hydratePrimalStore(injected?: PrimalStore): Promise<void> {
  if (store) {
    for (const stop of stoppers) stop();
    stoppers.length = 0;
    await store.dispose();
  }
  if (injected) {
    await attachAccount(injected);
    return;
  }
  try {
    await attachAccount(openPrimalStore());
  } catch (error) {
    if (!isRecordValidationFailure(error)) {
      // A transient storage failure: destroy nothing. The records are intact, so this session
      // runs without persistence and the next boot reads them (a reload after a hot module
      // swap races the previous tab's closing connection exactly this way).
      campaignLogger.error('Opening the account database failed; continuing without storage', {
        error: String(error),
      });
      for (const stop of stoppers) stop();
      stoppers.length = 0;
      if (store) await store.dispose();
      store = null;
      emitNotice('toasts.storageBlocked', 'error');
      return;
    }
    // A database this build cannot read: records from an incompatible build :
    // is reset, not repaired: keeping it would masquerade as blocked storage
    // forever, and the boot-time settings (like the music player's auto-open)
    // would never load.
    campaignLogger.warn('Stored records failed validation: resetting the database', { error: String(error) });
    // The settings record is innocent until proven otherwise: rescue it before
    // the wipe so a stale *campaign* record does not cost the user their music,
    // theme and language choices. getAll validates through the codec: an
    // unreadable settings record leaves nothing to rescue.
    let rescued: Settings | null = null;
    try {
      rescued = (await store?.getAll('settings'))?.find((entry) => entry.id === SETTINGS_ID) ?? null;
    } catch {
      rescued = null;
    }
    if (store) await store.dispose();
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase(primalDatabaseName());
      // `blocked` (another tab still holds a connection) resolves too: the deletion
      // lands when that tab closes, and the reopen below then meets either the old
      // or the fresh database: the guarded retry handles both.
      request.onsuccess = request.onerror = request.onblocked = () => resolve();
    });
    try {
      await attachAccount(openPrimalStore());
    } catch (retryError) {
      // Still unreadable: the deletion was blocked, so the old records are back.
      // Running on in-memory defaults beats taking the app down; the next boot
      // after the blocking tab closes finds a clean database.
      campaignLogger.error('Reopening the reset database failed', { error: String(retryError) });
      emitNotice('toasts.storageBlocked', 'error');
      return;
    }
    if (rescued) persistSettings(rescued);
    emitNotice('toasts.storageReset', 'warning');
  }
}

/** Opens the account's tables into memory: observers, locale and the dev seed.
 *  Every table is read once: an unreadable record surfaces here (not as a silent
 *  observer failure) so the caller can reset the database. */
async function attachAccount(account: PrimalStore): Promise<void> {
  store = account;
  // One observer per subject kind; the registry owns the table, the raw list and the signal.
  for (const def of Object.values(SUBJECTS)) stoppers.push(def.observe(account));
  stoppers.push(
    account.observe('loadouts', (records) => loadouts.update(() => records)),
    account.observe('settings', (records) => {
      const next = records.find((entry) => entry.id === SETTINGS_ID);
      if (next) {
        const { id: _id, ...rest } = next;
        settings.update(() => rest);
        // The observer's first snapshot carries the persisted record, and it arrives only
        // after this boot line ran on in-memory defaults: the saved language applies here,
        // and every later settings write re-confirms the same locale.
        void setLocale(rest.language);
      }
    }),
  );
  await Promise.all(
    (['ascents', 'campaigns', 'challenges', 'expeditions', 'loadouts', 'settings'] as const).map((table) =>
      account.isEmpty(table),
    ),
  );
  if (import.meta.env.DEV && (await account.isEmpty('campaigns'))) {
    await account.put('campaigns', seedCampaign());
  }
}

/** Runs a durable write and reports failures as toasts instead of throwing into the UI. */
export async function commitWrite(label: string, work: (account: PrimalStore) => Promise<unknown>): Promise<void> {
  if (!store) return;
  try {
    await work(store);
  } catch (error) {
    notifyError('toasts.saveFailed', error);
    campaignLogger.error(`${label} failed`, { error: String(error) });
  }
}

/** Persists one subject row after a command committed it to memory. The registry row owns
 *  the kind's vault table, so the commit path never switches on the kind. */
function persistSubject(next: HuntSubject): void {
  const def = SUBJECTS[next.kind];
  void commitWrite(`save ${def.table}`, (account) => def.put(account, next));
}

/** Replaces every subject table from a backup file; throws so the caller can report failures. */
async function persistState(state: PersistedState): Promise<void> {
  if (!store) throw new PrimalDomainError('database-closed', 'The database is not open yet.');
  await store.batch(
    ['ascents', 'campaigns', 'challenges', 'expeditions', 'loadouts', 'settings', 'tombstones'],
    async (tx) => {
      await tx.clear('ascents');
      await tx.clear('campaigns');
      await tx.clear('challenges');
      await tx.clear('expeditions');
      await tx.clear('loadouts');
      await tx.clear('tombstones');
      await tx.putAll('ascents', state.ascents);
      await tx.putAll('campaigns', state.campaigns);
      await tx.putAll('challenges', state.challenges);
      await tx.putAll('expeditions', state.expeditions);
      await tx.putAll('loadouts', state.loadouts);
      await tx.put('settings', { ...state.settings, id: SETTINGS_ID });
    },
  );
}

export function persistSettings(next: Settings): void {
  void commitWrite('save settings', (account) => account.put('settings', { ...next, id: SETTINGS_ID }));
}

export function persistLoadout(next: HunterLoadout): void {
  void commitWrite('save build', (account) => account.put('loadouts', next));
}

export function forgetLoadout(loadoutId: string): void {
  void commitWrite('delete build', (account) => account.delete('loadouts', loadoutId));
}

/** Saves the catalog stub's bookkeeping row (own entries, likes, pending unpublishes, principal). */
export function persistCatalogRecord(next: CatalogRecord): void {
  void commitWrite('save catalog', (account) => account.put('catalogState', next));
}

/** Reads the catalog row; undefined means no store is open yet or none was ever saved. */
export async function loadCatalogRecord(): Promise<CatalogRecord | undefined> {
  if (!store) return undefined;
  return store.get('catalogState', 'app');
}

/** Records a deletion so the sync port can propagate it; local reads ignore the row. */
export function recordTombstone(entity: SyncEntity, id: string): void {
  void commitWrite(`tombstone ${entity}`, (account) => account.put('tombstones', { deletedAt: now(), entity, id }));
}

export const recentCampaigns: Readable<Campaign[]> = computed(() =>
  [...campaigns.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
);

export const recentAscents: Readable<Ascent[]> = computed(() =>
  [...ascents.value].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
);

export const ascentById = (id: string): Ascent | undefined => ascents.value.find((ascent) => ascent.id === id);
export const campaignById = (id: string): Campaign | undefined =>
  campaigns.value.find((campaign) => campaign.id === id);
export const challengeById = (id: string): Challenge | undefined => challenges.value.find((run) => run.id === id);
export const expeditionById = (id: string): Expedition | undefined =>
  expeditions.value.find((expedition) => expedition.id === id);
export const hunterName = (id: string): string => hunterById(id)?.name ?? id;

// ---------------------------------------------------------------------------
// Remote session mirrors: a guest mirrors the host's subject so every view works unchanged
// ---------------------------------------------------------------------------

const remoteSubjects = new Map<string, { kind: SubjectKind; subject: HuntSubject }>();

/** Session-layer hook: forwards a command to the session host. The next snapshot carries the result. */
type CommandSender = (subjectId: string, command: string, args: unknown[]) => void;
let commandSender: CommandSender | null = null;
let forwardingDepth = 0;

export function isRemoteSubject(id: string): boolean {
  return remoteSubjects.has(id);
}

export function setSessionCommandSender(sender: CommandSender | null): void {
  commandSender = sender;
}

/**
 * Forwards a command to the session host when the subject is a remote mirror and no
 * host-side apply is in flight. Returns whether the command left the device.
 */
export function forwardToHost(ref: SubjectRef, name: string, args: readonly unknown[]): boolean {
  if (forwardingDepth > 0 || !commandSender || !remoteSubjects.has(ref.id)) return false;
  commandSender(ref.id, name, [...args]);
  return true;
}

/** Runs `fn` with session forwarding suspended: used by the host while applying a guest command. */
export function applyLocalCommand<T>(fn: () => T): T {
  forwardingDepth += 1;
  try {
    return fn();
  } finally {
    forwardingDepth -= 1;
  }
}

/** Mounts or replaces a remote mirror; the local database row stays untouched and reappears on unmount. */
export function mountRemoteSubject(subject: HuntSubject): void {
  remoteSubjects.set(subject.id, { kind: subject.kind, subject });
  publishSubjects();
}

/** Removes a remote mirror; the local subject comes back from the database records. */
export function unmountRemoteSubject(id: string): void {
  if (!remoteSubjects.delete(id)) return;
  publishSubjects();
}

export function exportSavedData(): string {
  const backup: SavedDataBackup = {
    appVersion: APP_VERSION,
    data: {
      ascents: SUBJECTS.ascent.all().filter((entry) => !remoteSubjects.has(entry.id)),
      campaigns: SUBJECTS.campaign.all().filter((entry) => !remoteSubjects.has(entry.id)),
      challenges: SUBJECTS.challenge.all().filter((entry) => !remoteSubjects.has(entry.id)),
      expeditions: SUBJECTS.expedition.all().filter((entry) => !remoteSubjects.has(entry.id)),
      loadouts: loadouts.value,
      settings: settings.value,
    },
    exportedAt: now(),
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
  };
  return JSON.stringify(backup, null, 2);
}

/** Replaces the whole account database from a backup file; observers carry the change into memory. */
export async function importSavedData(
  source: string,
): Promise<{ ascents: number; campaigns: number; challenges: number; expeditions: number }> {
  const imported = parseBackup(source);
  await persistState(imported);
  return {
    ascents: imported.ascents.length,
    campaigns: imported.campaigns.length,
    challenges: imported.challenges.length,
    expeditions: imported.expeditions.length,
  };
}

export function findSubject(ref: SubjectRef): HuntSubject | undefined {
  // While applying locally (the host applying a forwarded guest command), the canonical subject
  // is the local database record: a mounted mirror would shadow it with the guest's stale copy.
  if (forwardingDepth > 0) return SUBJECTS[ref.kind].local(ref.id);
  return SUBJECTS[ref.kind].display(ref.id);
}

/** Commits a subject through its registry row: fight-event tracking, rev stamping, validation,
 *  the in-memory publish and the vault write. The kind flows through the return type, so
 *  kind-specific callers never re-narrow. */
export function commitSubject<T extends HuntSubject>(next: T, reason: string, fightAction?: FightAction): T {
  // Every committed write counts: equal revs on two devices mean a concurrent edit. Creations
  // enter with the seed 0 and take their first counted write here.
  const before = SUBJECTS[next.kind].local(next.id);
  const stamp = now();
  const tracked = before ? trackFightChange(before, next, { action: fightAction, recordedAt: stamp }) : next;
  // The spread widens to the union; the rev stamp is the only change, so T survives it.
  const stamped = { ...tracked, rev: next.rev + 1 } as T;
  const def = SUBJECTS[stamped.kind];
  sanitizeSnapshot(def.table, stamped);
  def.upsert(stamped);
  def.log(stamped.id, reason);
  emitSubjectUpdated(stamped.kind, stamped.id, reason);
  persistSubject(stamped);
  return stamped;
}
// ---------------------------------------------------------------------------
// Sync gateway: the sync layer's only vault access
// ---------------------------------------------------------------------------

/** Remote records are untrusted: they run through the same schemas as backups. The subject
 *  tables resolve through the registry; loadouts are the one sync entity that is not a subject. */
function sanitizeSnapshot(entity: SyncEntity, record: unknown): HuntSubject | HunterLoadout {
  return entity === 'loadouts' ? loadoutCodec.parse(record) : SUBJECT_BY_TABLE[entity].sanitize(record);
}

/** Narrows a remote payload's entity string to a table the sync layer owns. */
const SYNC_ENTITIES = ['ascents', 'campaigns', 'challenges', 'expeditions', 'loadouts'] as const;
function isSyncEntity(entity: string): entity is SyncEntity {
  return (SYNC_ENTITIES as readonly string[]).includes(entity);
}

/**
 * What `startSync` runs on: the device's own records, the pending tombstones, the
 * merge path for pulled records, and the per-account sync bookkeeping. Everything
 * flows through the normal store so observers carry remote changes into the app
 * exactly like local ones.
 */
export const syncGateway = {
  /** Applies pulled deletions: no tombstone: the deletion came from the server. */
  async applyDeletions(deletions: readonly SyncDeletion[]): Promise<void> {
    if (!store) throw new PrimalDomainError('database-closed', 'The database is not open yet.');
    for (const { entity, id } of deletions) {
      // Remote deletions are untrusted: an unknown entity is a bad payload, not a table.
      if (!isSyncEntity(entity)) continue;
      await store.delete(entity, id);
    }
  },

  /** Upserts the pulled records the engine determined the server is ahead on :
   *  the rev comparisons are tandem's. Returns the ids of records that failed validation. */
  async applyRecords(records: readonly SyncRecord[]): Promise<string[]> {
    if (!store) throw new PrimalDomainError('database-closed', 'The database is not open yet.');
    const skipped: string[] = [];
    for (const { entity, record } of records) {
      try {
        await store.put(entity, sanitizeSnapshot(entity, record));
      } catch {
        skipped.push(record.id);
      }
    }
    return skipped;
  },

  /** Removes tombstones that made it to the server: only the pushed ones, in case
   *  new deletions were recorded while the push was in flight. */
  async clearDeletions(deletions: readonly SyncDeletion[]): Promise<void> {
    if (!store) throw new PrimalDomainError('database-closed', 'The database is not open yet.');
    for (const { id } of deletions) await store.delete('tombstones', id);
  },

  async loadState(): Promise<SyncStateRecord> {
    if (!store) throw new PrimalDomainError('database-closed', 'The database is not open yet.');
    return (await store.get('syncState', 'app')) ?? { cursor: null, id: 'app', revs: {} };
  },

  async pendingDeletions(): Promise<SyncDeletion[]> {
    if (!store) throw new PrimalDomainError('database-closed', 'The database is not open yet.');
    return store.getAll('tombstones');
  },
  /** The device's own records: session mirrors are excluded. */
  records(): SyncRecord[] {
    return [
      ...SUBJECTS.ascent.all().map((record): SyncRecord => ({ entity: 'ascents', record })),
      ...SUBJECTS.campaign.all().map((record): SyncRecord => ({ entity: 'campaigns', record })),
      ...SUBJECTS.challenge.all().map((record): SyncRecord => ({ entity: 'challenges', record })),
      ...SUBJECTS.expedition.all().map((record): SyncRecord => ({ entity: 'expeditions', record })),
      ...loadouts.peek().map((record): SyncRecord => ({ entity: 'loadouts', record })),
    ];
  },

  async saveState(next: SyncStateRecord): Promise<void> {
    if (!store) throw new PrimalDomainError('database-closed', 'The database is not open yet.');
    await store.put('syncState', next);
  },
};
// ---------------------------------------------------------------------------

/**
 * A campaign in progress so the Load Game list is not empty. Mounted only under development :
 * a production build never carries a fake campaign that could be edited or saved as real data.
 */
function seedCampaign(): Campaign {
  const created = '2026-08-30T18:00:00.000Z';
  let campaign = createCampaign({
    config: { expansionIds: ['core'], name: 'Alborea Survivors', nightmareVariant: false, variants: [] },
    hunterIds: ['daeron', 'mirah', 'thoreg', 'ljonar'],
    id: 'campaign-seed',
    now: created,
  });
  campaign = activateQuest(campaign, questId(1), created);
  campaign = {
    ...campaign,
    hunters: campaign.hunters.map((hunter, index) => ({
      ...hunter,
      playerName: ['Ana', 'Ben', 'Cleo', 'Dag'][index] ?? '',
      resources: { ...hunter.resources, blood: 2, bones: 1, fire: 2, mellis: 2, nillea: 2, scales: 1 },
    })),
    monsterState: idleMonsterState(campaign.hunters.length),
    notes: [
      {
        createdAt: created,
        id: 'note-1',
        scope: 'campaign',
        targetId: null,
        text: 'Need more Scales before Chapter 4.',
      },
      {
        createdAt: created,
        id: 'note-2',
        scope: 'chapter',
        targetId: '1',
        text: 'Try Mirah’s new mastery on Toramat.',
      },
    ],
    phase: 'hunt',
    rev: 0,
    scores: [],
    updatedAt: '2026-09-14T21:30:00.000Z',
  };
  return campaign;
}
