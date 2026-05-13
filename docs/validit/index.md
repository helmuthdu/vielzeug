---
title: Validit — Schema validation for TypeScript
description: Zero-dependency schema validation library with strict-by-default objects, async refinements, coercion, flexible schema composition, and full TypeScript inference.
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="validit" />

<img src="/logo-validit.svg" alt="Validit logo" width="156" class="logo-highlight"/>

# Validit

`@vielzeug/validit` is a zero-dependency schema validation library for TypeScript projects. It gives you a fluent schema API, runtime validation, and precise input/output typing with `InferInput<T>` and `Infer<T>`.

<!-- Search keywords: validation schema, runtime validator, typed data parsing. -->

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/validit
```

```sh [npm]
npm install @vielzeug/validit
```

```sh [yarn]
yarn add @vielzeug/validit
```

:::

## Quick Start

```ts
import { flattenFirstErrors, v, type Infer } from '@vielzeug/validit';

const UserSchema = v.object({
  id: v.coerce.number().int().positive(),
  name: v.string().trim().min(1),
  email: v.string().trim().email(),
  role: v.union('admin', 'editor', 'viewer').default('viewer'),
  tags: v.array(v.string()).unique().default([]),
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
  const { fieldErrors, formErrors } = flattenFirstErrors(result.error);
  console.log(fieldErrors, formErrors);
}
```

## Why Validit?

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

// After - Validit
const UserSchema = v.object({
  email: v.string().email(),
  age: v.number().int().min(18),
});

const result = UserSchema.safeParse(payload);
if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten();
}
```

| Feature           | Validit                                       | Zod    | Yup     |
| ----------------- | --------------------------------------------- | ------ | ------- |
| Bundle size       | <PackageInfo package="validit" type="size" /> | ~62 kB | ~14 kB  |
| Type inference    | ✅ `Infer<T>`                                 | ✅     | Partial |
| Coercion API      | ✅ `v.coerce.*`                               | ✅     | ✅      |
| Async validation  | ✅ `.check()`                                 | ✅     | ✅      |
| Error flattening  | ✅ `flatten()` + `flattenFirstErrors(error)`  | ✅     | Partial |
| Zero dependencies | ✅                                            | ✅     | ❌      |

**Use Validit when** you want a fluent schema API with strong TypeScript inference, structured errors, and zero dependencies.

**Consider alternatives when** you are already standardized on another validator ecosystem and migration cost outweighs the API benefits.

## Features

- **Schema factories**: primitives, collections, literals, unions, intersections, lazy schemas, discriminated variants, and enum helpers
- **Input/output inference**: `InferInput<T>` for accepted inputs plus `Infer<T>` for parsed outputs
- **Sync and async validation**: `.check()` with `parse*` and `safeParse*`
- **Advanced validation hooks**: `ctx.addIssue()` for multi-issue/path-aware validation
- **Preprocess and coerce**: `schema.preprocess(...)` plus `v.coerce.string()`, `number()`, `boolean()`, and `date()`
- **Expanded schema coverage**: `v.bigint()`, `v.set()`, and `v.map()`
- **Error ergonomics**: `ValidationError`, `Issue`, `ErrorCode`, `error.flatten()`, and `flattenFirstErrors(error)`
- **Object and tuple composition**: object `.strip()`/`.relaxed()` modes and tuple `.rest()`
- **String and number format constraints**: validators like `.ulid()`, `.jwt()`, `.duration()`, and `.finite()`
- **Strict by default objects**: unknown keys are rejected unless `.relaxed()` is used
- **Nested global message customization**: `configure({ messages })` and `reset()`
- **Flexible roots**: `v.any()` and `v.unknown()` when you want to start from an unconstrained schema
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

- [Formit](/formit/)
- [Fetchit](/fetchit/)
- [Deposit](/deposit/)

<!-- markdownlint-enable MD025 MD033 MD060 -->
