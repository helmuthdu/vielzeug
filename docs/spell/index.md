---
title: Spell — Schema validation for TypeScript
description: Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.
package: spell
category: validation
keywords: [schema, validation, type-safe, parsing, runtime-validation, zod-like, coercion]
related: [forge, courier, vault]
exports: [s, ValidationError, configure, ErrorCode, errorsAt, fromDescriptor, descriptorToJsonSchema]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="spell" />

<img src="/logo-spell.svg" alt="Spell logo" width="156" class="logo-highlight"/>

# Sieve

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/spell` &nbsp;·&nbsp; **Category:** Validation

**Key exports:** `s`, `ValidationError`, `configure`, `ErrorCode`, `errorsAt`, `fromDescriptor`, `descriptorToJsonSchema`

**When to use:** Zero-dep schema validation with strict-by-default objects, async refinements, coercion, JSON Schema output, and full TypeScript inference.

**Related:** [Forge](/forge/) · [Courier](/courier/) · [Vault](/vault/)

</details>

`@vielzeug/spell` is a zero-dependency schema validation library for TypeScript projects. It gives you a fluent schema API, runtime validation, and precise input/output typing with `InferInput<T>` and `Infer<T>`.


## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/spell
```

```sh [npm]
npm install @vielzeug/spell
```

```sh [yarn]
yarn add @vielzeug/spell
```

:::

## Quick Start

```ts
import { s, type Infer } from '@vielzeug/spell';

const UserSchema = s.object({
  id: s.coerce.number().int().positive(),
  name: s.string().trim().min(1),
  email: s.string().trim().email(),
  role: s.union('admin', 'editor', 'viewer').default('viewer'),
  tags: s.array(s.string()).unique().default([]),
});

type User = Infer<typeof UserSchema>;

const result = UserSchema.safeParse({
  id: '42',
  name: 'Ada',
  email: 'ada@example.com',
});

if (result.success) {
  const user: User = result.data;
  console.log(user.id); // 42
} else {
  const { fieldErrors, formErrors } = result.error.flattenFirst();
  console.log(fieldErrors, formErrors);
}
```

## Why Sieve?

Ad-hoc validation tends to spread across handlers and services, making rules hard to reuse and error responses inconsistent.

```ts
// Before - manual checks
function parseUser(input: unknown) {
  if (typeof input !== 'object' || input === null) throw new Error('Invalid payload');
  const data = input as Record<string, unknown>;
  if (typeof data.email !== 'string' || !data.email.includes('@')) throw new Error('Invalid email');
  if (typeof data.age !== 'number' || data.age < 18) throw new Error('Invalid age');
  return { email: data.email, age: data.age };
}

// After - Sieve
const UserSchema = s.object({
  email: s.string().email(),
  age: s.number().int().min(18),
});

const result = UserSchema.safeParse(payload);
if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten();
}
```

| Feature           | Sieve                                       | Zod    | Yup     |
| ----------------- | --------------------------------------------- | ------ | ------- |
| Bundle size       | <PackageInfo package="spell" type="size" /> | ~62 kB | ~14 kB  |
| Type inference    | ✅ `Infer<T>`                                 | ✅     | Partial |
| Coercion API      | ✅ `s.coerce.*`                               | ✅     | ✅      |
| Async validation  | ✅ `.check()`                                 | ✅     | ✅      |
| Error flattening  | ✅ `flatten()` + `flattenFirst()`              | ✅     | Partial |
| Zero dependencies | ✅                                            | ✅     | ❌      |

**Use Sieve when** you want a fluent schema API with strong TypeScript inference, structured errors, and zero dependencies.

**Consider alternatives when** you are already standardized on another validator ecosystem and migration cost outweighs the API benefits.

## Features

- **Schema factories**: primitives, collections, literals, unions, intersections, lazy schemas, discriminated variants, and enum helpers
- **Input/output inference**: `InferInput<T>` for accepted inputs plus `Infer<T>` for parsed outputs
- **Sync and async validation**: `.check()` for synchronous predicates, `.checkAsync()` for async validators; use `parseAsync()` / `safeParseAsync()` for async schemas
- **Assertion helper**: `schema.assert(value, label?)` — type-narrowing assertion that throws `ValidationError` on failure
- **Advanced validation hooks**: `ctx.addIssue()` for multi-issue/path-aware validation
- **Preprocess and coerce**: `schema.preprocess(...)` plus `s.coerce.string()`, `number()`, `boolean()`, and `date()`
- **Schema introspection**: `schema.label(description)` attaches a human-readable label. `schema.toDescriptor()` returns a typed `SchemaDescriptor`. `schema.kind` returns the schema kind string. `schema.toJsonSchema()` emits JSON Schema 2020-12 output. `schema.walk()` for custom tree traversal. `descriptorToJsonSchema(descriptor)` and `fromDescriptor(descriptor)` for round-tripping descriptors.
- **Expanded schema coverage**: `s.bigint()`, `s.set()`, and `s.map()`
- **Error ergonomics**: `ValidationError`, `Issue`, `ErrorCode`, `error.flatten()`, `error.flattenFirst()`, `error.format()`, and `errorsAt()`
- **Object and tuple composition**: object `.relaxed()` / `.strict()` modes, `.partial()`, `.pick()`, `.omit()`, `.extend()`, and tuple `.rest()`
- **String and number format constraints**: validators like `.ulid()`, `.jwt()`, `.duration()`, and `.finite()`
- **Locale-aware messages**: `configure()` for global overrides, `registerLocale()` / `useLocale()` for multi-locale support, `reset()` to restore defaults
- **Strict by default objects**: unknown keys are rejected unless `.relaxed()` is used
- **Flexible roots**: `s.any()` and `s.unknown()` when you want to start from an unconstrained schema
- **Zero dependencies**: no runtime dependencies, no adapter layer required

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## Documentation

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

## See Also

- [Forge](/forge/) — typed form state that uses Sieve schemas as its validation layer
- [Courier](/courier/) — HTTP client for validating request and response payloads at service boundaries
- [Vault](/vault/) — unified storage API that accepts Sieve schemas to type-gate persisted data

<!-- markdownlint-enable MD025 MD033 MD060 -->
