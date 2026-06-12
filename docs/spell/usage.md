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
  console.error(result.error.format());
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

Call `.defaults()` to get a fully default-filled object without providing any input. Every required field must have a `.default()` set, or a `ValidationError` is thrown.

```ts
const Config = s.object({
  host: s.string().default('localhost'),
  port: s.number().default(3000),
});

Config.defaults(); // { host: 'localhost', port: 3000 }
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

## Refinements and Async Checks

Use `check()` for synchronous domain rules and `checkAsync()` when the rule needs I/O.

```ts
import { s } from '@vielzeug/spell';

const reservedUsernames = new Set(['admin', 'root']);
const takenEmails = new Set(['ada@example.com']);

const Signup = s.object({
  email: s
    .string()
    .email()
    .checkAsync(async (value, ctx) => {
      if (takenEmails.has(value)) {
        ctx.addIssue({ code: 'custom', message: 'Email is already taken' });
      }
    }),
  username: s
    .string()
    .min(3)
    .check(
      (value) => !reservedUsernames.has(value),
      ({ value }) => {
        return `${value} is reserved`;
      },
    ),
});

await Signup.parseAsync({
  email: 'grace@example.com',
  username: 'grace',
});
```

Use `parseAsync()` or `safeParseAsync()` when any nested schema contains an async check.

Use `refine()` instead of `check()` when you only need a boolean predicate and an optional message.

```ts
import { s } from '@vielzeug/spell';

const EvenNumber = s.number().refine(
  (n) => n % 2 === 0,
  () => 'Must be even',
);
EvenNumber.parse(4); // 4
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

Use descriptors when schemas need to cross process boundaries or feed tooling.

```ts
import { descriptorToJsonSchema, fromDescriptor, s } from '@vielzeug/spell';

const Product = s
  .object({
    id: s.string().uuid(),
    name: s.string().min(1),
    price: s.number().positive().multipleOf(0.01),
  })
  .label('Product');

const descriptor = Product.toDescriptor();
const rebuilt = fromDescriptor(descriptor);
const jsonSchema = descriptorToJsonSchema(descriptor);

rebuilt.parse({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Keyboard', price: 129.99 });
console.log(jsonSchema.title);
```

`fromDescriptor()` restores base fields such as `description`, `isOptional`, and `isNullable`. It also restores object strictness, common string annotations, and number hints emitted by built-in helpers such as `.positive()`, `.negative()`, and `.multipleOf()`. The reconstructible descriptor type excludes `variant`, `pipe`, `instanceof`, and `lazy` descriptors because those shapes cannot be rebuilt without executable code.

## Messages and Locales

Use `configure()` for global overrides and `registerLocale()` plus `useLocale()` for switchable locale packs.

```ts
import { configure, currentLocale, registerLocale, reset, s, useLocale } from '@vielzeug/spell';

configure({
  messages: {
    string: {
      email: 'Use a valid work email address',
    },
  },
});

configure({
  messages: {
    number: {
      min: ({ min }) => `Use a value greater than or equal to ${min}`,
    },
  },
});

registerLocale('de', {
  string: {
    email: 'Bitte eine gültige E-Mail-Adresse eingeben',
  },
});

useLocale('de');
console.log(currentLocale()); // 'de'

s.string().email().safeParse('not-an-email');
reset();
console.log(currentLocale()); // 'en'
```

`configure({ messages })` merges into the currently active messages. Later `configure()` calls compose with earlier overrides instead of resetting them.

## Working with Validation Errors

Use `ValidationError` helpers when you need UI-ready error structures.

```ts
import { ValidationError, errorsAt, s } from '@vielzeug/spell';

const User = s.object({
  email: s.string().email(),
  profile: s.object({
    name: s.string().min(2),
  }),
});

const result = User.safeParse({ email: 'nope', profile: { name: '' } });

if (!result.success && ValidationError.is(result.error)) {
  const formatted = result.error.format();
  const profileErrors = errorsAt(formatted, 'profile', 'name');
  console.log(profileErrors);
}
```

Use `bestMatch()` on a union failure when you want the branch that came closest to succeeding.

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
import { createApi } from '@vielzeug/courier';
import { s } from '@vielzeug/spell';

const Profile = s.object({
  displayName: s.string().min(2),
  newsletter: s.boolean(),
});

const form = createForm({
  defaultValues: {
    displayName: '',
    newsletter: false,
  },
  validator: Profile,
});

const api = createApi({ baseUrl: '/api' });
const profile = Profile.parse(await api.get('/profile'));
```

Use Spell descriptors with `@vielzeug/codex` or other tooling when you need generated docs or external schema consumers.

## Schema Traversal with walk()

Use `walk()` to inspect or transform a schema tree without importing internal implementation classes.

```ts
import { s, type SchemaWalker } from '@vielzeug/spell';

const fields: string[] = [];

const collectFields: SchemaWalker<void> = {
  object(schema) {
    for (const [key, child] of Object.entries(schema.shape)) {
      fields.push(key);
      child.walk(collectFields);
    }
  },
  unknown() {},
};

const User = s.object({
  email: s.string().email(),
  profile: s.object({ name: s.string() }),
});

User.walk(collectFields);
console.log(fields); // ['email', 'profile', 'name']
```

`walk()` dispatches by `schema.kind`. Add an `unknown` handler as a fallback for any kind not explicitly listed in your visitor.

## Best Practices

- Keep schemas close to the boundary where unknown data enters your app.
- Prefer tree-shakeable `sXxx` exports in libraries and the `s` namespace in app code.
- Use `.default(() => value)` for mutable defaults such as arrays, objects, `Map`, and `Set`.
- Call `.required()` when you want to remove `undefined` but keep `null` semantics intact.
- Keep async validation explicit. Switch to `parseAsync()` as soon as one nested rule performs I/O.
- Use `refine()` for simple predicate checks; use `check()` with a `ctx` argument when you need `ctx.addIssue()`.
- Use `toDescriptor()` for tooling. Use `fromDescriptor()` only with trusted `ReconstructibleSchemaDescriptor` input.
