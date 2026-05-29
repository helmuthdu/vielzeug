---
title: Sieve — Usage Guide
description: Schema composition, parsing flows, strict object behavior, async refinements, and message customization in Sieve.
---

[[toc]]

## Basic Usage

```ts
import { s } from '@vielzeug/sieve';

const UserSchema = s.object({
  id: s.coerce.number().int().positive(),
  name: s.string().trim().min(1),
  email: s.string().trim().email(),
  age: s.number().int().min(18).optional(),
  newsletter: s.coerce.boolean().default(false),
});

const parsed = UserSchema.parse(input);

const result = UserSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.flattenFirst());
}
```

`parse()` is useful once you already control the boundary. At external boundaries, prefer `safeParse()` so validation failures stay in the result instead of becoming thrown exceptions.

## Schema Factories

`s` is the canonical factory namespace.

```ts
s.any();
s.unknown();
s.string();
s.number();
s.boolean();
s.date();
s.literal('active');
s.enum(['draft', 'published'] as const);
s.object({ id: s.number() });
s.array(s.string());
s.tuple([s.string(), s.number()]);
s.record(s.string(), s.number());
s.union(s.string(), s.number());
s.union('admin', 'editor', 'viewer');
s.intersect(s.object({ id: s.number() }), s.object({ createdAt: s.date() }));
s.variant('type', {
  ok: s.object({ data: s.string() }),
  error: s.object({ message: s.string() }),
});
s.lazy(() => s.object({ next: s.null() }));
s.instanceof(Date);
s.never();
s.null();
s.undefined();
```

Use `s.any()` when you want an unconstrained schema that only adds preprocess, check, transform, or branding behavior. Use `s.unknown()` when you want the same runtime behavior but keep the output type as `unknown` until later transforms or checks narrow it.

## Primitive Schemas

### Strings

```ts
s.string().min(3).max(40).nonEmpty();
s.string().email();
s.string().url();
s.string().uuid();
s.string().ulid();
s.string().cuid2();
s.string().jwt();
s.string().isoDate(); // YYYY-MM-DD
s.string().isoDateTime(); // ISO date-time
s.string().duration(); // ISO 8601 duration
s.string().ip(); // IPv4 or IPv6
s.string().startsWith('user_').endsWith('_id').includes('_');
s.string().regex(/^[a-z0-9_-]+$/i);
s.string().trim().lowercase(); // preprocess before validation
```

String preprocessors run before validation. That means `s.string().trim().email()` trims first, then validates the resulting value.

When multiple preprocessors are chained, they run in declaration order.

```ts
const Schema = s
  .string()
  .preprocess((value) => (typeof value === 'string' ? ` ${value} ` : value))
  .preprocess((value) => (typeof value === 'string' ? value.trim() : value));

Schema.parse('abc'); // 'abc'
```

### Numbers

```ts
s.number().int().min(0).max(100);
s.number().positive();
s.number().negative();
s.number().nonNegative();
s.number().nonPositive();
s.number().multipleOf(5);
s.number().safe();
s.number().finite();
```

`safe()` uses `Number.isSafeInteger()`, so it is intended for integer-like identifiers and counters rather than arbitrary floating-point values.

### Other Primitives

```ts
s.boolean();
s.coerce.boolean(); // true/false, 1/0, 'true'/'false', '1'/'0'
s.date().min(new Date('2024-01-01')).max(new Date());
s.coerce.date(); // string or number -> Date
s.bigint().positive();
s.coerce.bigint(); // number/string integer -> bigint
s.literal('active');
s.enum(['draft', 'published'] as const);
s.enum([200, 201, 204] as const);
```

## Objects, Arrays, Tuples, and Records

### Objects

```ts
const Profile = s.object({
  id: s.number().int().positive(),
  name: s.string().min(1),
  tags: s.array(s.string()).max(10),
  point: s.tuple([s.number(), s.number()] as const),
  meta: s.record(s.string(), s.string()).optional(),
});

// object() is strict by default (unknown keys fail)
const RelaxedProfile = Profile.relaxed(); // allow and preserve unknown keys
const StrictProfile = Profile.strict();   // explicitly re-enforce strict mode
```

`object()` is strict by default. Unknown keys produce an `invalid_keys` issue instead of being silently dropped.

Use `.relaxed()` when you want to allow and preserve unknown keys. Call `.strict()` to create a new strict schema from a relaxed one.

### Arrays

```ts
const TagsSchema = s.array(s.string().trim().min(1)).nonEmpty().unique();

TagsSchema.parse(['docs', 'typescript']);
```

`unique()` uses JavaScript `Set` semantics. Primitive values compare by value, but objects compare by reference.

### Tuples

```ts
const PointSchema = s.tuple([s.number(), s.number()] as const);
const HeadTailSchema = s.tuple([s.string()] as const).rest(s.number());

const point = PointSchema.parse([12, 48]);
// point: readonly [number, number]
```

### Records

```ts
const EnvSchema = s.record(s.string().regex(/^[A-Z_]+$/), s.string());

EnvSchema.parse({ API_URL: 'https://example.com', MODE: 'prod' });
```

Record key schemas validate the string property names. If the key schema transforms a key, the parsed output uses the transformed key.

```ts
const NormalizedHeaders = s.record(s.string().trim().lowercase(), s.string());

NormalizedHeaders.parse({ ' Content-Type ': 'application/json' });
// => { 'content-type': 'application/json' }
```

## Union, Intersect, and Variant

```ts
const Id = s.union(s.number(), s.string());
const Role = s.union('admin', 'editor', 'viewer');

const Timestamped = s.intersect(s.object({ id: s.number() }), s.object({ createdAt: s.date() }));

const ApiResult = s.variant('type', {
  ok: s.object({ data: s.string() }),
  error: s.object({ message: s.string() }),
});
```

`union()` and `intersect()` accept either schemas or raw literals. Raw literals are normalized to literal schemas internally.

## Parsing and Validation Flow

### `parse()` and `safeParse()`

```ts
import { ValidationError } from '@vielzeug/sieve';

try {
  UserSchema.parse(input);
} catch (error) {
  if (ValidationError.is(error)) {
    console.log(error.issues);
  }
}

const result = UserSchema.safeParse(input);
if (!result.success) {
  console.log(result.error.issues);
}
```

`parse()` throws only for validation failures and for misuse like calling `parse()` on a schema that contains async validators. `safeParse()` returns a discriminated union and never throws for validation failures.

### `parseAsync()` and `safeParseAsync()`

```ts
const UniqueEmail = s
  .string()
  .email()
  .checkAsync(async (value) => {
    const exists = await db.users.exists({ email: value });
    return !exists || 'Email already exists';
  });

await UniqueEmail.parseAsync('user@example.com');
await UniqueEmail.safeParseAsync('user@example.com');
```

If any schema in the tree uses `checkAsync()`, use the async parse methods. Calling `parse()` on such a schema throws immediately.

## Optional, Nullable, Default, and Catch

### `optional()`, `nullable()`, and `nullish()`

```ts
s.string().optional();
s.string().nullable();
s.string().nullish();
```

### `required()`, `default()`, and `catch()`

```ts
s.string().optional().required();
s.string().default('fallback');
s.number().catch(0);

s.object({
  name: s.string().optional(),
}).required();
```

`default()` applies only when the input is `undefined`. It does not replace `null` or other invalid values.

`catch()` returns a fallback when validation fails. It only catches `ValidationError`, not unrelated runtime errors.

## Transforms, Preprocess, and Branding

### `transform()`

```ts
const NormalizedEmail = s
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());
```

`transform()` returns a new base `Schema<NewOutput>`. Apply type-specific methods like `.email()` or `.min()` before the transform.

### `preprocess()`

```ts
const PaginationSchema = s
  .object({
    page: s.number().int().min(1),
    limit: s.number().int().min(1).max(100),
  })
  .preprocess((value) => {
    if (!value || typeof value !== 'object') return value;

    const input = value as Record<string, unknown>;

    return {
      ...input,
      limit: typeof input.limit === 'string' ? Number(input.limit) : input.limit,
      page: typeof input.page === 'string' ? Number(input.page) : input.page,
    };
  });
```

### `brand()` and `describe()`

```ts
// Setter: attach a human-readable description (returns same schema type)
const UserId = s.number().int().positive().brand<'UserId'>().describe('Positive numeric user identifier');

// Getter: return a typed SchemaDescriptor for introspection
const descriptor = s.string().min(3).email().describe();
// => { kind: 'string', minLength: 3, format: 'email' }
```

`brand()` is compile-time only. `describe(string)` stores a description on the schema instance and returns the same schema type. `describe()` with no arguments returns a `SchemaDescriptor` with the kind, constraints, and nested descriptors for this schema.

### `toJsonSchema()` and `walk()`

```ts
// JSON Schema 2020-12 output (memoized per schema instance)
const jsonSchema = s.object({ name: s.string().min(1), age: s.number().int().min(0) }).toJsonSchema();

// Walk the schema tree with a typed visitor
const fieldNames = s.object({ id: s.number(), name: s.string() }).walk({
  object: (_, fields) => Object.keys(fields),
  unknown: () => [],
});
```

## Async Validation

### `check()` — sync validation

`check()` has two forms:

**Predicate form** — pass a boolean-returning function plus an optional message:
```ts
const Password = s
  .string()
  .min(8)
  .check((v) => /[A-Z]/.test(v), 'Must include uppercase')
  .check((v) => /\d/.test(v), 'Must include a number');
```

**Context form** — single callback returning `void | boolean | string`; use for inline message or `ctx.addIssue()` for multi-issue or path-aware validation:
```ts
const Password = s
  .string()
  .min(8)
  .check((v) => /[A-Z]/.test(v) || 'Must include uppercase')
  .check((v) => /\d/.test(v) || 'Must include a number');
```

`check()` is **synchronous only**. Returning a `Promise` from `check()` throws at runtime. Use `checkAsync()` for async validators.

### `checkAsync()` — async validation

```ts
const Username = s
  .string()
  .min(3)
  .checkAsync(async (value) => {
    const taken = await db.users.exists({ username: value });

    return !taken || `${value} is not available`;
  });
```

Async validators receive the parsed value after preprocessors, defaults, and core schema validation.
Schemas with `checkAsync()` **must** be used with `parseAsync()` / `safeParseAsync()`.

### `ctx.addIssue()` for multi-issue validation

Use the context form with `ctx.addIssue()` when you need multiple issues or explicit path control:

```ts
const PasswordSchema = s
  .object({
    password: s.string().min(8),
    confirmPassword: s.string(),
  })
  .check(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Passwords must match',
        path: ['confirmPassword'],
      });
    }
  });
```

## Error Handling

```ts
const RegistrationSchema = s
  .object({
    password: s.string().min(8),
    confirmPassword: s.string(),
  })
  .check(({ password, confirmPassword }) => password === confirmPassword || 'Passwords must match');

const result = RegistrationSchema.safeParse(input);

if (!result.success) {
  for (const issue of result.error.issues) {
    console.log(issue.path.join('.'), issue.code, issue.message, issue.params);
  }

  const grouped = result.error.flatten();
  // grouped.fieldErrors: Array<{ path: (string|number)[]; messages: string[] }>
  // grouped.formErrors: string[]

  const firstOnly = result.error.flattenFirst();
  // firstOnly.fieldErrors: Array<{ path: (string|number)[]; message: string }>
  // firstOnly.formErrors: string[]

  const nested = result.error.format();
  // nested: { _errors: string[]; [field]: { _errors: string[] } }

  // Target a specific field path
  import { errorsAt } from '@vielzeug/sieve';
  const emailErrors = errorsAt(nested, 'email'); // string[]

  console.log(grouped.fieldErrors, grouped.formErrors);
  console.log(firstOnly.fieldErrors, firstOnly.formErrors);
  console.log(nested);
}
```

Cross-field object refinements usually land in `formErrors` because their issue path is empty.

For machine handling, prefer checking `issue.code` and `issue.params` over matching human-readable messages.

- `array.unique()` uses `invalid_unique`
- `number.safe()` uses `invalid_safe`
- `number.finite()` uses `invalid_finite`

## Message Customization

```ts
import { configure, reset } from '@vielzeug/sieve';

configure({
  messages: {
    array: {
      unique: () => 'Tags must be unique',
    },
    number: {
      min: ({ min }) => `Value must be at least ${min}`,
    },
    string: {
      email: () => 'Please enter a valid email address',
      ip: () => 'Use a valid IPv4 or IPv6 address',
    },
  },
});

reset();
```

`configure()` deep-merges the provided message groups with the defaults. `reset()` restores the built-in defaults.

## Type Inference

```ts
import { s, type Infer, type InferInput } from '@vielzeug/sieve';

const Schema = s.object({
  id: s.number(),
  email: s.string().email().optional(),
});

type Output = Infer<typeof Schema>;
type Input = InferInput<typeof Schema>;
```

`Infer` resolves to the parsed output type of the schema.

## Framework Integration

Sieve is a pure-utility library. Use it at data boundaries — form submission handlers, API response parsers, and URL query param validators.

::: code-group

```tsx [React]
import { s } from '@vielzeug/sieve';

const LoginSchema = s.object({
  email: s.string().email(),
  password: s.string().min(8),
});

type LoginValues = typeof LoginSchema extends { parse(x: unknown): infer T } ? T : never;

function LoginForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = LoginSchema.safeParse(data);
    if (!result.success) {
      console.error(result.error.issues);
      return;
    }
    await login(result.data);
  }
  return <form onSubmit={handleSubmit}>...</form>;
}
```

```ts [Vue 3]
import { reactive } from 'vue';
import { s } from '@vielzeug/sieve';

const ContactSchema = s.object({
  name: s.string().min(1),
  email: s.string().email(),
});

function useContactForm() {
  const errors = reactive<Record<string, string | undefined>>({});

  async function submit(values: unknown) {
    const result = ContactSchema.safeParse(values);
    if (!result.success) {
      for (const issue of result.error.issues) {
        errors[issue.path?.[0] ?? ''] = String(issue.message);
      }
      return;
    }
    await sendContact(result.data);
  }

  return { errors, submit };
}
```

```svelte [Svelte]
<script lang="ts">
  import { s } from '@vielzeug/sieve';

  const FormSchema = s.object({ name: s.string().min(1), email: s.string().email() });
  let errors: Record<string, string> = {};

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    const result = FormSchema.safeParse(data);
    if (!result.success) {
      errors = {};
      // map issues to field errors
      return;
    }
    await send(result.data);
  }
</script>

<form on:submit={handleSubmit}>...</form>
```

:::


### Pitfalls

- **React:** `new FormData(e.currentTarget)` only captures inputs with a `name` attribute — unnamed inputs are silently omitted from validation. Always name every form input.
- **Vue 3:** Deleting keys from a `reactive` object with `delete errors[k]` works for Vue's reactivity, but you must use `reactive` (not `ref`) for the error object to get per-key deletion tracking.
- **Svelte:** `$:` reactive statements that depend on `errors` re-run after every keystroke when validate is called on-input — debounce validation calls in high-frequency scenarios.

## Working with Other Vielzeug Libraries

### With Forge

Use `schemaValidator()` to share one schema between Forge validation and static typing.

```ts
import { createForm, schemaValidator } from '@vielzeug/forge';
import { s } from '@vielzeug/sieve';

const schema = s.object({
  email: s.string().email(),
  password: s.string().min(8),
});

const form = createForm({
  defaultValues: { email: '', password: '' },
  validator: schemaValidator(schema),
});
```

### With Courier

Validate API response payloads at the data boundary.

```ts
import { createApi } from '@vielzeug/courier';
import { s } from '@vielzeug/sieve';

const UserSchema = s.object({ id: s.number(), name: s.string(), email: s.string().email() });
const api = createApi({ baseUrl: 'https://api.example.com' });

async function getUser(id: number) {
  const raw = await api.get<unknown>(`/users/{id}`, { params: { id } });
  return UserSchema.parse(raw); // throws on unexpected shape
}
```

## Best Practices

- Reuse schema instances instead of rebuilding per call.
- Use `safeParse()` for user input boundaries.
- Use `parseAsync()` / `safeParseAsync()` whenever async refinements are present.
- Prefer message functions when the error needs dynamic values like `min`, `max`, or the offending input.
- Keep transforms at the end of schema chains.
- Treat `s.object(...)` as strict-by-default and use `.relaxed()` deliberately.
