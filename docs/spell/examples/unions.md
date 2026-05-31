---
title: 'Spell Examples — Unions, Intersects, and Variants'
description: 'Union, intersect, and variant example for @vielzeug/spell.'
---

## Unions, Intersects, and Variants

### Problem

Model polymorphic payloads, IDs that can arrive in multiple formats, and discriminated events without losing runtime validation or output typing.

### Solution

Use `s.union()` for value-level branching, `s.intersect()` to merge multiple object shapes, and `s.variant()` for discriminated-union dispatch on a known tag field.

```ts
import { s } from '@vielzeug/spell';

const IdSchema = s.union(s.coerce.number().int().positive(), s.string().uuid());

IdSchema.parse('42');
// => 42 (number) because the first branch succeeds

const RoleSchema = s.union('admin', 'editor', 'viewer');
RoleSchema.parse('admin');

const WithId = s.object({ id: s.number().int().positive() });
const WithAudit = s.object({ createdAt: s.date() });

const EntitySchema = s.intersect(WithId, WithAudit);
// s.and() is a two-argument alias for s.intersect()
const EntitySchema2 = s.and(WithId, WithAudit);

const EventSchema = s.variant('type', {
  user_created: s.object({ userId: s.number().int().positive() }),
  user_deleted: s.object({ userId: s.number().int().positive(), reason: s.string() }),
});

EventSchema.parse({ type: 'user_created', userId: 10 });
EventSchema.parse({ type: 'user_deleted', userId: 10, reason: 'requested' });

const ActionSchema = s.variant('type', {
  create: s.object({ name: s.string() }),
  remove: s.object({ id: s.number().int().positive() }),
});

ActionSchema.safeParse({ type: 'create', name: 'A', extra: true }); // fails (strict object mode)

// TypeScript enum — extract values into a tuple for s.enum()
enum Status {
  Draft = 'draft',
  Published = 'published',
}

const StatusSchema = s.enum(Object.values(Status) as [string, ...string[]]);
StatusSchema.parse(Status.Draft);
```

### Pitfalls

- Ordering permissive union branches before strict branches.
- Assuming intersection merges incompatible values automatically.
- Using `variant` maps where branch values are not object schemas.

### Related

- [API](./api.md)
- [Async](./async.md)
- [Forms](./forms.md)
