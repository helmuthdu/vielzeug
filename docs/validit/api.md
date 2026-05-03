---
title: Validit — API Reference
description: Complete reference for validit exports, v factories, schema methods, specialized schemas, messages, types, and errors.
---

[[toc]]

## API At a Glance

| Symbol             | Purpose                                 | Execution mode | Common gotcha                                         |
| ------------------ | --------------------------------------- | -------------- | ----------------------------------------------------- |
| `v.object()`       | Create typed object schema definitions  | Sync           | Unknown keys are rejected by default                  |
| `safeParse()`      | Validate unknown input without throwing | Sync           | Always branch on success before using parsed data     |
| `safeParseAsync()` | Validate async refinement pipelines     | Async          | Await result to capture async validation issues       |
| `configure()`      | Override global validation messages     | Sync           | Message keys are nested groups, not flat string keys  |

## Most Used First

### External boundaries

- Use `safeParse()` when validating request payloads, form input, query params, or external API responses.
- Use `safeParseAsync()` when any part of the schema tree uses `.refineAsync()`.
- Use `parse()` and `parseAsync()` when validation failure should be exceptional and you want a thrown `ValidationError`.

### Common composition flow

1. Start with a factory from `v`.
2. Add built-in constraints like `.min()` or `.email()`.
3. Add `preprocess()`, `default()`, `optional()`, or `nullable()` as needed.
4. Add `.refine()` or `.refineAsync()` for domain-specific rules.
5. Add `transform()` only after type-specific validators are complete.

## Package Exports

```ts
import {
  ErrorCode,
  Schema,
  ValidationError,
  configure,
  reset,
  v,
  type Infer,
  type InferOutput,
  type TypeOf,
  type Issue,
  type MessageFn,
  type ParseResult,
  type ValidateFn,
  type AsyncValidateFn,
  type Messages,
} from '@vielzeug/validit';
```

`@vielzeug/validit` exports `v` as the canonical schema factory namespace.

## v Namespace

### Primitive Factories

- `v.any()`
- `v.unknown()`
- `v.string()`
- `v.number()`
- `v.boolean()`
- `v.date()`
- `v.literal(value)`
- `v.enum(values)`
- `v.nativeEnum(enumObj)`
- `v.null()`
- `v.undefined()`
- `v.never()`

### Composite Factories

- `v.object(shape)`
- `v.array(itemSchema)`
- `v.tuple(items)`
- `v.record(keySchema, valueSchema)`
- `v.union(a, b, ...rest)`
- `v.intersect(a, b, ...rest)`
- `v.variant(discriminator, map)`
- `v.lazy(getter)`
- `v.instanceof(ClassCtor)`

### Coercion Factories

- `v.coerce.string()`
- `v.coerce.number()`
- `v.coerce.boolean()`
- `v.coerce.date()`

## Schema

All schema classes inherit from `Schema<Output>`.

### Validation

```ts
parse(value: unknown): Output
safeParse(value: unknown): ParseResult<Output>
parseAsync(value: unknown): Promise<Output>
safeParseAsync(value: unknown): Promise<ParseResult<Output>>
```

- `parse()` throws `ValidationError` on failure.
- `safeParse()` never throws for validation failures.
- If async validators exist, `parse()` throws and you must use `parseAsync()` or `safeParseAsync()`.

`parse()` can throw either:

- `ValidationError` for validation failures
- `Error` when called on schemas that contain async validators

### Modifiers

```ts
optional(): Schema<Output | undefined>
nullable(): Schema<Output | null>
nullish(): Schema<Output | null | undefined>
required(): Schema<Exclude<Output, undefined>>
default(value: Output | (() => Output)): this
catch(fallback: Output | (() => Output)): this
```

- `default()` applies only when the input is `undefined`.
- `catch()` returns a fallback only for `ValidationError` failures.

### Custom Validation

```ts
refine(
  check: (value: Output) => boolean,
  message?: MessageFn<{ value: Output }>,
): this

refineAsync(
  check: (value: Output) => Promise<boolean>,
  message?: MessageFn<{ value: Output }>,
): this
```

- `refine()` is sync only.
- `refineAsync()` stores async checks used by `parseAsync()` and `safeParseAsync()`.

### Transform and Metadata

```ts
transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput>
preprocess(fn: (value: unknown) => unknown): this
describe(description: string): this
readonly description: string | undefined
brand<Brand extends string>(): Schema<Output & { __brand: Brand }>
is(value: unknown): value is Output
```

`preprocess()` steps run in declaration order.

## StringSchema

`v.string()` methods:

- `.min(length, message?)`
- `.max(length, message?)`
- `.length(exact, message?)`
- `.nonEmpty(message?)`
- `.startsWith(prefix, message?)`
- `.endsWith(suffix, message?)`
- `.includes(substr, message?)`
- `.regex(pattern, message?)`
- `.email(message?)`
- `.url(message?)`
- `.uuid(message?)`
- `.isoDate(message?)`
- `.isoDateTime(message?)`
- `.ip(message?)`
- `.trim()`
- `.lowercase()`
- `.uppercase()`

Notes:

- `email()` uses a pragmatic syntax-focused regex, not full SMTP validation.
- `ip()` accepts IPv4 and IPv6.

## NumberSchema

`v.number()` methods:

- `.min(min, message?)`
- `.max(max, message?)`
- `.int(message?)`
- `.positive(message?)`
- `.negative(message?)`
- `.nonNegative(message?)`
- `.nonPositive(message?)`
- `.multipleOf(step, message?)`
- `.safe(message?)`

`safe()` checks `Number.isSafeInteger(value)`.

## DateSchema

`v.date()` methods:

- `.min(date, message?)`
- `.max(date, message?)`

`v.coerce.date()` converts string or number inputs to `Date` before validation.

## ArraySchema

`v.array(schema)` methods:

- `.min(length, message?)`
- `.max(length, message?)`
- `.length(exact, message?)`
- `.nonEmpty(message?)`
- `.unique(message?)`

`unique()` uses JavaScript `Set` semantics.

## ObjectSchema

`v.object(shape)` methods:

- `.partial()`
- `.partial(...keys)`
- `.required()`
- `.extend(extraShape)`
- `.pick(...keys)`
- `.omit(...keys)`
- `.relaxed()`

Properties:

- `.shape` (readonly)

Behavior notes:

- `v.object(...)` rejects unknown keys by default.
- `.relaxed()` allows unknown keys and preserves them in output.

## TupleSchema

`v.tuple(items)` validates fixed-length arrays with per-index schemas.

- Input must be an array.
- Input length must match the tuple length exactly.

## RecordSchema

`v.record(keySchema, valueSchema)` validates object keys and values.

- The input must be a plain object.
- Keys are parsed as strings through `keySchema`.
- If the parsed key changes, the output uses the parsed key.

Example:

```ts
v.record(v.string().trim().lowercase(), v.string()).parse({ ' X-ID ': '1' });
// => { 'x-id': '1' }
```

## UnionSchema

`v.union(a, b, ...rest)`:

- accepts schema instances or raw literal values (`string | number | boolean | null | undefined`)
- returns the output of the first successful branch
- exposes `.schemas` (readonly normalized branch schemas)

## IntersectSchema

`v.intersect(a, b, ...rest)`:

- all branches must pass
- aggregates issues from failing branches
- merges object outputs from successful branches in order
- exposes `.schemas` (readonly)

## VariantSchema

`v.variant(discriminator, map)`:

- requires `map` values to be object schemas
- injects discriminator literals into each branch internally
- validates in O(1) by discriminator lookup
- inherits strict object behavior from each branch unless the branch schema uses `.relaxed()`

## Other Schemas

- `v.lazy(getter)` for recursive schemas
- `v.instanceof(Ctor)` for class instance checks
- `v.enum(values)` for string or number tuples
- `v.nativeEnum(enumObj)` for TS native enums
- `v.literal(value)` for exact value match
- `v.never()` always fails

## Global Messages

### `configure()`

```ts
configure({
  messages: {
    number: {
      min: ({ min }) => `Must be >= ${min}`,
    },
    string: {
      email: () => 'Invalid email',
      ip: () => 'Invalid IP address',
    },
  },
});
```

### `reset()`

```ts
reset();
```

### `Messages`

`Messages` is the full nested message contract used internally. `configure({ messages })` accepts a deep partial shape, so you can override only the keys you need.

## Types

### Infer, InferOutput, and TypeOf

```ts
type User = Infer<typeof UserSchema>;
type UserOut = InferOutput<typeof UserSchema>;
type UserOut2 = TypeOf<typeof UserSchema>;
```

All three extract schema output types.

### ParseResult

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
```

### MessageFn

```ts
type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);
```

### Issue

```ts
type Issue = {
  code: ErrorCode | (string & {});
  message: string;
  params?: Record<string, unknown>;
  path: (string | number)[];
};
```

## Errors

### ValidationError

- `.issues: Issue[]`
- `.flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] }`
- `.flattenFirst(): { fieldErrors: Record<string, string>; formErrors: string[] }`
- `ValidationError.is(value): value is ValidationError`

### ErrorCode

Built-in codes:

- `custom`
- `invalid_date`
- `invalid_enum`
- `invalid_length`
- `invalid_literal`
- `invalid_string`
- `invalid_type`
- `invalid_union`
- `invalid_url`
- `invalid_variant`
- `not_integer`
- `not_multiple_of`
- `not_safe`
- `not_unique`
- `too_big`
- `too_small`
- `unrecognized_keys`
