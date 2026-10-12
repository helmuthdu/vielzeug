import { s } from '@vielzeug/spell';
import { describe, expect, it } from 'vitest';
import { defineArchiveCollection } from '../collection';
import { ARCHIVE_CONTRACT_VERSION } from '../contract';
import { ArchiveDefinitionError, ArchiveError } from '../errors';

const collection = defineArchiveCollection({
  contentVersion: 1,
  index: () => ({ filter: null, tags: [], title: 'JSON' }),
  name: 'json',
  payloadSchema: s.object({ value: s.unknown() }),
});

describe('collection JSON storage contract', () => {
  it('sorts nested object keys, including integer keys, without reordering arrays', async () => {
    const left = await collection.derive({ value: { '2': 2, '10': 10, a: true, z: [{ a: 1, b: 2 }] } });
    const right = await collection.derive({ value: { '2': 2, '10': 10, a: true, z: [{ a: 1, b: 2 }] } });
    expect(left?.canonicalJson).toBe('{"value":{"10":10,"2":2,"a":true,"z":[{"a":1,"b":2}]}}');
    expect(left?.contentHash).toBe(right?.contentHash);
    expect((await collection.derive({ value: [1, 2] }))?.contentHash).not.toBe(
      (await collection.derive({ value: [2, 1] }))?.contentHash,
    );
  });

  it('rejects values that JSON would lose, coerce, execute or cannot represent', async () => {
    const cycle: { self?: object } = {};
    cycle.self = cycle;
    const accessor = Object.defineProperty({}, 'value', { enumerable: true, get: () => 1 });
    const hidden = Object.defineProperty({}, 'hidden', { value: 1 });
    const symbols = { [Symbol('key')]: true };
    const sparse = new Array(1);
    for (const value of [
      undefined,
      Number.NaN,
      Infinity,
      1n,
      new Date(),
      new Map(),
      new Set(),
      () => 1,
      Symbol('value'),
      cycle,
      accessor,
      hidden,
      symbols,
      sparse,
      '\ud800',
      '\udc00',
      Object.create({ inherited: true }),
    ]) {
      expect(await collection.derive({ value })).toBeNull();
    }
    expect(await collection.derive({ value: 'paired 😀 \u0000' })).not.toBeNull();
  });

  it('rejects root arrays and scalars even when a schema transform could turn them into objects', async () => {
    const transformed = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 'root' }),
      name: 'root',
      payloadSchema: s.unknown().transform(() => ({ value: 1 })),
    });
    for (const value of [[], 1, 'x', null, true, undefined]) {
      expect(await transformed.derive(value)).toBeNull();
    }
  });

  it('omits optional fields materialized as undefined by Spell', async () => {
    const optional = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 'optional' }),
      name: 'optional',
      payloadSchema: s.object({ value: s.string().optional() }),
    });
    expect((await optional.derive({}))?.canonicalJson).toBe('{}');
    expect(await optional.derive({ value: undefined })).toBeNull();
  });

  it('rejects a transform that discards a provided field as undefined', async () => {
    const discarding = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 'discarding' }),
      name: 'discarding',
      payloadSchema: s.object({ value: s.unknown().transform(() => undefined) }),
    });
    await expect(discarding.derive({ value: 1 })).rejects.toMatchObject({
      name: 'ArchiveDerivationError',
      stage: 'schema',
    });
  });

  it('indexes the final normalized payload and stores identical bytes on every parse', async () => {
    const payloadSchema = s.object({ value: s.string().transform((value) => value.trim()) });
    const normalized = defineArchiveCollection({
      contentVersion: 1,
      index: (payload) => ({ filter: null, tags: [], title: payload.value }),
      name: 'normalized',
      payloadSchema,
    });
    const derived = await normalized.derive({ value: ' padded ' });
    expect(derived?.title).toBe('padded');
    expect(derived?.canonicalJson).toBe('{"value":"padded"}');
    expect(payloadSchema.parse(JSON.parse(derived!.canonicalJson))).toEqual({ value: 'padded' });
    expect((await normalized.derive(JSON.parse(derived!.canonicalJson)))?.contentHash).toBe(derived?.contentHash);
  });

  it('rejects non-idempotent schema and domain transforms', async () => {
    const unstable = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 'unstable' }),
      name: 'unstable',
      payloadSchema: s.object({ value: s.number().transform((value) => value + 1) }),
    });
    await expect(unstable.derive({ value: 1 })).rejects.toMatchObject({
      name: 'ArchiveDerivationError',
      stage: 'schema',
    });
    const domain = defineArchiveCollection({
      canonicalize: (payload) => ({ value: payload.value + 1 }),
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 'domain' }),
      name: 'domain',
      payloadSchema: s.object({ value: s.number() }),
    });
    await expect(domain.derive({ value: 1 })).rejects.toMatchObject({
      name: 'ArchiveDerivationError',
      stage: 'canonicalize',
    });
  });

  it('rejects mutation by indexing instead of hashing a different payload', async () => {
    const mutating = defineArchiveCollection({
      contentVersion: 1,
      index: (payload) => {
        payload.value++;
        return { filter: null, tags: [], title: String(payload.value) };
      },
      name: 'mutating',
      payloadSchema: s.object({ value: s.number() }),
    });
    await expect(mutating.derive({ value: 1 })).rejects.toMatchObject({
      name: 'ArchiveDerivationError',
      stage: 'index',
    });
  });

  it('re-runs the plain payload schema when parsing entry responses', () => {
    const normalized = defineArchiveCollection({
      contentVersion: 1,
      index: () => ({ filter: null, tags: [], title: 'response' }),
      name: 'response',
      payloadSchema: s.object({ value: s.string().transform((value) => value.trim()) }),
    });
    const entry = {
      author: { id: '00000000-0000-4000-8000-000000000001', name: 'Author' },
      contentHash: 'a'.repeat(64),
      contentVersion: 1,
      id: '00000000-0000-4000-8000-000000000002',
      likeCount: 0,
      payload: { value: ' padded ' },
      publishedAt: '2026-10-12T09:00:00.000Z',
      revision: 1,
      schemaVersion: ARCHIVE_CONTRACT_VERSION,
      updatedAt: '2026-10-12T09:00:00.000Z',
    };
    // Stored payloads are canonical by construction, so the entry schema is the
    // plain payload schema: a transform applies on read like anywhere else, and a
    // payload outside the schema fails the parse instead of throwing a server error.
    const parsed = normalized.contract.entry.safeParse(entry);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.payload).toEqual({ value: 'padded' });
    expect(normalized.contract.entry.safeParse({ ...entry, payload: { value: 7 } }).success).toBe(false);
  });

  it('freezes independent vocabulary copies and collection metadata', async () => {
    const filters = ['first'];
    const tags = ['tag'];
    const defined = defineArchiveCollection({
      contentVersion: 1,
      filters,
      index: () => ({ filter: 'first', tags: ['tag'], title: 'frozen' }),
      name: 'frozen',
      payloadSchema: s.object({}),
      tags,
    });
    filters[0] = 'changed';
    tags[0] = 'changed';
    expect(defined.filters).toEqual(['first']);
    expect(defined.tags).toEqual(['tag']);
    expect(Object.isFrozen(defined.filters)).toBe(true);
    expect(Object.isFrozen(defined.tags)).toBe(true);
    expect(Object.isFrozen(defined)).toBe(true);
    expect(await defined.derive({})).not.toBeNull();
  });

  it('throws typed definition errors for unsafe versions', () => {
    expect(() =>
      defineArchiveCollection({
        contentVersion: Number.MAX_SAFE_INTEGER + 1,
        index: () => ({ filter: null, tags: [], title: 'version' }),
        name: 'version',
        payloadSchema: s.object({}),
      }),
    ).toThrow(ArchiveDefinitionError);
    expect(new ArchiveDefinitionError('Invalid')).toBeInstanceOf(ArchiveError);
  });
});
