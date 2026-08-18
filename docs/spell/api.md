---
title: Spell — API Reference
description: Reference for Spell schema builders, parsing, diagnostics, and tooling exports.
---

[[toc]]

## API Overview

| Symbol                  | Purpose                         | Execution mode                     | Common gotcha                                        |
| ----------------------- | ------------------------------- | ---------------------------------- | ---------------------------------------------------- |
| `s`                     | Creates schemas                 | Sync or async, depending on checks | `checkAsync()` requires async parsing                |
| `Schema` / `PipeSchema` | Base schema abstractions        | Sync or async                      | Use `Infer` rather than assuming input equals output |
| `diagnostics`           | Parse-context and error helpers | Sync                               | Context is per parse/request, not global             |
| `SpellValidationError`  | Validation failure details      | Sync/async parse failures          | Use `safeParse()` to handle it as a result           |

## Package Entry Point

| Import                       | Purpose                                         |
| ---------------------------- | ----------------------------------------------- |
| `@vielzeug/spell`            | Schema builders, errors, types, and diagnostics |
| `@vielzeug/spell/json`       | Convert portable definitions to JSON Schema     |
| `@vielzeug/spell/predicates` | Standalone format and type predicates           |

```ts
import { diagnostics, s, type Infer } from '@vielzeug/spell';
import { fromDefinition } from '@vielzeug/spell/json';
import { isEmail } from '@vielzeug/spell/predicates';
```

## `s`

All builders live under `s`.

| Builder                                                           | Purpose                    |
| ----------------------------------------------------------------- | -------------------------- |
| `string`, `number`, `boolean`, `bigint`, `date`                   | Primitive values           |
| `literal`, `enum`, `null`, `undefined`, `unknown`, `any`, `never` | Exact and universal values |
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

`parse()` and `safeParse()` are available on synchronous schemas. Calling `checkAsync()` returns an async-only schema, where TypeScript exposes only `parseAsync()` and `safeParseAsync()`. That async-only mode propagates through compositional schemas when a child is asynchronous.

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

## Diagnostics

`diagnostics` contains pure helpers and immutable parse-context creation.

```ts
import { diagnostics, s } from '@vielzeug/spell';

const context = diagnostics.createParseContext({
  object: { invalidKeys: () => 'Unsupported field' },
});

const result = s.object({ email: s.string().email() }).safeParse({ email: 'ada@example.com', extra: true }, context);

if (!result.success) {
  const messages = result.error.messagesAt('email');
  console.log(messages);
}
```

`diagnostics.fail(code, message, params?)` and `diagnostics.prependIssuePath(issues, segment)` support custom parser implementations.

## Errors

- `SpellError` — base class. Use `SpellError.is(error)` for cross-boundary narrowing.
- `SpellValidationError` — validation failure with `issues`, `bestMatch()`, `messagesAt()`, `flatten()`, and `flattenFirst()`.
- `SpellDefinitionError` — schema cannot create portable definition.

```ts
const result = s.object({ email: s.string().email() }).safeParse({ email: 'invalid' });

if (!result.success) {
  const { fieldErrors, formErrors } = result.error.flatten();
  console.log(fieldErrors, formErrors);
}
```

## Types

### Core schema types

```ts
type SchemaMode = 'async' | 'sync';

type AnySchema<Output = unknown, Input = Output, Mode extends SchemaMode = SchemaMode> = SchemaSurface<
  Output,
  Input,
  Mode
>;

type SchemaSurface<Output = unknown, Input = Output, Mode extends SchemaMode = SchemaMode> = {
  _parseFullAsync(value: unknown, ctx?: ParseContext): Promise<{ data: unknown; issues: Issue[] }>;
  _parseFullSync(value: unknown, ctx?: ParseContext): { data: unknown; issues: Issue[] };
  definition(): SchemaDescriptor;
  isOptional: boolean;
  optional(): SchemaSurface<Output | undefined, Input | undefined, Mode>;
  required(): SchemaSurface<Exclude<Output, undefined>, Exclude<Input, undefined>, Mode>;
  readonly [schemaInput]: Input;
  readonly [schemaMode]: Mode;
  readonly [schemaOutput]: Output;
  walk<R>(visitor: SchemaWalker<R>): R | null;
};
```

`schemaMode` is the public symbol marking a schema's parsing capability.

### Inference types

```ts
type InferOutput<T> =
  T extends Schema<infer Output, unknown, SchemaMode>
    ? Output
    : T extends { readonly [schemaOutput]: infer Output }
      ? Output
      : never;
type InferInput<T> = T extends { readonly [schemaInput]: infer Input } ? Input : unknown;
type Infer<T> = InferOutput<T>;
type InferSchemaMode<T> = T extends { readonly [schemaMode]: infer Mode extends SchemaMode } ? Mode : never;
type MergeSchemaModes<Modes extends SchemaMode> = 'async' extends Modes ? 'async' : 'sync';
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

type ValidateFn = (value: unknown, ctx?: ParseContext) => Issue[] | null | Promise<Issue[] | null>;

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
    | { kind: 'any' | 'unknown' | 'never' | 'boolean' | 'bigint' | 'date' | 'lazy' }
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

### Schema walker

```ts
type SchemaWalker<R> = {
  array?: <T extends AnySchema, Mode extends SchemaMode>(schema: ArraySchema<T, Mode>, item: R | null) => R;
  bigint?: <Input, Mode extends SchemaMode>(schema: BigIntSchema<Input, Mode>) => R;
  boolean?: <Input, Mode extends SchemaMode>(schema: BooleanSchema<Input, Mode>) => R;
  date?: <Input, Mode extends SchemaMode>(schema: DateSchema<Input, Mode>) => R;
  enum?: <T extends EnumValues, Mode extends SchemaMode>(schema: EnumSchema<T, Mode>) => R;
  instanceof?: <T, Mode extends SchemaMode>(schema: InstanceOfSchema<T, Mode>) => R;
  intersect?: <T extends readonly AnySchema[], Mode extends SchemaMode>(schema: IntersectSchema<T, Mode>, branches: (R | null)[]) => R;
  lazy?: <T, Input, Mode extends SchemaMode>(schema: LazySchema<T, Input, Mode>) => R;
  literal?: <T extends string | number | boolean | null | undefined, Mode extends SchemaMode>(schema: LiteralSchema<T, Mode>) => R;
  map?: <K extends AnySchema, V extends AnySchema, Mode extends SchemaMode>(schema: MapSchema<K, V, Mode>, key: R | null, value: R | null) => R;
  never?: <Mode extends SchemaMode>(schema: NeverSchema<Mode>) => R;
  number?: <Input, Mode extends SchemaMode>(schema: NumberSchema<Input, Mode>) => R;
  object?: <T extends ObjectShape, Mode extends SchemaMode>(schema: ObjectSchema<T, Mode>, fields: Record<string, R | null>) => R;
  pipe?: <To extends AnySchema, From extends AnySchema, Mode extends SchemaMode>(schema: PipeSchema<To, From, Mode>, from: R | null, to: R | null) => R;
  record?: <K extends AnySchema, V extends AnySchema, Mode extends SchemaMode>(schema: RecordSchema<K, V, Mode>, key: R | null, value: R | null) => R;
  set?: <T extends AnySchema, Mode extends SchemaMode>(schema: SetSchema<T, Mode>, item: R | null) => R;
  string?: <Input, Mode extends SchemaMode>(schema: StringSchema<Input, Mode>) => R;
  tuple?: <T extends TupleSchemas, Rest extends AnySchema | null, Mode extends SchemaMode>(schema: TupleSchema<T, Rest, Mode>, items: (R | null)[], rest: R | null) => R;
  union?: <T extends readonly AnySchema[], Mode extends SchemaMode>(schema: UnionSchema<T, Mode>, branches: (R | null)[]) => R;
  unknown?: (schema: AnySchema) => R;
  variant?: <K extends string, M extends Record<string, ObjectSchema<any, any>>, Mode extends SchemaMode>(schema: VariantSchema<K, M, Mode>, branches: Record<string, R | null>) => R;
};
```

### Error helpers

```ts
type FlatError = { messages: string[]; path: (string | number)[] };
type FlatErrorFirst = { message: string; path: (string | number)[] };
```
