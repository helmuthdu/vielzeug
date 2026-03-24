---
title: Validit — Schema validation for TypeScript
description: Zero-dependency schema validation library with chainable schemas, async support, coercion, and full TypeScript inference.
---

<PackageBadges package="validit" />

<img src="/logo-validit.svg" alt="Validit logo" width="156" class="logo-highlight"/>

# Validit

`@vielzeug/validit` is a zero-dependency schema validation library for TypeScript projects. It gives you a fluent schema API, runtime validation, and precise output types with `Infer<T>`.

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
import { v, type Infer } from '@vielzeug/validit';

const UserSchema = v
  .object({
    id: v.coerce.number().int().positive(),
    name: v.string().min(1),
    email: v.string().trim().email(),
    role: v.union('admin', 'editor', 'viewer').default('viewer'),
  })
  .strict();

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
  const { fieldErrors, formErrors } = result.error.flatten();
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
| Async validation  | ✅ `.refineAsync()`                           | ✅     | ✅      |
| Error flattening  | ✅ Field + form                               | ✅     | Partial |
| Zero dependencies | ✅                                            | ✅     | ❌      |

**Use Validit when** you want a fluent schema API with strong TypeScript inference, structured errors, and zero dependencies.

**Consider alternatives when** you are already standardized on another validator ecosystem and migration cost outweighs the API benefits.

## Features

- **Chainable schema factories**: primitives and composites (`string`, `number`, `object`, `array`, `tuple`, `record`, `union`, `intersect`, `variant`, `enum`, `nativeEnum`)
- **Type inference**: `Infer<T>` and `InferOutput<T>` infer the parsed output type
- **Sync + async validation**: `.refine()` and `.refineAsync()` with `parse*` / `safeParse*`
- **Preprocessing and coercion**: `schema.preprocess(...)`, `v.preprocess(...)`, and `v.coerce.*`
- **Error ergonomics**: `ValidationError`, `Issue`, `ErrorCode`, and `error.flatten()`
- **Object composition helpers**: `.partial()`, `.required()`, `.pick()`, `.omit()`, `.extend()`, `.strip()`, `.passthrough()`, `.strict()`
- **Global message customization**: `configure({ messages })`
- **Zero dependencies**: <PackageInfo package="validit" type="size" /> gzipped

## Compatibility

| Environment | Support |
| ----------- | ------- |
| Browser     | ✅      |
| Node.js     | ✅      |
| SSR         | ✅      |
| Deno        | ✅      |

## See Also

- [Formit](/formit/)
- [Fetchit](/fetchit/)
- [Deposit](/deposit/)
