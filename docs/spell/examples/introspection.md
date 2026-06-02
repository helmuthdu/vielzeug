---
title: 'Spell Examples — Schema Introspection and Round-Trips'
description: 'Serialize spell schemas to descriptors, rebuild them, and export JSON Schema.'
---

## Schema Introspection and Round-Trips

### Problem

Tooling layers need a serializable schema format. Runtime schema instances cannot cross process boundaries or live in static metadata directly.

### Solution

Use `toDescriptor()` as the canonical portable shape, then rebuild or export from that descriptor.

```ts
import { descriptorToJsonSchema, fromDescriptor, s } from '@vielzeug/spell';

const Invoice = s.object({
  id: s.string().uuid(),
  notes: s.string().max(500).optional().nullable(),
  total: s.number().positive().multipleOf(0.01),
}).label('Invoice');

const descriptor = Invoice.toDescriptor();
const rebuilt = fromDescriptor(descriptor);
const jsonSchema = descriptorToJsonSchema(descriptor);

console.log(rebuilt.equals(Invoice));
console.log(jsonSchema.title);
```

### Pitfalls

- `fromDescriptor()` only accepts reconstructible descriptor kinds. `variant`, `pipe`, `instanceof`, and `lazy` descriptors stay one-way.
- Descriptor round-trips preserve `description`, optionality, nullability, object strictness, and common string and number annotations emitted by built-in helpers.
- Use `toJsonSchema()` or `descriptorToJsonSchema()` for external consumers. Do not hand Spell-specific descriptors to tools that expect JSON Schema.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Unions, Intersections, and Variants](./unions.md)
