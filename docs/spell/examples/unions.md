---
title: 'Spell Examples: Unions, Intersections, and Discriminated Unions'
description: 'Compose multiple spell schemas with unions, intersections, and discriminated unions.'
---

## Unions, Intersections, and Discriminated Unions

### Problem

A domain model may have multiple valid shapes. You need to express those branches while keeping accurate errors and typed output.

### Solution

Use `s.discriminatedUnion()` for object branches tagged by one field, `extend()` for shared fields, and `s.union()` for alternative non-object values.

```ts
import { s } from '@vielzeug/spell';

const Timestamped = s.object({ createdAt: s.date() });

const DraftArticle = Timestamped.extend({ title: s.string().min(3) });
const PublishedArticle = Timestamped.extend({ slug: s.string().slug(), title: s.string().min(3) });

// Branches omit `kind`: the tag is added as a literal of the branch key
const Article = s.discriminatedUnion('kind', {
  draft: DraftArticle,
  published: PublishedArticle,
});

const result = Article.safeParse({ createdAt: new Date(), kind: 'published', title: 'Docs' });

if (!result.success) {
  console.log(result.error.issues); // [{ code: 'invalid_type', path: ['slug'], ... }]
}

const ArticleRef = s.union(s.string().uuid(), s.string().slug());
ArticleRef.parse('getting-started');
```

#### With Intersections

`s.intersect()` requires every branch to pass and deep-merges object outputs. Each branch sees the full input, so object branches must be `relaxed()`.

```ts
import { s } from '@vielzeug/spell';

const Named = s.object({ name: s.string() }).relaxed();
const Aged = s.object({ age: s.number().int() }).relaxed();

s.intersect(Named, Aged).parse({ age: 36, name: 'Ada' }); // { age: 36, name: 'Ada' }
```

### Pitfalls

- Prefer `s.discriminatedUnion()` over `s.union()` for tagged objects: an unknown tag yields one `invalid_discriminator` issue and branch errors point at fields.
- A branch that declares the tag field with a different schema throws `SpellDefinitionError` when the union is built.
- Strict object branches of an intersection reject each other's keys; use `extend()` to combine object shapes.
- Plain unions report one `invalid_union` issue whose `params.errors` holds each branch's issues.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Schema Introspection and Round-Trips](./introspection.md)
