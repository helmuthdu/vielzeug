---
title: 'Spell Examples — Schema Introspection and Round-Trips'
description: 'Export declarative spell definitions as JSON Schema.'
---

## Schema Introspection and Round-Trips

### Problem

Tooling layers need a serializable schema format. Runtime schema instances cannot cross process boundaries or live in static metadata directly.

### Solution

Use `definition()` as canonical portable shape, then export it through `fromDefinition()` from `@vielzeug/spell/json`.

```ts
import { s } from '@vielzeug/spell';
import { fromDefinition } from '@vielzeug/spell/json';

const Invoice = s
  .object({
    id: s.string().uuid(),
    notes: s.string().max(500).optional().nullable(),
    total: s.number().positive().multipleOf(0.01),
  })
  .label('Invoice');

const definition = Invoice.definition();
const jsonSchema = fromDefinition(definition);

console.log(jsonSchema.title); // 'Invoice'
console.log(jsonSchema.properties?.id);
```

### Pitfalls

- Definitions preserve declarative structure such as descriptions, optionality, nullability, and built-in annotations.
- Use `fromDefinition()` for external consumers. Do not hand Spell definitions to tools that expect JSON Schema.
- Runtime checks, transforms, defaults, catches, and preprocessors intentionally have no definition.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Unions, Intersections, and Variants](./unions.md)
