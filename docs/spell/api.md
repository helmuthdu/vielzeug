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

| Type                              | Purpose                                                           |
| --------------------------------- | ----------------------------------------------------------------- |
| `Infer<T>` / `InferOutput<T>`     | Parsed output type                                                |
| `InferInput<T>`                   | Accepted input type, including async schemas                      |
| `InferSchemaMode<T>`              | `'sync'` or `'async'` parsing capability                          |
| `SchemaMode`                      | Mode union: `'sync'                                               | 'async'` |
| `AnySchema`                       | Structural schema surface for composition and custom integrations |
| `schemaMode`                      | Public symbol marking a schema's parsing capability               |
| `MergeSchemaModes<T>`             | Produces `'async'` when any constituent mode is async             |
| `ParseResult<T>`                  | Tagged safe-parse result                                          |
| `Issue`                           | Validation issue union                                            |
| `CheckContext` / `ValidateResult` | Custom check callback contracts                                   |
| `SchemaDescriptor`                | Frozen portable schema definition                                 |
| `JsonSchema`                      | JSON Schema object shape                                          |
| `Messages` / `DeepPartial<T>`     | Parse-context message overrides                                   |
| `SchemaWalker<R>`                 | Schema traversal visitor                                          |
