---
title: 'Spell Examples: Schema Introspection and Round-Trips'
description: 'Export declarative spell definitions as JSON Schema.'
---

## Schema Introspection and Round-Trips

### Problem

Tooling layers need a serializable schema format. Runtime schema instances cannot cross process boundaries or live in static metadata.

### Solution

Use `definition()` as the portable shape, then convert it with `toJsonSchema()` from `@vielzeug/spell/json`.

```ts
import { s } from '@vielzeug/spell';
import { toJsonSchema } from '@vielzeug/spell/json';

const Invoice = s
  .object({
    id: s.string().uuid(),
    notes: s.string().max(500).nullish(),
    reference: s.string().startsWith('INV-'),
    total: s.number().positive().multipleOf(0.01),
  })
  .describe('Invoice');

const definition = Invoice.definition();
const jsonSchema = toJsonSchema(definition);

console.log(definition.fields.reference); // { kind: 'string', patterns: [{ flags: '', source: '^INV-' }] }
console.log(jsonSchema.description); // 'Invoice'
console.log(jsonSchema.required); // ['id', 'reference', 'total']
```

### Pitfalls

- Definitions record descriptions, optionality, nullability, and every built-in constraint, including date bounds as ISO strings.
- Pass `toJsonSchema()` output to external consumers; Spell definitions are not JSON Schema.
- Checks, transforms, preprocessors (including `s.coerce.*` and `trim()`), defaults, and catches have no definition; keep a separate declarative schema for tooling.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Unions, Intersections, and Discriminated Unions](./unions.md)
