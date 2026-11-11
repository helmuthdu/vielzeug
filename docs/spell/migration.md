---
title: Spell Migration
---

# Spell Migration

## Upgrading from 26.11.9

This train rebuilds Spell on one ordered execution engine. Checks and transforms run in chain order, definitions describe every built-in constraint, and the duplicate or ambiguous APIs are removed.

### Checks run in chain order

A check after `transform()` now receives the transformed value, and `trim()`, `lowercase()`, and `uppercase()` are ordered transforms instead of preprocessors. Transforms are skipped once an earlier step failed.

```ts
// Before: min(1) saw the untrimmed input, so '  ' passed
s.string().min(1).trim();

// After: put normalizers first
s.string().trim().min(1);
```

### Object derivation requires a plain shape

`extend()`, `pick()`, `omit()`, and `partial()` throw `SpellDefinitionError` when the object has checks, transforms, preprocessors, a default, or a catch. Previously they copied checks that could read removed fields.

```ts
// Before
const Patch = Signup.check(passwordsMatch).omit('confirm');

// After: derive first, then add the check
const Patch = Signup.omit('confirm');
const Checked = Signup.check(passwordsMatch);
```

### Removed object helpers

`merge()`, `defaults()`, `partialDefaults()`, `requiredFields()`, and `optionalFields()` were removed.

```ts
// Before
const Resource = Base.merge(WithMeta);
const config = Config.defaults();
const required = User.requiredFields();

// After
const Resource = Base.extend(WithMeta.shape);
const config = Config.parse({});
const required = Object.entries(User.shape)
  .filter(([, field]) => !field.isOptional)
  .map(([key]) => key);
```

### `required()` clears `default()`

`required()` now makes `undefined` invalid again. It clears both `optional()` and `default()`. On objects it no longer makes the fields required; build the required shape directly instead of calling `partial().required()`.

```ts
// Before: the default still applied
s.string().default('Guest').required().parse(undefined); // 'Guest'

// After
s.string().default('Guest').required().safeParse(undefined).success; // false
```

### `tolerate()` is an object method

```ts
// Before
import { tolerate } from '@vielzeug/spell';
const Person = tolerate(s.object({ name: s.string() }), 'address');

// After
const Person = s.object({ name: s.string() }).tolerate('address');
```

### `label()` is renamed to `describe()`

```ts
// Before
s.string().label('User name');

// After
s.string().describe('User name');
```

### Unions and intersections take schemas only

Raw literal shorthand was removed from `s.union()` and `s.intersect()`.

```ts
// Before
s.union('light', 'dark');

// After
s.enum(['light', 'dark']);
s.union(s.literal('light'), s.number());
```

### `unique()` takes an options object

The equality-function form was replaced by a key selector.

```ts
// Before
s.array(Item).unique((a, b) => a.id === b.id, 'Duplicate item');

// After
s.array(Item).unique({ by: (item) => item.id, message: 'Duplicate item' });
```

### Unified issue codes and format names

String format and pattern failures share one code. `params.format` is the method name.

| Before                                                                | After                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `invalid_string`, `invalid_url`, `invalid_base64`, `invalid_duration` | `invalid_format`                                             |
| `params.format: 'iso-date'`, `'iso-datetime'`, `'hex-color'`          | `'isoDate'`, `'isoDateTime'`, `'hexColor'`                   |
| `startsWith`/`endsWith`/`includes`/`regex` under `invalid_string`     | `invalid_format` with `params.format` set to the method name |
| `invalid_variant`                                                     | `invalid_discriminator`                                      |
| `invalid_unique` with `params: { unique: true }`                      | `invalid_unique` without `params`                            |

```ts
// Before
if (issue.code === 'invalid_string' && issue.params.format === 'iso-date') showDateHint();

// After
if (issue.code === 'invalid_format' && issue.params.format === 'isoDate') showDateHint();
```

### Renamed message keys

| Before                            | After                        |
| --------------------------------- | ---------------------------- |
| `string.date`                     | `string.isoDate`             |
| `string.dateTime`                 | `string.isoDateTime`         |
| `variant.*`                       | `discriminatedUnion.*`       |
| `string.nonEmpty({ min, value })` | `string.nonEmpty({ value })` |

### Definitions and JSON Schema

`fromDefinition()` is renamed to `toJsonSchema()`, and the `JsonSchema` type moved to `@vielzeug/spell/json`. Descriptors now record every built-in constraint.

| Before                                        | After                                              |
| --------------------------------------------- | -------------------------------------------------- |
| `format`, `contentEncoding` (string)          | `formats: string[]` (method names)                 |
| `pattern: string \| null` (string)            | `patterns: { flags, source }[]`                    |
| `typeHint: 'integer'` (number)                | `integer: true`; `finite()` adds `finite: true`    |
| `kind: 'variant'`                             | `kind: 'discriminatedUnion'`                       |
| `startsWith`, `nonEmpty`, date bounds omitted | Recorded as patterns, `minLength`, and ISO strings |

```ts
// Before
import { fromDefinition, type JsonSchema } from '@vielzeug/spell/json';
const json: JsonSchema = fromDefinition(schema.definition());

// After
import { toJsonSchema, type JsonSchema } from '@vielzeug/spell/json';
const json: JsonSchema = toJsonSchema(schema.definition());
```

`array().unique({ by })` makes `definition()` throw. Bigint bounds no longer log a warning: they are part of the definition.

### Async misuse throws instead of failing

`safeParse()`, `is()`, and `assert()` on a schema with async checks now throw `SpellError` before running any async check, and `catch()` no longer turns that misuse into a fallback value. The message is "Schema contains async checks; use parseAsync() or safeParseAsync()."

```ts
// Before
schema.safeParse(value).success; // false

// After
await schema.safeParseAsync(value);
```

`schema['~standard'].validate()` now returns its result synchronously unless the schema has async checks. Await it or wrap it in `Promise.resolve()` if your code calls `.then()` on it.

### `SyncParsable` removed

`AnySchema` is now `Schema<unknown, unknown>` and exposes `safeParse()`, so adapters no longer need a separate surface type.

```ts
// Before
import type { SyncParsable } from '@vielzeug/spell';
function validate(schema: SyncParsable<unknown>) {}

// After
import type { AnySchema, Schema } from '@vielzeug/spell';
function validate(schema: AnySchema) {}
function parseWith<T>(schema: Schema<T, unknown>) {}
```

### Predicates subpath exports formats only

`@vielzeug/spell/predicates` no longer exports the type guards and range helpers (`isString`, `isNumber`, `isInRange`, `hasMinLength`, …). Use `typeof` checks or the guards from `@vielzeug/arsenal/guards`. The format predicates (`isEmail`, `isUuid`, `isIsoDate`, …) are unchanged.

## Spell 3.2

### Schema traversal removed

`schema.walk()` and the `SchemaWalker<R>` visitor type were removed. Schema structure is available through `schema.definition()`, which returns a serializable `SchemaDescriptor` tree, and `toJsonSchema()` from `@vielzeug/spell/json` converts it to JSON Schema.

### Execution-mode generics removed

The third `SchemaMode` type parameter on `Schema` and every schema class, plus the `InferSchemaMode`, `MergeSchemaModes`, and `SchemaMode` types and the `schemaMode` symbol, were removed. `checkAsync()` now returns the same schema type instead of flipping a type-level mode. Synchronous parsing of a schema with async checks still throws at runtime ("Schema contains async checks; use parseAsync() or safeParseAsync."), and async checks now compose correctly at any nesting depth: `s.object({ tags: s.array(s.string().checkAsync(fn)) }).parseAsync(...)` previously failed with "Sync parsing cannot evaluate async checks" and now evaluates the nested check.

## Spell 3.0

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
