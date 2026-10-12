import { Schema, s } from '@vielzeug/spell';
import { canonicalObjectJson } from './_json';
import {
  ARCHIVE_COLLECTION_NAME_PATTERN,
  ARCHIVE_CONTRACT_VERSION,
  ARCHIVE_LIMITS,
  type ArchivePage,
  archiveAuthorSchema,
  hex64Schema,
  isoTimestampSchema,
  isWellFormedText,
  uuidSchema,
} from './contract';
import { ArchiveDefinitionError, ArchiveDerivationError, type ArchiveDerivationStage } from './errors';

/**
 * The one seam between a deployment's content and the archive core. A collection
 * declares its payload schema and derives its list dimensions; the core owns
 * everything else — parsing, canonical serialization, the content hash, the emitted
 * envelope schemas, and every storage bound. Collections never hash, never size,
 * and never hand-write the envelope.
 */

/** What `index` derives from one validated payload: the list dimensions plus the FTS title. */
export interface ArchiveIndexing<F extends string = string, T extends string = string> {
  /** One scalar-filter value from the declared vocabulary, or null for "no filter". */
  filter: F | null;
  /** Tag values from the declared vocabulary; duplicates collapse in first-seen order. */
  tags: readonly T[];
  /** The searchable title; the core trims and bounds it. */
  title: string;
}

/** The definition a deployment writes; `defineArchiveCollection` derives the rest. */
export interface ArchiveCollectionDefinition<
  P extends object,
  C extends number,
  F extends string = never,
  T extends string = never,
> {
  /**
   * Normalizes a parsed payload to its storage form — fixed key order, sorted
   * order-insensitive lists — so equivalent content hashes identically. Omit when
   * the payload is already canonical; a result that leaves the payload schema is
   * a derivation fault at derive time, never stored. Must be idempotent.
   */
  canonicalize?(payload: P): P;
  /** The collection's payload-format version; stored and re-emitted with every entry. */
  contentVersion: C;
  /** Valid scalar-filter values; a query param outside the vocabulary is 400. */
  filters?: readonly F[];
  /** Derives the list dimensions and the searchable title from the canonical payload. */
  index(payload: P): ArchiveIndexing<NoInfer<F>, NoInfer<T>>;
  /** The URL + storage dimension this collection owns: lowercase `[a-z0-9-]`, at most 32 chars. */
  name: string;
  /** The strict payload schema: the whole content contract, parsed before anything derives. */
  payloadSchema: Schema<P, unknown>;
  /** Valid tag values. */
  tags?: readonly T[];
}

/** Everything the archive stores and re-identifies by, derived once per publish and update. */
export interface ArchiveDerivation {
  /** The stored bytes: the canonical payload, serialized with fixed key order. */
  canonicalJson: string;
  /** SHA-256 hex over `{contentVersion, payload}`: identical content hashes identically. */
  contentHash: string;
  /** The collection's declared payload-format version. */
  contentVersion: number;
  filter: string | null;
  tags: readonly string[];
  title: string;
}

/** The envelope fields every emitted entry carries; the payload stays the collection's. */
export interface ArchiveEntry<P = unknown, C extends number = number> {
  author: { id: string; name: string };
  contentHash: string;
  /** The collection's payload-format version, literal-pinned by the definition. */
  contentVersion: C;
  id: string;
  likeCount: number;
  payload: P;
  publishedAt: string;
  revision: number;
  /** The archive wire-contract version, pinned by the core. */
  schemaVersion: typeof ARCHIVE_CONTRACT_VERSION;
  updatedAt: string;
}

/** The private owner view: the emitted entry plus the create retry key and moderation state. */
export interface ArchiveOwnedEntry<P = unknown, C extends number = number> extends ArchiveEntry<P, C> {
  /** The create retry key; public routes never emit it. */
  clientKey: string;
  /** True while an operator has removed the entry from public view (still owned, frozen for edits). */
  hidden: boolean;
}

/**
 * The wire schemas one collection shares with its client: every request and response
 * envelope for this collection's routes, composed from the payload schema, so the
 * client and the Worker parse the same bytes with the same rules.
 */
export interface ArchiveContract<P = unknown, C extends number = number> {
  /** The public entry emitted by list, detail and publish/update responses. */
  entry: Schema<ArchiveEntry<P, C>>;
  /** The own-publications response: `{ entries: ArchiveOwnedEntry[] }`. */
  ownedEntries: Schema<{ entries: ArchiveOwnedEntry<P, C>[] }>;
  /** The private owner entry — the public entry plus the create retry key. */
  ownedEntry: Schema<ArchiveOwnedEntry<P, C>>;
  /** One list page: entries plus the forward/backward cursors around it. */
  page: Schema<ArchivePage<ArchiveEntry<P, C>>>;
  /** The publish request: `{ clientKey, payload }`. */
  publishInput: Schema<{ clientKey: string; payload: P }, unknown>;
  /** The update request: `{ expectedRevision, payload }`. */
  updateInput: Schema<{ expectedRevision: number; payload: P }, unknown>;
}

/** One registered collection: the derived runtime seam the Worker consumes. */
export interface ArchiveCollection<P extends object = object, C extends number = number> {
  readonly contentVersion: C;
  /** The collection's wire schemas, shared with its client. */
  readonly contract: ArchiveContract<P, C>;
  /**
   * Validates an untrusted payload and derives everything the archive stores.
   * Null rejects invalid content: JSON/schema failures, title/tag bounds or the
   * canonical payload byte ceiling. Routes answer 422 `invalid-payload` for null.
   * Callback failures and deployment invariant violations throw ArchiveDerivationError.
   */
  readonly derive: (raw: unknown) => Promise<ArchiveDerivation | null>;
  readonly filters: readonly string[];
  readonly name: string;
  readonly tags: readonly string[];
}

const sha256Hex = async (text: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

/** The envelope shape shared by the public and owned compositions. */
const envelopeShape = <P, C extends number>(payload: Schema<P>, contentVersion: C) =>
  ({
    author: archiveAuthorSchema,
    contentHash: hex64Schema,
    contentVersion: s.literal(contentVersion),
    id: uuidSchema,
    likeCount: s.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    payload,
    publishedAt: isoTimestampSchema,
    revision: s.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
    schemaVersion: s.literal(ARCHIVE_CONTRACT_VERSION),
    updatedAt: isoTimestampSchema,
  }) as const;

/**
 * Builds one collection from its definition. Malformed definitions fail here, at
 * registration time — never mid-request: the name must be a routable `[a-z0-9-]`
 * segment, the content version a positive integer, and every declared filter and
 * tag value well-formed text of `1..vocabChars` chars — the bound cursors and the
 * meta route both rely on it. The core derives everything else per payload:
 * parsing, canonical serialization, hashing over the collection's versioned
 * envelope, the emitted-entry schemas, and every storage bound.
 */
export function defineArchiveCollection<
  P extends object,
  const C extends number,
  const F extends string = never,
  const T extends string = never,
>(definition: ArchiveCollectionDefinition<P, C, F, T>): ArchiveCollection<P, C> {
  const { canonicalize, contentVersion, index, name, payloadSchema } = definition;
  if (
    typeof index !== 'function' ||
    !payloadSchema ||
    typeof payloadSchema.safeParse !== 'function' ||
    (canonicalize !== undefined && typeof canonicalize !== 'function')
  ) {
    throw new ArchiveDefinitionError(
      'Collection requires a payload schema and synchronous indexing/canonicalization functions.',
    );
  }
  if (
    (definition.filters !== undefined && !Array.isArray(definition.filters)) ||
    (definition.tags !== undefined && !Array.isArray(definition.tags))
  ) {
    throw new ArchiveDefinitionError('Collection vocabularies must be arrays.');
  }
  const filters = Object.freeze([...(definition.filters ?? [])]);
  const tags = Object.freeze([...(definition.tags ?? [])]);
  if (typeof name !== 'string' || !ARCHIVE_COLLECTION_NAME_PATTERN.test(name)) {
    throw new ArchiveDefinitionError(`Archive collection name must match [a-z0-9-]{1,32}: ${JSON.stringify(name)}`);
  }
  if (!Number.isSafeInteger(contentVersion) || contentVersion < 1) {
    throw new ArchiveDefinitionError(`Archive collection ${name}: contentVersion must be a safe integer >= 1.`);
  }
  const validateVocabulary = (kind: 'filters' | 'tags', values: readonly string[]): void => {
    for (const value of values) {
      if (
        typeof value !== 'string' ||
        value.length === 0 ||
        value.length > ARCHIVE_LIMITS.vocabChars ||
        !isWellFormedText(value)
      ) {
        throw new ArchiveDefinitionError(
          `Archive collection ${name}: every ${kind} value must be well-formed text of 1..${ARCHIVE_LIMITS.vocabChars} chars.`,
        );
      }
    }
  };
  validateVocabulary('filters', filters);
  validateVocabulary('tags', tags);
  const filterValues = new Set<string>(filters);
  const tagValues = new Set<string>(tags);

  const stablePayload = (raw: unknown, stage: ArchiveDerivationStage = 'response'): P | null => {
    try {
      const json = canonicalObjectJson(raw);
      if (json === null) return null;
      const parsed = payloadSchema.safeParse(JSON.parse(json));
      if (!parsed.success || canonicalObjectJson(parsed.data, true, raw) !== json) return null;
      return parsed.data;
    } catch (cause) {
      throw new ArchiveDerivationError(stage, 'Collection stable payload validation failed.', { cause });
    }
  };
  const responsePayload: Schema<P> = new Schema<P>()
    .check((raw) => (stablePayload(raw) === null ? 'Payload is not stable JSON for this collection.' : undefined))
    .transform((raw): P => {
      const parsed = stablePayload(raw);
      if (parsed === null)
        throw new ArchiveDerivationError('response', 'Payload schema changed during response parsing.');
      return parsed;
    });

  const derive = async (raw: unknown): Promise<ArchiveDerivation | null> => {
    let stage: ArchiveDerivationStage = 'schema';
    try {
      if (canonicalObjectJson(raw) === null) return null;
      const parsed = payloadSchema.safeParse(raw);
      if (!parsed.success) return null;
      const parsedJson = canonicalObjectJson(parsed.data, true, raw);
      if (parsedJson === null)
        throw new ArchiveDerivationError(stage, 'Payload schema produced invalid or lossy JSON.');
      stage = 'canonicalize';
      const canonical = canonicalize === undefined ? parsed.data : canonicalize(parsed.data);
      // A canonicalize step that leaves the payload schema is a collection bug, not data to store.
      const normalizedJson = canonicalObjectJson(canonical, true, JSON.parse(parsedJson));
      if (normalizedJson === null) throw new ArchiveDerivationError(stage, 'Canonicalization produced invalid JSON.');
      stage = 'schema';
      const revalidated = payloadSchema.safeParse(JSON.parse(normalizedJson));
      if (!revalidated.success)
        throw new ArchiveDerivationError(
          canonicalize === undefined ? 'schema' : 'canonicalize',
          'Canonical payload is outside the payload schema.',
          { cause: revalidated.error },
        );
      const canonicalJson = canonicalObjectJson(revalidated.data, true, JSON.parse(normalizedJson));
      if (
        canonicalJson === null ||
        canonicalJson !== normalizedJson ||
        stablePayload(JSON.parse(canonicalJson), 'schema') === null
      )
        throw new ArchiveDerivationError(stage, 'Payload schema is not stable on canonical JSON.');
      if (canonicalize !== undefined) {
        const repeatedPayload = payloadSchema.parse(JSON.parse(canonicalJson));
        stage = 'canonicalize';
        const repeated = canonicalize(repeatedPayload);
        if (canonicalObjectJson(repeated, true) !== canonicalJson)
          throw new ArchiveDerivationError(stage, 'Canonicalization is not idempotent.');
      }

      stage = 'index';
      const { filter, tags: rawTags, title: rawTitle } = index(revalidated.data);
      // Indexing may read the final parsed value, but must not change the stored content.
      if (canonicalObjectJson(revalidated.data, true) !== canonicalJson)
        throw new ArchiveDerivationError(stage, 'Indexing mutated the canonical payload.');
      if (typeof rawTitle !== 'string' || !Array.isArray(rawTags))
        throw new ArchiveDerivationError(stage, 'Indexing must return a string title and a tags array.');
      const title = rawTitle.trim();
      if (title.length === 0 || title.length > ARCHIVE_LIMITS.titleChars || !isWellFormedText(title)) return null;
      if (filter !== null && (typeof filter !== 'string' || !isWellFormedText(filter)))
        throw new ArchiveDerivationError(stage, 'Indexing returned an invalid filter.');
      const uniqueTags: string[] = [];
      for (const tag of rawTags) {
        if (typeof tag !== 'string' || !isWellFormedText(tag))
          throw new ArchiveDerivationError(stage, 'Indexing returned an invalid tag.');
        if (!uniqueTags.includes(tag)) uniqueTags.push(tag);
      }
      // A derivation outside the declared vocabulary would store a row no list query
      // can reach — the query route 400s the very value the collection derived.
      if ((filter !== null && !filterValues.has(filter)) || uniqueTags.some((tag) => !tagValues.has(tag)))
        throw new ArchiveDerivationError(stage, 'Indexing returned a value outside the declared vocabularies.');
      if (uniqueTags.length > ARCHIVE_LIMITS.tagsPerEntry) return null;

      if (new TextEncoder().encode(canonicalJson).byteLength > ARCHIVE_LIMITS.payloadBytes) return null;
      stage = 'hash';
      const contentHash = await sha256Hex(`{"contentVersion":${contentVersion},"payload":${canonicalJson}}`);
      return { canonicalJson, contentHash, contentVersion, filter, tags: uniqueTags, title };
    } catch (cause) {
      if (cause instanceof ArchiveDerivationError) throw cause;
      throw new ArchiveDerivationError(stage, 'Collection content derivation failed.', { cause });
    }
  };

  const entrySchema: Schema<ArchiveEntry<P, C>> = s.object(envelopeShape(responsePayload, contentVersion));
  const ownedEntrySchema: Schema<ArchiveOwnedEntry<P, C>> = s.object({
    ...envelopeShape(responsePayload, contentVersion),
    clientKey: uuidSchema,
    hidden: s.boolean(),
  });
  const contract: ArchiveContract<P, C> = {
    entry: entrySchema,
    ownedEntries: s.object({ entries: s.array(ownedEntrySchema) }),
    ownedEntry: ownedEntrySchema,
    page: s.object({
      cursor: s.string().nullable(),
      entries: s.array(entrySchema),
      previous: s.string().nullable(),
    }),
    publishInput: s.object({ clientKey: uuidSchema, payload: payloadSchema }),
    updateInput: s.object({
      expectedRevision: s.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      payload: payloadSchema,
    }),
  };

  return Object.freeze({ contentVersion, contract: Object.freeze(contract), derive, filters, name, tags });
}
