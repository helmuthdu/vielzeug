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
import { v, Infer } from '@vielzeug/validit';

const UserSchema = v.object({
  name:  v.string().min(1),
  email: v.string().email(),
  age:   v.number().min(18).optional(),
  role:  v.enum(['admin', 'user', 'guest']),
});

type User = Infer<typeof UserSchema>;

const result = UserSchema.parse({ name: 'Alice', email: 'alice@example.com', role: 'admin' });

if (result.success) {
  console.log(result.data); // typed as User
} else {
  console.log(result.errors); // [{ path, message }]
}
```

## Features

- ✅ **Rich primitives** — `string`, `number`, `boolean`, `date`, `literal`, `enum`, `unknown`
- ✅ **Composite types** — `object`, `array`, `tuple`, `union`, `intersection`, `record`
- ✅ **Modifiers** — `.optional()`, `.nullable()`, `.default(val)`
- ✅ **String rules** — `.min()`, `.max()`, `.length()`, `.email()`, `.url()`, `.regex()`, `.trim()`
- ✅ **Number rules** — `.min()`, `.max()`, `.int()`, `.positive()`, `.negative()`
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
const status   = v.enum(['active', 'inactive', 'pending']);
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
const TagsSchema  = v.array(v.string().min(1));
const PointSchema = v.tuple([v.number(), v.number()]);
```

### Union and Intersection

```typescript
const IdSchema = v.union([v.string(), v.number()]);

const AdminSchema = v.intersection([UserSchema, v.object({ permissions: v.array(v.string()) })]);
```

### Safe Parse vs. Parse

```typescript
// safeParse — never throws, returns { success, data?, errors? }
const result = schema.safeParse(input);
if (!result.success) console.log(result.errors);

// parse — throws ValidationError on failure
const data = schema.parse(input);
```

### Custom Validators

```typescript
const PasswordSchema = v.string().refine(
  (val) => /[A-Z]/.test(val) && /[0-9]/.test(val),
  'Password must contain an uppercase letter and a digit'
);
```

## API

| Export | Description |
|---|---|
| `v.string()` | String schema with chainable rules |
| `v.number()` | Number schema |
| `v.boolean()` | Boolean schema |
| `v.date()` | Date schema |
| `v.literal(val)` | Exact value schema |
| `v.enum(values)` | Enum schema from string array |
| `v.object(shape)` | Object schema |
| `v.array(item)` | Array schema |
| `v.tuple(items)` | Fixed-length tuple schema |
| `v.union(schemas)` | Union (OR) schema |
| `v.intersection(schemas)` | Intersection (AND) schema |
| `v.record(key, value)` | Record/dictionary schema |
| `v.unknown()` | Passes any value |
| `Infer<T>` | Extract TypeScript type from schema |

## Documentation

Full docs at **[vielzeug.dev/validit](https://vielzeug.dev/validit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/validit/usage) | Primitives, objects, modifiers |
| [API Reference](https://vielzeug.dev/validit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/validit/examples) | Real-world validation patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
