---
title: Validit — Usage Guide
description: Schema composition, parsing flows, strict object behavior, async refinements, and message customization in Validit.
---

[[toc]]

## Basic Usage

```ts
import { flattenFirstErrors, v } from '@vielzeug/validit';

const UserSchema = v.object({
  id: v.coerce.number().int().positive(),
  name: v.string().trim().min(1),
  email: v.string().trim().email(),
  age: v.number().int().min(18).optional(),
  newsletter: v.coerce.boolean().default(false),
});

const parsed = UserSchema.parse(input);

const result = UserSchema.safeParse(input);
if (!result.success) {
  console.log(flattenFirstErrors(result.error));
}
```

`parse()` is useful once you already control the boundary. At external boundaries, prefer `safeParse()` so validation failures stay in the result instead of becoming thrown exceptions.

## Schema Factories

`v` is the canonical factory namespace.

```ts
v.any();
v.unknown();
v.string();
v.number();
v.boolean();
v.date();
v.literal('active');
v.enum(['draft', 'published'] as const);
v.nativeEnum(StatusEnum);
v.object({ id: v.number() });
v.array(v.string());
v.tuple([v.string(), v.number()] as const);
v.record(v.string(), v.number());
v.union(v.string(), v.number());
v.union('admin', 'editor', 'viewer');
v.intersect(v.object({ id: v.number() }), v.object({ createdAt: v.date() }));
v.variant('type', {
  ok: v.object({ data: v.string() }),
  error: v.object({ message: v.string() }),
});
v.lazy(() => v.object({ next: v.null() }));
v.instanceof(Date);
v.never();
v.null();
v.undefined();
```

Use `v.any()` when you want an unconstrained schema that only adds preprocess, check, transform, or branding behavior. Use `v.unknown()` when you want the same runtime behavior but keep the output type as `unknown` until later transforms or checks narrow it.

## Primitive Schemas

### Strings

```ts
v.string().min(3).max(40).nonEmpty();
v.string().email();
v.string().url();
v.string().uuid();
v.string().ulid();
v.string().cuid2();
v.string().jwt();
v.string().isoDate(); // YYYY-MM-DD
v.string().isoDateTime(); // ISO date-time
v.string().duration(); // ISO 8601 duration
v.string().ip(); // IPv4 or IPv6
v.string().startsWith('user_').endsWith('_id').includes('_');
v.string().regex(/^[a-z0-9_-]+$/i);
v.string().trim().lowercase(); // preprocess before validation
```

String preprocessors run before validation. That means `v.string().trim().email()` trims first, then validates the resulting value.

When multiple preprocessors are chained, they run in declaration order.

```ts
const Schema = v
  .string()
  .preprocess((value) => (typeof value === 'string' ? ` ${value} ` : value))
  .preprocess((value) => (typeof value === 'string' ? value.trim() : value));

Schema.parse('abc'); // 'abc'
```

### Numbers

```ts
v.number().int().min(0).max(100);
v.number().positive();
v.number().negative();
v.number().nonNegative();
v.number().nonPositive();
v.number().multipleOf(5);
v.number().safe();
v.number().finite();
```

`safe()` uses `Number.isSafeInteger()`, so it is intended for integer-like identifiers and counters rather than arbitrary floating-point values.

### Other Primitives

```ts
v.boolean();
v.coerce.boolean(); // true/false, 1/0, 'true'/'false', '1'/'0'
v.date().min(new Date('2024-01-01')).max(new Date());
v.coerce.date(); // string or number -> Date
v.bigint().positive();
v.coerce.bigint(); // number/string integer -> bigint
v.literal('active');
v.enum(['draft', 'published'] as const);
v.enum([200, 201, 204] as const);
v.nativeEnum(StatusEnum);
```

## Objects, Arrays, Tuples, and Records

### Objects

```ts
const Profile = v.object({
  id: v.number().int().positive(),
  name: v.string().min(1),
  tags: v.array(v.string()).max(10),
  point: v.tuple([v.number(), v.number()] as const),
  meta: v.record(v.string(), v.string()).optional(),
});

// object() is strict by default (unknown keys fail)
const RelaxedProfile = Profile.relaxed();
const StrippedProfile = Profile.strip();
```

`object()` is strict by default. Unknown keys produce an `unrecognized_keys` issue instead of being silently dropped.

Use `.strip()` when you want to ignore unknown keys, and `.relaxed()` when you want to preserve unknown keys.

### Arrays

```ts
const TagsSchema = v.array(v.string().trim().min(1)).nonEmpty().unique();

TagsSchema.parse(['docs', 'typescript']);
```

`unique()` uses JavaScript `Set` semantics. Primitive values compare by value, but objects compare by reference.

### Tuples

```ts
const PointSchema = v.tuple([v.number(), v.number()] as const);
const HeadTailSchema = v.tuple([v.string()] as const).rest(v.number());

const point = PointSchema.parse([12, 48]);
// point: readonly [number, number]
```

### Records

```ts
const EnvSchema = v.record(v.string().regex(/^[A-Z_]+$/), v.string());

EnvSchema.parse({ API_URL: 'https://example.com', MODE: 'prod' });
```

Record key schemas validate the string property names. If the key schema transforms a key, the parsed output uses the transformed key.

```ts
const NormalizedHeaders = v.record(v.string().trim().lowercase(), v.string());

NormalizedHeaders.parse({ ' Content-Type ': 'application/json' });
// => { 'content-type': 'application/json' }
```

## Union, Intersect, and Variant

```ts
const Id = v.union(v.number(), v.string());
const Role = v.union('admin', 'editor', 'viewer');

const Timestamped = v.intersect(v.object({ id: v.number() }), v.object({ createdAt: v.date() }));

const ApiResult = v.variant('type', {
  ok: v.object({ data: v.string() }),
  error: v.object({ message: v.string() }),
});
```

`union()` and `intersect()` accept either schemas or raw literals. Raw literals are normalized to literal schemas internally.

## Parsing and Validation Flow

### `parse()` and `safeParse()`

```ts
import { ValidationError } from '@vielzeug/validit';

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
const UniqueEmail = v
  .string()
  .email()
  .check(async (value) => {
    const exists = await db.users.exists({ email: value });
    return !exists;
  }, 'Email already exists');

await UniqueEmail.parseAsync('user@example.com');
await UniqueEmail.safeParseAsync('user@example.com');
```

If any branch of a schema uses async `check()`, use the async parse methods all the way through. Calling `parse()` on such a schema throws an error telling you to switch to `parseAsync()` or `safeParseAsync()`.

## Optional, Nullable, Default, and Catch

### `optional()`, `nullable()`, and `nullish()`

```ts
v.string().optional();
v.string().nullable();
v.string().nullish();
```

### `required()`, `default()`, and `catch()`

```ts
v.string().optional().required();
v.string().default('fallback');
v.number().catch(0);

v.object({
  name: v.string().optional(),
}).required();
```

`default()` applies only when the input is `undefined`. It does not replace `null` or other invalid values.

`catch()` returns a fallback when validation fails. It only catches `ValidationError`, not unrelated runtime errors.

## Transforms, Preprocess, and Branding

### `transform()`

```ts
const NormalizedEmail = v
  .string()
  .trim()
  .email()
  .transform((value) => value.toLowerCase());
```

`transform()` returns a new base `Schema<NewOutput>`. Apply type-specific methods like `.email()` or `.min()` before the transform.

### `preprocess()`

```ts
const PaginationSchema = v
  .object({
    page: v.number().int().min(1),
    limit: v.number().int().min(1).max(100),
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
const UserId = v.number().int().positive().brand<'UserId'>().describe('Positive numeric user identifier');
```

`brand()` is compile-time only. `describe()` stores a string on the schema instance for tooling or documentation.

## Async Validation

### `check()`

```ts
const Password = v
  .string()
  .min(8)
  .check((value) => /[A-Z]/.test(value), 'Must include uppercase')
  .check((value) => /\d/.test(value), 'Must include a number');
```

### `check()` with async validation

```ts
const Username = v
  .string()
  .min(3)
  .check(
    async (value) => {
      const taken = await db.users.exists({ username: value });
      return !taken;
    },
    ({ value }) => `${value} is not available`,
  );
```

Sync and async checks both receive the parsed value after preprocessors, defaults, and core schema validation.

### `ctx.addIssue()` for multi-issue validation

```ts
const PasswordSchema = v
  .object({
    password: v.string().min(8),
    confirmPassword: v.string(),
  })
  .check(({ password, confirmPassword }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: ErrorCode.custom,
        message: 'Passwords must match',
        path: ['confirmPassword'],
      });
    }
  });
```

Use `ctx.addIssue()` when you need multiple issues or explicit issue paths/codes.

## Error Handling

```ts
const RegistrationSchema = v
  .object({
    password: v.string().min(8),
    confirmPassword: v.string(),
  })
  .check(({ password, confirmPassword }) => password === confirmPassword, 'Passwords must match');

const result = RegistrationSchema.safeParse(input);

if (!result.success) {
  for (const issue of result.error.issues) {
    console.log(issue.path.join('.'), issue.code, issue.message, issue.params);
  }

  const grouped = result.error.flatten();
  const firstOnly = flattenFirstErrors(result.error);
  const nested = result.error.format();

  console.log(grouped.fieldErrors, grouped.formErrors);
  console.log(firstOnly.fieldErrors, firstOnly.formErrors);
  console.log(nested);
}
```

Cross-field object refinements usually land in `formErrors` because their issue path is empty.

For machine handling, prefer checking `issue.code` and `issue.params` over matching human-readable messages.

- `array.unique()` uses `not_unique`
- `number.safe()` uses `not_safe`
- `number.finite()` uses `not_finite`

## Message Customization

```ts
import { configure, reset } from '@vielzeug/validit';

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
import { v, type Infer, type InferInput } from '@vielzeug/validit';

const Schema = v.object({
  id: v.number(),
  email: v.string().email().optional(),
});

type Output = Infer<typeof Schema>;
type Input = InferInput<typeof Schema>;
```

`Infer` resolves to the parsed output type of the schema.

## Framework Integration

Validit is a pure-utility library. Use it at data boundaries — form submission handlers, API response parsers, and URL query param validators.

::: code-group

```tsx [React]
import { v } from '@vielzeug/validit';

const LoginSchema = v.object({
  email: v.string().email(),
  password: v.string().min(8),
});

type LoginValues = typeof LoginSchema extends { parse(x: unknown): infer T } ? T : never;

function LoginForm() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = LoginSchema.safeParse(data);
    if (!result.ok) {
      console.error(result.errors);
      return;
    }
    await login(result.value);
  }
  return <form onSubmit={handleSubmit}>...</form>;
}
```

```ts [Vue 3]
import { reactive } from 'vue';
import { v } from '@vielzeug/validit';

const ContactSchema = v.object({
  name: v.string().min(1),
  email: v.string().email(),
});

function useContactForm() {
  const errors = reactive<Record<string, string | undefined>>({});

  async function submit(values: unknown) {
    const result = ContactSchema.safeParse(values);
    if (!result.ok) {
      for (const issue of result.errors.issues ?? []) {
        errors[issue.path?.[0] ?? ''] = String(issue.message);
      }
      return;
    }
    await sendContact(result.value);
  }

  return { errors, submit };
}
```

```svelte [Svelte]
<script lang="ts">
  import { v } from '@vielzeug/validit';

  const FormSchema = v.object({ name: v.string().min(1), email: v.string().email() });
  let errors: Record<string, string> = {};

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target as HTMLFormElement));
    const result = FormSchema.safeParse(data);
    if (!result.ok) {
      errors = {};
      // map issues to field errors
      return;
    }
    await send(result.value);
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

### With Formit

Use `schemaValidator()` to share one schema between Formit validation and static typing.

```ts
import { createForm, schemaValidator } from '@vielzeug/formit';
import { v } from '@vielzeug/validit';

const schema = v.object({
  email: v.string().email(),
  password: v.string().min(8),
});

const form = createForm({
  defaultValues: { email: '', password: '' },
  validator: schemaValidator(schema),
});
```

### With Fetchit

Validate API response payloads at the data boundary.

```ts
import { createApi } from '@vielzeug/fetchit';
import { v } from '@vielzeug/validit';

const UserSchema = v.object({ id: v.number(), name: v.string(), email: v.string().email() });
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
- Treat `v.object(...)` as strict-by-default and use `.relaxed()` deliberately.
