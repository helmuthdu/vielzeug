---
title: Spell — API Reference
description: Complete API reference for spell schema builders, helpers, validators, exported types, and errors.
---

[[toc]]

## API At a Glance

| Symbol                                              | Purpose                                                                       | Execution mode      | Common gotcha                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `s`                                                 | Namespace of all schema builders (`s.string()`, `s.object()`, etc.)           | Sync setup          | All builders are accessed via this single export.                   |
| `Schema.parse()` / `safeParse()`                    | Validate synchronously; `parse()` throws, `safeParse()` returns tagged result | Sync                | See `Schema` class section below.                                   |
| `s.coerce.*`                                        | Coerce string-like input before validation                                    | Sync setup          | Coercion changes the accepted input type, not only the output type. |
| `Schema.parseAsync()` / `safeParseAsync()`          | Validate including async `validate()` callbacks                               | Async               | Required when any nested rule uses an async `validate()` callback.  |
| `descriptorToJsonSchema()`                          | Convert descriptors to JSON Schema                                            | Sync setup          | Uses `toDescriptor()` output, not custom transforms.                |
| `setMessages()` / `setLogger()` / `resetMessages()` | Override validation messages and warning logger                               | Sync setup          | `setMessages()` replaces the active message set each call.          |
| `ValidationError`                                   | Inspect validation failures                                                   | Sync/async failures | `format()` returns nested objects, `flatten()` returns path arrays. |
| `prependIssuePath()`                                | Prefix a path segment to an array of issues                                   | Sync                | Use inside custom parsers that delegate to inner schemas.           |

## Package Entry Point

| Import path       | Format      | Notes                                                        |
| ----------------- | ----------- | ------------------------------------------------------------ |
| `@vielzeug/spell` | ESM and CJS | Public entry point for every export documented on this page. |

## Export Inventory

Use this table to scan every runtime export.

| Category                  | Exports                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classes                   | `Schema`, `PipeSchema`, `ValidationError`                                                                                                                                                                                                                                                                                        |
| Message and error helpers | `ErrorCode`, `errorsAt`, `fail`, `prependIssuePath`, `setMessages`, `setLogger`, `resetMessages`                                                                                                                                                                                                                                 |
| Descriptor helpers        | `descriptorToJsonSchema`                                                                                                                                                                                                                                                                                                         |
| Pure validators           | `hasMaxLength`, `hasMinLength`, `isArray`, `isBoolean`, `isDate`, `isInteger`, `isMultipleOf`, `isNegative`, `isNonNegative`, `isNullOrUndefined`, `isNumber`, `isPositive`, `isString`, `isInRange`                                                                                                                             |
| String format validators  | `isBase64`, `isBase64url`, `isCuid`, `isCuid2`, `isDuration`, `isEmail`, `isEmoji`, `isHex`, `isHexColor`, `isIp`, `isIsoDate`, `isIsoDateTime`, `isJwt`, `isNanoid`, `isNumeric`, `isSemver`, `isSlug`, `isTime`, `isUlid`, `isUrl`, `isUuid`                                                                                   |
| Namespace                 | `s`                                                                                                                                                                                                                                                                                                                              |
| Schema builders (via `s`) | `s.string()`, `s.number()`, `s.object()`, `s.array()`, `s.union()`, `s.variant()`, `s.coerce.*`, `s.enum()`, `s.tuple()`, `s.record()`, `s.map()`, `s.set()`, `s.lazy()`, `s.literal()`, `s.and()`, `s.or()`, `s.instanceof()`, `s.bigint()`, `s.boolean()`, `s.date()`, `s.null()`, `s.undefined()`, `s.unknown()`, `s.never()` |

## Factories and Namespace

### `s`

Use the namespace form when you want all builders behind one import.

```ts
const s: {
  and: typeof sAnd;
  any: typeof sAny;
  array: typeof sArray;
  bigint: typeof sBigint;
  boolean: typeof sBoolean;
  coerce: typeof sCoerce;
  date: typeof sDate;
  enum: typeof sEnum;
  instanceof: typeof sInstanceof;
  intersect: typeof sIntersect;
  lazy: typeof sLazy;
  literal: typeof sLiteral;
  map: typeof sMap;
  never: typeof sNever;
  null: typeof sNull;
  number: typeof sNumber;
  object: typeof sObject;
  or: typeof sOr;
  record: typeof sRecord;
  set: typeof sSet;
  string: typeof sString;
  tuple: typeof sTuple;
  undefined: typeof sUndefined;
  union: typeof sUnion;
  unknown: typeof sUnknown;
  variant: typeof sVariant;
};
```

**Returns:** A namespace object that exposes the same builders as the tree-shakeable `sXxx` exports.

Use the namespace when you want one import in application code.

```ts
import { s } from '@vielzeug/spell';

const Session = s.object({
  expiresAt: s.date(),
  token: s.string().min(1),
});
```

---

### Schema builders (via `s`)

All schema builders are accessed as methods on the `s` object — they are not individually importable. Access all builders through the `s` namespace:

```ts
import { s } from '@vielzeug/spell';

const Filter = s.union(
  s.object({ type: s.enum(['tag'] as const), value: s.array(s.string().min(1)) }),
  s.object({ type: s.enum(['owner'] as const), value: s.string().email() }),
);
```

Builder reference:

| Builder                 | Returns                    | Notes                                                                                                                                |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `s.any()`               | `Schema<any>`              | Accepts any value.                                                                                                                   |
| `s.unknown()`           | `Schema<unknown>`          | Accepts any value and keeps `unknown`.                                                                                               |
| `s.never()`             | `NeverSchema`              | Always fails.                                                                                                                        |
| `s.null()`              | `LiteralSchema<null>`      | Useful inside unions.                                                                                                                |
| `s.undefined()`         | `LiteralSchema<undefined>` | Useful inside unions.                                                                                                                |
| `s.string()`            | `StringSchema`             | String constraints and string format helpers.                                                                                        |
| `s.number()`            | `NumberSchema`             | Numeric range, integer, sign, and multiplicity helpers.                                                                              |
| `s.boolean()`           | `BooleanSchema`            | Boolean parsing and coercion helpers.                                                                                                |
| `s.bigint()`            | `BigIntSchema`             | Integer boundaries for `bigint`. Constraints are runtime-only — `toDescriptor()` warns and does not serialize `min()`, `max()`, etc. |
| `s.date()`              | `DateSchema`               | Date instance validation and range helpers.                                                                                          |
| `s.literal(value)`      | `LiteralSchema<T>`         | Exact primitive matching.                                                                                                            |
| `s.enum(values)`        | `EnumSchema<T>`            | Fixed string union from a readonly tuple.                                                                                            |
| `s.array(schema)`       | `ArraySchema<T>`           | Element validation plus min/max/length/nonEmpty.                                                                                     |
| `s.tuple(items)`        | `TupleSchema<T>`           | Fixed positions with typed output.                                                                                                   |
| `s.object(shape)`       | `ObjectSchema<T>`          | Strict object parsing by default.                                                                                                    |
| `s.record(key, val)`    | `RecordSchema<K, V>`       | String-keyed record validation.                                                                                                      |
| `s.set(schema)`         | `SetSchema<T>`             | Set size and element validation.                                                                                                     |
| `s.map(key, val)`       | `MapSchema<K, V>`          | Map entry validation.                                                                                                                |
| `s.union(...items)`     | `UnionSchema`              | First successful branch wins.                                                                                                        |
| `s.or(a, b)`            | `UnionSchema`              | Alias for `s.union()` with exactly two schemas.                                                                                      |
| `s.and(a, b)`           | `IntersectSchema`          | Alias for `s.intersect()` with two schemas.                                                                                          |
| `s.intersect(...items)` | `IntersectSchema`          | Merges compatible outputs deeply and safely.                                                                                         |
| `s.variant(key, map)`   | `VariantSchema`            | Discriminated object union. Async field validators on branch objects are silently skipped — use `s.object()` with `parseAsync()` directly if you need async branch-field rules. |
| `s.lazy(getter)`        | `LazySchema<T>`            | Recursive schema definitions.                                                                                                        |
| `s.instanceof(cls)`     | `InstanceOfSchema<T>`      | Runtime class instance checks.                                                                                                       |

---

### `s.coerce`

Use `s.coerce` when input arrives as strings or loosely typed values.

```ts
s.coerce: {
  bigint(): BigIntSchema;
  boolean(): BooleanSchema;
  date(): DateSchema;
  number(): NumberSchema;
  string(): StringSchema;
};
```

**Returns:** Coercing variants of the primitive schemas.

Use coercion at API and form boundaries, then keep the parsed output typed afterwards.

```ts
import { s } from '@vielzeug/spell';

const Page = s.coerce.number().int().positive().default(1);
const PublishedAt = s.coerce.date().nullable();
```

## Core Classes

### `Schema<Output, Input = Output>`

Use `Schema` when you need the shared methods that every schema instance exposes.

```ts
class Schema<Output = unknown, Input = Output> {
  parse(value: unknown): Output;
  safeParse(value: unknown): ParseResult<Output>;
  parseAsync(value: unknown): Promise<Output>;
  safeParseAsync(value: unknown): Promise<ParseResult<Output>>;
  validate(fn: (value: Output, ctx: CheckContext) => ValidateResult | Promise<ValidateResult>): this;
  refine(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this;
  optional(): WrapperSchema<this, 'optional'>;
  nullable(): WrapperSchema<this, 'nullable'>;
  nullish(): WrapperSchema<this, 'nullish'>;
  required(): Schema<Exclude<Output, undefined>, Exclude<Input, undefined>>;
  default(defaultValue: Output | (() => Output)): this;
  catch(fallback: Output | (() => Output)): this;
  transform<NewOutput>(fn: (value: Output) => NewOutput): Schema<NewOutput, Input>;
  preprocess(fn: (value: unknown) => unknown): this;
  pipe<B>(next: Schema<B, Output>): Schema<B, Input>;
  label(description: string): this;
  toDescriptor(): SchemaDescriptor;
  toJsonSchema(): JsonSchema;
  assert(value: unknown, label?: string): asserts value is Output;
  walk<R>(visitor: SchemaWalker<R>): R;
  equals(other: AnySchema): boolean;
  get description(): string | undefined;
  get isOptional(): boolean;
  get isNullable(): boolean;
  get kind(): string;
  is(value: unknown): value is Output;
}
```

**Returns:** Parsed values, schema wrappers, transformed schemas, or schema metadata depending on the method.

Use `Schema` methods to choose how validation failures should move through your code.

```ts
import { s } from '@vielzeug/spell';

const Username = s.string().trim().min(3).label('Username');

Username.assert('ada');
const descriptor = Username.toDescriptor();
const sameShape = Username.equals(s.string().trim().min(3).label('Username'));
console.log(descriptor.description, sameShape);
```

Use this table to decide which methods to call most often.

| Method family                                       | What it does                                                                                                                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parse*`                                            | Returns data or throws / returns an error object.                                                                                                                                  |
| `validate` / `refine`                               | Adds custom validation. `validate()` accepts sync or async callbacks and boolean/string shorthands. `refine()` is the predicate-only alias for boolean predicates.                 |
| `optional` / `nullable` / `nullish` / `required`    | Changes missing-value semantics.                                                                                                                                                   |
| `default` / `catch`                                 | Supplies fallback output on `undefined` or validation failure.                                                                                                                     |
| `transform` / `preprocess` / `pipe`                 | Converts input before or after validation.                                                                                                                                         |
| `label` / `description`                             | Adds a human-readable description that also appears in descriptors.                                                                                                                |
| `is(value)`                                         | Type-predicate guard. Returns `true` if `value` passes `safeParse()`.                                                                                                              |
| `kind`                                              | Read-only string identifier for this schema's type (e.g. `'string'`, `'object'`).                                                                                                  |
| `equals(other)`                                     | Structural equality check comparing shape, constraints, and annotations (not pre/postprocessors).                                                                                  |
| `toDescriptor` / `toJsonSchema` / `walk` / `equals` | Supports tooling and schema introspection. `toDescriptor()` emits a dev warning if the schema has preprocessors (e.g. `trim()`, `coerce`), since they cannot survive a round-trip. |

### `Schema.validate()`

Use `validate()` to add a custom synchronous or asynchronous rule to any schema.

```ts
validate(fn: (value: Output, ctx: CheckContext) => ValidateResult | Promise<ValidateResult>): this
```

**Parameters**

| Name | Type                                                                 | Notes                                                                                   |
| ---- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `fn` | `(value: Output, ctx: CheckContext) => ValidateResult \| Promise<…>` | Sync or async. Return `false` or a `string` to fail; `true`, `null`, or `void` to pass. |

**Returns:** `this` (fluent)

The callback receives the parsed `value` and a `ctx` object with `addIssue()`. All three of the following forms are equivalent:

```ts
import { s } from '@vielzeug/spell';

// Boolean shorthand
const EvenNumber = s.number().validate((n) => n % 2 === 0);

// String message shorthand (falsy condition || message)
const Email = s.string().validate((v) => v.includes('@') || 'Must be a valid email');

// Explicit ctx.addIssue() for multiple issues or custom codes
const Signup = s.object({ email: s.string(), username: s.string() }).validate((v, ctx) => {
  if (v.email === v.username) {
    ctx.addIssue({ code: 'custom', message: 'Email and username must differ', path: ['email'] });
  }
});
```

Async callbacks are awaited only in `parseAsync()` / `safeParseAsync()`. Passing an async callback to `validate()` and calling `parse()` synchronously silently skips the async rule. Use `parseAsync()` whenever any `validate()` callback may return a `Promise`.

---

### `Schema.refine()`

Use `refine()` as the predicate-only alias for boolean validation. Familiar for users coming from other schema libraries.

```ts
refine(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this
```

**Parameters**

| Name        | Type                           | Notes                                                          |
| ----------- | ------------------------------ | -------------------------------------------------------------- |
| `predicate` | `(value: Output) => boolean`   | Return `false` to fail.                                        |
| `message`   | `MessageFn<{ value: Output }>` | Optional. Static string or function that receives `{ value }`. |

**Returns:** `this` (fluent)

For context-based checks that call `ctx.addIssue()`, use `validate()` directly.

```ts
import { s } from '@vielzeug/spell';

const PositiveNumber = s.number().refine(
  (n) => n > 0,
  () => 'Must be positive',
);
PositiveNumber.parse(5); // 5
// PositiveNumber.parse(-1); // throws
```

---

### `ObjectSchema.merge()`

Use `merge()` to combine two object schemas into one. Fields from the right-hand schema override same-named fields from the left.

```ts
merge<U extends ObjectShape>(other: ObjectSchema<U>): ObjectSchema<T & U>
```

**Returns:** A new `ObjectSchema` whose shape is the left shape plus the right shape (right wins on conflict).

The merged schema inherits the **right-hand schema's strict/relaxed mode**. A strict right-hand schema produces a strict merge; a relaxed right-hand schema produces a relaxed merge.

```ts
import { s } from '@vielzeug/spell';

const Base = s.object({ id: s.string() });
const Extra = s.object({ name: s.string() }).relaxed();

const Merged = Base.merge(Extra);
Merged.parse({ extra: 'ok', id: '1', name: 'Ada' }); // relaxed — extra keys allowed
```

---

### `ObjectSchema.keyof()`

Use `keyof()` to get a union schema of the object's own string keys.

```ts
keyof(): UnionSchema<readonly [LiteralSchema<keyof T & string>, ...LiteralSchema<keyof T & string>[]]>
```

**Returns:** A `UnionSchema` whose output is the union of the object's literal key strings.

Use it when you need to validate that a string is one of the known keys of a schema.

```ts
import { s } from '@vielzeug/spell';

const Product = s.object({ id: s.string(), price: s.number() });
const ProductKey = Product.keyof();

ProductKey.parse('id'); // 'id'
ProductKey.parse('price'); // 'price'
// ProductKey.parse('name'); // throws
```

---

### `ObjectSchema.defaults()`

Returns a fully default-filled object by parsing `{}` against the schema. Every required field must have a `.default()` value set; fields without defaults cause a `ValidationError` to be thrown.

```ts
defaults(): InferObject<T>
```

**Returns:** The parsed object with all default values applied.

```ts
import { s } from '@vielzeug/spell';

const Config = s.object({
  host: s.string().default('localhost'),
  port: s.number().default(3000),
});

Config.defaults(); // { host: 'localhost', port: 3000 }
```

Use `.partial()` before `.defaults()` if all fields should be optional:

```ts
const schema = s.object({ name: s.string() }).partial();
schema.defaults(); // {}
```

---

### `PipeSchema<Output, Input = unknown>`

Use `pipe()` when one schema should feed another schema instead of a custom transform.

```ts
class PipeSchema<Output, Input = unknown> extends Schema<Output, Input> {
  readonly from: Schema<any, Input>;
  readonly to: Schema<Output, any>;
}
```

**Returns:** A schema that parses with `from`, then validates the result with `to`.

Use `pipe()` when the second step should reuse another schema's constraints and error messages.

```ts
import { s } from '@vielzeug/spell';

const Slug = s.string().trim().pipe(s.string().slug());
Slug.parse('release-notes');
```

## Descriptor and Helper Functions

### `descriptorToJsonSchema()`

Use `descriptorToJsonSchema()` when another tool expects JSON Schema instead of Spell descriptors.

```ts
descriptorToJsonSchema(descriptor: SchemaDescriptor): JsonSchema
```

**Parameters**

| Name         | Type               | Notes                                        |
| ------------ | ------------------ | -------------------------------------------- |
| `descriptor` | `SchemaDescriptor` | Any descriptor produced by `toDescriptor()`. |

**Returns:** `JsonSchema`

Use it to generate OpenAPI components, editor tooling, or external validation contracts.

```ts
import { descriptorToJsonSchema, s } from '@vielzeug/spell';

const schema = s.object({
  id: s.string().uuid(),
  total: s.number().nonNegative(),
});

const jsonSchema = descriptorToJsonSchema(schema.toDescriptor());
```

---

### `setMessages()`

Use `setMessages()` to override any subset of the global validation message catalog.

```ts
setMessages(messages: DeepPartial<Messages>): void
```

**Parameters**

| Name       | Type                    | Notes                                                                                  |
| ---------- | ----------------------- | -------------------------------------------------------------------------------------- |
| `messages` | `DeepPartial<Messages>` | Partial message overrides. Merged into the built-in defaults, not composed additively. |

**Returns:** `void`

Each `setMessages()` call replaces the active overrides. Call `resetMessages()` to restore the built-in defaults.

```ts
import { setMessages } from '@vielzeug/spell';

setMessages({
  string: {
    email: 'Use a valid work email address',
    min: ({ min }) => `Must be at least ${min} characters`,
  },
});
```

To integrate with `@vielzeug/lingua` (or any i18n library), call `setMessages()` from your locale change callback:

```ts
import { setMessages } from '@vielzeug/spell';

// spellMessages is your locale → DeepPartial<Messages> map
i18n.subscribe(() => setMessages(spellMessages[i18n.locale]));
```

---

### `setLogger()`

Use `setLogger()` to route or silence internal Spell development warnings.

```ts
setLogger(logger: Logger | null): void
```

**Parameters**

| Name     | Type             | Notes                                                    |
| -------- | ---------------- | -------------------------------------------------------- |
| `logger` | `Logger \| null` | Custom `(msg: string) => void` fn, or `null` to silence. |

**Returns:** `void`

Internal warnings include things like multiple `regex()` constraints on a single string schema. Pass `null` to silence them completely.

```ts
import { setLogger } from '@vielzeug/spell';

// Silence all internal warnings
setLogger(null);

// Redirect to your own logging infrastructure
setLogger((msg) => myLogger.warn(msg));
```

---

### `resetMessages()`

Use `resetMessages()` to restore the built-in message catalog and the default warning logger.

```ts
resetMessages(): void
```

**Returns:** `void`

Useful in tests to ensure each test starts from a clean global state.

```ts
import { resetMessages, setMessages } from '@vielzeug/spell';

setMessages({ string: { email: 'Custom message' } });
// ... run tests ...
resetMessages(); // restore defaults
```

---

### `fail()`

Use `fail()` inside custom validators when you need a typed issue array.

```ts
fail<C extends ErrorCode>(code: C, message: string, params: Extract<Issue, { code: C }>['params']): Issue[]
fail(code: string, message: string, params?: Record<string, unknown>): Issue[]
```

**Returns:** A one-item `Issue[]` array.

Use it to keep custom validators consistent with Spell's internal issue shape.

```ts
import { fail } from '@vielzeug/spell';

const issues = fail('custom', 'Expected a company email', { value: 'ada@example.com' });
```

---

### `prependIssuePath()`

Use `prependIssuePath()` to move nested issues under a parent field path.

```ts
prependIssuePath(issues: Issue[], prefix: string | number): Issue[]
```

**Returns:** A new issue array with the path prefix applied.

Use it when a custom parser delegates to another schema and wants nested paths to stay accurate.

```ts
import { fail, prependIssuePath } from '@vielzeug/spell';

const nested = prependIssuePath(fail('custom', 'Missing field'), 'profile');
```

---

### `errorsAt()`

Use `errorsAt()` to read nested messages from `ValidationError.format()` output.

```ts
errorsAt(formatted: FormattedErrors, ...path: (string | number)[]): string[]
```

**Returns:** A list of messages at the requested path.

Use it when UI code works with the nested `format()` result instead of flat arrays.

```ts
import { ValidationError, errorsAt, s } from '@vielzeug/spell';

const Schema = s.object({ profile: s.object({ name: s.string().min(2) }) });
const result = Schema.safeParse({ profile: { name: '' } });

if (!result.success && ValidationError.is(result.error)) {
  console.log(errorsAt(result.error.format(), 'profile', 'name'));
}
```

## Standalone Validators

### General validators

Use these helpers when you need a boolean check without allocating a schema.

```ts
hasMinLength(value: { length: number }, min: number): boolean
hasMaxLength(value: { length: number }, max: number): boolean
isArray(value: unknown): value is unknown[]
isBoolean(value: unknown): value is boolean
isDate(value: unknown): value is Date
isInteger(value: unknown): value is number
isMultipleOf(value: number, multipleOf: number): boolean
isNegative(value: number): boolean
isNonNegative(value: number): boolean
isNullOrUndefined(value: unknown): value is null | undefined
isNumber(value: unknown): value is number
isPositive(value: number): boolean
isString(value: unknown): value is string
isInRange(value: number, min: number, max: number): boolean
```

**Returns:** A boolean or a type predicate.

Use them in adapters, preprocessors, or guard clauses that do not need full schema errors.

```ts
import { hasMinLength, isInRange, isString } from '@vielzeug/spell';

const value: unknown = 'release';

if (isString(value) && hasMinLength(value, 3)) {
  console.log(isInRange(value.length, 3, 12));
}
```

---

### Format validators

Use these helpers when you need the same format checks outside a schema definition.

```ts
isBase64(value: string): boolean
isBase64url(value: string): boolean
isCuid(value: string): boolean
isCuid2(value: string): boolean
isDuration(value: string): boolean
isEmail(value: string): boolean
isEmoji(value: string): boolean
isHex(value: string): boolean
isHexColor(value: string): boolean
isIp(value: string): boolean
isIsoDate(value: string): boolean
isIsoDateTime(value: string): boolean
isJwt(value: string): boolean
isNanoid(value: string): boolean
isNumeric(value: string): boolean
isSemver(value: string): boolean
isSlug(value: string): boolean
isTime(value: string): boolean
isUlid(value: string): boolean
isUrl(value: string): boolean
isUuid(value: string): boolean
```

**Returns:** `boolean`

Use them to preflight input before building a schema or to reuse Spell's format logic in other utilities.

```ts
import { isEmail, isSlug, isUuid } from '@vielzeug/spell';

console.log(isEmail('ada@example.com'));
console.log(isSlug('release-notes'));
console.log(isUuid('550e8400-e29b-41d4-a716-446655440000'));
```

## Types

Use these exported types when Spell drives your public TypeScript API.

| Type                                                           | Purpose                                                                               |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `AnySchema`                                                    | Union of all schema instances. Useful for generic helpers.                            |
| `Infer<T>`                                                     | Output type alias for a schema instance.                                              |
| `InferInput<T>`                                                | Accepted input type for a schema instance.                                            |
| `InferOutput<T>`                                               | Explicit output type helper for a schema instance.                                    |
| `ParseResult<T>`                                               | Result union used by `safeParse()` and `safeParseAsync()`.                            |
| `ValidateFn`                                                   | Low-level validator function signature used by custom schema implementations.         |
| `CheckContext`                                                 | Context object passed to `validate()` callbacks for explicit issue emission.          |
| `ValidateResult`                                               | Allowed return type from `validate()` callbacks: `boolean \| string \| null \| void`. |
| `SchemaWalker<R>`                                              | Visitor interface used by `walk()`.                                                   |
| `OptionalSchema<T>` / `NullableSchema<T>` / `NullishSchema<T>` | Wrapper output aliases for common wrapper modes.                                      |
| `WrapperMode`                                                  | `'optional' \| 'nullable' \| 'nullish'`                                               |
| `SchemaDescriptor`                                             | Full serializable descriptor produced by `toDescriptor()`.                            |
| `JsonSchema`                                                   | JSON Schema output shape returned by `toJsonSchema()` and `descriptorToJsonSchema()`. |
| `ErrorCode`                                                    | String union derived from the `ErrorCode` constant. Useful for typed custom issues.   |
| `Issue`                                                        | Single validation issue object with `code`, `message`, `path`, and `params`.          |
| `MessageFn<Ctx>`                                               | Message callback signature for schema and locale overrides.                           |
| `Messages`                                                     | Full locale message catalog shape.                                                    |
| `DeepPartial<Messages>`                                        | Deep-optional version of `Messages`; accepted by `setMessages()`.                     |
| `Logger`                                                       | Warning logger signature used by `setLogger()`: `(msg: string) => void`.              |
| `FormattedErrors`                                              | Nested error object returned by `ValidationError.format()`.                           |
| `FlatError`                                                    | `{ path, messages }` entry returned by `flatten()`.                                   |
| `FlatErrorFirst`                                               | `{ path, message }` entry returned by `flattenFirst()`.                               |

## Errors

### `ValidationError`

Use `ValidationError` to inspect failures from throwing and safe parsing APIs.

```ts
class ValidationError extends Error {
  readonly issues: Issue[];
  constructor(issues: Issue[], cause?: unknown);
  static is(value: unknown): value is ValidationError;
  bestMatch(): Issue[] | null;
  flatten(): { fieldErrors: FlatError[]; formErrors: string[] };
  flattenFirst(): { fieldErrors: FlatErrorFirst[]; formErrors: string[] };
  format(): FormattedErrors;
}
```

**Returns:** Structured views over the underlying `issues` array.

Use the instance helpers to shape errors for logs, forms, or API responses.

```ts
import { ValidationError, s } from '@vielzeug/spell';

const Payload = s.object({ email: s.string().email() });
const result = Payload.safeParse({ email: 'invalid' });

if (!result.success && ValidationError.is(result.error)) {
  console.log(result.error.flatten());
}
```

`format()` guards unsafe path keys when building nested objects. You can safely hand its result to UI code without letting hostile keys write through the prototype chain. Path segments named `'_errors'` are automatically remapped to `'_errors_'` to avoid colliding with the reserved `_errors` field in each `FormattedErrors` node. Use `errorsAt()` with the same path to retrieve messages consistently.

> **Note:** `ValidationError.message` (the human-readable error string) may contain constraint parameter values such as string suffixes, pattern prefixes, or min/max bounds when those appear in your validation messages. For structured access to individual issue details, use `.issues` or the flattening helpers instead of serializing `.message` directly into API responses or logs.

---

### `ErrorCode`

Use `ErrorCode` when you need Spell's built-in code registry at runtime and the matching string union at type level.

```ts
const ErrorCode = {
  custom: 'custom',
  invalid_type: 'invalid_type',
  too_small: 'too_small',
  too_big: 'too_big',
  // ...other built-in codes
} as const;

type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
```

**Returns:** A frozen object of built-in codes and the matching exported string union type.

Use the constant to avoid typos in custom helpers and the type to keep issue handling exhaustive.

```ts
import { ErrorCode, fail } from '@vielzeug/spell';
import type { ErrorCode as SpellErrorCode } from '@vielzeug/spell';

const code: SpellErrorCode = ErrorCode.custom;
const issues = fail(ErrorCode.custom, 'Expected a string');
```
