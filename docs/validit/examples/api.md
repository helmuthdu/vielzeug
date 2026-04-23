---
title: 'Validit Examples — API'
description: 'API request and response validation examples with validit.'
---

## API Validation Examples

### Request Body Validation

```ts
import { v } from '@vielzeug/validit';

const CreateArticleSchema = v
  .object({
    title: v.string().min(5).max(200),
    body: v.string().min(20),
    tags: v.array(v.string()).max(10).default([]),
    status: v.union('draft', 'published').default('draft'),
  });

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
  createdAt: v.string().isoDateTime(),
});

const payload = await service.getUser(id);
const safePayload = UserResponseSchema.parse(payload);
```

### Webhook Event Validation

```ts
const WebhookSchema = v.variant('type', {
  invoice_paid: v.object({ amount: v.number().positive(), invoiceId: v.string().uuid() }),
  subscription_canceled: v.object({ reason: v.string(), subscriptionId: v.string().uuid() }),
});

const event = WebhookSchema.parse(req.body);
```

## Common Pitfalls

- Assuming unknown keys are accepted in object payloads.
- Using `safeParse()` with async-only schemas containing `.refineAsync()`.
- Returning raw `ValidationError` messages to clients without shaping response fields.

## Related Recipes

- [Async](./async.md)
- [Forms](./forms.md)
- [Unions](./unions.md)
