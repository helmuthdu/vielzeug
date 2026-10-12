---
title: 'Archive Examples: Content Identity and Versions'
description: "Use stable JSON identity, explicit array normalization and content-version identity."
---

## Content Identity and Versions

### Problem

Equivalent JSON objects should hash identically despite property insertion order.
Order-insensitive arrays need explicit normalization. The collection's content
version must participate in content identity.

### Solution

Let the core sort object keys and hash its `{contentVersion, payload}` envelope;
canonicalize only application-specific ordering.

```ts
import { defineArchiveCollection } from '@vielzeug/archive';
import { s } from '@vielzeug/spell';

const recipes = defineArchiveCollection({
  name: 'recipes', contentVersion: 1,
  payloadSchema: s.object({
    name: s.string().min(1).max(32),
    ingredients: s.array(s.string().min(1).max(64)).min(1).max(20),
  }),
  canonicalize: (payload) => ({ ...payload, ingredients: [...payload.ingredients].sort() }),
  index: ({ name }) => ({ title: name, filter: null, tags: [] }),
});
const first = await recipes.derive({ name: 'Rice', ingredients: ['water', 'rice'] });
const reordered = await recipes.derive({ ingredients: ['rice', 'water'], name: 'Rice' });
if (first === null || reordered === null) throw new Error('Invalid recipe');
console.log(first.contentHash === reordered.contentHash); // true
console.log(first.canonicalJson);
```

A matching update hash returns the existing entry without incrementing revision,
provided `expectedRevision` still matches. Reusing a create key with different
content conflicts. `contentVersion` participates in identity, independently of
wire `schemaVersion` and the storage stamp.

Filter, tag and title projections are stored when content is published or updated.
Changing the indexing function does not rewrite existing rows, even if the payload
schema and content version stay the same. For unreleased development deployments,
deliberately reset and reseed a fresh database with the active definition when
projection semantics change; Archive provides no automatic projection updates.
Resetting is destructive: perform it only as an explicit development operation.
An older stored content version does not get reinterpreted by a new definition;
reads return 503 `record-unavailable` when the current wire schema rejects it.

### Pitfalls

- Passing Dates, cycles, non-finite numbers or other non-JSON values: derivation rejects.
- Using a non-idempotent canonicalizer or unstable schema transform: `ArchiveDerivationError`, not invalid-content `null`.
- Mutating payloads in `index` or assuming changed index rules update stored projections: keep the definition and dataset consistent.
- Expecting older content formats to be decoded: runtime reads validate only the current definition.

### Related

- [Stand Up a Content Archive](./stand-up-a-content-archive.md)
- [Archive API Reference](../api.md)
