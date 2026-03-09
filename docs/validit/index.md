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
import { v, type Infer } from '@vielzeug/validit';

const UserSchema = v.object({
  name:  v.string().min(1),
  email: v.string().email(),
  age:   v.number().min(18).optional(),
  role:  v.union('admin', 'editor', 'viewer'),
});

type User = Infer<typeof UserSchema>;

// Parse (throws on failure)
const user = UserSchema.parse(rawInput);

// Safe parse (returns result object)
const result = UserSchema.safeParse(rawInput);
if (result.success) {
  console.log(result.data); // typed as User
} else {
  const { fieldErrors, formErrors } = result.error.flatten();
  // fieldErrors: { name: ['...'], email: ['...'] }
  // formErrors:  ['...'] (root-level refine errors)
}
```

## Features

- **Chainable schema builders** — `v.string()`, `v.number()`, `v.object()`, `v.array()`, `v.tuple()`, `v.record()`, `v.union()`, `v.intersect()`, `v.variant()`, `v.enum()`, and more
- **Type inference** — `Infer<typeof Schema>` extracts the TypeScript type; `InferInput<T>` / `InferOutput<T>` for fine-grained control
- **Error flattening** — `error.flatten()` returns `{ fieldErrors, formErrors }` ready for any form UI
- **Message functions** — every message parameter accepts `string | (({ value, ...ctx }) => string)` for typed, context-aware error messages
- **Sync validation** — `.refine(fn, message)` for sync custom validators; throws at definition time if given an async function
- **Async validation** — `.refineAsync(fn, message)` + `parseAsync()` and `safeParseAsync()` for async refinements
- **Coercion** — `v.coerce.string/number/boolean/date()` for form data and URL params
- **Discriminated unions** — `v.variant(discriminator, { tag: schema })` dictionary API with O(1) runtime dispatch and compile-time inference
- **String helpers** — `.regex()`, `.email()`, `.url()`, `.uuid()`, `.date()`, `.datetime()`, `.includes()`, `.trim()`, `.lowercase()`, `.uppercase()`, and more
- **Object helpers** — `.partial()`, `.partial(...keys)`, `.required()`, `.pick()`, `.omit()`, `.extend()`, `.strict()` — all preserve `.refine()` chains
- **Modifiers** — `.optional()`, `.nullable()`, `.nullish()`, `.default(val)`, `.catch(fallback)`
- **Transforms** — `.transform(fn)` for data shaping after validation
- **Recursive schemas** — `v.lazy(() => schema)` for circular/self-referencing types
- **Class validation** — `v.instanceof(SomeClass)` for custom class checks
- **Type guard** — `.is(value)` narrows to the output type without throwing
- **Branded types** — `.brand<'MyBrand'>()` for zero-cost nominal typing
- **Zero dependencies** — <PackageInfo package="validit" type="size" /> gzipped

## Next Steps

|                           |                                                                    |
| ------------------------- | ------------------------------------------------------------------ |
| [Usage Guide](./usage.md) | Schema types, modifiers, coercion, and advanced patterns           |
| [API Reference](./api.md) | Complete type signatures for every schema and method               |
| [Examples](./examples.md) | Copy-paste ready recipes for forms, APIs, and config validation    |
