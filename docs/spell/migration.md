---
title: Spell 3.0 Migration
---

# Spell 3.0 Migration

Spell 3.0 removes duplicate and internal-facing APIs, preserves composite input types, and adds Standard Schema v1 interoperability.

## Create parse contexts directly

Replace the `diagnostics` wrapper with the direct `createParseContext()` export.

```ts
// Before
import { diagnostics } from '@vielzeug/spell';
const context = diagnostics.createParseContext(messages);

// After
import { createParseContext } from '@vielzeug/spell';
const context = createParseContext(messages);
```

`diagnostics.fail()` and `diagnostics.prependIssuePath()` are no longer public. Custom validation belongs in `check()` or `checkAsync()`.

## Use `unknown` instead of `any`

`unknown` is the single schema for unrestricted input.

```ts
// Before
const value = s.any();

// After
const value = s.unknown();
```

## Coerce at construction

Instance `.coerce()` methods were removed because they discarded constraints already added to the schema.

```ts
// Before
const port = s.number().coerce().int().positive();

// After
const port = s.coerce.number().int().positive();
```

Use `s.coerce.string()`, `s.coerce.number()`, `s.coerce.boolean()`, `s.coerce.bigint()`, and `s.coerce.date()`.

## Handle union errors without branch guessing

`SpellValidationError.bestMatch()` was removed. Plain unions now retain one stable `invalid_union` issue instead of heuristically selecting a branch.

```ts
const result = schema.safeParse(input);

if (!result.success) {
  console.log(result.error.issues);
}
```

Use `s.discriminatedUnion()` when one field identifies the intended object branch and field-specific errors are required.

## Remove imports of internal schema machinery

The root package no longer exports `Schema`, `PipeSchema`, `AnySchema`, `InferSchemaMode`, `MergeSchemaModes`, `SchemaMode`, `ValidateFn`, or `schemaMode`. Build schemas through `s`; use `Infer`, `InferInput`, and `InferOutput` for application types.

## Standard Schema interoperability

Every Spell schema implements Standard Schema v1 through `schema['~standard']`. Pass a Spell schema directly to Standard Schema consumers such as `schemaValidator()` from `@vielzeug/forge/schema`.

Review the [Usage Guide](./usage.md) and [API Reference](./api.md) for the current contracts.
