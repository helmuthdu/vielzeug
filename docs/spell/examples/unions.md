---
title: 'Spell Examples — Unions, Intersections, and Variants'
description: 'Compose multiple spell schemas with unions, intersects, and discriminated variants.'
---

## Unions, Intersections, and Variants

### Problem

A domain model may have multiple valid shapes. You need to express those branches while keeping accurate errors and typed output.

### Solution

Use unions for alternative shapes, intersections for merged constraints, and variants for discriminated object unions.

```ts
import { SpellValidationError, s } from '@vielzeug/spell';

const Timestamped = s.object({
  createdAt: s.date(),
});

const DraftArticle = s.object({
  kind: s.literal('draft'),
  title: s.string().min(3),
});

const PublishedArticle = s.object({
  kind: s.literal('published'),
  slug: s.string().slug(),
  title: s.string().min(3),
});

const Article = s.variant('kind', {
  draft: DraftArticle,
  published: PublishedArticle,
});

const AuditedArticle = s.and(Article, Timestamped);
const result = AuditedArticle.safeParse({ kind: 'published', title: 'Docs', createdAt: new Date() });

if (!result.success && SpellValidationError.is(result.error)) {
  console.log(result.error.bestMatch());
}
```

### Pitfalls

- Prefer `s.variant()` over `s.union()` when one field can discriminate the branches. Errors are smaller and branch selection is deterministic.
- Intersections merge outputs deeply. Keep overlapping property names compatible across both sides.
- `bestMatch()` is useful for union failures because it surfaces the branch that got closest to passing.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Schema Introspection and Round-Trips](./introspection.md)
