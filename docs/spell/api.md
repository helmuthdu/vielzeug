---
title: 'Spell: API Reference'
description: Reference for Spell schema builders, schema methods, parsing, errors, parse contexts, definitions, and JSON Schema export.
---

[[toc]]

## API Overview

| Symbol                 | Purpose                                     | Execution mode                       | Common gotcha                                                   |
| ---------------------- | ------------------------------------------- | ------------------------------------ | --------------------------------------------------------------- |
| `s`                    | Creates schemas                             | Sync, or async when checks are async | `checkAsync()` anywhere in the tree requires `parseAsync()`     |
| `Schema`               | Base class of every schema                  | Sync or async                        | Modifiers return copies; schemas are never mutated              |
| `createParseContext()` | Creates request-local messages              | Sync                                 | Pass the context to each parse call                             |
| `joinIssuePath()`      | Flattens issue paths to UI keys             | Sync                                 | Empty or undefined paths join to `''`                           |
| `SpellValidationError` | Carries validation issues                   | Sync/async parse failures            | Use `safeParse()` for expected invalid data                     |
| `SpellDefinitionError` | Rejects non-portable or invalid definitions | Sync                                 | Thrown by `definition()` and object derivations, not by parsing |
| `ErrorCode`            | Issue code constants                        | n/a                                  | Narrow `Issue` on `code` to read typed `params`                 |
| `toJsonSchema()`       | Converts a definition to JSON Schema        | Sync                                 | Imported from `@vielzeug/spell/json`                            |

## Package Entry Point

| Import                       | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `@vielzeug/spell`            | Schema builders, base class, errors, types, and context |
| `@vielzeug/spell/json`       | `toJsonSchema()` and the `JsonSchema` type              |
| `@vielzeug/spell/predicates` | Standalone string format predicates                     |

```ts
import { createParseContext, s, type Infer } from '@vielzeug/spell';
import { toJsonSchema } from '@vielzeug/spell/json';
import { isEmail } from '@vielzeug/spell/predicates';
```

## Builders

All builders live under `s`.

| Builder                                        | Returns                               | Notes                                                 |
| ---------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `s.string()`                                   | `StringSchema`                        |                                                       |
| `s.number()`                                   | `NumberSchema`                        | Rejects `NaN`                                         |
| `s.bigint()`                                   | `BigIntSchema`                        |                                                       |
| `s.boolean()`                                  | `BooleanSchema`                       |                                                       |
| `s.date()`                                     | `DateSchema`                          | Rejects invalid dates with `invalid_date`             |
| `s.literal(value)`                             | `LiteralSchema<T>`                    | `string`, `number`, `boolean`, `null`, or `undefined` |
| `s.enum(values)`                               | `EnumSchema<T>`                       | Non-empty tuple of strings or numbers                 |
| `s.null()`, `s.undefined()`                    | `LiteralSchema<null \| undefined>`    |                                                       |
| `s.unknown()`                                  | `Schema<unknown>`                     | Accepts any value                                     |
| `s.never()`                                    | `NeverSchema`                         | Rejects every value                                   |
| `s.instanceof(cls)`                            | `InstanceOfSchema<T>`                 | Accepts abstract constructors                         |
| `s.array(item)`                                | `ArraySchema<T>`                      |                                                       |
| `s.tuple(items)`                               | `TupleSchema<T>`                      | Exact length unless `.rest()` is used                 |
| `s.set(item)`                                  | `SetSchema<T>`                        |                                                       |
| `s.map(key, value)`                            | `MapSchema<K, V>`                     |                                                       |
| `s.record(key, value)`                         | `RecordSchema<K, V>`                  | Drops unsafe keys (`__proto__`, `constructor`, …)     |
| `s.object(shape)`                              | `ObjectSchema<T>`                     | Strict by default                                     |
| `s.union(...schemas)`                          | `UnionSchema<T>`                      | At least two schemas; first match wins                |
| `s.intersect(...schemas)`                      | `IntersectSchema<T>`                  | At least two schemas; object outputs are deep-merged  |
| `s.discriminatedUnion(key, branches)`          | `DiscriminatedUnionSchema<K, M>`      | Branches are object schemas keyed by tag              |
| `s.lazy(getter)`                               | `LazySchema<Output, Input>`           | Recursive schemas                                     |
| `s.coerce.string/number/boolean/bigint/date()` | Primitive schema with `unknown` input | Coercion runs before the type check                   |

### `s.coerce`

| Builder              | Converts                                                  |
| -------------------- | --------------------------------------------------------- |
| `s.coerce.string()`  | Any non-nullish value with `String()`                     |
| `s.coerce.number()`  | Numeric strings and booleans with `Number()`              |
| `s.coerce.boolean()` | `'true'`/`'1'`/`1` and `'false'`/`'0'`/`0`                |
| `s.coerce.bigint()`  | Safe-integer numbers and integer strings up to 1000 chars |
| `s.coerce.date()`    | Strings and epoch milliseconds with `new Date()`          |

Values the coercer cannot convert reach the type check unchanged and fail with `invalid_type`.

## Schema Methods

Every schema extends `Schema<Output, Input>`.

### Parsing

```ts
parse(value: unknown, context?: ParseContext): Output;
safeParse(value: unknown, context?: ParseContext): ParseResult<Output>;
parseAsync(value: unknown, context?: ParseContext): Promise<Output>;
safeParseAsync(value: unknown, context?: ParseContext): Promise<ParseResult<Output>>;
is(value: unknown): value is Output;
assert(value: unknown, label?: string): asserts value is Output;
```

**Returns:** `parse()` returns the parsed output or throws `SpellValidationError`. `safeParse()` returns a `ParseResult`.

`parse()`, `safeParse()`, `is()`, and `assert()` are synchronous. If the schema or any nested schema has a `checkAsync()` step, they throw `SpellError` ("Schema contains async checks; use parseAsync() or safeParseAsync().") before running the async check. This is a usage error, not a validation issue, so `catch()` does not intercept it. `assert(value, label)` prefixes root-level messages with `label`.

**Example:**

```ts
import { s } from '@vielzeug/spell';

const result = s.string().email().safeParse('ada@example.com');

if (result.success) console.log(result.data);
```

### Checks

```ts
check(fn: (value: Output, ctx: CheckContext) => ValidateResult): this;
checkAsync(fn: (value: Output, ctx: CheckContext) => Promise<ValidateResult>): this;
```

**Returns:** A copy of the schema with the rule appended.

A check runs only when the structural type check passed. It returns `true`, `null`, or `undefined` to pass, a string to fail with that message, or `false` to fail with the default message. `ctx.addIssue({ code, message, params?, path? })` reports issues at paths relative to the schema. Passing an async function to `check()` is a type error.

**Example:**

```ts
const Signup = s.object({ confirm: s.string(), password: s.string() }).check((value, ctx) => {
  if (value.password !== value.confirm)
    ctx.addIssue({ code: 'custom', message: 'Passwords must match', path: ['confirm'] });
});
```

### Modifiers

| Method            | Returns                                           | Effect                                                                   |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------ |
| `optional()`      | `Schema<Output \| undefined, Input \| undefined>` | Accepts `undefined`                                                      |
| `nullable()`      | `Schema<Output \| null, Input \| null>`           | Accepts `null`                                                           |
| `nullish()`       | `Schema<Output \| null \| undefined, …>`          | Accepts `null` and `undefined`                                           |
| `required()`      | `Schema<Exclude<Output, undefined>, …>`           | Rejects `undefined` again; clears `optional()` and `default()`           |
| `default(value)`  | `this`                                            | Returns a fresh copy of `value` for `undefined`; a function is a factory |
| `catch(fallback)` | `this`                                            | Returns a fresh copy of `fallback` when validation fails                 |
| `transform(fn)`   | `Schema<Next, Input>`                             | Maps the value in chain order; skipped once an earlier step failed       |
| `preprocess(fn)`  | `this`                                            | Maps raw input before the type check                                     |
| `pipe(next)`      | `PipeSchema<this, Next>`                          | Parses with this schema, then feeds the output to `next`                 |
| `describe(text)`  | `this`                                            | Sets `description`, which `definition()` includes                        |

`optional()`, `nullable()`, `nullish()`, `required()`, and `transform()` change the value type, so they return a base `Schema`. Chain type-specific methods such as `.min()` or `.extend()` before them.

### Properties and definitions

| Member         | Type                                    | Description                                                      |
| -------------- | --------------------------------------- | ---------------------------------------------------------------- |
| `kind`         | `SchemaKind`                            | Schema kind, e.g. `'string'` or `'object'`                       |
| `description`  | `string \| undefined`                   | Text set with `describe()`                                       |
| `isOptional`   | `boolean`                               | `true` with `optional()`, `nullish()`, `default()`, or `catch()` |
| `isNullable`   | `boolean`                               | `true` with `nullable()` or `nullish()`                          |
| `'~standard'`  | `StandardSchemaV1.Props<Input, Output>` | Standard Schema v1 protocol                                      |
| `definition()` | `SchemaDescriptor`                      | Frozen declarative descriptor                                    |

`definition()` throws `SpellDefinitionError` when the schema, or a nested schema, has runtime-only behavior: `check()`, `checkAsync()`, `transform()`, `preprocess()` (including `s.coerce.*`, `trim()`, `lowercase()`, `uppercase()`), `default()`, `catch()`, or `array().unique({ by })`.

### Standard Schema

`schema['~standard'].validate(value)` returns a result synchronously unless the schema has async checks, in which case it returns a Promise. Successful results contain `value`; failures contain `{ message, path }` issues. A failed union stays one union issue.

```ts
const User = s.object({ name: s.string() });
const result = await User['~standard'].validate({ name: 'Ada' });
```

## String Schema

```ts
min(length: number, message?): this;
max(length: number, message?): this;
length(exact: number, message?): this;
nonEmpty(message?): this;
startsWith(prefix: string, message?): this;
endsWith(suffix: string, message?): this;
includes(substr: string, message?): this;
regex(pattern: RegExp, message?): this;
url(options?: { message?: MessageFn<{ value: string }>; protocols?: readonly string[] }): this;
nanoid(length?: number, message?): this;
trim(): this;
lowercase(): this;
uppercase(): this;
```

Format methods take an optional `message`: `email`, `url`, `uuid`, `isoDate`, `isoDateTime`, `time`, `duration`, `ip`, `cuid`, `cuid2`, `ulid`, `nanoid`, `base64`, `base64url`, `hex`, `hexColor`, `emoji`, `jwt`, `semver`, `slug`, `numeric`.

Format and pattern failures use code `invalid_format` with `params.format` set to the method name, such as `'email'`, `'isoDate'`, `'startsWith'`, or `'regex'`. `url()` accepts `http` and `https` unless `protocols` is given. `regex()` drops the stateful `g` and `y` flags. `trim()`, `lowercase()`, and `uppercase()` are ordered transforms: constraints chained after them see the normalized value.

## Number, BigInt, and Date Schemas

| Schema         | Methods                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `NumberSchema` | `min`, `max`, `positive`, `negative`, `nonNegative`, `nonPositive`, `int`, `safe`, `finite`, `multipleOf` |
| `BigIntSchema` | `min`, `max`, `positive`, `negative`, `nonNegative`, `nonPositive`, `multipleOf`                          |
| `DateSchema`   | `min(date)`, `max(date)`                                                                                  |

Each method takes an optional trailing `message`. `safe()` requires an integer within `Number.MIN_SAFE_INTEGER`…`Number.MAX_SAFE_INTEGER`.

## Collection Schemas

| Schema         | Methods and members                                    |
| -------------- | ------------------------------------------------------ |
| `ArraySchema`  | `min`, `max`, `length`, `nonEmpty`, `unique(options?)` |
| `TupleSchema`  | `items`, `rest(schema)`                                |
| `SetSchema`    | `min`, `max`, `size`, `nonEmpty`                       |
| `MapSchema`    | `min`, `max`, `size`, `nonEmpty`                       |
| `RecordSchema` | (none)                                                 |

```ts
unique(options?: { by?: (item: InferOutput<T>) => unknown; message?: MessageFn<{ value: unknown[] }> }): this;
```

`unique()` compares items with `Set` semantics, or compares the keys returned by `by`. A `by` selector makes `definition()` throw.

## Object Schema

```ts
readonly shape: T;
relaxed(): this;
strict(): this;
tolerate(...keys: string[]): this;
extend<U extends ObjectShape>(extra: U): ObjectSchema<Omit<T, keyof U> & U>;
pick<K extends keyof T & string>(...keys: K[]): ObjectSchema<Pick<T, K>>;
omit<K extends keyof T & string>(...keys: K[]): ObjectSchema<Omit<T, K>>;
partial(): ObjectSchema<{ [K in keyof T]: Optional<T[K]> }>;
partial<K extends keyof T & string>(...keys: K[]): ObjectSchema<Omit<T, K> & { [P in K]: Optional<T[P]> }>;
keyof(): EnumSchema<[keyof T & string, ...(keyof T & string)[]]>;
```

| Method       | Description                                                                  |
| ------------ | ---------------------------------------------------------------------------- |
| `strict()`   | Rejects unknown keys with one `invalid_keys` issue (default)                 |
| `relaxed()`  | Copies unknown keys to the output, skipping unsafe keys                      |
| `tolerate()` | Accepts and drops the named keys; other unknown keys follow the current mode |
| `extend()`   | Adds fields; same-named fields are replaced                                  |
| `pick()`     | Keeps the named fields                                                       |
| `omit()`     | Removes the named fields                                                     |
| `partial()`  | Makes all or the named fields optional                                       |
| `keyof()`    | Enum schema of the shape keys                                                |

`extend()`, `pick()`, `omit()`, and `partial()` keep the unknown-key mode, tolerated keys, description, and `optional`/`nullable` flags. They throw `SpellDefinitionError` when the object has checks, transforms, preprocessors, a default, or a catch, because those were written for the old shape.

Absent keys whose field returns `undefined` are left out of the output. Field defaults are written for absent keys.

## Composition Schemas

| Schema                     | Members                                     | Failure                                                               |
| -------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| `UnionSchema`              | `schemas`                                   | One `invalid_union` issue; `params.errors` holds each branch's issues |
| `IntersectSchema`          | `schemas`                                   | Issues from every failing branch                                      |
| `DiscriminatedUnionSchema` | `discriminator`, `branches` (`ReadonlyMap`) | `invalid_discriminator` for an unknown tag; branch issues otherwise   |
| `LazySchema`               | (none)                                      | Issues of the resolved schema                                         |
| `PipeSchema`               | `from`, `to`                                | Issues of the first failing stage                                     |

`s.discriminatedUnion(key, branches)` adds `key` as a literal of the branch tag when a branch omits it. It throws `SpellDefinitionError` when a branch is not an object schema or declares `key` with a different schema.

Intersections of object schemas need `.relaxed()` branches, because each strict branch rejects the other branch's keys.

## Parse Contexts

```ts
function createParseContext(messages?: DeepPartial<Messages>): ParseContext;
```

**Returns:** A frozen parse context with the built-in messages merged with the supplied overrides. Unsafe override keys such as `__proto__` are ignored with a development warning.

**Example:**

```ts
import { createParseContext, s } from '@vielzeug/spell';

const context = createParseContext({ object: { invalidKeys: () => 'Unsupported field' } });
const result = s.object({ email: s.string().email() }).safeParse({ email: 'ada@example.com', extra: true }, context);

if (!result.success) console.log(result.error.issues[0].message); // 'Unsupported field'
```

## JSON Schema

```ts
import { toJsonSchema, type JsonSchema } from '@vielzeug/spell/json';

function toJsonSchema(definition: SchemaDescriptor): JsonSchema;
```

**Returns:** A JSON Schema 2020-12 object.

| Definition                      | JSON Schema                                                         |
| ------------------------------- | ------------------------------------------------------------------- |
| `isoDate`, `isoDateTime`, `url` | `format: 'date'`, `'date-time'`, `'uri'`                            |
| `base64`, `base64url`           | `contentEncoding`                                                   |
| `ip`                            | `anyOf` of `ipv4` and `ipv6` formats                                |
| Several formats or patterns     | `allOf`                                                             |
| `bigint` bounds                 | Numeric bounds (may lose precision above `Number.MAX_SAFE_INTEGER`) |
| `date`, `instanceof`            | `$comment` only                                                     |
| `set`, `map`                    | Array with `uniqueItems`, object with `additionalProperties`        |
| `isNullable`                    | `anyOf` with `{ type: 'null' }`                                     |

**Example:**

```ts
import { s } from '@vielzeug/spell';
import { toJsonSchema } from '@vielzeug/spell/json';

const jsonSchema = toJsonSchema(s.object({ id: s.string().uuid() }).definition());
```

## Predicates

`@vielzeug/spell/predicates` exports the format tests used by `StringSchema`. Each takes a string and returns `boolean`.

`isBase64`, `isBase64url`, `isCuid`, `isCuid2`, `isDuration`, `isEmail`, `isEmoji`, `isHex`, `isHexColor`, `isIp`, `isIsoDate`, `isIsoDateTime`, `isJwt`, `isNanoid(value, length = 21)`, `isNumeric`, `isSemver`, `isSlug`, `isTime`, `isUlid`, `isUrl(value, protocols = ['http', 'https'])`, `isUuid`.

## Types

### Inference types

| Type                   | Resolves to                                     |
| ---------------------- | ----------------------------------------------- |
| `Infer<TSchema>`       | Parsed output; alias of `InferOutput<TSchema>`  |
| `InferInput<TSchema>`  | Input accepted before parsing or transformation |
| `InferOutput<TSchema>` | Value returned after parsing and transformation |
| `AnySchema`            | `Schema<unknown, unknown>`; any schema          |

Object input types make a field optional when its schema accepts a missing value (`optional()`, `nullish()`, `default()`, `catch()`). Use `AnySchema` as a generic constraint, and `Schema<T, unknown>` for a parameter that must parse to `T`.

### Parse result and issues

```ts
type ParseResult<T> = { data: T; success: true } | { error: SpellValidationError; success: false };

type Issue =
  | { code: 'custom'; message: string; params?: Record<string, unknown>; path: (string | number)[] }
  | { code: 'invalid_date'; message: string; params?: undefined; path: (string | number)[] }
  | {
      code: 'invalid_discriminator';
      message: string;
      params: { discriminator: string; expected: string[] };
      path: (string | number)[];
    }
  | { code: 'invalid_enum'; message: string; params: { values: readonly unknown[] }; path: (string | number)[] }
  | { code: 'invalid_finite'; message: string; params?: undefined; path: (string | number)[] }
  | {
      code: 'invalid_format';
      message: string;
      params: { format: string; includes?: string; pattern?: string; prefix?: string; suffix?: string };
      path: (string | number)[];
    }
  | { code: 'invalid_integer'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_keys'; message: string; params: { keys: string[] }; path: (string | number)[] }
  | { code: 'invalid_length'; message: string; params: { exact: number }; path: (string | number)[] }
  | { code: 'invalid_literal'; message: string; params: { expected: unknown }; path: (string | number)[] }
  | { code: 'invalid_multiple_of'; message: string; params: { step: number | bigint }; path: (string | number)[] }
  | { code: 'invalid_safe'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_type'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_union'; message: string; params: { errors: Issue[][] }; path: (string | number)[] }
  | { code: 'invalid_unique'; message: string; params?: undefined; path: (string | number)[] }
  | {
      code: 'too_big';
      message: string;
      params: { exclusive?: boolean; max: number | bigint | Date };
      path: (string | number)[];
    }
  | {
      code: 'too_small';
      message: string;
      params: { exclusive?: boolean; min: number | bigint | Date };
      path: (string | number)[];
    }
  | { code: string & {}; message: string; params?: Record<string, unknown>; path: (string | number)[] };
```

`ErrorCode` is a const object mapping each built-in code to its string literal.

### Validation contracts

```ts
type ParseContext = { readonly messages: Messages };

type CheckContext = {
  addIssue: (issue: {
    code: string;
    message: string;
    params?: Record<string, unknown>;
    path?: (string | number)[];
  }) => void;
};

type ValidateResult = boolean | null | undefined | string;

type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);

type DeepPartial<T> = { [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K] };
```

### Messages

`Messages` has one group per schema type. Each entry is a function of the constraint context.

```ts
type Messages = {
  array: { length; max; min; nonEmpty; type; unique };
  bigint: { max; min; multipleOf; negative; nonNegative; nonPositive; positive; type };
  boolean: { type };
  check: { default };
  date: { max; min; type };
  discriminatedUnion: { invalidDiscriminator: (ctx: { discriminator: string; expected: string[] }) => string; type };
  enum: { invalid: (ctx: { values: readonly unknown[] }) => string };
  instanceof: { type: (ctx: { className: string }) => string };
  literal: { expected: (ctx: { expected: unknown }) => string };
  map: { max; min; nonEmpty; size; type };
  never: { invalid };
  number: { finite; int; max; min; multipleOf; negative; nonNegative; nonPositive; positive; safe; type };
  object: { invalidKeys: (ctx: { keys: string[] }) => string; type };
  set: { max; min; nonEmpty; size; type };
  string: {
    base64;
    base64url;
    cuid;
    cuid2;
    duration;
    email;
    emoji;
    endsWith;
    hex;
    hexColor;
    includes;
    ip;
    isoDate;
    isoDateTime;
    jwt;
    length;
    max;
    min;
    nanoid;
    nonEmpty;
    numeric;
    regex;
    semver;
    slug;
    startsWith;
    time;
    type;
    ulid;
    url;
    uuid;
  };
  tuple: { length: (ctx: { exact: number }) => string; min: (ctx: { min: number }) => string; type };
  union: { invalid };
};
```

Constraint messages receive `value` plus the constraint's parameters, e.g. `string.min` receives `{ min, value }` and `string.includes` receives `{ substr, value }`.

### Descriptors

```ts
type PatternDescriptor = { readonly flags: string; readonly source: string };

type SchemaDescriptor = { description?: string; isNullable?: true; isOptional?: true } & (
  | { kind: 'unknown' | 'never' | 'boolean' | 'lazy' }
  | {
      kind: 'bigint';
      exclusiveMaximum?: bigint;
      exclusiveMinimum?: bigint;
      maximum?: bigint;
      minimum?: bigint;
      multipleOf?: bigint;
    }
  | {
      kind: 'number';
      exclusiveMaximum?: number;
      exclusiveMinimum?: number;
      finite?: true;
      integer?: true;
      maximum?: number;
      minimum?: number;
      multipleOf?: number;
    }
  | {
      kind: 'string';
      formats?: readonly string[];
      maxLength?: number;
      minLength?: number;
      patterns?: readonly PatternDescriptor[];
    }
  | { kind: 'date'; maximum?: string; minimum?: string }
  | { className: string; kind: 'instanceof' }
  | { kind: 'literal'; value: string | number | boolean | null | undefined }
  | { kind: 'enum'; values: readonly (string | number)[] }
  | { items: SchemaDescriptor; kind: 'array'; maxItems?: number; minItems?: number; uniqueItems?: true }
  | { items: readonly SchemaDescriptor[]; kind: 'tuple'; rest: SchemaDescriptor | null }
  | {
      fields: Readonly<Record<string, SchemaDescriptor>>;
      kind: 'object';
      strict: boolean;
      tolerated?: readonly string[];
    }
  | { key: SchemaDescriptor; kind: 'record'; value: SchemaDescriptor }
  | { items: SchemaDescriptor; kind: 'set'; maxSize?: number; minSize?: number }
  | { key: SchemaDescriptor; kind: 'map'; maxSize?: number; minSize?: number; value: SchemaDescriptor }
  | { branches: readonly SchemaDescriptor[]; kind: 'union' | 'intersect' }
  | { branches: Readonly<Record<string, SchemaDescriptor>>; discriminator: string; kind: 'discriminatedUnion' }
  | { from: SchemaDescriptor; kind: 'pipe'; to: SchemaDescriptor }
);

type SchemaKind = SchemaDescriptor['kind'];

type JsonSchema = Record<string, unknown>; // from '@vielzeug/spell/json'
```

Date bounds are ISO strings. `formats` lists format method names in chain order; `patterns` lists `regex()`, `startsWith()`, `endsWith()`, `includes()`, and `url()` protocol patterns.

### Standard Schema

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

namespace StandardSchemaV1 {
  interface Props<Input = unknown, Output = Input> {
    readonly types?: Types<Input, Output> | undefined;
    readonly validate: (value: unknown, options?: Options | undefined) => Result<Output> | Promise<Result<Output>>;
    readonly vendor: string;
    readonly version: 1;
  }
  type Result<Output> = { readonly issues: readonly Issue[] } | { readonly issues?: undefined; readonly value: Output };
  interface Options {
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }
  interface Issue {
    readonly message: string;
    readonly path?: readonly (PropertyKey | PathSegment)[] | undefined;
  }
  interface PathSegment {
    readonly key: PropertyKey;
  }
  interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }
  type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input'];
  type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output'];
}
```

### Error helpers

```ts
type FlatError = { messages: string[]; path: (string | number)[] };
type FlatErrorFirst = { message: string; path: (string | number)[] };

type IssuePathSegment = PropertyKey | { readonly key: PropertyKey };
type IssuePath = readonly IssuePathSegment[];

function joinIssuePath(path: IssuePath | undefined, separator?: string): string;
```

`joinIssuePath()` flattens a Spell or Standard Schema issue path into a UI key such as `'permissions.0.slug'`.

## Errors

| Class                  | Thrown when                                                                                | Members                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `SpellError`           | Base class; thrown directly when synchronous parsing meets an async check                  | `name`, `message`                                                       |
| `SpellValidationError` | `parse()`, `parseAsync()`, or `assert()` receives invalid input                            | `issues` (frozen), `flatten()`, `flattenFirst()`, `messagesAt(...path)` |
| `SpellDefinitionError` | `definition()` on a non-portable schema; invalid object derivation or discriminated branch | `name`, `message`                                                       |

`SpellValidationError.message` lists one `path: message [code]` line per issue; root issues use `value` as the path.

```ts
const result = s.object({ email: s.string().email() }).safeParse({ email: 'invalid' });

if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten();
  console.log(fieldErrors, formErrors);
}
```
