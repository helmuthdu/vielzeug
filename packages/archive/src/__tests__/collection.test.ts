import { s } from '@vielzeug/spell';
import { describe, expect, it, vi } from 'vitest';
import { type ArchiveDerivation, type ArchiveIndexing, defineArchiveCollection } from '../collection';
import { ARCHIVE_CONTRACT_VERSION, ARCHIVE_LIMITS } from '../contract';
import { ArchiveDerivationError, ArchiveError } from '../errors';
import { fixtureCollection, fixturePayloadSchema } from './fixture-collection';

/** One storage-derivation probe: null means rejected, a value means stored. */
const derive = async (raw: unknown): Promise<ArchiveDerivation | null> => fixtureCollection.derive(raw);

/** A local `{ ok: boolean }` collection for one derive-time rule; the index states its own contract. */
const localCollection = (
  index: (payload: { ok: boolean }) => ArchiveIndexing,
  options: { filters?: readonly string[]; tags?: readonly string[] } = {},
) =>
  defineArchiveCollection({
    contentVersion: 1,
    filters: options.filters ?? [],
    index,
    name: 'local',
    payloadSchema: s.object({ ok: s.boolean() }),
    tags: options.tags ?? [],
  });

describe('defineArchiveCollection', () => {
  it('builds the runtime collection from a well-formed definition', () => {
    expect(fixtureCollection.contentVersion).toBe(1);
    expect(fixtureCollection.contract).toBeDefined();
    expect(fixtureCollection.filters).toEqual(['even', 'odd']);
    expect(fixtureCollection.name).toBe('fixture');
    expect(fixtureCollection.tags).toEqual(['low', 'high']);
  });

  it('rejects a name outside [a-z0-9-]{1,32} at definition time', () => {
    for (const name of ['Recipes', 'under_score', 'a'.repeat(33), '']) {
      expect(() =>
        defineArchiveCollection({
          contentVersion: 1,
          filters: [],
          index: () => ({ filter: null, tags: [], title: 't' }),
          name,
          payloadSchema: s.object({ ok: s.boolean() }),
          tags: [],
        }),
      ).toThrow(/name must match/);
    }
  });

  it('rejects a non-integer or non-positive content version at definition time', () => {
    for (const contentVersion of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        defineArchiveCollection({
          contentVersion,
          filters: [],
          index: () => ({ filter: null, tags: [], title: 't' }),
          name: 'fixture',
          payloadSchema: s.object({ ok: s.boolean() }),
          tags: [],
        }),
      ).toThrow(/contentVersion/);
    }
  });

  it('rejects vocabulary values that are empty, over-long or malformed at definition time', () => {
    for (const bad of ['', 'a'.repeat(ARCHIVE_LIMITS.vocabChars + 1), 'fire\u0000', 'lone\ud800']) {
      expect(() =>
        defineArchiveCollection({
          contentVersion: 1,
          filters: [bad],
          index: () => ({ filter: null, tags: [], title: 't' }),
          name: 'fixture',
          payloadSchema: s.object({ ok: s.boolean() }),
          tags: [],
        }),
      ).toThrow(/filters value/);
      expect(() =>
        defineArchiveCollection({
          contentVersion: 1,
          filters: [],
          index: () => ({ filter: null, tags: [], title: 't' }),
          name: 'fixture',
          payloadSchema: s.object({ ok: s.boolean() }),
          tags: [bad],
        }),
      ).toThrow(/tags value/);
    }
  });

  it('allows omitted vocabularies for collections without list dimensions', async () => {
    const plain = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 't' }),
      name: 'plain',
      payloadSchema: s.object({ ok: s.boolean() }),
    });
    expect(await plain.derive({ ok: true })).not.toBeNull();
  });

  it('infers the derivation from the declared vocabularies', async () => {
    const typed = defineArchiveCollection({
      contentVersion: 1,
      filters: ['italian', 'japanese'],
      index: (payload) => ({
        filter: payload.cuisine,
        tags: ['quick'],
        title: `t-${payload.cuisine}`,
      }),
      name: 'typed',
      payloadSchema: s.object({ cuisine: s.enum(['italian', 'japanese'] as const) }),
      tags: ['quick'],
    });
    expect(await typed.derive({ cuisine: 'italian' })).not.toBeNull();
    // Outside the payload schema: the usual runtime rejection.
    expect(await typed.derive({ cuisine: 'french' })).toBeNull();
  });
});

describe('fixtureCollection.derive', () => {
  it('derives the full storage shape from a good payload', async () => {
    const derivation = await derive({ v: 4 });
    expect(derivation).not.toBeNull();
    expect(derivation?.canonicalJson).toBe('{"v":4}');
    expect(derivation?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(derivation?.contentVersion).toBe(1);
    expect(derivation?.filter).toBe('even');
    expect(derivation?.tags).toEqual(['low']);
    expect(derivation?.title).toBe('fixture-4');
  });

  it('is deterministic for the same payload', async () => {
    expect((await derive({ v: 4 }))?.contentHash).toBe((await derive({ v: 4 }))?.contentHash);
  });

  it('derives a distinct hash per distinct payload', async () => {
    expect((await derive({ v: 4 }))?.contentHash).not.toBe((await derive({ v: 5 }))?.contentHash);
  });

  it('rejects payloads outside the schema', async () => {
    for (const raw of [{ v: -1 }, { v: 1.5 }, { v: '4' }, { extra: true, v: 4 }, null, 'nope']) {
      expect(await derive(raw), JSON.stringify(raw)).toBeNull();
    }
  });

  it('folds order-insensitive lists through canonicalize so reordering hashes identically', async () => {
    const listCollection = defineArchiveCollection({
      canonicalize: (payload: { items: string[] }) => ({ items: [...payload.items].sort() }),
      contentVersion: 1,
      filters: [],
      index: () => ({ filter: null, tags: [], title: 'list' }),
      name: 'list',
      payloadSchema: s.object({ items: s.array(s.string()) }),
      tags: [],
    });
    const a = await listCollection.derive({ items: ['b', 'a'] });
    const b = await listCollection.derive({ items: ['a', 'b'] });
    expect(a?.canonicalJson).toBe(b?.canonicalJson);
    expect(a?.contentHash).toBe(b?.contentHash);
  });

  it('rejects a canonicalize result that leaves the payload schema', async () => {
    const broken = defineArchiveCollection({
      // Deliberately mis-typed: the runtime defense exists precisely for this bug.
      canonicalize: (() => ({})) as unknown as (payload: { ok: boolean }) => { ok: boolean },
      contentVersion: 1,
      filters: [],
      index: () => ({ filter: null, tags: [], title: 't' }),
      name: 'broken',
      payloadSchema: s.object({ ok: s.boolean() }),
      tags: [],
    });
    await expect(broken.derive({ ok: true })).rejects.toMatchObject({
      name: 'ArchiveDerivationError',
      stage: 'canonicalize',
    });
  });

  it('rejects a derivation whose filter is outside the declared vocabulary', async () => {
    const drifting = localCollection(() => ({ filter: 'undeclared', tags: [], title: 't' }), {
      filters: ['declared'],
    });
    await expect(drifting.derive({ ok: true })).rejects.toMatchObject({
      name: 'ArchiveDerivationError',
      stage: 'index',
    });
  });

  it('rejects a derivation carrying a tag outside the declared vocabulary', async () => {
    const drifting = localCollection(() => ({ filter: null, tags: ['undeclared'], title: 't' }), {
      tags: ['declared'],
    });

    await expect(drifting.derive({ ok: true })).rejects.toMatchObject({
      name: 'ArchiveDerivationError',
      stage: 'index',
    });
  });

  it('enforces empty vocabularies at runtime when indexing bypasses the type contract', async () => {
    const filters = localCollection(() => ({ filter: 'undeclared', tags: [], title: 't' }));
    const tags = localCollection(() => ({ filter: null, tags: ['undeclared'], title: 't' }));
    await expect(filters.derive({ ok: true })).rejects.toMatchObject({ stage: 'index' });
    await expect(tags.derive({ ok: true })).rejects.toMatchObject({ stage: 'index' });
  });

  it('collapses duplicate tags in first-seen order instead of storing them', async () => {
    const tagged = localCollection(() => ({ filter: null, tags: ['low', 'high', 'low'], title: 't' }), {
      tags: ['low', 'high'],
    });
    const derivation = await tagged.derive({ ok: true });
    expect(derivation?.tags).toEqual(['low', 'high']);
  });

  it('rejects more distinct tags than the tags-per-entry bound', async () => {
    const over = Array.from({ length: ARCHIVE_LIMITS.tagsPerEntry + 1 }, (_, i) => `t${i}`);
    const many = localCollection(() => ({ filter: null, tags: over, title: 't' }), { tags: over });
    expect(await many.derive({ ok: true })).toBeNull();
    const within = localCollection(
      () => ({ filter: null, tags: over.slice(0, ARCHIVE_LIMITS.tagsPerEntry), title: 't' }),
      { tags: over },
    );
    expect((await within.derive({ ok: true }))?.tags.length).toBe(ARCHIVE_LIMITS.tagsPerEntry);
  });

  it('trims the derived title and rejects empty, oversized or ill-formed titles', async () => {
    const titled = defineArchiveCollection({
      contentVersion: 1,
      filters: [],
      index: (payload: { title: string }) => ({ filter: null, tags: [], title: payload.title }),
      name: 'titled',
      payloadSchema: s.object({ title: s.string() }),
      tags: [],
    });
    expect((await titled.derive({ title: '  padded  ' }))?.title).toBe('padded');
    for (const title of ['   ', '', 'x'.repeat(ARCHIVE_LIMITS.titleChars + 1), 'bad\u0000title']) {
      expect(await titled.derive({ title }), JSON.stringify(title)).toBeNull();
    }
  });

  it('rejects a canonical payload over the payload-byte ceiling', async () => {
    const big = defineArchiveCollection({
      contentVersion: 1,
      filters: [],
      index: () => ({ filter: null, tags: [], title: 'big' }),
      name: 'big',
      payloadSchema: s.object({ pad: s.string() }),
      tags: [],
    });
    // The bound covers the whole canonical JSON, wrapper included: {"pad":"…"} adds 10 bytes.
    expect(await big.derive({ pad: 'x'.repeat(ARCHIVE_LIMITS.payloadBytes - 10) })).not.toBeNull();
    expect(await big.derive({ pad: 'x'.repeat(ARCHIVE_LIMITS.payloadBytes - 9) })).toBeNull();
  });

  it('chains unexpected schema callback faults without treating them as invalid content', async () => {
    const cause = new Error('private schema failure');
    const faulty = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 't' }),
      name: 'faulty',
      payloadSchema: s.object({
        ok: s.boolean().transform((): boolean => {
          throw cause;
        }),
      }),
    });
    await expect(faulty.derive({ ok: true })).rejects.toMatchObject({
      cause,
      name: 'ArchiveDerivationError',
      stage: 'schema',
    });
  });

  it('chains unexpected canonicalization and indexing faults', async () => {
    const cause = new Error('private callback failure');
    const fail = () => {
      throw cause;
    };
    const canonical = defineArchiveCollection({
      canonicalize: fail,
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 't' }),
      name: 'faulty',
      payloadSchema: s.object({ ok: s.boolean() }),
    });
    await expect(canonical.derive({ ok: true })).rejects.toMatchObject({ cause, stage: 'canonicalize' });
    await expect(localCollection(fail).derive({ ok: true })).rejects.toMatchObject({ cause, stage: 'index' });
    expect(new ArchiveDerivationError('index', 'Invalid')).toBeInstanceOf(ArchiveError);
  });

  it('chains hashing runtime failures', async () => {
    const cause = new Error('digest unavailable');
    const digest = vi.spyOn(crypto.subtle, 'digest').mockRejectedValueOnce(cause);
    try {
      await expect(derive({ v: 4 })).rejects.toMatchObject({
        cause,
        name: 'ArchiveDerivationError',
        stage: 'hash',
      });
    } finally {
      digest.mockRestore();
    }
  });
});

describe('fixtureCollection.contract', () => {
  const envelope = (payload: { v: number }, over: Record<string, unknown> = {}) => ({
    author: { id: crypto.randomUUID(), name: 'fixture author' },
    contentHash: 'a'.repeat(64),
    contentVersion: 1,
    id: crypto.randomUUID(),
    likeCount: 0,
    payload,
    publishedAt: new Date().toISOString(),
    revision: 1,
    schemaVersion: ARCHIVE_CONTRACT_VERSION,
    updatedAt: new Date().toISOString(),
    ...over,
  });

  it('entry accepts a valid envelope, pins the contract version and keeps the payload typed', () => {
    const parsed = fixtureCollection.contract.entry.safeParse(envelope({ v: 4 }));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.schemaVersion).toBe(ARCHIVE_CONTRACT_VERSION);
      expect(parsed.data.contentVersion).toBe(1);
      expect(parsed.data.payload.v).toBe(4);
    }
  });

  it('entry rejects wrong versions, a corrupt payload and a non-hex hash', () => {
    expect(fixtureCollection.contract.entry.safeParse(envelope({ v: 4 }, { schemaVersion: 2 })).success).toBe(false);
    expect(fixtureCollection.contract.entry.safeParse(envelope({ v: 4 }, { contentVersion: 2 })).success).toBe(false);
    expect(fixtureCollection.contract.entry.safeParse(envelope({ v: 'x' } as unknown as { v: number })).success).toBe(
      false,
    );
    expect(
      fixtureCollection.contract.entry.safeParse(envelope({ v: 4 }, { contentHash: 'z'.repeat(64) })).success,
    ).toBe(false);
  });

  it('ownedEntry adds the create retry key and moderation state to the public envelope', () => {
    const parsed = fixtureCollection.contract.ownedEntry.safeParse({
      ...envelope({ v: 4 }),
      clientKey: crypto.randomUUID(),
      hidden: false,
    });
    expect(parsed.success).toBe(true);
    // Missing retry key or missing moderation state are both foreign shapes.
    expect(fixtureCollection.contract.ownedEntry.safeParse(envelope({ v: 4 })).success).toBe(false);
    expect(
      fixtureCollection.contract.ownedEntry.safeParse({ ...envelope({ v: 4 }), clientKey: crypto.randomUUID() })
        .success,
    ).toBe(false);
  });

  it('ownedEntries parses the own-publications response and rejects foreign shapes', () => {
    const parsed = fixtureCollection.contract.ownedEntries.safeParse({
      entries: [{ ...envelope({ v: 4 }), clientKey: crypto.randomUUID(), hidden: false }],
    });
    expect(parsed.success).toBe(true);
    expect(fixtureCollection.contract.ownedEntries.safeParse({ entries: [envelope({ v: 4 })] }).success).toBe(false);
  });

  it('page parses one list page with cursors', () => {
    const parsed = fixtureCollection.contract.page.safeParse({
      cursor: null,
      entries: [envelope({ v: 4 })],
      previous: null,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.entries[0]?.payload.v).toBe(4);
    expect(
      fixtureCollection.contract.page.safeParse({ cursor: null, entries: [], extra: 1, previous: null }).success,
    ).toBe(false);
  });

  it('publishInput parses {clientKey, payload} and rejects payload drift', () => {
    const input = { clientKey: crypto.randomUUID(), payload: { v: 4 } };
    expect(fixtureCollection.contract.publishInput.safeParse(input).success).toBe(true);
    expect(fixtureCollection.contract.publishInput.safeParse({ ...input, payload: { v: -1 } }).success).toBe(false);
  });

  it('updateInput parses {expectedRevision, payload} and rejects a bad revision', () => {
    const input = { expectedRevision: 1, payload: { v: 4 } };
    expect(fixtureCollection.contract.updateInput.safeParse(input).success).toBe(true);
    expect(fixtureCollection.contract.updateInput.safeParse({ ...input, expectedRevision: 0 }).success).toBe(false);
  });

  it('reuses the fixture payload schema, so client and Worker parse alike', () => {
    expect(fixturePayloadSchema.safeParse({ v: 4 }).success).toBe(true);
  });
});
