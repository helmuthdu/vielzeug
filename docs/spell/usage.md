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

## Custom Validation

Use `validate()` for domain rules — both synchronous and asynchronous. A single method handles all cases.

```ts
import { s } from '@vielzeug/spell';

// Boolean shorthand: return false to fail with default message
const EvenNumber = s.number().validate((n) => n % 2 === 0);

// String shorthand: return the message as a string
const Username = s
  .string()
  .min(3)
  .validate((v) => !v.startsWith('_') || 'Cannot start with underscore');

// Multiple issues via ctx.addIssue()
const Signup = s.object({ confirm: s.string(), password: s.string() }).validate((v, ctx) => {
  if (v.password !== v.confirm) {
    ctx.addIssue({ code: 'custom', message: 'Passwords must match', path: ['confirm'] });
  }
});
```

Async rules work in the same method. Spell awaits them only in `parseAsync()` — async callbacks passed to `validate()` are silently skipped in synchronous `parse()`.

```ts
import { s } from '@vielzeug/spell';

const takenEmails = new Set(['ada@example.com']);

const AccountEmail = s
  .string()
  .email()
  .validate(async (value, ctx) => {
    if (takenEmails.has(value)) {
      ctx.addIssue({ code: 'custom', message: 'Email is already taken', path: [] });
    }
  });

// Must use parseAsync when any validate() callback is async
await AccountEmail.parseAsync('grace@example.com');
```

Use `refine()` when you only need a boolean predicate and an optional message function.

```ts
import { s } from '@vielzeug/spell';

const PositivePrice = s.number().refine(
  (n) => n > 0,
  () => 'Must be positive',
);
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

Use descriptors when schemas need to cross process boundaries or feed tooling.

```ts
import { descriptorToJsonSchema, s } from '@vielzeug/spell';

const Product = s
  .object({
    id: s.string().uuid(),
    name: s.string().min(1),
    price: s.number().positive().multipleOf(0.01),
  })
  .label('Product');

const descriptor = Product.toDescriptor();
const jsonSchema = descriptorToJsonSchema(descriptor);

Product.parse({ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Keyboard', price: 129.99 });
console.log(jsonSchema.title);
```

Descriptors are serializable snapshots of the schema structure. Use `toDescriptor()` to produce one and `descriptorToJsonSchema()` to convert it to JSON Schema for external consumers.

## Messages

Use `setMessages()` to replace the active validation message catalog. Each call replaces the current overrides — it does not accumulate.

```ts
import { resetMessages, setMessages } from '@vielzeug/spell';

setMessages({
  string: {
    email: 'Use a valid work email address',
    min: ({ min }) => `Must be at least ${min} characters`,
  },
  number: {
    min: ({ min }) => `Use a value of ${min} or greater`,
  },
});

// Restore the built-in defaults when done
resetMessages();
```

Use `setLogger()` to route or silence internal development warnings (e.g. conflicting `regex()` constraints).

```ts
import { setLogger } from '@vielzeug/spell';

setLogger(null); // silence
setLogger((msg) => myLogger.warn(msg)); // redirect
```

To integrate with `@vielzeug/lingua`, call `setMessages()` from your locale change callback:

```ts
import { setMessages } from '@vielzeug/spell';

// spellMessages maps locale keys to DeepPartial<Messages>
i18n.subscribe(() => setMessages(spellMessages[i18n.locale]));
```

## Working with Validation Errors

Use `SpellValidationError` helpers when you need UI-ready error structures.

```ts
import { SpellValidationError, errorsAt, s } from '@vielzeug/spell';

const User = s.object({
  email: s.string().email(),
  profile: s.object({
    name: s.string().min(2),
  }),
});

const result = User.safeParse({ email: 'nope', profile: { name: '' } });

if (!result.success && SpellValidationError.is(result.error)) {
  const formatted = result.error.format();
  const profileErrors = errorsAt(formatted, 'profile', 'name');
  console.log(profileErrors);
}
```

Use `bestMatch()` on a union failure when you want the branch that came closest to succeeding.

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

`walk()` dispatches by `schema.kind`. If no handler matches and no `unknown` fallback is provided, `walk()` returns `null`. Add an `unknown` handler to capture any kind not explicitly listed in your visitor.

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

## Best Practices

- Keep schemas close to the boundary where unknown data enters your app.
- Prefer tree-shakeable `sXxx` exports in libraries and the `s` namespace in app code.
- Use `.default(() => value)` for mutable defaults such as arrays, objects, `Map`, and `Set`.
- Call `.required()` when you want to remove `undefined` but keep `null` semantics intact.
- Use `validate()` with a `ctx` argument when you need `ctx.addIssue()`; use `refine()` for simple boolean predicates.
- Switch to `parseAsync()` as soon as any `validate()` callback is async.
- Call `resetMessages()` in test `afterEach()` when tests call `setMessages()` to prevent state leakage.
- Use `toDescriptor()` for tooling and `descriptorToJsonSchema()` for external JSON Schema consumers.
