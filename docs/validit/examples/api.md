---
title: 'Validit Examples — API'
description: 'API request and response validation examples with validit.'
---

## API Validation Examples

## Problem

Implement api validation examples in a production-friendly way with `@vielzeug/validit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/validit` installed.

### Request Body Validation

```ts
import { v } from '@vielzeug/validit';

const CreateArticleSchema = v
  .object({
    title: v.string().min(5).max(200),
    body: v.string().min(20),
    tags: v.array(v.string()).max(10).default([]),
    status: v.union('draft', 'published').default('draft'),
  })
  .strict();

app.post('/articles', (req, res) => {
  const result = CreateArticleSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.issues.map((issue) => ({
        code: issue.code,
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  return res.status(201).json({ data: result.data });
});
```

### Query Parameter Validation

```ts
const QuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  limit: v.coerce.number().int().min(1).max(100).default(20),
  sort: v.union('newest', 'oldest').default('newest'),
});

const query = QuerySchema.parse(req.query);
```

### Response Validation

```ts
const UserResponseSchema = v.object({
  id: v.number().int().positive(),
  email: v.string().email(),
  createdAt: v.string().datetime(),
});

const payload = await service.getUser(id);
const safePayload = UserResponseSchema.parse(payload);
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Async](./async.md)
- [Forms](./forms.md)
- [Unions](./unions.md)
