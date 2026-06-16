---
title: 'Spell Examples — Schema Introspection and Round-Trips'
description: 'Serialize spell schemas to descriptors, rebuild them, and export JSON Schema.'
---

## Schema Introspection and Round-Trips

### Problem

Tooling layers need a serializable schema format. Runtime schema instances cannot cross process boundaries or live in static metadata directly.

### Solution

Use `toDescriptor()` as the canonical portable shape, then export to JSON Schema for external consumers.

```ts
import { descriptorToJsonSchema, s } from '@vielzeug/spell';

const Invoice = s
  .object({
    id: s.string().uuid(),
    notes: s.string().max(500).optional().nullable(),
    total: s.number().positive().multipleOf(0.01),
  })
  .label('Invoice');

const descriptor = Invoice.toDescriptor();
const jsonSchema = descriptorToJsonSchema(descriptor);

console.log(jsonSchema.title); // 'Invoice'
console.log(jsonSchema.properties?.id);
```

### Pitfalls

- Descriptor round-trips preserve `description`, optionality, nullability, object strictness, and common string and number annotations emitted by built-in helpers.
- Use `descriptorToJsonSchema()` for external consumers. Do not hand Spell-specific descriptors to tools that expect JSON Schema.
- `variant`, `pipe`, `instanceof`, and `lazy` descriptors are one-way — they serialize to a descriptor but cannot be reconstructed from it.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Unions, Intersections, and Variants](./unions.md)
