import { s } from '@vielzeug/spell';
import { defineArchiveCollection } from '../collection';

/**
 * The reference collection used by this package's tests: a minimal, strictly
 * validated `{ v: number }` payload demonstrating the whole definition surface —
 * the payload schema, derived filter/tags/title, and the declared vocabularies —
 * with no collection code beyond the definition itself.
 */
export const fixturePayloadSchema = s.object({ v: s.number().int().min(0) });

export const fixtureCollection = defineArchiveCollection({
  contentVersion: 1,
  filters: ['even', 'odd'],
  index: (payload) => ({
    filter: payload.v % 2 === 0 ? 'even' : 'odd',
    tags: [payload.v < 10 ? 'low' : 'high'],
    title: `fixture-${payload.v}`,
  }),
  name: 'fixture',
  payloadSchema: fixturePayloadSchema,
  tags: ['low', 'high'],
});
