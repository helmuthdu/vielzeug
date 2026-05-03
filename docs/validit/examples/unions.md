---
title: 'Validit Examples — Unions'
description: 'Union, intersect, and variant examples with validit.'
---

## Union and variant examples

### Problem

Model polymorphic payloads, IDs that can arrive in multiple formats, and discriminated events without losing runtime validation or output typing.

### Runnable Example

```ts
import { v } from '@vielzeug/validit';

const IdSchema = v.union(v.coerce.number().int().positive(), v.string().uuid());

IdSchema.parse('42');
// => 42 (number) because the first branch succeeds

const RoleSchema = v.union('admin', 'editor', 'viewer');
RoleSchema.parse('admin');

const WithId = v.object({ id: v.number().int().positive() });
const WithAudit = v.object({ createdAt: v.date() });

const EntitySchema = v.intersect(WithId, WithAudit);

const EventSchema = v.variant('type', {
  user_created: v.object({ userId: v.number().int().positive() }),
  user_deleted: v.object({ userId: v.number().int().positive(), reason: v.string() }),
});

EventSchema.parse({ type: 'user_created', userId: 10 });
EventSchema.parse({ type: 'user_deleted', userId: 10, reason: 'requested' });

const ActionSchema = v.variant('type', {
  create: v.object({ name: v.string() }),
  remove: v.object({ id: v.number().int().positive() }),
});

ActionSchema.safeParse({ type: 'create', name: 'A', extra: true }); // fails (strict object mode)

enum Status {
  Draft = 'draft',
  Published = 'published',
}

const StatusSchema = v.nativeEnum(Status);
StatusSchema.parse(Status.Draft);
```

### Expected Output

- `union()` returns the first successful branch result.
- `intersect()` requires every branch to pass and merges object outputs from successful branches.
- `variant()` chooses one object branch by discriminator instead of trying every branch.

### Common Pitfalls

- Ordering permissive union branches before strict branches.
- Assuming intersection merges incompatible values automatically.
- Using `variant` maps where branch values are not object schemas.

### Related Recipes

- [API](./api.md)
- [Async](./async.md)
- [Forms](./forms.md)
