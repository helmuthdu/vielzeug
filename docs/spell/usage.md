---
title: 'Spell: Usage Guide'
description: Build schemas, order checks and transforms, compose objects, customize messages, and integrate Spell with other Vielzeug packages.
---

[[toc]]

## Basic Usage

Start with `safeParse()` when you want explicit success and failure branches.

```ts
import { s } from '@vielzeug/spell';

const Signup = s.object({
  email: s.string().email(),
  password: s.string().min(12),
  referralCode: s.string().optional(),
});

const result = Signup.safeParse({
  email: 'ada@example.com',
  password: 'horse-battery-staple',
});

if (!result.success) {
  console.error(result.error.issues);
} else {
  console.log(result.data.email);
}
```

Use `parse()` when invalid input should throw. Use `safeParse()` when invalid input is part of normal control flow.

## Building Schemas

Compose schemas from the `s` builders. Every method returns a new schema, so you can share and extend base schemas safely.

```ts
import { s } from '@vielzeug/spell';

const Article = s.object({
  id: s.string().uuid(),
  meta: s.object({ published: s.boolean(), publishedAt: s.date().nullable() }).relaxed(),
  slug: s.string().slug(),
  tags: s.array(s.string().min(1)).default([]),
  title: s.string().trim().min(1).max(120),
});
```

Object schemas reject unknown keys by default. Call `.relaxed()` to keep extra properties in the output.

Fields with a `default()` are filled in when their key is absent, so `parse({})` returns a fully default-filled object.

```ts
const Config = s.object({
  host: s.string().default('localhost'),
  port: s.number().default(3000),
});

Config.parse({}); // { host: 'localhost', port: 3000 }
```

`default()` and `catch()` return a fresh copy of object, array, `Map`, `Set`, and `Date` values on every parse, so callers cannot mutate a shared default.

## Ordering Checks and Transforms

Checks, built-in constraints, and transforms run in the order you chain them. A constraint after a transform sees the transformed value.

```ts
import { s } from '@vielzeug/spell';

// trim() runs first, so '   ' fails min(1)
const Title = s.string().trim().min(1);

// The check receives the length, not the string
const ShortCode = s
  .string()
  .transform((value) => value.length)
  .check((length) => length <= 8 || 'At most 8 characters');
```

Transforms are skipped once an earlier step reported an issue, so a transform never receives a value that failed validation. Use `preprocess()` to change raw input before the type check.

## Optional, Nullable, and Fallback Values

Use modifiers to describe missing values and recovery rules.

```ts
import { s } from '@vielzeug/spell';

const DisplayName = s.string().trim().min(2).describe('Display name').optional().default('Guest').nullable();

DisplayName.parse(undefined); // 'Guest'
DisplayName.parse(null); // null
DisplayName.description; // 'Display name'
```

`optional()`, `nullable()`, `nullish()`, `required()`, and `transform()` change the value type and return a base `Schema`. Chain type-specific methods such as `.min()` or `.extend()` before them.

Call `.required()` to make `undefined` invalid again. It clears `optional()` and `default()` and keeps `null` and checks.

```ts
import { s } from '@vielzeug/spell';

const NullableButRequired = s.string().optional().nullable().required();

NullableButRequired.parse('Ada');
NullableButRequired.parse(null);
NullableButRequired.safeParse(undefined).success; // false
```

Use `.catch()` when you want a fallback output after validation fails.

```ts
import { s } from '@vielzeug/spell';

const Port = s.number().int().min(1).max(65535).catch(3000);

Port.parse('not-a-number'); // 3000
```

## Composing Object Schemas

Derive new object schemas with `extend()`, `pick()`, `omit()`, and `partial()`. Derive the shape first, then add checks, transforms, defaults, or catches to the final schema.

```ts
import { s } from '@vielzeug/spell';

const User = s.object({ email: s.string().email(), id: s.string().uuid(), name: s.string() });

const Admin = User.extend({ role: s.enum(['owner', 'editor']) });
const UserPatch = User.omit('id').partial();

const Signup = User.pick('email')
  .extend({ confirm: s.string(), password: s.string().min(12) })
  .check((value) => value.password === value.confirm || 'Passwords must match');
```

Deriving from an object with checks, transforms, preprocessors, a default, or a catch throws `SpellDefinitionError`. A check written for the old shape could read a field that `omit()` removed, so Spell refuses instead of guessing.

## Tolerating Removed Fields

Records saved by older schema versions can carry keys the current schema no longer declares. `tolerate()` accepts and drops exactly the named keys, and other unknown keys still fail.

```ts
import { s } from '@vielzeug/spell';

const Person = s.object({ email: s.string(), name: s.string() }).tolerate('address');

Person.parse({ address: '42 Wallaby Way', email: 'johndoe@mail.com', name: 'John Doe' });
// { email: 'johndoe@mail.com', name: 'John Doe' }
```

Fields added in later schema versions do not need `tolerate()`: give them a `default()` and older records are repaired on parse.

## Custom Validation

Use `check()` for synchronous domain rules and `checkAsync()` for asynchronous rules.

```ts
import { s } from '@vielzeug/spell';

// Return false to fail with the default message
const EvenNumber = s.number().check((n) => n % 2 === 0);

// Return a string to fail with that message
const Username = s
  .string()
  .min(3)
  .check((v) => !v.startsWith('_') || 'Cannot start with underscore');

// Report issues at specific paths with ctx.addIssue()
const Signup = s.object({ confirm: s.string(), password: s.string() }).check((v, ctx) => {
  if (v.password !== v.confirm) ctx.addIssue({ code: 'custom', message: 'Passwords must match', path: ['confirm'] });
});
```

A schema containing `checkAsync()` at any depth needs `parseAsync()` or `safeParseAsync()`. The synchronous methods throw `SpellError` before running the async check, because accepting an unchecked value would be unsafe.

```ts
import { s } from '@vielzeug/spell';

const takenEmails = new Set(['ada@example.com']);

const AccountEmail = s
  .string()
  .email()
  .checkAsync(async (value) => !takenEmails.has(value) || 'Email is already taken');

await AccountEmail.parseAsync('grace@example.com');
```

## Strings, Numbers, and Regex Safety

Use the built-in constraints instead of hand-written predicates.

```ts
import { s } from '@vielzeug/spell';

const Password = s.string().min(12).regex(/[A-Z]/).regex(/[0-9]/);
const Price = s.number().nonNegative().multipleOf(0.01);
const LaunchWindow = s.date().min(new Date('2025-01-01T00:00:00.000Z'));
const Website = s.string().url({ protocols: ['https'] });
```

Format failures use the `invalid_format` code with `params.format` set to the method name. `regex()` drops the stateful `g` and `y` flags, so repeated parses agree even when you reuse a global regular expression.

## Coercion and Pipelines

Use `s.coerce.*` when input arrives as strings, such as query parameters or form values.

```ts
import { s } from '@vielzeug/spell';

const Query = s.object({
  draft: s.coerce.boolean().default(false),
  limit: s.coerce.number().int().positive().default(20),
  publishedAt: s.coerce.date().nullable(),
  search: s.coerce.string().trim().min(1).optional(),
});

Query.parse({ draft: 'true', limit: '50', publishedAt: '2025-04-01T12:00:00.000Z', search: '  vielzeug  ' });
```

Use `transform()` or `pipe()` when downstream code needs a different output.

```ts
import { s } from '@vielzeug/spell';

const LowercaseTags = s.array(s.string().trim().min(1)).transform((tags) => tags.map((tag) => tag.toLowerCase()));
const Slug = s.string().trim().pipe(s.string().slug());
```

## Definitions and JSON Schema

Use declarative definitions when schemas feed external tooling.

```ts
import { s } from '@vielzeug/spell';
import { toJsonSchema } from '@vielzeug/spell/json';

const Product = s
  .object({
    id: s.string().uuid(),
    name: s.string().min(1),
    price: s.number().positive().multipleOf(0.01),
  })
  .describe('Product');

const jsonSchema = toJsonSchema(Product.definition());
console.log(jsonSchema.description); // 'Product'
```

Definitions are frozen, serializable data. Schemas with checks, transforms, preprocessors (including `s.coerce.*` and `trim()`), defaults, or catches have no definition, and `definition()` throws `SpellDefinitionError`.

## Messages

Spell has no process-wide configuration. Build one parse context per request, locale, or form, and pass it explicitly.

```ts
import { createParseContext, s } from '@vielzeug/spell';

const User = s.object({ email: s.string().email() });
const german = createParseContext({ object: { invalidKeys: () => 'Keine unbekannten Felder erlaubt' } });

User.safeParse({ email: 'ada@example.com', extra: true }, german);
```

Development builds warn through `console.warn` when a message override uses an unsafe key such as `__proto__`.

## Working with Validation Errors

Use `SpellValidationError` helpers to build UI-ready error structures.

```ts
import { joinIssuePath, s } from '@vielzeug/spell';

const User = s.object({ email: s.string().email(), profile: s.object({ name: s.string().min(2) }) });
const result = User.safeParse({ email: 'nope', profile: { name: '' } });

if (!result.success) {
  console.log(result.error.messagesAt('profile', 'name'));

  for (const issue of result.error.issues) console.log(joinIssuePath(issue.path), issue.message);
}
```

Union failures produce one `invalid_union` issue. Use `s.discriminatedUnion()` when a tag field identifies the intended branch, so errors point at that branch's fields.

## Typing Schema Parameters

Type a function that accepts any schema with `AnySchema`, or with `Schema<T, unknown>` when it needs the parsed type.

```ts
import { type AnySchema, type ParseResult, type Schema, s } from '@vielzeug/spell';

function isValid(schema: AnySchema, value: unknown): boolean {
  return schema.safeParse(value).success;
}

function parseWith<T>(schema: Schema<T, unknown>, value: unknown): ParseResult<T> {
  return schema.safeParse(value);
}

parseWith(s.object({ email: s.string() }), { email: 'ada@example.com' });
```

## Framework Integration

Spell works anywhere you can call a function before data enters your app.

::: code-group

```tsx [React]
import { s } from '@vielzeug/spell';

const SearchParams = s
  .object({
    page: s.coerce.number().int().positive().default(1),
    q: s.string().trim().optional(),
  })
  .relaxed();

export function SearchPage({ rawParams }: { rawParams: unknown }) {
  const params = SearchParams.parse(rawParams);

  return (
    <div>
      {params.q ?? 'All results'}: page {params.page}
    </div>
  );
}
```

```ts [Vue]
import { computed, ref } from 'vue';
import { s } from '@vielzeug/spell';

const Settings = s.object({
  compact: s.coerce.boolean().default(false),
  locale: s.string().min(2),
});

const raw = ref<unknown>({ compact: 'true', locale: 'en' });
const settings = computed(() => Settings.parse(raw.value));
```

```svelte [Svelte]
<script lang="ts">
  import { s } from '@vielzeug/spell';

  const Email = s.string().email();
  let value = '';
  $: error = Email.safeParse(value).success ? '' : 'Enter a valid email';
</script>

<input bind:value />
{#if error}<p>{error}</p>{/if}
```

:::

## Working with Other Vielzeug Libraries

Spell schemas implement Standard Schema, so packages that accept Standard Schema validators use them directly.

```ts
import { createCourier } from '@vielzeug/courier';
import { createForm } from '@vielzeug/forge';
import { schemaValidator } from '@vielzeug/forge/schema';
import { s } from '@vielzeug/spell';

const Profile = s.object({ displayName: s.string().min(2), newsletter: s.boolean() });

const form = createForm({
  initialValues: { displayName: '', newsletter: false },
  validate: schemaValidator(Profile),
});

const courier = createCourier({ baseUrl: '/api' });
const profile = Profile.parse(await courier.get('/profile'));
```

## Best Practices

- Keep schemas close to the boundary where unknown data enters your app.
- Chain constraints in the order they should apply; put `trim()` before length checks.
- Derive object shapes with `extend()`, `pick()`, `omit()`, or `partial()` before adding checks.
- Chain type-specific methods before `optional()`, `nullable()`, `transform()`, or `required()`.
- Use `check()` with `ctx.addIssue()` for multi-field rules; return a message for single predicates.
- Use `checkAsync()` with `parseAsync()` for every asynchronous domain rule.
- Build a parse context per request, locale, or test instead of relying on global state.
- Use `definition()` with `toJsonSchema()` for external tooling, and keep runtime-only schemas separate.
