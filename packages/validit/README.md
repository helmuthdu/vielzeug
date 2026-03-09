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
  email: v.email(),
  age:   v.number().min(18).optional(),
  role:  v.oneOf(v.literal('admin'), v.literal('user'), v.literal('guest')),
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
- ✅ **Composite types** — `object`, `array`, `oneOf`, `allOf`, `noneOf`
- ✅ **Schema modifiers** — `.optional()`, `.nullable()`, `.default(val)`
- ✅ **String rules** — `.min()`, `.max()`, `.length()`, `.nonempty()`, `.startsWith()`, `.endsWith()`, `.email()`, `.url()`, `.pattern()`, `.trim()`
- ✅ **Number rules** — `.min()`, `.max()`, `.int()`, `.positive()`, `.negative()`, `.multipleOf()`
- ✅ **Object helpers** — `.partial()`, `.required()`, `.pick()`, `.omit()`, `.extend()`, `.strip()`, `.passthrough()`, `.strict()`
- ✅ **Recursive schemas** — `v.lazy(() => schema)` for circular/self-referencing types
- ✅ **Class validation** — `v.instanceof(SomeClass)`
- ✅ **Coercion** — `v.coerce.string/number/boolean/date()` for form data and URL params
- ✅ **Async validation** — `parseAsync()` / `safeParseAsync()` for async refinements
- ✅ **Type inference** — `Infer<typeof schema>` gives the exact TypeScript type
- ✅ **Zero dependencies** — pure TypeScript, ~2 KB gzipped

## Usage

### Primitives

```typescript
import { v } from '@vielzeug/validit';

const name     = v.string().min(1).max(100).trim();
const age      = v.number().int().min(0).max(120);
const active   = v.boolean();
const joinedAt = v.date();
const status   = v.oneOf(v.literal('active'), v.literal('inactive'), v.literal('pending'));
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

### Arrays

```typescript
const TagsSchema = v.array(v.string().nonempty()).nonempty();
```

### Unions and Intersections

```typescript
// Exactly one branch must match (mutual exclusion)
const IdSchema = v.oneOf(v.string(), v.number());

// All branches must pass (intersection/mix-in)
const AdminSchema = v.allOf(UserSchema, v.object({ permissions: v.array(v.string()) }));
```

### Safe Parse vs. Parse

```typescript
// safeParse — never throws, returns { success, data?, errors? }
const result = schema.safeParse(input);
if (!result.success) console.log(result.error.issues);

// parse — throws ValidationError on failure
const data = schema.parse(input);
```

### Custom Validators

```typescript
const PasswordSchema = v.string()
  .min(8)
  .refine(
    (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
    'Password must contain an uppercase letter and a digit',
  );

// Async refinement — use parseAsync / safeParseAsync
const UniqueEmailSchema = v.email().refine(async (email) => {
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
| `v.object(shape)` | Object schema |
| `v.array(item)` | Array schema |
| `v.oneOf(...schemas)` | Exactly one schema must match |
| `v.noneOf(...schemas)` | Passes when value matches none of the schemas (blocklist) |
| `v.allOf(...schemas)` | All schemas must pass (intersection) |
| `v.lazy(getter)` | Deferred / recursive schema |
| `v.instanceof(cls)` | Class instance check |
| `v.never()` | Always fails |
| `v.coerce.string/number/boolean/date()` | Coercive schemas |
| `v.email()` | Shorthand for `v.string().email()` |
| `v.url()` | Shorthand for `v.string().url()` |
| `v.uuid()` | Shorthand for `v.string().uuid()` |
| `v.int()` | Shorthand for `v.number().int()` |
| `v.any()` | Passes any value |
| `v.unknown()` | Passes any value (typed as `unknown`) |
| `v.null()` | Matches `null` |
| `v.undefined()` | Matches `undefined` |
| `Infer<T>` | Extract TypeScript type from schema |
| `pipe(...schemas)` | Chain schemas in sequence |
| `ValidationError` | Error class thrown by `parse()` |

## Documentation

Full docs at **[vielzeug.dev/validit](https://vielzeug.dev/validit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/validit/usage) | Primitives, objects, modifiers |
| [API Reference](https://vielzeug.dev/validit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/validit/examples) | Real-world validation patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
