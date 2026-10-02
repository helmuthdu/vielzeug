import { type InferOutput, type Schema, s } from '@vielzeug/spell';
import pkg from '../../package.json';
import {
  expansions,
  hunterById,
  monsterById,
  potionById,
  questById,
  resources,
  TOTAL_CHAPTERS,
  trialSeriesById,
} from '../content';
import type { CatalogEntry } from '../domain/catalog';
import { PrimalDomainError } from '../domain/errors';
import { fightHistoryIssue, trackedFightIssue } from '../domain/fight-events';
import { LOADOUT_NAME_MAX, LOADOUT_STRATEGY_MAX } from '../domain/loadout';
import { MONSTER_TOKENS } from '../domain/monster-state';
import type {
  Ascent,
  Campaign,
  Challenge,
  ElementId,
  ExpansionId,
  Expedition,
  HunterLoadout,
  HuntRecord,
  ResourceId,
} from '../domain/types';

/**
 * The single saved-game contract. Vault codec reads, backup imports and remote session
 * snapshots all go through the same pipeline: validate against the persisted schemas.
 * There is no second, weaker path.
 */

export type ThemePreference = 'dark' | 'light' | 'system';
export type AppLocale = 'de' | 'en';
/** Wide-screen hunter board: every hunter side by side, or one hunter with portrait and gear. */
export type HunterBoardLayout = 'hunter' | 'party';

export interface Settings {
  /** Opens the setup dialog automatically when creating a new game. */
  autoOpenGameSetup: boolean;
  hunterBoardLayout: HunterBoardLayout;
  language: AppLocale;
  /** Opens the player when the app opens: it loads with the bar; playback needs Auto-play. */
  musicAutoLoad: boolean;
  /** Starts playing as soon as the music player opens. */
  musicAutoPlay: boolean;
  /** Raw timeline text (one "m:ss Title" per line) parsed into track markers. */
  musicTimeline: string;
  /** The YouTube video the audio player is linked to (a library id or a raw YouTube id). */
  musicVideoId: string;
  /** Expansions owned by the table; pre-selected when creating games. */
  ownedExpansionIds: ExpansionId[];
  reducedMotion: boolean;
  theme: ThemePreference;
}

/** The settings row in the Vault database: one record per account, keyed by a constant id. */
export type SettingsRecord = Settings & { id: 'app' };

export const DEFAULT_SETTINGS: Settings = {
  autoOpenGameSetup: true,
  hunterBoardLayout: 'party',
  language: 'en',
  musicAutoLoad: false,
  musicAutoPlay: false,
  musicTimeline: '',
  musicVideoId: 'ZpWrLuiryEQ',
  ownedExpansionIds: ['core'],
  reducedMotion: false,
  theme: 'system',
};

export const BACKUP_FORMAT = 'primal-companion-backup';
export const BACKUP_VERSION = 3;
/** The app build writing the backup (the package version), so old records can be traced to their writer. */
export const APP_VERSION = pkg.version;

/** A whole-state snapshot: the shape of a downloaded backup file. */
export interface PersistedState {
  ascents: Ascent[];
  campaigns: Campaign[];
  challenges: Challenge[];
  expeditions: Expedition[];
  loadouts: HunterLoadout[];
  settings: Settings;
}

export interface SavedDataBackup {
  appVersion: string;
  data: PersistedState;
  exportedAt: string;
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const expansionIdValues = expansions.map((expansion) => expansion.id) as [ExpansionId, ...ExpansionId[]];
const elementIdValues = resources
  .filter((resource) => resource.category === 'element')
  .map((resource) => resource.id) as [ElementId, ...ElementId[]];
const resourceIdValues = resources.map((resource) => resource.id) as [ResourceId, ...ResourceId[]];

const idSchema = s.string().min(1);
const nullableIdSchema = idSchema.nullable();
const timestampSchema = s.string().isoDateTime();
const nonNegativeIntegerSchema = s.number().int().safe().nonNegative();
const revSchema = nonNegativeIntegerSchema;
const hunterIdSchema = idSchema.check((id) => hunterById(id) !== undefined || 'Unknown hunter.');
const huntTimerSchema = s.object({
  durationMs: nonNegativeIntegerSchema.nullable(),
  elapsedMs: nonNegativeIntegerSchema,
  startedAt: timestampSchema.nullable(),
});
const huntActorSchema = s.discriminatedUnion('kind', {
  hunter: s.object({ hunterId: idSchema, kind: s.literal('hunter') }),
  monster: s.object({ kind: s.literal('monster'), monsterId: idSchema }),
});
const fightEventMetaSchema = {
  elapsedMs: nonNegativeIntegerSchema.nullable(),
  recordedAt: timestampSchema,
  sequence: nonNegativeIntegerSchema.min(1),
};
const fightFactsFields = {
  armorHealth: nonNegativeIntegerSchema.nullable(),
  helmHealth: nonNegativeIntegerSchema.nullable(),
  masteryGoal: nonNegativeIntegerSchema.nullable(),
};
const terrainTokenSchema = s.object({
  id: s.string(),
  sector: s.enum(['front', 'left-flank', 'right-flank', 'rear', 'edges'] as const).nullable(),
  terrainId: s.string(),
});
const monsterStateSchema = s.object({
  acceleration: nonNegativeIntegerSchema,
  bonus: nonNegativeIntegerSchema,
  damage: nonNegativeIntegerSchema,
  stance: s.enum([1, 2, 3, 4, 5] as const),
  struggle: nonNegativeIntegerSchema,
  terrain: s.object({
    placed: s.array(terrainTokenSchema),
    removed: s.array(s.string()),
    transformed: s.record(s.string(), s.string()),
  }),
  tokens: s.record(s.enum(MONSTER_TOKENS), s.number().int().safe().min(0).max(1)),
  toughness: nonNegativeIntegerSchema,
});
const fightEventSchema = s.discriminatedUnion('type', {
  build: s.object({
    actor: s.object({ hunterId: hunterIdSchema, kind: s.literal('hunter') }),
    facts: s.object(fightFactsFields),
    ...fightEventMetaSchema,
    type: s.literal('build'),
  }),
  counter: s.object({
    actor: huntActorSchema,
    counter: s.enum([
      'defense',
      'disrupt',
      'item',
      'mastery',
      'stamina',
      'strain',
      'weapon',
      'toughness',
      'bonus',
      'struggle',
      'acceleration',
    ] as const),
    delta: s.number().int().safe(),
    ...fightEventMetaSchema,
    type: s.literal('counter'),
    value: nonNegativeIntegerSchema,
  }),
  damage: s.object({
    actor: huntActorSchema,
    delta: s.number().int().safe(),
    ...fightEventMetaSchema,
    type: s.literal('damage'),
    value: nonNegativeIntegerSchema,
  }),
  depletion: s.object({
    actor: s.object({ hunterId: hunterIdSchema, kind: s.literal('hunter') }),
    depleted: s.boolean(),
    ...fightEventMetaSchema,
    slot: s.enum(['armor', 'helm'] as const),
    type: s.literal('depletion'),
  }),
  effect: s.object({
    active: s.boolean(),
    actor: huntActorSchema,
    effect: s.enum([
      'aggro',
      'burning',
      'dazed',
      'threatened',
      'blind',
      'confuse',
      'stun',
      'vulnerable',
      'slow',
      'unstoppable',
      'double',
    ] as const),
    ...fightEventMetaSchema,
    type: s.literal('effect'),
  }),
  knockout: s.object({
    actor: s.object({ hunterId: hunterIdSchema, kind: s.literal('hunter') }),
    ...fightEventMetaSchema,
    token: s.enum(['red', 'black', 'dead'] as const).nullable(),
    type: s.literal('knockout'),
  }),
  potion: s.object({
    actor: s.object({ hunterId: hunterIdSchema, kind: s.literal('hunter') }),
    consumed: s.boolean(),
    ...fightEventMetaSchema,
    potionId: idSchema.check((id) => potionById(id) !== undefined || 'Unknown potion.'),
    type: s.literal('potion'),
  }),
  reset: s.object({
    actor: huntActorSchema,
    ...fightEventMetaSchema,
    monsterState: monsterStateSchema.nullable(),
    scope: s.enum(['hunter', 'monster'] as const),
    type: s.literal('reset'),
  }),
  stance: s.object({
    actor: s.object({ kind: s.literal('monster'), monsterId: idSchema }),
    from: s.enum([1, 2, 3, 4, 5] as const),
    ...fightEventMetaSchema,
    to: s.enum([1, 2, 3, 4, 5] as const),
    toughness: nonNegativeIntegerSchema,
    type: s.literal('stance'),
  }),
  terrain: s.object({
    action: s.enum(['placed', 'removed', 'transformed'] as const),
    actor: s.object({ kind: s.literal('monster'), monsterId: idSchema }),
    ...fightEventMetaSchema,
    sector: s.enum(['front', 'left-flank', 'right-flank', 'rear', 'edges'] as const).nullable(),
    terrainId: idSchema,
    tokenId: idSchema,
    type: s.literal('terrain'),
  }),
  unleash: s.object({
    actor: s.object({ kind: s.literal('monster'), monsterId: idSchema }),
    ...fightEventMetaSchema,
    type: s.literal('unleash'),
  }),
  wound: s.object({
    actor: s.object({ kind: s.literal('monster'), monsterId: idSchema }),
    damageRemoved: nonNegativeIntegerSchema,
    ...fightEventMetaSchema,
    stance: s.enum([1, 2, 3, 4, 5] as const),
    type: s.literal('wound'),
  }),
  'wound-ready': s.object({
    actor: s.object({ kind: s.literal('monster'), monsterId: idSchema }),
    damage: nonNegativeIntegerSchema,
    ...fightEventMetaSchema,
    threshold: nonNegativeIntegerSchema,
    type: s.literal('wound-ready'),
  }),
});
const hunterStateSchema = s.object({
  aggro: s.boolean(),
  burning: s.boolean(),
  damage: nonNegativeIntegerSchema,
  dazed: s.boolean(),
  defense: nonNegativeIntegerSchema,
  depleted: s.object({ armor: s.boolean(), helm: s.boolean() }),
  disrupt: nonNegativeIntegerSchema,
  item: nonNegativeIntegerSchema,
  knockedOut: s.enum(['red', 'black', 'dead'] as const).nullable(),
  mastery: nonNegativeIntegerSchema,
  stamina: nonNegativeIntegerSchema,
  strain: nonNegativeIntegerSchema,
  threatened: s.boolean(),
  weapon: nonNegativeIntegerSchema,
});
// Spell types a record's output as a full map, but a parsed bundle is sparse: only the
// resources the party actually holds appear. Narrowing the declared output keeps the schema
// and the domain's Partial map honest about the same runtime shape.
const fightStartSchema = s.object({
  hunters: s.record(
    hunterIdSchema,
    s.object({
      ...fightFactsFields,
      state: hunterStateSchema,
    }),
  ),
  monsterId: idSchema.check((id) => monsterById(id) !== undefined || 'Unknown monster.'),
  monsterState: monsterStateSchema,
});
const resourceBundleSchema = s.record(s.enum(resourceIdValues), s.number().finite().nonNegative()) as Schema<
  Partial<Record<ResourceId, number>>
>;
const questIdSchema = idSchema.check((id) => questById(id) !== undefined || 'Unknown quest.');
const equipmentSchema = s.object({
  armorId: nullableIdSchema,
  helmId: nullableIdSchema,
  itemId: nullableIdSchema,
  weaponId: nullableIdSchema,
});
const deckCardIdsSchema = s.array(idSchema).unique();
const huntRecordSchema = s
  .object({
    durationMs: nonNegativeIntegerSchema.nullable(),
    events: s.array(fightEventSchema),
    fightStart: fightStartSchema,
    hunters: s.array(
      s.object({
        deckCardIds: deckCardIdsSchema,
        equipment: equipmentSchema,
        hunterId: hunterIdSchema,
        masteryCardId: idSchema,
      }),
    ),
    id: idSchema,
    monsterId: idSchema.check((id) => monsterById(id) !== undefined || 'Unknown monster.'),
    outcome: s.enum(['victory', 'defeat'] as const),
    recordedAt: timestampSchema,
  })
  .check((record) =>
    Array.isArray(record.hunters) && record.hunters.every((hunter) => hunter && typeof hunter.hunterId === 'string')
      ? (fightHistoryIssue({
          durationMs: record.durationMs,
          events: record.events,
          hunterIds: record.hunters.map((hunter) => hunter.hunterId),
          monsterId: record.monsterId,
          start: record.fightStart,
        }) ?? true)
      : 'Invalid recorded party.',
  );
const campaignHunterSchema = s.object({
  consumedPotionIds: s.array(idSchema).unique(),
  craftedEquipmentIds: s.array(idSchema).unique(),
  deckCardIds: deckCardIdsSchema,
  equipment: equipmentSchema,
  hunterId: hunterIdSchema,
  masteryCardId: idSchema,
  notes: s.string(),
  playerName: s.string(),
  potionInventoryIds: s.array(idSchema),
  potionLoadoutIds: s.tuple([nullableIdSchema, nullableIdSchema, nullableIdSchema]),
  resources: resourceBundleSchema,
  rewardEquipmentIds: s.array(idSchema),
  rewardPotionIds: s.array(idSchema),
  skillPoints: nonNegativeIntegerSchema,
  skillTree: s.object({
    A: s.enum([0, 1, 2] as const),
    B: s.enum([0, 1, 2] as const),
    C: s.enum([0, 1, 2] as const),
    D: s.enum([0, 1, 2] as const),
    E: s.enum([0, 1, 2] as const),
  }),
});
const questStateSchema = s.object({
  chapter: s.number().int().min(1).max(TOTAL_CHAPTERS),
  questId: questIdSchema,
  status: s.enum(['locked', 'available', 'active', 'completed', 'expired'] as const),
});
const noteSchema = s.object({
  createdAt: timestampSchema,
  id: idSchema,
  scope: s.enum(['campaign', 'chapter', 'hunter', 'quest'] as const),
  targetId: nullableIdSchema,
  text: s.string(),
});
export const campaignSchema = s
  .object({
    achievements: s.array(idSchema).unique(),
    activeQuestId: questIdSchema.nullable(),
    chapter: s.number().int().min(1).max(TOTAL_CHAPTERS),
    createdAt: timestampSchema,
    defeats: nonNegativeIntegerSchema,
    expansionIds: s.array(s.enum(expansionIdValues)).unique(),
    fightEvents: s.array(fightEventSchema),
    fightStart: fightStartSchema.nullable(),
    finalBattleWon: s.boolean(),
    forge: s.object({
      level: s.number().int().min(0).max(3),
      unlockedElementIds: s.array(s.enum(elementIdValues)).unique(),
    }),
    herbalist: s.object({ level: s.number().int().min(0).max(3) }),
    hunterState: s.record(s.string(), hunterStateSchema),
    hunters: s
      .array(campaignHunterSchema)
      .min(2)
      .max(4)
      .unique((left, right) => left.hunterId === right.hunterId),
    huntHistory: s.array(huntRecordSchema),
    huntTimer: huntTimerSchema,
    id: idSchema,
    kind: s.literal('campaign'),
    monsterState: monsterStateSchema,
    name: idSchema,
    nightmareVariant: s.boolean(),
    notes: s.array(noteSchema).unique((left, right) => left.id === right.id),
    phase: s.enum(['quest-board', 'preparing', 'hunt', 'result'] as const),
    quests: s.array(questStateSchema).unique((left, right) => left.questId === right.questId),
    resolvedChapter: s.number().int().min(0).max(TOTAL_CHAPTERS),
    rev: revSchema,
    scores: s.array(
      s.object({
        answers: s.array(s.number()),
        total: s.number(),
      }),
    ),
    totalDefeats: nonNegativeIntegerSchema,
    trophies: s.array(idSchema).unique(),
    unassignedRewards: s.array(idSchema),
    updatedAt: timestampSchema,
    variants: s.array(s.enum(['hunters-trial'] as const)).unique(),
  })
  .check((campaign, context) => {
    if (campaign.nightmareVariant && !campaign.expansionIds.includes('nightmare')) {
      context.addIssue({
        code: 'custom',
        message: 'Nightmare campaigns require the Nightmare Expansion.',
        path: ['nightmareVariant'],
      });
    }
  })
  .check((subject) => trackedFightIssue(subject) ?? true);
const expeditionHunterSchema = s.object({
  consumedPotionIds: s.array(idSchema).unique(),
  deckCardIds: deckCardIdsSchema,
  equipment: equipmentSchema,
  hunterId: hunterIdSchema,
  masteryCardId: idSchema,
  playerName: s.string().max(24).default(''),
  potionLoadoutIds: s.tuple([nullableIdSchema, nullableIdSchema, nullableIdSchema]),
});
export const loadoutSchema = s.object({
  catalogEntryId: idSchema.optional(),
  createdAt: timestampSchema,
  deckCardIds: s.array(idSchema).unique(),
  equipment: equipmentSchema,
  hunterId: hunterIdSchema,
  id: idSchema,
  masteryCardId: idSchema,
  name: s.string().max(LOADOUT_NAME_MAX),
  potionLoadoutIds: s.tuple([nullableIdSchema, nullableIdSchema, nullableIdSchema]),
  /** The loadout `rev` whose snapshot the catalog holds; a higher local rev is unpublished drift. */
  publishedRev: revSchema.optional(),
  rev: revSchema,
  strategy: s.string().max(LOADOUT_STRATEGY_MAX),
  updatedAt: timestampSchema,
});

/** One entry this device published to the catalog: the rows a real catalog backend owns.
 *  The viewer-relative `liked` flag is derived at read time, never persisted. */
export type CatalogOwnEntry = Omit<CatalogEntry, 'liked'>;

/** An unpublish that must reach the catalog before its entry may be forgotten: no orphans. */
export interface CatalogPendingOp {
  entryId: string;
  op: 'unpublish';
  queuedAt: string;
}

/** The catalog stub's bookkeeping, one row per account: own entries, likes, the pending
 *  unpublish queue and the device principal a real backend replaces with its accounts. */
export interface CatalogRecord {
  id: 'app';
  likedEntryIds: string[];
  own: CatalogOwnEntry[];
  pending: CatalogPendingOp[];
  principalId: string | null;
}

const catalogAuthorSchema = s.object({ id: idSchema, name: s.string().max(24) });
const catalogOwnEntrySchema = s.object({
  author: catalogAuthorSchema,
  code: s.string().min(1),
  // Defaulted so rows published before the field existed still read: they filter under no
  // element until republished.
  elementIds: s.array(idSchema).default([]),
  hunterId: hunterIdSchema,
  id: idSchema,
  likeCount: nonNegativeIntegerSchema,
  name: s.string().max(LOADOUT_NAME_MAX),
  publishedAt: timestampSchema,
});
const catalogPendingOpSchema = s.object({
  entryId: idSchema,
  op: s.literal('unpublish'),
  queuedAt: timestampSchema,
});
export const catalogRecordSchema = s.object({
  id: s.literal('app'),
  likedEntryIds: s.array(idSchema).unique(),
  own: s.array(catalogOwnEntrySchema),
  pending: s.array(catalogPendingOpSchema),
  principalId: nullableIdSchema,
});
export const expeditionSchema = s
  .object({
    aggression: s.enum([0, 1, 2, 3] as const).nullable(),
    createdAt: timestampSchema,
    expansionIds: s.array(s.enum(expansionIdValues)).unique(),
    fightEvents: s.array(fightEventSchema),
    fightStart: fightStartSchema.nullable(),
    hunterState: s.record(s.string(), hunterStateSchema),
    hunters: s.array(expeditionHunterSchema).unique((left, right) => left.hunterId === right.hunterId),
    huntHistory: s.array(huntRecordSchema),
    huntTimer: huntTimerSchema,
    id: idSchema,
    kind: s.literal('expedition'),
    monsterId: idSchema.check((id) => monsterById(id) !== undefined || 'Unknown monster.').nullable(),
    monsterState: monsterStateSchema,
    nightmareVariant: s.boolean(),
    result: s.enum(['victory', 'defeat'] as const).nullable(),
    rev: revSchema,
    scenarioId: nullableIdSchema,
    status: s.enum(['draft', 'ready', 'played'] as const),
    trialScore: s
      .object({
        answers: s.array(nonNegativeIntegerSchema),
        total: s.number(),
      })
      .optional(),
    updatedAt: timestampSchema,
  })
  .check((subject) => trackedFightIssue(subject) ?? true);
const ascentHunterSchema = s.object({
  consumedPotionIds: s.array(idSchema).unique(),
  deckCardIds: deckCardIdsSchema,
  equipment: equipmentSchema,
  hunterId: hunterIdSchema,
  masteryCardId: idSchema,
  playerName: s.string().max(24).default(''),
  potionLoadoutIds: s.tuple([nullableIdSchema, nullableIdSchema, nullableIdSchema]),
  skillPoints: nonNegativeIntegerSchema,
  skillTree: s.object({
    A: s.enum([0, 1, 2] as const),
    B: s.enum([0, 1, 2] as const),
    C: s.enum([0, 1, 2] as const),
    D: s.enum([0, 1, 2] as const),
    E: s.enum([0, 1, 2] as const),
  }),
  woundCount: s.number().int().min(0).max(3),
});
export const ascentSchema = s
  .object({
    chapter: s.enum([1, 2, 3] as const),
    createdAt: timestampSchema,
    defeatedMonsterIds: s.array(idSchema).unique(),
    drawPile: s.array(idSchema.check((id) => monsterById(id) !== undefined || 'Unknown monster.')).unique(),
    expansionIds: s.array(s.enum(expansionIdValues)).unique(),
    fightEvents: s.array(fightEventSchema),
    fightStart: fightStartSchema.nullable(),
    hunterState: s.record(s.string(), hunterStateSchema),
    hunters: s
      .array(ascentHunterSchema)
      .min(1)
      .max(5)
      .unique((left, right) => left.hunterId === right.hunterId),
    huntHistory: s.array(huntRecordSchema),
    huntTimer: huntTimerSchema,
    id: idSchema,
    kind: s.literal('ascent'),
    monsterState: monsterStateSchema,
    name: idSchema,
    nightmareVariant: s.boolean(),
    pending: s
      .object({
        monsterId: idSchema.check((id) => monsterById(id) !== undefined || 'Unknown monster.'),
        scenarioId: idSchema,
      })
      .nullable(),
    phase: s.enum(['preparing', 'encounter', 'hunt', 'result'] as const),
    result: s.enum(['victory', 'defeat'] as const).nullable(),
    rev: revSchema,
    scores: s.array(
      s.object({
        answers: s.array(s.number()),
        total: s.number(),
      }),
    ),
    status: s.enum(['running', 'finished'] as const),
    updatedAt: timestampSchema,
  })
  .check((subject) => trackedFightIssue(subject) ?? true);

const settingsSchema = s.object({
  autoOpenGameSetup: s.boolean().default(true),
  hunterBoardLayout: s.enum(['hunter', 'party'] as const),
  language: s.enum(['de', 'en'] as const),
  musicAutoLoad: s.boolean(),
  musicAutoPlay: s.boolean(),
  musicTimeline: s.string(),
  musicVideoId: s.string(),
  ownedExpansionIds: s.array(s.enum(expansionIdValues)).unique(),
  reducedMotion: s.boolean(),
  theme: s.enum(['dark', 'light', 'system'] as const),
});
const challengeHunterSchema = s.object({
  consumedPotionIds: s.array(idSchema).unique(),
  deckCardIds: deckCardIdsSchema,
  /** The dealt preparation draft: two drawn level-1 ids per slot, worn during preparation. */
  draftPairs: s.object({
    armor: s.array(idSchema).max(2),
    helm: s.array(idSchema).max(2),
    weapon: s.array(idSchema).max(2),
  }),
  equipment: equipmentSchema,
  equipmentRewardTaken: s.boolean(),
  hunterId: hunterIdSchema,
  masteryCardId: idSchema,
  playerName: s.string().max(24).default(''),
  potionLoadoutIds: s.tuple([nullableIdSchema, nullableIdSchema, nullableIdSchema]),
  skillPoints: nonNegativeIntegerSchema,
  skillTree: s.object({
    A: s.enum([0, 1, 2] as const),
    B: s.enum([0, 1, 2] as const),
    C: s.enum([0, 1, 2] as const),
    D: s.enum([0, 1, 2] as const),
    E: s.enum([0, 1, 2] as const),
  }),
  woundCount: s.number().int().min(0).max(3),
});
export const challengeSchema = s
  .object({
    aggression: s.enum([1, 2, 3] as const),
    bounty: s.enum(['keep', 'raise'] as const).nullable(),
    createdAt: timestampSchema,
    defeatedMonsterIds: s.array(idSchema).unique(),
    expansionIds: s.array(s.enum(expansionIdValues)).unique(),
    expeditionNumber: s.enum([1, 2, 3, 4, 5] as const),
    fightEvents: s.array(fightEventSchema),
    fightStart: fightStartSchema.nullable(),
    hunterState: s.record(s.string(), hunterStateSchema),
    hunters: s
      .array(challengeHunterSchema)
      .min(1)
      .max(5)
      .unique((left, right) => left.hunterId === right.hunterId),
    huntHistory: s.array(huntRecordSchema),
    huntTimer: huntTimerSchema,
    id: idSchema,
    kind: s.literal('challenge'),
    monsterState: monsterStateSchema,
    name: idSchema,
    nightmareVariant: s.boolean(),
    pending: s
      .object({
        biome: s.enum([
          'crystal-caves',
          'endless-swamp',
          'flooded-wilds',
          'frozen-wastes',
          'goldarks',
          'nightmare',
          'niz-maraga',
          'sunset-plains',
          'thunder-mountains',
          'woltyar',
        ] as const),
        monsterId: idSchema.check((id) => monsterById(id) !== undefined || 'Unknown monster.'),
        roll: s.enum([1, 2, 3, 4, 5, 6] as const),
      })
      .nullable(),
    phase: s.enum(['quest-board', 'preparing', 'hunt', 'result'] as const),
    result: s.enum(['victory', 'defeat'] as const).nullable(),
    rev: revSchema,
    scores: s.array(
      s.object({
        answers: s.array(s.number()),
        total: s.number(),
      }),
    ),
    seriesId: idSchema.check((id) => trialSeriesById(id) !== undefined || 'Unknown series.'),
    status: s.enum(['running', 'finished'] as const),
    updatedAt: timestampSchema,
  })
  .check((subject) => trackedFightIssue(subject) ?? true);

const persistedStateSchema = s.object({
  ascents: s.array(ascentSchema).unique((left, right) => left.id === right.id),
  campaigns: s.array(campaignSchema).unique((left, right) => left.id === right.id),
  challenges: s.array(challengeSchema).unique((left, right) => left.id === right.id),
  expeditions: s.array(expeditionSchema).unique((left, right) => left.id === right.id),
  loadouts: s.array(loadoutSchema).unique((left, right) => left.id === right.id),
  settings: settingsSchema,
});
const backupHeaderSchema = s.object({
  appVersion: s.string(),
  data: s.unknown(),
  exportedAt: timestampSchema,
  format: s.literal(BACKUP_FORMAT),
  version: s.literal(BACKUP_VERSION),
});

// ---------------------------------------------------------------------------
// Schema drift guards: the persisted schemas must match the domain types exactly.
// Spell objects reject unknown keys, so a field added to a domain type without its
// schema entry would fail every write at runtime, discovered as a save-failed toast.
// These assertions move that failure to compile time. DeepRequired<> normalizes
// optionality on both sides so the guards compare the committed shapes.
// ---------------------------------------------------------------------------

type Expect<T extends true> = T;
/** Structural identity: stronger than mutual assignability: optionality must agree too. */
type Equal<Actual, Expected> =
  (<T>() => T extends Actual ? 1 : 2) extends <T>() => T extends Expected ? 1 : 2 ? true : false;

/** Removes optionality recursively (tuples and readonly modifiers survive) so the guards
 *  compare the committed shapes on both sides of the write boundary. */
type DeepRequired<T> = T extends object ? { [K in keyof T]-?: Exclude<DeepRequired<T[K]>, undefined> } : T;

/** Compile-time proof that every persisted schema matches its domain type. */
export type SchemaDriftGuards = [
  Expect<Equal<DeepRequired<InferOutput<typeof campaignSchema>>, DeepRequired<Campaign>>>,
  Expect<Equal<DeepRequired<InferOutput<typeof expeditionSchema>>, DeepRequired<Expedition>>>,
  Expect<Equal<DeepRequired<InferOutput<typeof ascentSchema>>, DeepRequired<Ascent>>>,
  Expect<Equal<DeepRequired<InferOutput<typeof challengeSchema>>, DeepRequired<Challenge>>>,
  Expect<Equal<DeepRequired<InferOutput<typeof huntRecordSchema>>, DeepRequired<HuntRecord>>>,
  Expect<Equal<DeepRequired<InferOutput<typeof loadoutSchema>>, DeepRequired<HunterLoadout>>>,
  Expect<Equal<InferOutput<typeof settingsSchema>, Settings>>,
  Expect<Equal<DeepRequired<InferOutput<typeof persistedStateSchema>>, DeepRequired<PersistedState>>>,
];

// ---------------------------------------------------------------------------
// Settings hardening
// ---------------------------------------------------------------------------

/** The schema validates the shape; this only guarantees the core box stays enabled. */
function normalizeSettings(value: Settings): Settings {
  return {
    ...value,
    ownedExpansionIds: ['core', ...value.ownedExpansionIds.filter((id) => id !== 'core')],
  };
}

// ---------------------------------------------------------------------------
// The pipeline
// ---------------------------------------------------------------------------

/** Validates a whole-state snapshot. Throws when it is not a playable saved game. */
export function restoreState(value: unknown): PersistedState {
  const result = persistedStateSchema.safeParse(value);
  if (!result.success)
    throw new PrimalDomainError('backup-invalid', 'The selected backup contains invalid saved games.');
  return { ...result.data, settings: normalizeSettings(result.data.settings) };
}

/** Validates one untrusted campaign snapshot (remote session host). */
export function sanitizeCampaignSnapshot(value: unknown): Campaign {
  const result = campaignSchema.safeParse(value);
  if (!result.success) throw new Error('The host sent an invalid campaign snapshot.');
  return result.data;
}

/** Validates one untrusted expedition snapshot (remote session host). */
export function sanitizeExpeditionSnapshot(value: unknown): Expedition {
  const result = expeditionSchema.safeParse(value);
  if (!result.success) throw new Error('The host sent an invalid expedition snapshot.');
  return result.data;
}

/** Validates one untrusted ascent snapshot (remote session host). */
export function sanitizeAscentSnapshot(value: unknown): Ascent {
  const result = ascentSchema.safeParse(value);
  if (!result.success) throw new Error('The host sent an invalid ascent snapshot.');
  return result.data;
}

/** Validates one untrusted challenge snapshot (remote session host). */
export function sanitizeChallengeSnapshot(value: unknown): Challenge {
  const result = challengeSchema.safeParse(value);
  if (!result.success) throw new Error('The host sent an invalid challenge snapshot.');
  return result.data;
}

/** Parses a downloaded backup file into a playable state. Throws a `PrimalDomainError` whose
 *  code maps to a localized message, so import failures never surface in a fixed language. */
export function parseBackup(source: string): PersistedState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new PrimalDomainError('backup-not-json', 'Choose a valid JSON backup file.');
  }
  const header = backupHeaderSchema.safeParse(parsed);
  if (!header.success)
    throw new PrimalDomainError('backup-unsupported', 'The selected file is not a supported Primal backup.');
  return restoreState(header.data.data);
}

// ---------------------------------------------------------------------------
// Vault codecs
// ---------------------------------------------------------------------------

/**
 * A Vault codec backed by one schema: decode validates on every read (the trust boundary),
 * the same parse validates every write. The settings codec additionally guarantees the core
 * box stays enabled.
 */
function codec<T>(schema: { parse(value: unknown): T }) {
  return {
    parse(value: unknown): T {
      return schema.parse(value);
    },
  };
}

/** Per-record codecs for the Vault tables: a record is playable the moment it reaches memory. */
export const campaignCodec = codec(campaignSchema);
export const expeditionCodec = codec(expeditionSchema);
export const ascentCodec = codec(ascentSchema);
export const challengeCodec = codec(challengeSchema);
export const loadoutCodec = codec(loadoutSchema);
export const catalogCodec = codec(catalogRecordSchema);
export const settingsCodec = {
  parse(value: unknown): SettingsRecord {
    return { ...normalizeSettings(settingsSchema.extend({ id: s.literal('app') }).parse(value)), id: 'app' };
  },
};
