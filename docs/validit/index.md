---
title: Validit — Schema validation for TypeScript
description: Zero-dependency schema validation library with chainable schemas, async support, coercion, and full TypeScript inference.
---

<PackageBadges package="validit" />

<img src="/logo-validit.svg" alt="Validit Logo" width="156" class="logo-highlight"/>

# Validit

**Validit** is a zero-dependency schema validation library with chainable schemas, async support, coercion, and full TypeScript inference.

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
import { v } from '@vielzeug/validit';

const UserSchema = v.object({
  name: v.string().min(1),
  email: v.email(),
  age: v.number().min(18).optional(),
  role: v.oneOf(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
});

// Parse (throws on failure)
const user = UserSchema.parse(rawInput);

// Safe parse (returns result object)
const result = UserSchema.safeParse(rawInput);
if (result.success) {
  console.log(result.data); // typed as User
} else {
  console.error(result.error.issues); // validation errors
}

// Infer TypeScript type
import { type Infer } from '@vielzeug/validit';
type User = Infer<typeof UserSchema>;
```

## Features

- **Chainable schema builders** — `v.string()`, `v.number()`, `v.object()`, `v.array()`, `v.oneOf()`, `v.allOf()`, `v.noneOf()`, and more
- **Type inference** — `Infer<typeof Schema>` extracts the TypeScript type
- **Async validation** — `parseAsync()` and `safeParseAsync()` for async refinements
- **Coercion** — `v.coerce.string/number/boolean/date()` for form data and URL params
- **Refinements** — `.refine(fn)` handles both sync and async custom validation logic
- **Transforms** — `.transform(fn)` for data shaping after validation
- **Recursive schemas** — `v.lazy(() => schema)` for circular/self-referencing types
- **Class validation** — `v.instanceof(SomeClass)` for custom class checks
- **Object helpers** — `.partial()`, `.required()`, `.pick()`, `.omit()`, `.extend()`, `.strict()`
- **Zero dependencies** — <PackageInfo package="validit" type="size" /> gzipped

## Next Steps

| | |
|---|---|
| [Usage Guide](./usage.md) | Schema types, chaining, coercion, and advanced patterns |
| [API Reference](./api.md) | Complete type signatures and method documentation |
| [Examples](./examples.md) | Real-world validation recipes and framework integrations |
