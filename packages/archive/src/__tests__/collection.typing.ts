import { s } from '@vielzeug/spell';
import { type ArchiveCollection, defineArchiveCollection } from '../collection';

/** Compiled by test:types, never executed: index results cannot widen vocabulary inference. */
export function collectionTyping(): void {
  const payloadSchema = s.object({ title: s.string() });
  const valid = defineArchiveCollection({
    contentVersion: 2,
    filters: ['first', 'second'],
    index: (payload) => ({ filter: 'first', tags: ['tag'], title: payload.title }),
    name: 'valid',
    payloadSchema,
    tags: ['tag'],
  });
  const literalVersion: ArchiveCollection<{ title: string }, 2> = valid;
  void literalVersion;

  defineArchiveCollection({
    contentVersion: 1,
    filters: ['first'],
    // @ts-expect-error Index cannot introduce a filter missing from the declared array.
    index: (payload) => ({ filter: 'other', tags: ['tag'], title: payload.title }),
    name: 'invalid-filter',
    payloadSchema,
    tags: ['tag'],
  });
  defineArchiveCollection({
    contentVersion: 1,
    filters: ['first'],
    // @ts-expect-error Index cannot introduce a tag missing from the declared array.
    index: (payload) => ({ filter: 'first', tags: ['other'], title: payload.title }),
    name: 'invalid-tag',
    payloadSchema,
    tags: ['tag'],
  });
  defineArchiveCollection({
    contentVersion: 1,
    // @ts-expect-error Omitted filters mean no non-null filter can be derived.
    index: (payload) => ({ filter: 'other', tags: [], title: payload.title }),
    name: 'omitted-filters',
    payloadSchema,
  });
  defineArchiveCollection({
    contentVersion: 1,
    // @ts-expect-error Omitted tags mean no tag can be derived.
    index: (payload) => ({ filter: null, tags: ['other'], title: payload.title }),
    name: 'omitted-tags',
    payloadSchema,
  });
  defineArchiveCollection({
    contentVersion: 1,
    filters: [],
    // @ts-expect-error An empty filter array cannot be widened from index.
    index: (payload) => ({ filter: 'other', tags: [], title: payload.title }),
    name: 'empty-filters',
    payloadSchema,
  });
  defineArchiveCollection({
    contentVersion: 1,
    // @ts-expect-error An empty tag array cannot be widened from index.
    index: (payload) => ({ filter: null, tags: ['other'], title: payload.title }),
    name: 'empty-tags',
    payloadSchema,
    tags: [],
  });
  defineArchiveCollection({
    contentVersion: 1,
    index: (payload) => ({ filter: null, tags: [], title: payload.title }),
    name: 'omitted-valid',
    payloadSchema,
  });
  defineArchiveCollection({
    contentVersion: 1,
    filters: ['first'],
    index: (payload) => ({ filter: 'first', tags: [], title: payload.title }),
    name: 'filter-only',
    payloadSchema,
  });
  defineArchiveCollection({
    contentVersion: 1,
    index: (payload) => ({ filter: null, tags: ['tag'], title: payload.title }),
    name: 'tag-only',
    payloadSchema,
    tags: ['tag'],
  });
}
