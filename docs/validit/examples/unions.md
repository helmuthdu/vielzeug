---
title: 'Validit Examples — Unions'
description: 'Union, intersect, and variant examples with validit.'
---

## Union and Variant Examples

## Problem

Implement union and variant examples in a production-friendly way with `@vielzeug/validit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/validit` installed.

### First-Match Union

```ts
import { v } from '@vielzeug/validit';

const IdSchema = v.union(v.coerce.number().int().positive(), v.string().uuid());

IdSchema.parse('42');
// => 42 (number) because the first branch succeeds
```

### Raw Literal Union

```ts
const RoleSchema = v.union('admin', 'editor', 'viewer');
RoleSchema.parse('admin');
```

### Intersections

```ts
const WithId = v.object({ id: v.number().int().positive() });
const WithAudit = v.object({ createdAt: v.date() });

const EntitySchema = v.intersect(WithId, WithAudit);
```

### Discriminated Variant

```ts
const EventSchema = v.variant('type', {
  user_created: v.object({ userId: v.number().int().positive() }),
  user_deleted: v.object({ userId: v.number().int().positive(), reason: v.string() }),
});

EventSchema.parse({ type: 'user_created', userId: 10 });
EventSchema.parse({ type: 'user_deleted', userId: 10, reason: 'requested' });
```

### Native Enum

```ts
enum Status {
  Draft = 'draft',
  Published = 'published',
}

const StatusSchema = v.nativeEnum(Status);
StatusSchema.parse(Status.Draft);
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [API](./api.md)
- [Async](./async.md)
- [Forms](./forms.md)
