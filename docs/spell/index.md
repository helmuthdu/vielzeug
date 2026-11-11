---
title: 'Spell: Schema validation for TypeScript'
description: Zero-dependency schema validation with explicit async checks, Standard Schema interoperability, and JSON Schema export.
package: spell
category: validation
keywords: [schema, validation, parsing, standard-schema, json-schema, locale, typescript, definitions]
related: [forge, courier, vault]
exports:
  [
    s,
    createParseContext,
    joinIssuePath,
    SpellValidationError,
    SpellDefinitionError,
    Schema,
    StandardSchemaV1,
    ErrorCode,
    './json',
    './predicates',
  ]
environments: [browser, node, ssr, deno]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="spell" />

## Why Spell?

Spell keeps runtime validation, static inference, and portable definitions in one API. Checks and transforms run in the order you chain them, and every built-in constraint appears in the exported definition.

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

| Feature           | Spell                                                                       | Zod                                          | Yup                                          |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| Bundle size       | <PackageInfo package="spell" type="size" />                                 | ~62 kB                                       | ~14 kB                                       |
| Type inference    | <ore-icon name="check" size="16"></ore-icon> `Infer<T>`                     | <ore-icon name="check" size="16"></ore-icon> | Partial                                      |
| Coercion API      | <ore-icon name="check" size="16"></ore-icon> `s.coerce.*`                   | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Async validation  | <ore-icon name="check" size="16"></ore-icon> `.checkAsync()`                | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Error flattening  | <ore-icon name="check" size="16"></ore-icon> `flatten()` + `flattenFirst()` | <ore-icon name="check" size="16"></ore-icon> | Partial                                      |
| Zero dependencies | <ore-icon name="check" size="16"></ore-icon>                                | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="x" size="16"></ore-icon>     |

<div class="decision-callout">

**Use Spell when** you want a fluent schema API with strong TypeScript inference, structured errors, and no third-party runtime dependencies.

**Consider alternatives when** you are already standardized on another validator ecosystem and migration cost outweighs the API benefits.

</div>

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
  .relaxed(); // allow extra keys: omit for strict-mode (default)

type User = Infer<typeof User>;

const payload: unknown = {
  email: 'ada@example.com',
  name: 'Ada',
  role: 'admin',
  team: 'platform',
};

const result = User.safeParse(payload);

if (!result.success) throw result.error;
const user = result.data;
```

## Features

<div class="features-grid">

- `s` builders for primitives, collections, objects, unions, and recursive schemas.
- `parse()`, `safeParse()`, `parseAsync()`, and `safeParseAsync()`; parsing stays synchronous unless a check is async.
- `check()` and `checkAsync()` run in chain order with transforms; sync parsing never skips an async check.
- `optional`, `nullable`, `nullish`, `default`, `catch`, and `required` modifiers; defaults are copied per parse.
- `extend()`, `pick()`, `omit()`, `partial()`, and `tolerate()` for object composition and schema evolution.
- `definition()` returns frozen data; `toJsonSchema()` from `@vielzeug/spell/json` converts it to JSON Schema.
- `schema['~standard']` implements Standard Schema v1 without an adapter.
- `createParseContext()` customizes messages per request, locale, or form.
- `SpellValidationError` offers `flatten()`, `flattenFirst()`, and `messagesAt()` for UI errors.
- Object and record parsing is hardened against prototype-pollution keys.

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Forge](/forge/): typed form state that uses Spell schemas as its validation layer
- [Courier](/courier/): HTTP client for validating request and response payloads at service boundaries
- [Vault](/vault/): unified storage API that accepts Spell schemas to type-gate persisted data

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
