---
title: Spell — Schema validation for TypeScript
description: Zero-dependency schema validation with sync and async parsing, descriptor round-trips, JSON Schema export, and tree-shakeable builders.
package: spell
category: validation
keywords: [schema, validation, parsing, json-schema, locale, typescript, descriptors]
related: [forge, courier, vault]
exports:
  [
    s,
    Schema,
    WrapperSchema,
    PipeSchema,
    ValidationError,
    ErrorCode,
    errorsAt,
    fail,
    fromDescriptor,
    descriptorToJsonSchema,
    configure,
    currentLocale,
    registerLocale,
    useLocale,
    reset,
  ]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageBadges package="spell" />

<img src="/logo-spell.svg" alt="Spell logo" width="156" class="logo-highlight"/>

# Spell

<details>
<summary>⚡ Quick Reference</summary>

**Package:** `@vielzeug/spell` &nbsp;·&nbsp; **Category:** Validation

**Key exports:** `s`, `Schema`, `ValidationError`, `ErrorCode`, `errorsAt`, `fail`, `fromDescriptor`, `descriptorToJsonSchema`, `configure`, `currentLocale`, `registerLocale`

**When to use:** Validate unknown input, infer types from schemas, customize messages, and round-trip schema descriptors across tools.

**Related:** [Forge](/forge/) · [Courier](/courier/) · [Vault](/vault/)

</details>

Spell validates unknown input with strict TypeScript inference, sync and async parsing, and descriptor-based introspection.

## Installation

Use your workspace package manager to add Spell.

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

Start with a schema, then parse unknown input and use the inferred output type everywhere else.

```ts
import { s, type Infer } from '@vielzeug/spell';

const User = s
  .object({
    email: s.string().email(),
    name: s.string().min(1),
    role: s.enum(['admin', 'editor', 'viewer'] as const),
  })
  .relaxed();

type User = Infer<typeof User>;

const payload: unknown = {
  email: 'ada@example.com',
  name: 'Ada',
  role: 'admin',
  team: 'platform',
};

const user = User.parse(payload);
```

## Why Spell?

Spell keeps runtime validation, static inference, and schema introspection in one API. You can use the namespace form for ergonomics or the `sXxx` exports for tree shaking. Descriptor and JSON Schema output make Spell useful at API boundaries, build tooling, and documentation layers.

This example shows the difference between manual branching and a single reusable schema.

```ts
// Before
function parseUserBefore(value: unknown) {
  if (typeof value !== 'object' || value === null) throw new Error('Expected object');

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.email !== 'string' || !candidate.email.includes('@')) {
    throw new Error('Expected valid email');
  }

  if (typeof candidate.role !== 'string' || !['admin', 'editor', 'viewer'].includes(candidate.role)) {
    throw new Error('Expected valid role');
  }

  return {
    email: candidate.email,
    role: candidate.role,
  };
}

// After
import { s } from '@vielzeug/spell';

const User = s.object({
  email: s.string().email(),
  role: s.enum(['admin', 'editor', 'viewer'] as const),
});

const user = User.parse({ email: 'ada@example.com', role: 'admin' });
```

| Feature           | Spell                                       | Zod    | Yup     |
| ----------------- | ------------------------------------------- | ------ | ------- |
| Bundle size       | <PackageInfo package="spell" type="size" /> | ~62 kB | ~14 kB  |
| Type inference    | ✅ `Infer<T>`                               | ✅     | Partial |
| Coercion API      | ✅ `s.coerce.*`                             | ✅     | ✅      |
| Async validation  | ✅ `.check()`                               | ✅     | ✅      |
| Error flattening  | ✅ `flatten()` + `flattenFirst()`           | ✅     | Partial |
| Zero dependencies | ✅                                          | ✅     | ❌      |

**Use Spell when** you want a fluent schema API with strong TypeScript inference, structured errors, and zero dependencies.

**Consider alternatives when** you are already standardized on another validator ecosystem and migration cost outweighs the API benefits.

## Features

- Namespace and tree-shakeable schema builders.
- Sync and async parsing with `parse()`, `safeParse()`, `parseAsync()`, and `safeParseAsync()`.
- Wrapper modes for `optional`, `nullable`, `nullish`, `default`, `catch`, and `required`.
- Descriptor round-trips with `toDescriptor()`, `fromDescriptor()`, and `descriptorToJsonSchema()`.
- Global and per-locale message configuration with composable `configure()` calls.
- Standalone validators for sizes, numeric ranges, and common string formats.
- Structured errors with flattened, formatted, and best-match union diagnostics.
- Object parsing and error formatting hardened against prototype-pollution-style keys.

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
