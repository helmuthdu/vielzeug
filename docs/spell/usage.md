---
title: Spell — Usage Guide
description: Learn how to build schemas, compose wrappers, customize locales, and integrate spell with other Vielzeug packages.
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

Use `parse()` when invalid input should throw immediately. Use `safeParse()` when invalid input is part of normal control flow.

## Building Schemas

Use the namespace form when readability matters more than bundle trimming.

```ts
import { s } from '@vielzeug/spell';

const Article = s.object({
  id: s.string().uuid(),
  title: s.string().trim().min(1).max(120),
  slug: s.string().slug(),
  tags: s.array(s.string().min(1)).default(() => []),
  meta: s
    .object({
      published: s.boolean(),
      publishedAt: s.date().nullable(),
    })
    .relaxed(),
});
```

```ts
import { s } from '@vielzeug/spell';

const Todo = s.object({
  done: s.boolean(),
  tags: s.array(s.string().min(1)).default(() => []),
  title: s.string().min(1),
});
```

Object schemas reject unknown keys by default. Call `.relaxed()` when you need to preserve extra properties.

Call `.defaults()` to get a fully default-filled object without providing any input. Every required field must have a `.default()` set, or a `SpellValidationError` is thrown. Call `.partialDefaults()` when only some fields have defaults — fields without a default are silently omitted instead of throwing.

```ts
const Config = s.object({
  host: s.string().default('localhost'),
  port: s.number().default(3000),
});

Config.defaults(); // { host: 'localhost', port: 3000 }

const Form = s.object({ name: s.string(), role: s.string().default('viewer') });
Form.partialDefaults(); // { role: 'viewer' }
```

## Wrapper Modes, Defaults, and Fallbacks

Chain wrappers to describe missing values and recovery rules without losing schema metadata.

```ts
import { s } from '@vielzeug/spell';

const DisplayName = s.string().trim().min(2).label('Display name').optional().default('Guest').nullable();

DisplayName.parse(undefined); // 'Guest'
DisplayName.parse(null); // null
DisplayName.description; // 'Display name'
```

Call `.required()` to remove `undefined` without removing `null`.

```ts
import { s } from '@vielzeug/spell';

const NullableButRequired = s.string().optional().nullable().required();

NullableButRequired.parse('Ada');
NullableButRequired.parse(null);
// NullableButRequired.parse(undefined); // throws
```

Use `.catch()` when you want a fallback output after validation fails.

```ts
import { s } from '@vielzeug/spell';

const Port = s.number().int().min(1).max(65535).catch(3000);

Port.parse('not-a-number'); // 3000
```

## Tolerating Removed Fields

When a persisted record shape evolves, records saved by older versions carry keys the current schema no longer declares. `tolerate` accepts and drops exactly the named keys, so one call documents one removed field — no optional placeholder in the schema and no strip step after parsing.

```ts
import { s, tolerate } from '@vielzeug/spell';

const Person = tolerate(
  s.object({ name: s.string(), email: s.number() }),
  'address',
);

const parsed = Person.parse({ name: 'John Doe', address: 'p sherman 42 wallaby way sydney', email: 'johndoe@mail.com' });
// { name: 'John Doe', email: 'johndoe@mail.com' } — the tolerated key never reaches the output
```

Fields added to later schema versions do not need `tolerate`: give them `default()` and older records repair on parse.

## Custom Validation

Use `check()` for synchronous domain rules and `checkAsync()` for asynchronous rules. Sync parsing rejects schemas with asynchronous checks.

```ts
import { s } from '@vielzeug/spell';

// Boolean shorthand: return false to fail with default message
const EvenNumber = s.number().check((n) => n % 2 === 0);

// String shorthand: return the message as a string
const Username = s
  .string()
  .min(3)
  .check((v) => !v.startsWith('_') || 'Cannot start with underscore');

// Multiple issues via ctx.addIssue()
const Signup = s.object({ confirm: s.string(), password: s.string() }).check((v, ctx) => {
  if (v.password !== v.confirm) {
    ctx.addIssue({ code: 'custom', message: 'Passwords must match', path: ['confirm'] });
  }
});
```

`checkAsync()` marks a schema as asynchronous: synchronous parsing throws at runtime instead of accepting an unchecked value, so async checks require `parseAsync()` or `safeParseAsync()`. Async checks compose at any nesting depth — arrays, objects, unions, intersections, tuples, maps, records, sets, lazy schemas, pipelines, and `s.discriminatedUnion(...)` branches all evaluate nested async checks correctly through `parseAsync()`.

```ts
import { s } from '@vielzeug/spell';

const takenEmails = new Set(['ada@example.com']);

const AccountEmail = s
  .string()
  .email()
  .checkAsync(async (value, ctx) => {
    if (takenEmails.has(value)) {
      ctx.addIssue({ code: 'custom', message: 'Email is already taken', path: [] });
    }
  });

// Async checks require parseAsync
await AccountEmail.parseAsync('grace@example.com');
```

Use `check()` for predicate-only rules too. Return `true` on success or message on failure.

```ts
import { s } from '@vielzeug/spell';

const PositivePrice = s.number().check((value) => value > 0 || 'Must be positive');
PositivePrice.parse(9.99);
```

## Strings, Numbers, and Safe Regex Usage

Use schema helpers for common string and number constraints instead of hand-written predicates.

```ts
import { s } from '@vielzeug/spell';

const Password = s.string().min(12).regex(/[A-Z]/).regex(/[0-9]/);
const Price = s.number().nonNegative().multipleOf(0.01);
const LaunchWindow = s.date().min(new Date('2025-01-01T00:00:00.000Z'));
```

Spell strips stateful `/g` and `/y` flags from `regex()` patterns before validation. Repeated parses stay deterministic even when the original regular expression is reused.

## Coercion and Transforms

Use coercion when input arrives as strings, query parameters, or form values.

```ts
import { s } from '@vielzeug/spell';

const Query = s.object({
  draft: s.coerce.boolean().default(false),
  limit: s.coerce.number().int().positive().default(20),
  publishedAt: s.coerce.date().nullable(),
  search: s.coerce.string().trim().min(1).optional(),
});

const parsed = Query.parse({
  draft: 'true',
  limit: '50',
  publishedAt: '2025-04-01T12:00:00.000Z',
  search: '  vielzeug  ',
});
```

Use `transform()` or `pipe()` after validation when downstream code needs a different output shape.

```ts
import { s } from '@vielzeug/spell';

const TrimmedTags = s.array(s.string().trim().min(1)).transform((tags) => tags.map((tag) => tag.toLowerCase()));
const Slug = s.string().trim().min(1).pipe(s.string().slug());
```

## Introspection, Round-Trips, and JSON Schema

Use declarative definitions when schemas need to cross process boundaries or feed tooling.

```ts
import { s } from '@vielzeug/spell';
import { fromDefinition } from '@vielzeug/spell/json';

const Product = s
  .object({
    id: s.string().uuid(),
    name: s.string().min(1),
    price: s.number().positive().multipleOf(0.01),
  })
  .label('Product');

const definition = Product.definition();
const jsonSchema = fromDefinition(definition);

Product.parse({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Keyboard', price: 129.99 });
console.log(jsonSchema.title);
```

Definitions are frozen serializable snapshots of declarative schema structure. Use `definition()` and `fromDefinition()` for external tooling. Schemas with runtime checks, transforms, defaults, catches, or preprocessors intentionally have no definition.

## Messages

Spell has no mutable process-wide configuration. Build one parse context per request, locale, or form, then pass it explicitly.

```ts
import { createParseContext, s } from '@vielzeug/spell';

const User = s.object({ email: s.string().email() });
const german = createParseContext({
  object: { invalidKeys: () => 'Keine unbekannten Felder erlaubt' },
});

User.safeParse({ email: 'ada@example.com', extra: true }, german);
```

Internal development warnings always use `console.warn` in development builds. Route application diagnostics in application code instead of mutating library-wide logger state.

## Working with Validation Errors

Use `SpellValidationError` helpers when you need UI-ready error structures.

```ts
import { s, SpellValidationError } from '@vielzeug/spell';

const User = s.object({
  email: s.string().email(),
  profile: s.object({
    name: s.string().min(2),
  }),
});

const result = User.safeParse({ email: 'nope', profile: { name: '' } });

if (!result.success && result.error instanceof SpellValidationError) {
  const profileErrors = result.error.messagesAt('profile', 'name');
  console.log(profileErrors);
}
```

Key inline errors by dot-path with `joinIssuePath()`, which also unwraps Standard Schema `{ key }` segments:

```ts
import { joinIssuePath } from '@vielzeug/spell';

for (const issue of result.error.issues) {
  console.log(joinIssuePath(issue.path), issue.message); // 'profile.name: ...'
}
```

Union failures produce one stable `invalid_union` issue. Use `s.discriminatedUnion()` when a discriminator can identify the intended object branch and provide field-specific errors.

## Validating synchronously in React

Adapters that validate inside a render or `validate` callback need the sync parse surface. `AnySchema` does not expose `safeParse`; type the adapter parameter against `SyncParsable` instead:

```ts
import { type SyncParsable } from '@vielzeug/spell';

function spellValidator(schema: SyncParsable<unknown>) {
  return (values: unknown) => {
    const result = schema.safeParse(values);
    if (result.success) return undefined;

    return result.error.issues.map((issue) => ({
      message: issue.message,
      path: issue.path,
    }));
  };
}

spellValidator(s.object({ email: s.string() })); // no shim or cast
```

## Framework Integration

Spell works anywhere you can call a function before state enters your app.

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
      {params.q ?? 'All results'} — page {params.page}
    </div>
  );
}
```

```ts [Vue]
import { computed, ref } from 'vue';
import { s } from '@vielzeug/spell';

const Settings = s.object({
  locale: s.string().min(2),
  compact: s.coerce.boolean().default(false),
});

const raw = ref<unknown>({ locale: 'en', compact: 'true' });
const settings = computed(() => Settings.parse(raw.value));
```

:::

Use `safeParse()` at event boundaries and `parse()` inside trusted data flows.

## Working with Other Vielzeug Libraries

Use Spell as the validation layer and let other packages focus on transport, forms, or storage.

```ts
import { createForm } from '@vielzeug/forge';
import { schemaValidator } from '@vielzeug/forge/schema';
import { createCourier } from '@vielzeug/courier';
import { s } from '@vielzeug/spell';

const Profile = s.object({
  displayName: s.string().min(2),
  newsletter: s.boolean(),
});

const form = createForm({
  initialValues: {
    displayName: '',
    newsletter: false,
  },
  validate: schemaValidator(Profile),
});

const courier = createCourier({ baseUrl: '/api' });
const profile = Profile.parse(await courier.get('/profile'));
```

Use Spell definitions with `@vielzeug/codex` or other tooling when you need generated docs or external schema consumers.

## Best Practices

- Keep schemas close to the boundary where unknown data enters your app.
- Use `s` consistently for construction; use explicit `/json` and `/predicates` subpaths for tooling.
- Use `.default(() => value)` for mutable defaults such as arrays, objects, `Map`, and `Set`.
- Call `.required()` when you want to remove `undefined` but keep `null` semantics intact.
- Use `check()` with a `ctx` argument when you need `ctx.addIssue()`; return a message for simple predicate failures.
- Use `checkAsync()` and `parseAsync()` for every asynchronous domain rule.
- Build a parse context per request or test; never rely on mutable process-wide configuration.
- Use `definition()` with `fromDefinition()` from `@vielzeug/spell/json` for external tooling.
