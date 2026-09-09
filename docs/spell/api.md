---
title: Spell — API Reference
description: Reference for Spell schema builders, parsing, errors, context, and tooling exports.
---

[[toc]]

## API Overview

| Symbol                   | Purpose                         | Execution mode                     | Common gotcha                              |
| ------------------------ | ------------------------------- | ---------------------------------- | ------------------------------------------ |
| `s`                      | Creates schemas                 | Sync or async, depending on checks | `checkAsync()` requires async parsing      |
| `createParseContext()`   | Creates request-local messages  | Sync                               | Pass the context to each parse call        |
| `SpellValidationError`   | Provides validation issues      | Sync/async parse failures          | Use `safeParse()` for expected invalid data |

## Package Entry Point

| Import                       | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `@vielzeug/spell`            | Schema builders, errors, types, and parse contexts |
| `@vielzeug/spell/json`       | Convert portable definitions to JSON Schema     |
| `@vielzeug/spell/predicates` | Standalone format and type predicates           |

```ts
import { createParseContext, s, type Infer } from '@vielzeug/spell';
import { fromDefinition } from '@vielzeug/spell/json';
import { isEmail } from '@vielzeug/spell/predicates';
```

## `s`

All builders live under `s`.

| Builder                                                           | Purpose                    |
| ----------------------------------------------------------------- | -------------------------- |
| `string`, `number`, `boolean`, `bigint`, `date`                   | Primitive values           |
| `literal`, `enum`, `null`, `undefined`, `unknown`, `never` | Exact and universal values |
| `array`, `tuple`, `set`, `map`, `record`, `object`                | Collections                |
| `union`, `intersect`, `discriminatedUnion`, `lazy`                | Composition                |
| `coerce.*`                                                        | Coercing primitive schemas |

```ts
const User = s.object({
  email: s.string().email(),
  id: s.string().uuid(),
  role: s.enum(['admin', 'member'] as const),
});

type User = Infer<typeof User>;
```

Object schemas reject unknown keys. Use `.relaxed()` to retain extras.

## Standard Schema interoperability

Every schema implements the dependency-free Standard Schema v1 structural protocol through `schema['~standard']`. Consumers that accept Standard Schema validators can use Spell schemas directly without an adapter.

```ts
const User = s.object({ name: s.string() });
const result = await User['~standard'].validate({ name: 'Ada' });
```

Successful results contain `value`; failures contain portable `{ message, path }` issues. Failed unions remain one stable union issue instead of selecting a branch heuristically.

The exported `StandardSchemaV1` interface mirrors the full v1 protocol, including `validate(value, options?)` and the `InferInput` and `InferOutput` namespace helpers.

## Parsing

Every schema provides:

```ts
schema.parse(value, context?);          // Output or SpellValidationError
schema.safeParse(value, context?);      // ParseResult<Output>
schema.parseAsync(value, context?);     // Promise<Output>
schema.safeParseAsync(value, context?); // Promise<ParseResult<Output>>
schema.is(value);                       // value is Output
schema.assert(value, label?);           // assertion
```

`parse()`, `safeParse()`, `is()`, and `assert()` are available on synchronous schemas. Calling `checkAsync()` returns an async-only schema, where TypeScript exposes only `parseAsync()` and `safeParseAsync()`. That async-only mode propagates through compositional schemas when a child is asynchronous.

## Custom Checks

`check()` is synchronous. `checkAsync()` is asynchronous. Do not return a Promise from `check()`.

```ts
const Signup = s.object({ confirm: s.string(), password: s.string() }).check((value, context) => {
  if (value.password !== value.confirm) {
    context.addIssue({ code: 'custom', message: 'Passwords must match', path: ['confirm'] });
  }
});

const AvailableEmail = s
  .string()
  .email()
  .checkAsync(async (value) => {
    return (await emailAvailable(value)) || 'Email is already registered';
  });
```

`CheckContext.addIssue()` takes `{ code, message, params?, path? }`. Paths are relative to current schema.

## Modifiers and Transforms

```ts
s.string().optional();
s.string().nullable();
s.string().nullish();
s.string().required();
s.string().default('guest');
s.string().catch('guest');
s.string()
  .trim()
  .transform((value) => value.toLowerCase());
s.string().pipe(s.string().slug());
s.string().label('User name');
```

`default()`, `catch()`, preprocessors, transforms, and checks are runtime behavior. They cannot become portable definitions.

## Definitions and JSON Schema

`definition()` is only for schemas containing declarative structure. It returns frozen data and throws `SpellDefinitionError` when runtime behavior is present.

```ts
import { s } from '@vielzeug/spell';
import { fromDefinition } from '@vielzeug/spell/json';

const Product = s.object({
  id: s.string().uuid(),
  name: s.string().min(1),
});

const definition = Product.definition();
const jsonSchema = fromDefinition(definition);
```

No implicit schema-to-JSON conversion exists. Make definition boundary explicit.

## Parse Contexts

`createParseContext()` creates immutable request-local validation messages.

```ts
function createParseContext(messages?: DeepPartial<Messages>): ParseContext;
```

**Returns:** A parse context with built-in messages merged with the supplied overrides.

```ts
import { createParseContext, s } from '@vielzeug/spell';

const context = createParseContext({
  object: { invalidKeys: () => 'Unsupported field' },
});

const result = s.object({ email: s.string().email() }).safeParse({ email: 'ada@example.com', extra: true }, context);

if (!result.success) {
  const messages = result.error.messagesAt('email');
  console.log(messages);
}
```

## Types

### Inference types

| Type | Resolves to |
| --- | --- |
| `Infer<TSchema>` | Parsed output; alias of `InferOutput<TSchema>` |
| `InferInput<TSchema>` | Input accepted before parsing or transformation |
| `InferOutput<TSchema>` | Value returned after parsing and transformation |

Composite schemas preserve child input types. Object input types make fields optional when their field schema accepts `undefined`.

### Standard Schema

```ts
interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': StandardSchemaV1.Props<Input, Output>;
}

namespace StandardSchemaV1 {
  interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown, options?: Options) => Result<Output> | Promise<Result<Output>>;
    readonly types?: Types<Input, Output>;
  }

  type Result<Output> = { readonly value: Output; readonly issues?: undefined } | { readonly issues: readonly Issue[] };
  interface Options { readonly libraryOptions?: Record<string, unknown> }
  interface Issue { readonly message: string; readonly path?: readonly (PropertyKey | PathSegment)[] }
  interface PathSegment { readonly key: PropertyKey }
  interface Types<Input = unknown, Output = Input> { readonly input: Input; readonly output: Output }
  type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input'];
  type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output'];
}
```

### Parse result and issues

```ts
type ParseResult<T> = { data: T; success: true } | { error: SpellValidationError; success: false };

type Issue =
  | { code: 'custom'; message: string; params?: Record<string, unknown>; path: (string | number)[] }
  | { code: 'invalid_base64'; message: string; params: { format: string }; path: (string | number)[] }
  | { code: 'invalid_date'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_duration'; message: string; params: { format: string }; path: (string | number)[] }
  | { code: 'invalid_enum'; message: string; params: { values: readonly unknown[] }; path: (string | number)[] }
  | { code: 'invalid_finite'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_integer'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_keys'; message: string; params: { keys: string[] }; path: (string | number)[] }
  | { code: 'invalid_length'; message: string; params: { exact: number }; path: (string | number)[] }
  | { code: 'invalid_literal'; message: string; params: { expected: unknown }; path: (string | number)[] }
  | { code: 'invalid_multiple_of'; message: string; params: { step: number | bigint }; path: (string | number)[] }
  | { code: 'invalid_safe'; message: string; params?: undefined; path: (string | number)[] }
  | {
      code: 'invalid_string';
      message: string;
      params: { format?: string; includes?: string; pattern?: string; prefix?: string; suffix?: string };
      path: (string | number)[];
    }
  | { code: 'invalid_type'; message: string; params?: undefined; path: (string | number)[] }
  | { code: 'invalid_union'; message: string; params: { errors: Issue[][] }; path: (string | number)[] }
  | { code: 'invalid_unique'; message: string; params: { unique: true }; path: (string | number)[] }
  | { code: 'invalid_url'; message: string; params: { format: string }; path: (string | number)[] }
  | {
      code: 'invalid_variant';
      message: string;
      params: { discriminator: string; expected: string[] };
      path: (string | number)[];
    }
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

`ErrorCode` is a const object mapping each issue code to its string literal.

### Validation contracts

```ts
type ParseContext = { messages: Messages };

type CheckContext = {
  addIssue: (issue: {
    code: string;
    message: string;
    params?: Record<string, unknown>;
    path?: (string | number)[];
  }) => void;
};

type ValidateResult = boolean | null | undefined | string;
```

### Messages

```ts
type MessageFn<Ctx extends Record<string, unknown> = Record<string, unknown>> = string | ((ctx: Ctx) => string);

type Messages = {
  array: { length: (ctx: { exact: number; value: unknown[] }) => string; max: (ctx: { max: number; value: unknown[] }) => string; min: (ctx: { min: number; value: unknown[] }) => string; nonEmpty: () => string; type: () => string; unique: () => string };
  bigint: { max: (ctx: { max: bigint; value: bigint }) => string; min: (ctx: { min: bigint; value: bigint }) => string; multipleOf: (ctx: { step: bigint; value: bigint }) => string; negative: () => string; nonNegative: () => string; nonPositive: () => string; positive: () => string; type: () => string };
  boolean: { type: () => string };
  check: { default: () => string };
  date: { max: (ctx: { max: Date; value: Date }) => string; min: (ctx: { min: Date; value: Date }) => string; type: () => string };
  enum: { invalid: (ctx: { values: readonly unknown[] }) => string };
  instanceof: { type: (ctx: { className: string }) => string };
  literal: { expected: (ctx: { expected: unknown }) => string };
  map: { max: (ctx: { max: number; value: Map<unknown, unknown> }) => string; min: (ctx: { min: number; value: Map<unknown, unknown> }) => string; nonEmpty: () => string; size: (ctx: { exact: number; value: Map<unknown, unknown> }) => string; type: () => string };
  never: { invalid: () => string };
  number: { finite: () => string; int: () => string; max: (ctx: { max: number; value: number }) => string; min: (ctx: { min: number; value: number }) => string; multipleOf: (ctx: { step: number; value: number }) => string; negative: () => string; nonNegative: () => string; nonPositive: () => string; positive: () => string; safe: () => string; type: () => string };
  object: { invalidKeys: (ctx: { keys: string[] }) => string; type: () => string };
  set: { max: (ctx: { max: number; value: Set<unknown> }) => string; min: (ctx: { min: number; value: Set<unknown> }) => string; nonEmpty: () => string; size: (ctx: { exact: number; value: Set<unknown> }) => string; type: () => string };
  string: { base64: () => string; base64url: () => string; cuid: () => string; cuid2: () => string; date: () => string; dateTime: () => string; duration: () => string; email: () => string; emoji: () => string; endsWith: (ctx: { suffix: string; value: string }) => string; hex: () => string; hexColor: () => string; includes: (ctx: { substr: string; value: string }) => string; ip: () => string; jwt: () => string; length: (ctx: { exact: number; value: string }) => string; max: (ctx: { max: number; value: string }) => string; min: (ctx: { min: number; value: string }) => string; nanoid: () => string; nonEmpty: () => string; numeric: () => string; regex: (ctx: { value: string }) => string; semver: () => string; slug: () => string; startsWith: (ctx: { prefix: string; value: string }) => string; time: () => string; type: () => string; ulid: () => string; url: () => string; uuid: () => string };
  tuple: { length: (ctx: { exact: number }) => string; min: (ctx: { min: number }) => string; type: () => string };
  union: { invalid: () => string };
  variant: { invalidDiscriminator: (ctx: { discriminator: string; expected: string[] }) => string; type: () => string };
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};
```

### Descriptor and JSON Schema

```ts
type SchemaDescriptor = BaseDescriptor &
  (
    | { kind: 'unknown' | 'never' | 'boolean' | 'bigint' | 'date' | 'lazy' }
    | { className: string; kind: 'instanceof' }
    | { contentEncoding?: string; format?: string; kind: 'string'; maxLength?: number; minLength?: number; pattern?: string | null }
    | { exclusiveMaximum?: number; exclusiveMinimum?: number; kind: 'number'; maximum?: number; minimum?: number; multipleOf?: number; typeHint?: 'integer' }
    | { kind: 'literal'; value: string | number | boolean | null | undefined }
    | { kind: 'enum'; values: readonly (string | number)[] }
    | { items: SchemaDescriptor; kind: 'array'; maxItems?: number; minItems?: number }
    | { items: SchemaDescriptor[]; kind: 'tuple'; rest: SchemaDescriptor | null }
    | { fields: Record<string, SchemaDescriptor>; kind: 'object'; strict: boolean }
    | { key: SchemaDescriptor; kind: 'record'; value: SchemaDescriptor }
    | { items: SchemaDescriptor; kind: 'set' }
    | { key: SchemaDescriptor; kind: 'map'; value: SchemaDescriptor }
    | { branches: SchemaDescriptor[]; kind: 'union' | 'intersect' }
    | { branches: Record<string, SchemaDescriptor>; discriminator: string; kind: 'variant' }
    | { from: SchemaDescriptor; kind: 'pipe'; to: SchemaDescriptor }
  );

type JsonSchema = Record<string, unknown>;
```

### Schema traversal

`SchemaWalker<R>` is the visitor type accepted by `schema.walk()`. Handlers are optional and correspond to schema kinds; composite handlers also receive their walked children. Use `unknown` as the fallback handler.

### Error helpers

```ts
type FlatError = { messages: string[]; path: (string | number)[] };
type FlatErrorFirst = { message: string; path: (string | number)[] };
```

## Errors

- `SpellError` — base class. Use `instanceof SpellError` for cross-boundary narrowing.
- `SpellValidationError` — validation failure with `issues`, `messagesAt()`, `flatten()`, and `flattenFirst()`.
- `SpellDefinitionError` — schema cannot create portable definition.

```ts
const result = s.object({ email: s.string().email() }).safeParse({ email: 'invalid' });

if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten();
  console.log(fieldErrors, formErrors);
}
```
