---
title: Spell — API Reference
description: Complete API reference for @vielzeug/spell.
---

[[toc]]

## API At a Glance

| Symbol             | Purpose                                      | Execution mode | Common gotcha                                        |
| ------------------ | -------------------------------------------- | -------------- | ---------------------------------------------------- |
| `s.object()`       | Create typed object schema definitions       | Sync           | Unknown keys are rejected by default                 |
| `safeParse()`      | Validate unknown input without throwing      | Sync           | Always branch on `success` before using parsed data  |
| `safeParseAsync()` | Validate schemas that contain async checks   | Async          | Required whenever any branch uses `checkAsync()`     |
| `configure()`      | Override global validation messages          | Sync           | Message keys are nested groups, not flat string keys |

## Package Entry Point

| Import              | Purpose                |
| ------------------- | ---------------------- |
| `@vielzeug/spell` | Main exports and types |

## Most Used First

### External boundaries

- Use `safeParse()` when validating request payloads, form input, query params, or external API responses.
- Use `safeParseAsync()` when any part of the schema tree uses `checkAsync()`.
- Use `parse()` and `parseAsync()` when validation failure should be exceptional.

### Common composition flow

1. Start with a factory from `s`.
2. Add built-in constraints like `.min()` or `.email()`.
3. Add `preprocess()`, `default()`, `optional()`, or `nullable()` as needed.
4. Add `.check()` / `.checkAsync()` for domain-specific rules.
5. Add `transform()` only after type-specific validators are complete.

## Package Exports

```ts
import {
  // Factories and namespace
  s,
  sAny, sArray, sBigint, sBoolean, sCoerce,
  sDate, sEnum, sInstanceof, sIntersect, sLazy,
  sLiteral, sMap, sNever, sNull, sNumber, sObject,
  sRecord, sSet, sString, sTuple, sUndefined,
  sUnion, sUnknown, sVariant,
  // Convenience aliases
  sAnd, sOr,
  // Descriptor utilities
  fromDescriptor, descriptorToJsonSchema,
  // Error handling
  ErrorCode,
  ValidationError,
  errorsAt,
  // Messages and locale
  configure,
  reset,
  registerLocale,
  useLocale,
  currentLocale,
  // Low-level utilities
  fail,
  prependIssuePath,
  resolveMessage,
  isPlainObject,
  // Classes
  Schema,
  WrapperSchema,
  PipeSchema,
  // Types
  type AnySchema,
  type CheckContext,
  type CheckFnResult,
  type FlatError,
  type FlatErrorFirst,
  type FormattedErrors,
  type Infer,
  type InferInput,
  type InferOutput,
  type Issue,
  type JsonSchema,
  type MessageFn,
  type Messages,
  type NullableSchema,
  type NullishSchema,
  type OptionalSchema,
  type ParseResult,
  type SchemaDescriptor,
  type SchemaWalker,
  type ValidateFn,
  type WrapperMode,
  type Logger,
} from '@vielzeug/spell';
```

`s` is the canonical schema factory namespace. Each `sXxx` export is also available as a standalone tree-shakeable function.

## s Namespace

### Primitive Factories

- `s.any()` — accepts any value; output typed as `any`
- `s.unknown()` — accepts any value; output typed as `unknown`
- `s.string()`
- `s.number()`
- `s.boolean()`
- `s.date()`
- `s.bigint()`
- `s.literal(value)` — exact value match
- `s.enum(values)` — accepts a `readonly` tuple of `string | number` values
- `s.null()` — shorthand for `s.literal(null)`
- `s.undefined()` — shorthand for `s.literal(undefined)`
- `s.never()` — always fails

### Composite Factories

- `s.object(shape)`
- `s.array(itemSchema)`
- `s.set(itemSchema)`
- `s.map(keySchema, valueSchema)`
- `s.tuple(items)`
- `s.record(keySchema, valueSchema)`
- `s.union(a, b, ...rest)` — at least two branches
- `s.intersect(a, b, ...rest)` — at least two branches; alias `s.and(a, b)`
- `s.or(a, b)` — alias for two-branch `s.union(a, b)`
- `s.variant(discriminator, map)` — discriminated union
- `s.lazy(getter)` — for recursive schemas
- `s.instanceof(Ctor)` — class instance check

### Coercion Factories

- `s.coerce.string()` — converts non-null values via `String()`
- `s.coerce.number()` — converts via `Number()`
- `s.coerce.boolean()` — accepts `true/false`, `1/0`, `'true'/'false'`, `'1'/'0'`
- `s.coerce.date()` — converts string or number to `Date`
- `s.coerce.bigint()` — converts number or integer string to `bigint`

## Schema&lt;Output, Input&gt;

All schema classes inherit from `Schema<Output, Input>`.

### Validation

```ts
parse(value: unknown): Output
safeParse(value: unknown): ParseResult<Output>
parseAsync(value: unknown): Promise<Output>
safeParseAsync(value: unknown): Promise<ParseResult<Output>>
```

- `parse()` throws `ValidationError` on failure.
- `safeParse()` never throws for validation failures.
- If the schema tree contains `checkAsync()`, calling `parse()` or `safeParse()` throws immediately — use `parseAsync()` / `safeParseAsync()`.

### Modifiers

```ts
optional(): WrapperSchema<this, 'optional'>    // allows undefined
nullable(): WrapperSchema<this, 'nullable'>    // allows null
nullish(): WrapperSchema<this, 'nullish'>      // allows null | undefined
required(): Schema<Exclude<Output, undefined>> // strips optionality
default(value: Output | (() => Output)): this  // applied when input is undefined
catch(fallback: Output | (() => Output)): this // applied when validation fails
```

- `default()` applies only when the input is `undefined`.
- `catch()` returns a fallback only for `ValidationError` failures.
- `optional()` / `nullable()` / `nullish()` on an already-wrapped schema merges modes instead of double-wrapping.

### Custom Validation

**Predicate form** — boolean return, optional message:
```ts
check(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this
```

**Context form** — returns `void | null | undefined | boolean | string`; use `ctx.addIssue()` for multi-issue/path-aware validation:
```ts
check(fn: (value: Output, ctx: CheckContext) => CheckFnResult): this
```

**Async validation** — must use `parseAsync()` / `safeParseAsync()`:
```ts
checkAsync(fn: (value: Output, ctx: CheckContext) => Promise<CheckFnResult>): this
```

`check()` throws a runtime error if the callback returns a `Promise`. Always use `checkAsync()` for async validators.

### Assertion

```ts
assert(value: unknown, label?: string): asserts value is Output
```

Throws `ValidationError` if `value` fails validation, narrowing its type on success. When `label` is provided, it is prepended to root-level (path-less) issue messages for clearer error context.

```ts
schema.assert(value, 'userId');
// throws: "userId: Expected number" if value is not a number
// Nested path issues (e.g. object fields) are NOT prefixed with the label.
```

`assert()` uses the internal `_parseFullSync` path — it does not accept async schemas. Use `parseAsync()` and check the result manually for schemas with `checkAsync()` validators.

```ts
transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput, Input>
preprocess(fn: (value: unknown) => unknown): this
```

`preprocess()` steps run in declaration order before type validation.
`transform()` creates a new `Schema<NewOutput>` — apply type-specific constraints before calling it.

```ts
label(description: string): this          // immutable — returns new schema with description attached
readonly description: string | undefined   // read the stored description
readonly kind: string                      // returns the schema kind (e.g. 'string', 'object', 'array')
toDescriptor(): SchemaDescriptor           // returns typed structural descriptor
toJsonSchema(): JsonSchema                 // JSON Schema 2020-12 output (derived from toDescriptor())
walk<R>(visitor: SchemaWalker<R>): R       // typed schema tree traversal
equals(other: AnySchema): boolean          // structural equality (ignores check() validators)
is(value: unknown): value is Output        // type guard based on safeParse
pipe<B>(next: Schema<B, NoInfer<Output>>): Schema<B, Input>
```

`label()` is **immutable** — it returns a new schema instance with the description attached. The original is unchanged.
`kind` reads the descriptor kind without allocating a full descriptor object when already cached.
`toDescriptor()` returns the full `SchemaDescriptor` for this schema — kind, constraints, and nested descriptors.

## StringSchema

`s.string()` — validates `typeof value === 'string'`.

### Length

| Method                          | Effect                 |
| ------------------------------- | ---------------------- |
| `.min(n, message?)`             | Minimum character count |
| `.max(n, message?)`             | Maximum character count |
| `.length(n, message?)`          | Exact character count  |
| `.nonEmpty(message?)`           | At least one character |

### Content

| Method                          | Effect                  |
| ------------------------------- | ----------------------- |
| `.startsWith(prefix, message?)` | Must start with prefix  |
| `.endsWith(suffix, message?)`   | Must end with suffix    |
| `.includes(substr, message?)`   | Must contain substring  |
| `.regex(pattern, message?)`     | Must match regex        |

Multiple `.regex()` calls on the same schema log a warning and suppress `pattern` in JSON Schema output.

### Format

| Method                   | Effect                                                    |
| ------------------------ | --------------------------------------------------------- |
| `.email(message?)`       | Pragmatic email syntax check                              |
| `.url(options?)`         | Valid URL; options: `{ message?, protocols? }`            |
| `.uuid(message?)`        | UUID (case-insensitive)                                   |
| `.isoDate(message?)`     | `YYYY-MM-DD`                                              |
| `.isoDateTime(message?)` | ISO 8601 date-time with optional time offset              |
| `.ip(message?)`          | IPv4 or IPv6                                              |
| `.time(message?)`        | `HH:MM` or `HH:MM:SS`                                    |
| `.duration(message?)`    | ISO 8601 duration (`P1Y2M3DT4H5M6S`)                     |
| `.cuid(message?)`        | CUID v1                                                   |
| `.cuid2(message?)`       | CUID v2                                                   |
| `.ulid(message?)`        | ULID                                                      |
| `.nanoid(message?)`      | NanoID (alphanumeric + `_-`, 10+ chars)                   |
| `.jwt(message?)`         | Three-segment `header.payload.signature`                  |
| `.semver(message?)`      | Semantic version string                                   |
| `.slug(message?)`        | URL slug (`[a-z0-9]+(-[a-z0-9]+)*`)                      |
| `.numeric(message?)`     | String representation of a number                        |
| `.hex(message?)`         | Hexadecimal string                                        |
| `.hexColor(message?)`    | CSS hex color (`#RGB`, `#RRGGBB`, `#RRGGBBAA`)           |
| `.emoji(message?)`       | One or more emoji characters                             |
| `.base64(message?)`      | Standard Base64 (requires at least one complete group)   |
| `.base64url(message?)`   | URL-safe Base64                                           |

### Preprocessors

`.trim()`, `.lowercase()`, `.uppercase()` run before validation in declaration order.

```ts
s.string().url({ protocols: ['https'] })  // restrict to HTTPS only
```

## NumberSchema

`s.number()` — validates `typeof value === 'number' && !Number.isNaN(value)`.

| Method                        | Effect                          |
| ----------------------------- | ------------------------------- |
| `.min(n, message?)`           | Value ≥ n                       |
| `.max(n, message?)`           | Value ≤ n                       |
| `.int(message?)`              | Integer (`Number.isInteger`)    |
| `.positive(message?)`         | Value > 0                       |
| `.negative(message?)`         | Value < 0                       |
| `.nonNegative(message?)`      | Value ≥ 0                       |
| `.nonPositive(message?)`      | Value ≤ 0                       |
| `.multipleOf(step, message?)` | Value % step ≈ 0                |
| `.safe(message?)`             | `Number.isSafeInteger(value)`   |
| `.finite(message?)`           | `Number.isFinite(value)`        |

## BigIntSchema

`s.bigint()` — validates `typeof value === 'bigint'`.

| Method                        | Effect           |
| ----------------------------- | ---------------- |
| `.min(n, message?)`           | Value ≥ n        |
| `.max(n, message?)`           | Value ≤ n        |
| `.positive(message?)`         | Value > 0n       |
| `.negative(message?)`         | Value < 0n       |
| `.nonNegative(message?)`      | Value ≥ 0n       |
| `.nonPositive(message?)`      | Value ≤ 0n       |
| `.multipleOf(step, message?)` | Value % step = 0 |

## DateSchema

`s.date()` — validates `instanceof Date` with `!isNaN`.

| Method                  | Effect                            |
| ----------------------- | --------------------------------- |
| `.min(date, message?)`  | Date must be on or after `date`   |
| `.max(date, message?)`  | Date must be on or before `date`  |

## ArraySchema

`s.array(itemSchema)` — validates `Array.isArray`.

| Method                  | Effect                               |
| ----------------------- | ------------------------------------ |
| `.min(n, message?)`     | At least n items                     |
| `.max(n, message?)`     | At most n items                      |
| `.length(n, message?)`  | Exactly n items                      |
| `.nonEmpty(message?)`   | At least 1 item                      |
| `.unique(message?)`     | No duplicate items (Set semantics)   |

## ObjectSchema

`s.object(shape)` — validates plain objects. **Strict by default** — unknown keys produce `invalid_keys`.

### Shape Manipulation

| Method                 | Effect                            |
| ---------------------- | --------------------------------- |
| `.partial()`           | All fields become optional        |
| `.partial(...keys)`    | Specific fields become optional   |
| `.required()`          | All fields become required        |
| `.extend(extraShape)`  | Add or override fields            |
| `.pick(...keys)`       | Keep only specified fields        |
| `.omit(...keys)`       | Remove specified fields           |

### Mode

| Method       | Effect                                    |
| ------------ | ----------------------------------------- |
| `.relaxed()` | Allow and pass through unknown keys       |
| `.strict()`  | Reject unknown keys (the default mode)    |

Properties: `.shape` (readonly)

## TupleSchema

`s.tuple(items)` — validates fixed-length arrays with per-index schemas.

- `.rest(schema)` allows variadic tail elements.

## RecordSchema

`s.record(keySchema, valueSchema)` — validates plain objects where every key and value matches the schemas. If key parsing transforms the key, the output uses the transformed key.

```ts
s.record(s.string().trim().lowercase(), s.string()).parse({ ' X-ID ': '1' });
// => { 'x-id': '1' }
```

## SetSchema

`s.set(itemSchema)` — validates `instanceof Set`.

| Method                 | Effect            |
| ---------------------- | ----------------- |
| `.min(n, message?)`    | At least n items  |
| `.max(n, message?)`    | At most n items   |
| `.size(n, message?)`   | Exactly n items   |
| `.nonEmpty(message?)`  | At least 1 item   |

## MapSchema

`s.map(keySchema, valueSchema)` — validates `instanceof Map`. Key and value schemas apply to every entry.

## UnionSchema

`s.union(a, b, ...rest)` — at least two branches, returns the first successful result.

- Accepts schema instances or raw literal values; raw values are normalized to `LiteralSchema`.
- Exposes `.schemas` (readonly).
- Use `error.bestMatch()` to surface the branch closest to matching on failure.

## IntersectSchema

`s.intersect(a, b, ...rest)` — all branches must pass; object outputs are deep-merged left to right.

## VariantSchema

`s.variant(discriminator, map)` — discriminated union with O(1) branch lookup.

- `map` values must be `ObjectSchema` instances.
- Each branch inherits its object's strict/relaxed mode.

## LazySchema

`s.lazy(getter)` — defers schema resolution for recursive types. The getter is called once and memoized.

## LiteralSchema and EnumSchema

```ts
s.literal('active')
s.literal(null)   // same as s.null()

s.enum(['draft', 'published'] as const)
s.enum([200, 201, 204] as const)
```

For TypeScript `enum` objects, extract values manually:
```ts
s.enum(Object.values(MyEnum) as [string, ...string[]])
```

## Schema Introspection

### `label()` — attach a description

```ts
// Immutable setter — returns a new schema with the description attached
const Schema = s.string().min(3).label('Full name');
Schema.description; // 'Full name'
```

### `toDescriptor()` — structural descriptor

```ts
const d = s.string().min(3).email().toDescriptor();
// => { kind: 'string', minLength: 3, format: 'email' }
```

### SchemaDescriptor

Discriminated union on `kind`:

```ts
type SchemaDescriptor =
  | { kind: 'any' | 'unknown' | 'never' | 'boolean' | 'bigint' | 'date' | 'lazy' | 'instanceof' }
  | { kind: 'string'; minLength?: number; maxLength?: number; pattern?: string | null; format?: string; contentEncoding?: string }
  | { kind: 'number'; minimum?: number; maximum?: number; exclusiveMinimum?: number; exclusiveMaximum?: number; multipleOf?: number; typeHint?: 'integer' }
  | { kind: 'literal'; value: string | number | boolean | null | undefined }
  | { kind: 'enum'; values: readonly (string | number)[] }
  | { kind: 'array'; items: SchemaDescriptor; minItems?: number; maxItems?: number }
  | { kind: 'tuple'; items: SchemaDescriptor[]; rest: SchemaDescriptor | null }
  | { kind: 'object'; fields: Record<string, SchemaDescriptor>; strict: boolean }
  | { kind: 'record'; key: SchemaDescriptor; value: SchemaDescriptor }
  | { kind: 'set'; items: SchemaDescriptor }
  | { kind: 'map'; key: SchemaDescriptor; value: SchemaDescriptor }
  | { kind: 'union' | 'intersect'; branches: SchemaDescriptor[] }
  | { kind: 'variant'; discriminator: string; branches: Record<string, SchemaDescriptor> }
  | { kind: 'pipe'; from: SchemaDescriptor; to: SchemaDescriptor }
```

All variants may also include `description?: string`, `isOptional?: boolean`, and `isNullable?: boolean`.

### `toJsonSchema()`

Emits JSON Schema 2020-12. Derived from `toDescriptor()` — no separate serialization path per schema.
Schemas without JSON Schema equivalents emit `{ $comment: '...' }`.

### `fromDescriptor(descriptor)`

Reconstructs a `Schema` instance from a `SchemaDescriptor`. Useful for persistence, code generation, or round-tripping descriptors.

```ts
import { fromDescriptor } from '@vielzeug/spell';

const schema = s.object({ name: s.string().min(1), age: s.number().int() });
const reconstructed = fromDescriptor(schema.toDescriptor());
reconstructed.parse({ name: 'Ada', age: 30 }); // works
```

`fromDescriptor` throws for schema kinds that cannot be serialized to a plain descriptor: `lazy`, `pipe`, `instanceof`, and `variant`.

### `descriptorToJsonSchema(descriptor)`

Converts a `SchemaDescriptor` directly to JSON Schema. Same output as `schema.toJsonSchema()` but accepts a pre-built descriptor.

```ts
import { descriptorToJsonSchema } from '@vielzeug/spell';

const jsonSchema = descriptorToJsonSchema(s.string().email().toDescriptor());
// => { type: 'string', format: 'email' }
```

### `walk()`

Traverse the tree with a typed visitor map. Container handlers receive already-walked child results.

```ts
s.object({ id: s.number(), name: s.string() }).walk({
  object: (_, fields) => Object.keys(fields),
  unknown: () => [],
});
// => ['id', 'name']
```

## Global Messages

### `configure()`

Deep-merges provided message groups with the defaults:

```ts
configure({
  messages: {
    number: { min: ({ min }) => `Must be at least ${min}` },
    string: { email: () => 'Please enter a valid email address' },
  },
});
```

### `reset()`

Restores all message defaults.

### Locale Management

Register named locale bundles and switch between them at runtime:

```ts
import { registerLocale, useLocale, currentLocale } from '@vielzeug/spell';

registerLocale('de', {
  string: { email: () => 'Bitte eine gültige E-Mail-Adresse eingeben' },
  number: { min: ({ min }) => `Mindestens ${min}` },
});

useLocale('de');      // activates 'de' locale
currentLocale();      // => 'de'
```

`registerLocale(locale, messages)` accepts a deep-partial message map — override only what you need.
`useLocale(locale)` throws if the locale has not been registered first.

### `Messages`

The full nested message contract. `configure({ messages })` accepts a deep partial — override only what you need.

## Types

### `Infer<T>` and `InferInput<T>`

```ts
type User = Infer<typeof UserSchema>;        // parsed output type
type UserIn = InferInput<typeof UserSchema>; // accepted input type
```

`InferOutput<T>` is an alias for `Infer<T>`.

### `ParseResult<T>`

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
```

### `MessageFn<Ctx>`

```ts
type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> =
  | string
  | ((ctx: Ctx) => string);
```

### `Issue`

Discriminated union on `code`:

```ts
type Issue = {
  code: ErrorCode | (string & {});
  message: string;
  params?: Record<string, unknown>;
  path: (string | number)[];
};
```

Narrowing on `issue.code` gives typed access to `issue.params`.

### `CheckContext`

```ts
type CheckContext = {
  addIssue: (issue: {
    code: string;
    message: string;
    params?: Record<string, unknown>;
    path?: (string | number)[];
  }) => void;
};
```

## Errors

### ValidationError

```ts
class ValidationError extends Error {
  readonly issues: Issue[];

  static is(value: unknown): value is ValidationError;

  flatten(): { fieldErrors: FlatError[]; formErrors: string[] };
  flattenFirst(): { fieldErrors: FlatErrorFirst[]; formErrors: string[] };
  format(): FormattedErrors;
  bestMatch(): Issue[] | null; // best-match branch errors for union failures
}

type FlatError = { path: (string | number)[]; messages: string[] };
type FlatErrorFirst = { path: (string | number)[]; message: string };
type FormattedErrors = { _errors: string[]; [key: string]: FormattedErrors | string[] };
```

### `errorsAt()`

Extracts `_errors` at any path depth inside a `FormattedErrors` tree:

```ts
const formatted = result.error.format();
errorsAt(formatted, 'email');          // string[]
errorsAt(formatted, 'address', 'city'); // string[]
```

### ErrorCode

| Code                  | Emitted by                             |
| --------------------- | -------------------------------------- |
| `custom`              | `check()` / `checkAsync()` failures    |
| `invalid_base64`      | `base64()`, `base64url()`              |
| `invalid_date`        | `s.date()` type check                  |
| `invalid_duration`    | `duration()`                           |
| `invalid_enum`        | `s.enum()`                             |
| `invalid_finite`      | `finite()`                             |
| `invalid_integer`     | `int()`                                |
| `invalid_keys`        | Object unknown keys (strict mode)      |
| `invalid_length`      | `length()` / `size()`                  |
| `invalid_literal`     | `s.literal()`                          |
| `invalid_multiple_of` | `multipleOf()`                         |
| `invalid_safe`        | `safe()`                               |
| `invalid_string`      | String format validators               |
| `invalid_type`        | Type mismatch                          |
| `invalid_union`       | All union branches failed              |
| `invalid_unique`      | `unique()`                             |
| `invalid_url`         | `url()`                                |
| `invalid_variant`     | Variant discriminator mismatch         |
| `too_big`             | `max()`, `negative()`, `nonPositive()` |
| `too_small`           | `min()`, `positive()`, `nonNegative()`, `nonEmpty()` |
