---
title: 'Sieve Examples — Unions'
description: 'Union, intersect, and variant examples with sieve.'
---

## Union and variant examples

### Problem

Model polymorphic payloads, IDs that can arrive in multiple formats, and discriminated events without losing runtime validation or output typing.

### Runnable Example

```ts
import { s } from '@vielzeug/sieve';

const IdSchema = s.union(s.coerce.number().int().positive(), s.string().uuid());

IdSchema.parse('42');
// => 42 (number) because the first branch succeeds

const RoleSchema = s.union('admin', 'editor', 'viewer');
RoleSchema.parse('admin');

const WithId = s.object({ id: s.number().int().positive() });
const WithAudit = s.object({ createdAt: s.date() });

const EntitySchema = s.intersect(WithId, WithAudit);

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

enum Status {
  Draft = 'draft',
  Published = 'published',
}

const StatusSchema = s.nativeEnum(Status);
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

### Related

- [API](./api.md)
- [Async](./async.md)
- [Forms](./forms.md)
