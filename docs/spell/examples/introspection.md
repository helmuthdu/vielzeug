---
title: 'Spell Examples — Schema Introspection'
description: 'Schema introspection, JSON Schema output, and descriptor round-tripping with @vielzeug/spell.'
---

## Schema Introspection

### Problem

Generate JSON Schema output from runtime schema definitions, persist schemas as plain data, and validate at runtime that a reconstructed schema has the expected shape.

### Solution

Use `toDescriptor()` to get a plain structural descriptor, `toJsonSchema()` for JSON Schema output, `fromDescriptor()` to reconstruct a schema from a stored descriptor, and `descriptorToJsonSchema()` to convert a descriptor directly without a schema instance.

```ts
import { s, fromDescriptor, descriptorToJsonSchema, type SchemaDescriptor } from '@vielzeug/spell';

// ── Attaching labels ─────────────────────────────────────────────────────────
const EmailSchema = s.string().trim().email().label('Email address');
EmailSchema.description; // 'Email address'

// ── Structural descriptor ────────────────────────────────────────────────────
const UserSchema = s.object({
  id: s.number().int().positive(),
  email: s.string().email(),
  role: s.union('admin', 'editor', 'viewer'),
});

const descriptor = UserSchema.toDescriptor();
// {
//   kind: 'object',
//   fields: {
//     id: { kind: 'number', typeHint: 'integer' },
//     email: { kind: 'string', format: 'email' },
//     role: { kind: 'union', branches: [...] },
//   },
//   strict: true,
// }

// ── JSON Schema output ───────────────────────────────────────────────────────
const jsonSchema = UserSchema.toJsonSchema();
// {
//   type: 'object',
//   properties: { id: { type: 'integer' }, email: { type: 'string', format: 'email' }, ... },
//   required: ['id', 'email', 'role'],
// }

// ── Descriptor without a full schema instance ────────────────────────────────
const storedDescriptor: SchemaDescriptor = { kind: 'string', minLength: 3 };
const jsonSchemaFromDescriptor = descriptorToJsonSchema(storedDescriptor);
// => { type: 'string', minLength: 3 }

// ── Round-tripping a schema through a descriptor ─────────────────────────────
const PointSchema = s.tuple([s.number(), s.number()]).rest(s.number());
const restored = fromDescriptor(PointSchema.toDescriptor());
restored.parse([1, 2, 3, 4]); // => [1, 2, 3, 4]

// ── kind getter ──────────────────────────────────────────────────────────────
s.string().kind;     // 'string'
s.object({}).kind;   // 'object'
s.array(s.string()).kind; // 'array'

// ── Schema equality ──────────────────────────────────────────────────────────
const A = s.string().min(3).email();
const B = s.string().min(3).email();
A.equals(B); // true
A.equals(s.string().min(4).email()); // false

// ── Type guard ───────────────────────────────────────────────────────────────
s.string().is('hello');   // true
s.string().is(42);        // false

// ── assert() — assertion with type narrowing ─────────────────────────────────
function processPayload(raw: unknown) {
  UserSchema.assert(raw, 'payload');
  // raw is now typed as { id: number; email: string; role: string }
  console.log(raw.email);
}

// ── walk() — traverse the schema tree ───────────────────────────────────────
const requiredFields = s.object({ id: s.number(), email: s.string() }).walk({
  object: (_, fields) => Object.keys(fields),
  unknown: () => [],
});
// => ['id', 'email']
```

### Pitfalls

- `fromDescriptor` throws for `lazy`, `pipe`, `instanceof`, and `variant` kinds — these cannot round-trip through a plain descriptor.
- `assert()` is synchronous only. Use `parseAsync()` for schemas with `checkAsync()` validators.
- `equals()` compares schema structure only — it ignores `preprocess()` and `transform()` callbacks.

### Related

- [API](./api.md)
- [Unions](./unions.md)
- [Async](./async.md)
