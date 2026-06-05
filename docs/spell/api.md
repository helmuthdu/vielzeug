---
title: Spell — API Reference
description: Complete API reference for spell schema builders, helpers, validators, exported types, and errors.
---

[[toc]]

## API At a Glance

| Symbol                                             | Purpose                                                                       | Execution mode      | Common gotcha                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------- |
| `s`                                                | Namespace of all schema builders (`s.string()`, `s.object()`, etc.)           | Sync setup          | All builders are accessed via this single export.                   |
| `Schema.parse()` / `safeParse()`                   | Validate synchronously; `parse()` throws, `safeParse()` returns tagged result | Sync                | See `Schema` class section below.                                   |
| `s.coerce.*`                                       | Coerce string-like input before validation                                    | Sync setup          | Coercion changes the accepted input type, not only the output type. |
| `Schema.parseAsync()` / `safeParseAsync()`         | Validate async refinements                                                    | Async               | Required when any nested rule uses `checkAsync()`.                  |
| `fromDescriptor()`                                 | Rebuild a schema from a reconstructible descriptor                            | Sync setup          | Only accepts reconstructible kinds.                                 |
| `descriptorToJsonSchema()`                         | Convert descriptors to JSON Schema                                            | Sync setup          | Uses `toDescriptor()` output, not custom transforms.                |
| `configure()` / `registerLocale()` / `useLocale()` | Override and switch validation messages                                       | Sync setup          | `configure()` composes with the active message set.                 |
| `ValidationError`                                  | Inspect validation failures                                                   | Sync/async failures | `format()` returns nested objects, `flatten()` returns path arrays. |

## Package Entry Point

| Import path       | Format      | Notes                                                        |
| ----------------- | ----------- | ------------------------------------------------------------ |
| `@vielzeug/spell` | ESM and CJS | Public entry point for every export documented on this page. |

## Export Inventory

Use this table to scan every runtime export.

| Category                  | Exports                                                                                                                                                                                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classes                   | `Schema`, `WrapperSchema`, `PipeSchema`, `ValidationError`                                                                                                                                                                                                                                                                       |
| Message and error helpers | `ErrorCode`, `errorsAt`, `fail`, `prependIssuePath`, `configure`, `currentLocale`, `registerLocale`, `reset`, `useLocale`                                                                                                                                                                                                        |
| Descriptor helpers        | `fromDescriptor`, `descriptorToJsonSchema`                                                                                                                                                                                                                                                                                       |
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

| Builder                 | Returns                    | Notes                                                   |
| ----------------------- | -------------------------- | ------------------------------------------------------- |
| `s.any()`               | `Schema<any>`              | Accepts any value.                                      |
| `s.unknown()`           | `Schema<unknown>`          | Accepts any value and keeps `unknown`.                  |
| `s.never()`             | `NeverSchema`              | Always fails.                                           |
| `s.null()`              | `LiteralSchema<null>`      | Useful inside unions.                                   |
| `s.undefined()`         | `LiteralSchema<undefined>` | Useful inside unions.                                   |
| `s.string()`            | `StringSchema`             | String constraints and string format helpers.           |
| `s.number()`            | `NumberSchema`             | Numeric range, integer, sign, and multiplicity helpers. |
| `s.boolean()`           | `BooleanSchema`            | Boolean parsing and coercion helpers.                   |
| `s.bigint()`            | `BigIntSchema`             | Integer boundaries for `bigint`.                        |
| `s.date()`              | `DateSchema`               | Date instance validation and range helpers.             |
| `s.literal(value)`      | `LiteralSchema<T>`         | Exact primitive matching.                               |
| `s.enum(values)`        | `EnumSchema<T>`            | Fixed string union from a readonly tuple.               |
| `s.array(schema)`       | `ArraySchema<T>`           | Element validation plus min/max/length/nonEmpty.        |
| `s.tuple(items)`        | `TupleSchema<T>`           | Fixed positions with typed output.                      |
| `s.object(shape)`       | `ObjectSchema<T>`          | Strict object parsing by default.                       |
| `s.record(key, val)`    | `RecordSchema<K, V>`       | String-keyed record validation.                         |
| `s.set(schema)`         | `SetSchema<T>`             | Set size and element validation.                        |
| `s.map(key, val)`       | `MapSchema<K, V>`          | Map entry validation.                                   |
| `s.union(...items)`     | `UnionSchema`              | First successful branch wins.                           |
| `s.or(a, b)`            | `UnionSchema`              | Alias for `s.union()` with exactly two schemas.         |
| `s.and(a, b)`           | `IntersectSchema`          | Alias for `s.intersect()` with two schemas.             |
| `s.intersect(...items)` | `IntersectSchema`          | Merges compatible outputs deeply and safely.            |
| `s.variant(key, map)`   | `VariantSchema`            | Discriminated object union.                             |
| `s.lazy(getter)`        | `LazySchema<T>`            | Recursive schema definitions.                           |
| `s.instanceof(cls)`     | `InstanceOfSchema<T>`      | Runtime class instance checks.                          |

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
  check(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this;
  check(fn: (value: Output, ctx: CheckContext) => Exclude<CheckFnResult, Promise<any>>): this;
  refine(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this;
  checkAsync(fn: (value: Output, ctx: CheckContext) => Promise<CheckFnResult>): this;
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

| Method family                                       | What it does                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `parse*`                                            | Returns data or throws / returns an error object.                                                         |
| `check*` / `refine`                                 | Adds synchronous or asynchronous custom validation. `refine()` is the predicate-only alias for `check()`. |
| `optional` / `nullable` / `nullish` / `required`    | Changes missing-value semantics.                                                                          |
| `default` / `catch`                                 | Supplies fallback output on `undefined` or validation failure.                                            |
| `transform` / `preprocess` / `pipe`                 | Converts input before or after validation.                                                                |
| `label` / `description`                             | Adds a human-readable description that also appears in descriptors.                                       |
| `toDescriptor` / `toJsonSchema` / `walk` / `equals` | Supports tooling and schema introspection.                                                                |

### `Schema.refine()`

Use `refine()` as the predicate-only alias for `check()`. Familiar for users coming from other schema libraries.

```ts
refine(predicate: (value: Output) => boolean, message?: MessageFn<{ value: Output }>): this
```

**Parameters**

| Name        | Type                           | Notes                                                          |
| ----------- | ------------------------------ | -------------------------------------------------------------- |
| `predicate` | `(value: Output) => boolean`   | Return `false` to fail.                                        |
| `message`   | `MessageFn<{ value: Output }>` | Optional. Static string or function that receives `{ value }`. |

**Returns:** `this` (fluent)

For context-based refinements that use `ctx.addIssue()`, use `check()` directly.

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

### `WrapperSchema<T, Mode>`

Use `WrapperSchema` when you inspect or type wrapper results directly.

```ts
class WrapperSchema<T extends AnySchema, Mode extends WrapperMode> extends Schema<
  WrapperOutput<T, Mode>,
  WrapperInput<T, Mode>
> {
  readonly inner: T;
  readonly mode: Mode;
  required(): Schema<Exclude<WrapperOutput<T, Mode>, undefined>, Exclude<WrapperInput<T, Mode>, undefined>>;
}
```

**Returns:** A schema that changes whether `undefined`, `null`, or both are accepted.

Use wrapper schemas to make optionality explicit without rebuilding the inner constraints.

```ts
import { s } from '@vielzeug/spell';

const Nickname = s.string().min(2).optional().default('guest').nullable();
const RequiredNickname = Nickname.required();

RequiredNickname.parse(null);
// RequiredNickname.parse(undefined); // throws
```

`required()` only removes `undefined`. A chain such as `.optional().nullable().required()` stays nullable.

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

## Descriptor, Locale, and Helper Functions

### `fromDescriptor()`

Use `fromDescriptor()` to rebuild a schema from a reconstructible descriptor.

```ts
fromDescriptor(descriptor: ReconstructibleSchemaDescriptor): AnySchema
```

**Parameters**

| Name         | Type                              | Notes                                                                        |
| ------------ | --------------------------------- | ---------------------------------------------------------------------------- |
| `descriptor` | `ReconstructibleSchemaDescriptor` | A descriptor produced by `toDescriptor()` for a reconstructible schema kind. |

**Returns:** `AnySchema`

Use it when descriptors travel through storage, code generation, or network boundaries.

```ts
import { fromDescriptor, s } from '@vielzeug/spell';

const descriptor = s
  .object({
    email: s.string().email(),
    age: s.number().positive(),
  })
  .toDescriptor();

const schema = fromDescriptor(descriptor);
schema.parse({ email: 'ada@example.com', age: 32 });
```

`fromDescriptor()` restores base fields such as `description`, `isOptional`, and `isNullable`. It also restores string annotations like `format`, `pattern`, and `contentEncoding`, object strictness, and number hints emitted by built-in helpers such as `.positive()`, `.negative()`, and `.multipleOf()`. It does not accept `variant`, `pipe`, `instanceof`, or `lazy` descriptors.

---

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

### `configure()`

Use `configure()` to override any subset of the global message catalog or the internal warning logger.

```ts
configure(opts: { logger?: Logger | null; messages?: DeepPartial<Messages> }): void
```

**Parameters**

| Name            | Type                    | Notes                                                                 |
| --------------- | ----------------------- | --------------------------------------------------------------------- |
| `opts.logger`   | `Logger \| null`        | Pass `null` to silence internal warnings.                             |
| `opts.messages` | `DeepPartial<Messages>` | Deep partial message overrides. Nested keys are merged, not replaced. |

**Returns:** `void`

Use repeated calls to compose message overrides in stages.

```ts
import { configure } from '@vielzeug/spell';

configure({
  messages: {
    string: {
      email: 'Use a valid email address',
    },
  },
});

configure({
  messages: {
    number: {
      min: ({ min }) => `Use ${min} or greater`,
    },
  },
});
```

Each `configure({ messages })` call merges into the currently active messages. It does not reset the message tree back to the defaults first.

---

### `registerLocale()`

Use `registerLocale()` to install a named locale pack before switching to it.

```ts
registerLocale(locale: string, messages: DeepPartial<Messages>): void
```

**Parameters**

| Name       | Type                    | Notes                                         |
| ---------- | ----------------------- | --------------------------------------------- |
| `locale`   | `string`                | Locale key such as `'en'` or `'de'`.          |
| `messages` | `DeepPartial<Messages>` | Full or partial message tree for that locale. |

**Returns:** `void`

Use locale registration during app startup.

```ts
import { registerLocale } from '@vielzeug/spell';

registerLocale('de', {
  string: {
    email: 'Bitte eine gültige E-Mail-Adresse eingeben',
  },
});
```

---

### `useLocale()`

Use `useLocale()` to switch the active message locale.

```ts
useLocale(locale: string): void
```

**Parameters**

| Name     | Type     | Notes                                                       |
| -------- | -------- | ----------------------------------------------------------- |
| `locale` | `string` | A locale key previously registered with `registerLocale()`. |

**Returns:** `void`

Use locale switching before parsing when the current request or user chooses the language.

```ts
import { useLocale } from '@vielzeug/spell';

useLocale('de');
```

---

### `currentLocale()`

Use `currentLocale()` to read the active locale key.

```ts
currentLocale(): string
```

**Returns:** The current locale key.

Use it when your UI and validation layer share locale state.

```ts
import { currentLocale } from '@vielzeug/spell';

console.log(currentLocale());
```

---

### `reset()`

Use `reset()` to restore the default logger, messages, and locale.

```ts
reset(): void
```

**Returns:** `void`

Use it in tests or isolated environments that need a clean global Spell state.

```ts
import { currentLocale, reset, useLocale } from '@vielzeug/spell';

useLocale('de');
reset();
console.log(currentLocale()); // 'en'
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

| Type                                                           | Purpose                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- | ----------- |
| `AnySchema`                                                    | Union of all schema instances. Useful for generic helpers.                                              |
| `Infer<T>`                                                     | Output type alias for a schema instance.                                                                |
| `InferInput<T>`                                                | Accepted input type for a schema instance.                                                              |
| `InferOutput<T>`                                               | Explicit output type helper for a schema instance.                                                      |
| `ParseResult<T>`                                               | Result union used by `safeParse()` and `safeParseAsync()`.                                              |
| `ValidateFn`                                                   | Low-level validator function signature used by custom schema implementations.                           |
| `CheckContext`                                                 | Context object for `check()` and `checkAsync()` issue emission.                                         |
| `CheckFnResult`                                                | Allowed return type from custom checks.                                                                 |
| `SchemaWalker<R>`                                              | Visitor interface used by `walk()`.                                                                     |
| `OptionalSchema<T>` / `NullableSchema<T>` / `NullishSchema<T>` | Wrapper output aliases for common wrapper modes.                                                        |
| `WrapperMode`                                                  | `'optional'                                                                                             | 'nullable' | 'nullish'`. |
| `SchemaDescriptor`                                             | Full serializable descriptor produced by `toDescriptor()`.                                              |
| `ReconstructibleSchemaDescriptor`                              | Descriptor subset accepted by `fromDescriptor()`. Excludes `variant`, `pipe`, `instanceof`, and `lazy`. |
| `JsonSchema`                                                   | JSON Schema output shape returned by `toJsonSchema()` and `descriptorToJsonSchema()`.                   |
| `ErrorCode`                                                    | String union derived from the `ErrorCode` constant. Useful for typed custom issues.                     |
| `Issue`                                                        | Single validation issue object with `code`, `message`, `path`, and `params`.                            |
| `MessageFn<Ctx>`                                               | Message callback signature for schema and locale overrides.                                             |
| `Messages`                                                     | Full locale message catalog shape.                                                                      |
| `DeepPartial<Messages>`                                        | Deep-optional version of `Messages`; accepted by `configure()` and `registerLocale()`.                  |
| `Logger`                                                       | Global warning logger signature used by `configure()`.                                                  |
| `FormattedErrors`                                              | Nested error object returned by `ValidationError.format()`.                                             |
| `FlatError`                                                    | `{ path, messages }` entry returned by `flatten()`.                                                     |
| `FlatErrorFirst`                                               | `{ path, message }` entry returned by `flattenFirst()`.                                                 |

## Errors

### `ValidationError`

Use `ValidationError` to inspect failures from throwing and safe parsing APIs.

```ts
class ValidationError extends Error {
  readonly issues: Issue[];
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

`format()` guards unsafe path keys when building nested objects. You can safely hand its result to UI code without letting hostile keys write through the prototype chain.

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
