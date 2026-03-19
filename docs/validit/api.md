---
title: Validit — API Reference
description: Complete API reference for Validit schemas and methods.
---

# Validit API Reference

[[toc]]

## API At a Glance

| Symbol             | Purpose                                 | Execution mode | Common gotcha                                         |
| ------------------ | --------------------------------------- | -------------- | ----------------------------------------------------- |
| `v.object()`       | Create typed object schema definitions  | Sync           | Use strict/passthrough intentionally for unknown keys |
| `safeParse()`      | Validate unknown input without throwing | Sync           | Always branch on success before using parsed data     |
| `safeParseAsync()` | Validate async refinement pipelines     | Async          | Await result to capture async validation issues       |

## Package Exports

```ts
import {
  ErrorCode,
  Schema,
  ValidationError,
  any,
  configure,
  nullable,
  nullish,
  optional,
  preprocess,
  resolveMessage,
  unknown,
  v,
  type Infer,
  type InferOutput,
  type Issue,
  type MessageFn,
  type ParseResult,
  type Messages,
} from '@vielzeug/validit';
```

`@vielzeug/validit` also exports flat schema factories and schema classes from `./schemas` (for example: `string`, `number`, `object`, `array`, `union`, `variant`, `enumOf`, `nativeEnum`, `instanceOf`, `coerceString`).

## v Factory

### Primitive Factories

- `v.string()`
- `v.number()`
- `v.boolean()`
- `v.date()`
- `v.literal(value)`
- `v.enum(values)`
- `v.nativeEnum(enumObj)`
- `v.null()`
- `v.undefined()`
- `v.any()`
- `v.unknown()`
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

### Wrapper/Utility Factories

- `v.optional(schema)`
- `v.nullable(schema)`
- `v.nullish(schema)`
- `v.preprocess(fn, schema)`

### Coercion Factories

- `v.coerce.string()`
- `v.coerce.number()`
- `v.coerce.boolean()`
- `v.coerce.date()`

## Schema Base Methods

All schemas inherit from `Schema<Output>`.

### Validation

```ts
parse(value: unknown): Output
safeParse(value: unknown): ParseResult<Output>
parseAsync(value: unknown): Promise<Output>
safeParseAsync(value: unknown): Promise<ParseResult<Output>>
```

- `parse()` throws `ValidationError` on failure.
- `safeParse()` never throws for validation failures.
- If async validators exist, `parse()` throws and you must use `parseAsync()` / `safeParseAsync()`.

### Modifiers

```ts
optional(): Schema<Output | undefined>
nullable(): Schema<Output | null>
nullish(): Schema<Output | null | undefined>
required(): Schema<Exclude<Output, undefined>>
default(value: Output | (() => Output)): this
catch(fallback: Output | (() => Output)): this
```

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
brand<Brand extends string>(): Schema<Output & { __brand: Brand }>
is(value: unknown): value is Output
```

## StringSchema

`v.string()` methods:

- `.min(length, message?)`
- `.max(length, message?)`
- `.length(exact, message?)`
- `.nonempty(message?)`
- `.startsWith(prefix, message?)`
- `.endsWith(suffix, message?)`
- `.includes(substr, message?)`
- `.regex(pattern, message?)`
- `.email(message?)`
- `.url(message?)`
- `.uuid(message?)`
- `.date(message?)`
- `.datetime(message?)`
- `.trim()`
- `.lowercase()`
- `.uppercase()`

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

## DateSchema

`v.date()` methods:

- `.min(date, message?)`
- `.max(date, message?)`

## ArraySchema

`v.array(schema)` methods:

- `.min(length, message?)`
- `.max(length, message?)`
- `.length(exact, message?)`
- `.nonempty(message?)`

## ObjectSchema

`v.object(shape)` methods:

- `.partial()`
- `.partial(...keys)`
- `.required()`
- `.extend(extraShape)`
- `.pick(...keys)`
- `.omit(...keys)`
- `.strip()`
- `.passthrough()`
- `.strict()`

Properties:

- `.shape` (readonly)

## TupleSchema

`v.tuple(items)` validates fixed-length arrays with per-index schemas.

## RecordSchema

`v.record(keySchema, valueSchema)` validates object keys and values.

## Union and Intersection

### UnionSchema

`v.union(a, b, ...rest)`:

- accepts schema instances or raw literal values (`string | number | boolean | null | undefined`)
- returns the output of the first successful branch
- exposes `.schemas` (readonly normalized branch schemas)

### IntersectSchema

`v.intersect(a, b, ...rest)`:

- all branches must pass
- aggregates issues from failing branches
- exposes `.schemas` (readonly)

## VariantSchema

`v.variant(discriminator, map)`:

- requires `map` values to be object schemas
- injects discriminator literals into each branch internally
- validates in O(1) by discriminator lookup

## Other Schemas

- `v.lazy(getter)` for recursive schemas
- `v.instanceof(Ctor)` for class instance checks
- `v.enum(values)` for string tuple enums
- `v.nativeEnum(enumObj)` for TS native enums
- `v.literal(value)` for exact value match
- `v.never()` always fails

## Global Configuration

### configure

```ts
configure({
  messages: {
    string_email: () => 'Invalid email',
    number_min: ({ min }) => `Must be >= ${min}`,
  },
});
```

### Messages

`Messages` is the full message contract used internally. `configure({ messages })` accepts `Partial<Messages>`.

## Types

### Infer and InferOutput

```ts
type User = Infer<typeof UserSchema>;
type UserOut = InferOutput<typeof UserSchema>;
```

Both extract schema output types.

### ParseResult

```ts
type ParseResult<T> = { success: true; data: T } | { success: false; error: ValidationError };
```

### MessageFn

```ts
type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);
```

## Errors

### ValidationError

- `.issues: Issue[]`
- `.flatten(): { fieldErrors: Record<string, string[]>; formErrors: string[] }`
- `ValidationError.is(value): value is ValidationError`

### Issue

```ts
type Issue = {
  code: ErrorCode | (string & {});
  message: string;
  params?: Record<string, unknown>;
  path: (string | number)[];
};
```

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
- `too_big`
- `too_small`
- `unrecognized_keys`
