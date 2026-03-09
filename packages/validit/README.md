# @vielzeug/validit

> Composable, type-safe schema validation with full TypeScript inference

[![npm version](https://img.shields.io/npm/v/@vielzeug/validit)](https://www.npmjs.com/package/@vielzeug/validit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Validit** is a lightweight schema-validation library: define schemas with a fluent API, infer types automatically with `Infer<>`, and validate at runtime with structured error results — no external dependencies.

## Installation

```sh
pnpm add @vielzeug/validit
# npm install @vielzeug/validit
# yarn add @vielzeug/validit
```

## Quick Start

```typescript
import { v, type Infer } from '@vielzeug/validit';

const UserSchema = v.object({
  name:  v.string().min(1),
  email: v.string().email(),
  age:   v.number().min(18).optional(),
  role:  v.union('admin', 'user', 'guest'),
});

type User = Infer<typeof UserSchema>;

// Parse — throws ValidationError on failure
const user = UserSchema.parse(rawInput);

// Safe parse — never throws; returns a result object
const result = UserSchema.safeParse(rawInput);
if (result.success) {
  console.log(result.data); // typed as User
} else {
  console.log(result.error.issues); // [{ path, message, code }]
  const { fieldErrors, formErrors } = result.error.flatten();
}
```

## Features

- ✅ **Rich primitives** — `string`, `number`, `boolean`, `date`, `literal`, `unknown`, `never`
- ✅ **Composite types** — `object`, `array`, `tuple`, `record`, `union`, `intersect`, `variant`, `enum`
- ✅ **Schema modifiers** — `.optional()`, `.nullable()`, `.nullish()`, `.default(val)`, `.catch(fallback)`
- ✅ **String rules** — `.min()`, `.max()`, `.length()`, `.nonempty()`, `.startsWith()`, `.endsWith()`, `.includes()`, `.regex()`, `.email()`, `.url()`, `.uuid()`, `.date()`, `.datetime()`, `.trim()`, `.lowercase()`, `.uppercase()`
- ✅ **Number rules** — `.min()`, `.max()`, `.int()`, `.positive()`, `.negative()`, `.nonNegative()`, `.nonPositive()`, `.multipleOf()`
- ✅ **Object helpers** — `.partial()`, `.partial(...keys)`, `.required()`, `.pick()`, `.omit()`, `.extend()`, `.strip()`, `.passthrough()`, `.strict()`
- ✅ **Discriminated unions** — `v.variant(discriminator, { tag: schema })` with compile-time and runtime safety
- ✅ **Recursive schemas** — `v.lazy(() => schema)` for circular/self-referencing types
- ✅ **Class validation** — `v.instanceof(SomeClass)`
- ✅ **Coercion** — `v.coerce.string/number/boolean/date()` for form data and URL params
- ✅ **Sync validation** — `.refine(fn, message)` — message can be a string or `({ value }) => string`
- ✅ **Async validation** — `.refineAsync(fn, message)` + `parseAsync()` / `safeParseAsync()`
- ✅ **Error flattening** — `error.flatten()` returns `{ fieldErrors, formErrors }` for form UIs
- ✅ **Type utilities** — `Infer<T>`, `InferInput<T>`, `InferOutput<T>`, `MessageFn<Ctx>`
- ✅ **Type guard** — `.is(value)` narrows to the output type
- ✅ **Branded types** — `.brand<'MyBrand'>()`
- ✅ **Zero dependencies** — pure TypeScript, ~2 KB gzipped

## Usage

### Primitives

```typescript
import { v } from '@vielzeug/validit';

const name     = v.string().min(1).max(100).trim();
const age      = v.number().int().min(0).max(120);
const active   = v.boolean();
const joinedAt = v.date();
const status   = v.union('active', 'inactive', 'pending');
```

### Objects

```typescript
const AddressSchema = v.object({
  street: v.string(),
  city:   v.string(),
  zip:    v.string().regex(/^\d{5}$/),
});

const PersonSchema = v.object({
  name:    v.string().min(1),
  address: AddressSchema,
  phone:   v.string().optional(),
});

type Person = Infer<typeof PersonSchema>;
```

### Arrays and Tuples

```typescript
const TagsSchema  = v.array(v.string().nonempty()).nonempty();
const PointSchema = v.tuple([v.number(), v.number()] as const);
```

### Unions, Intersections, and Discriminated Unions

```typescript
// First-match union — raw literals accepted as shorthand for v.literal()
const IdSchema = v.union(v.string(), v.number());

// All branches must pass (intersection/mix-in)
const AdminSchema = v.intersect(UserSchema, v.object({ permissions: v.array(v.string()) }));

// Discriminated union — dictionary API, fast O(1) dispatch
const ResultSchema = v.variant('type', {
  ok:    v.object({ data: v.string() }),
  error: v.object({ message: v.string() }),
});
```

### Custom Validators

```typescript
// refine() — sync; message can be a string or a function receiving { value }
const PasswordSchema = v.string()
  .min(8)
  .refine(
    (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
    ({ value }) => `"${value}" must contain an uppercase letter and a digit`,
  );

// refineAsync() — explicit async refinement; requires parseAsync / safeParseAsync
const UniqueEmailSchema = v.string().email().refineAsync(
  async (email) => !(await db.users.exists({ email })),
  'Email already registered',
);
```

### Error Handling

```typescript
import { ValidationError } from '@vielzeug/validit';

const result = schema.safeParse(input);
if (!result.success) {
  // Flat map ready for form UIs
  const { fieldErrors, formErrors } = result.error.flatten();
  // fieldErrors: { email: ['Invalid email address'], ... }
  // formErrors:  ['Reserved username']

  // Or iterate raw issues
  result.error.issues.forEach(({ path, message, code }) => {
    console.log(path.join('.'), message, code);
  });
}
```

## API

| Export | Description |
|---|---|
| `v.string()` | String schema with chainable rules |
| `v.number()` | Number schema |
| `v.boolean()` | Boolean schema |
| `v.date()` | Date schema |
| `v.literal(val)` | Exact value schema |
| `v.enum(values)` | Enum schema from a `readonly` tuple of strings |
| `v.object(shape)` | Object schema |
| `v.array(item)` | Array schema |
| `v.tuple(items)` | Fixed-length tuple schema |
| `v.record(keySchema, valueSchema)` | Record/dictionary schema |
| `v.union(...schemas)` | First-match union (raw literals accepted as shorthand) |
| `v.intersect(...schemas)` | All schemas must pass (intersection) |
| `v.variant(discriminator, map)` | Discriminated union dispatched by a literal discriminator field |
| `v.lazy(getter)` | Deferred / recursive schema |
| `v.instanceof(cls)` | Class instance check |
| `v.never()` | Always fails |
| `v.any()` | Passes any value |
| `v.unknown()` | Passes any value (typed as `unknown`) |
| `v.null()` | Matches `null` |
| `v.undefined()` | Matches `undefined` |
| `v.coerce.string/number/boolean/date()` | Coercive schemas |
| `ValidationError` | Error class thrown by `parse()` and `parseAsync()` |
| `ErrorCode` | Const object of all error code strings |
| `Infer<T>` | Extract output TypeScript type from schema |
| `InferInput<T>` | Extract input TypeScript type from schema |
| `InferOutput<T>` | Alias for `Infer<T>` |
| `MessageFn<Ctx>` | `string \| ((ctx: Ctx) => string)` — message parameter type |

## Documentation

Full docs at **[vielzeug.dev/validit](https://vielzeug.dev/validit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/validit/usage) | Primitives, objects, modifiers |
| [API Reference](https://vielzeug.dev/validit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/validit/examples) | Real-world validation patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.

## Installation

```sh
pnpm add @vielzeug/validit
# npm install @vielzeug/validit
# yarn add @vielzeug/validit
```

## Quick Start

```typescript
import { v, type Infer } from '@vielzeug/validit';

const UserSchema = v.object({
  name:  v.string().min(1),
  email: v.string().email(),
  age:   v.number().min(18).optional(),
  role:  v.union('admin', 'user', 'guest'),
});

type User = Infer<typeof UserSchema>;

// Parse — throws ValidationError on failure
const user = UserSchema.parse(rawInput);

// Safe parse — never throws; returns a result object
const result = UserSchema.safeParse(rawInput);
if (result.success) {
  console.log(result.data); // typed as User
} else {
  console.log(result.error.issues); // [{ path, message, code }]
}
```

## Features

- ✅ **Rich primitives** — `string`, `number`, `boolean`, `date`, `literal`, `unknown`, `never`
- ✅ **Composite types** — `object`, `array`, `tuple`, `record`, `union`, `intersect`, `variant`, `enum`
- ✅ **Schema modifiers** — `.optional()`, `.nullable()`, `.default(val)`, `.catch(fallback)`
- ✅ **String rules** — `.min()`, `.max()`, `.length()`, `.nonempty()`, `.startsWith()`, `.endsWith()`, `.email()`, `.url()`, `.uuid()`, `.pattern()`, `.trim()`
- ✅ **Number rules** — `.min()`, `.max()`, `.int()`, `.positive()`, `.negative()`, `.nonNegative()`, `.nonPositive()`, `.multipleOf()`
- ✅ **Object helpers** — `.partial()`, `.required()`, `.pick()`, `.omit()`, `.extend()`, `.strip()`, `.passthrough()`, `.strict()`
- ✅ **Discriminated unions** — `v.variant(discriminator, schemas)` with compile-time and runtime safety
- ✅ **Recursive schemas** — `v.lazy(() => schema)` for circular/self-referencing types
- ✅ **Class validation** — `v.instanceof(SomeClass)`
- ✅ **Coercion** — `v.coerce.string/number/boolean/date()` for form data and URL params
- ✅ **Sync validation** — `.refine(fn)` for sync custom validators; throws at definition time if given an async function
- ✅ **Async validation** — `.refineAsync(fn)` + `parseAsync()` / `safeParseAsync()`
- ✅ **Type utilities** — `Infer<T>`, `InferInput<T>`, `InferOutput<T>`
- ✅ **Type guard** — `.is(value)` narrows to the output type
- ✅ **Branded types** — `.brand<'MyBrand'>()`
- ✅ **Zero dependencies** — pure TypeScript, ~2 KB gzipped

## Usage

### Primitives

```typescript
import { v } from '@vielzeug/validit';

const name     = v.string().min(1).max(100).trim();
const age      = v.number().int().min(0).max(120);
const active   = v.boolean();
const joinedAt = v.date();
const status   = v.union(v.literal('active'), v.literal('inactive'), v.literal('pending'));
```

### Objects

```typescript
const AddressSchema = v.object({
  street: v.string(),
  city:   v.string(),
  zip:    v.string().pattern(/^\d{5}$/),
});

const PersonSchema = v.object({
  name:    v.string().min(1),
  address: AddressSchema,
  phone:   v.string().optional(),
});

type Person = Infer<typeof PersonSchema>;
```

### Arrays and Tuples

```typescript
const TagsSchema  = v.array(v.string().nonempty()).nonempty();
const PointSchema = v.tuple([v.number(), v.number()] as const);
```

### Unions, Intersections, and Discriminated Unions

```typescript
// First-match union — tries each schema in order, returns first success
const IdSchema = v.union(v.string(), v.number());

// All branches must pass (intersection/mix-in)
const AdminSchema = v.intersect(UserSchema, v.object({ permissions: v.array(v.string()) }));

// Discriminated union — fast dispatch by a literal discriminator field
const ResultSchema = v.variant('type', [
  v.object({ type: v.literal('ok'),    data: v.string() }),
  v.object({ type: v.literal('error'), message: v.string() }),
]);
```

### Safe Parse vs. Parse

```typescript
// safeParse — never throws, returns { success, data?, error? }
const result = schema.safeParse(input);
if (!result.success) console.log(result.error.issues);

// parse — throws ValidationError on failure
const data = schema.parse(input);
```

### Custom Validators

```typescript
// refine() — sync only; throws at definition time if given an async function
const PasswordSchema = v.string()
  .min(8)
  .refine(
    (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
    'Password must contain an uppercase letter and a digit',
  );

// refineAsync() — explicit async refinement; requires parseAsync / safeParseAsync
const UniqueEmailSchema = v.string().email().refineAsync(async (email) => {
  return !(await db.users.exists({ email }));
}, 'Email already registered');
```

## API

| Export | Description |
|---|---|
| `v.string()` | String schema with chainable rules |
| `v.number()` | Number schema |
| `v.boolean()` | Boolean schema |
| `v.date()` | Date schema |
| `v.literal(val)` | Exact value schema |
| `v.enum(values)` | Enum schema from a `readonly` tuple of strings |
| `v.object(shape)` | Object schema |
| `v.array(item)` | Array schema |
| `v.tuple(items)` | Fixed-length tuple schema |
| `v.record(keySchema, valueSchema)` | Record/dictionary schema |
| `v.union(...schemas)` | First-match union (raw literals accepted as shorthand) |
| `v.intersect(...schemas)` | All schemas must pass (intersection) |
| `v.variant(discriminator, schemas)` | Discriminated union dispatched by a `v.literal()` field |
| `v.lazy(getter)` | Deferred / recursive schema |
| `v.instanceof(cls)` | Class instance check |
| `v.never()` | Always fails |
| `v.any()` | Passes any value |
| `v.unknown()` | Passes any value (typed as `unknown`) |
| `v.null()` | Matches `null` |
| `v.undefined()` | Matches `undefined` |
| `v.coerce.string/number/boolean/date()` | Coercive schemas |
| `ValidationError` | Error class thrown by `parse()` and `parseAsync()` |
| `ErrorCode` | Const object of all error code strings |
| `Infer<T>` | Extract output TypeScript type from schema |
| `InferInput<T>` | Extract input TypeScript type from schema |
| `InferOutput<T>` | Alias for `Infer<T>` |

## Documentation

Full docs at **[vielzeug.dev/validit](https://vielzeug.dev/validit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/validit/usage) | Primitives, objects, modifiers |
| [API Reference](https://vielzeug.dev/validit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/validit/examples) | Real-world validation patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
