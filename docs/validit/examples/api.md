---
title: 'Validit Examples — API'
description: 'API request and response validation examples with validit.'
---

## API validation examples

### Problem

Validate request bodies, query parameters, and outbound service responses at the application boundary without duplicating ad-hoc checks.

### Runnable Example

```ts
import { v } from '@vielzeug/validit';

const CreateArticleSchema = v
  .object({
    title: v.string().min(5).max(200),
    body: v.string().min(20),
    tags: v.array(v.string().trim().min(1)).max(10).unique().default([]),
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

const QuerySchema = v.object({
  page: v.coerce.number().int().min(1).default(1),
  limit: v.coerce.number().int().min(1).max(100).default(20),
  sort: v.union('newest', 'oldest').default('newest'),
});

const query = QuerySchema.parse(req.query);

const UserResponseSchema = v.object({
  id: v.number().int().positive(),
  email: v.string().email(),
  createdAt: v.string().isoDateTime(),
});

const payload = await service.getUser(id);
const safePayload = UserResponseSchema.parse(payload);

const WebhookSchema = v.variant('type', {
  invoice_paid: v.object({ amount: v.number().positive(), invoiceId: v.string().uuid() }),
  subscription_canceled: v.object({ reason: v.string(), subscriptionId: v.string().uuid() }),
});

const event = WebhookSchema.parse(req.body);
```

### Expected Output

- `result.data` is fully parsed and defaulted before it enters your handler logic.
- Query parameters like `?page=2&limit=50` become numbers.
- Invalid responses from downstream services fail immediately instead of leaking inconsistent shapes into the rest of the app.

### Common Pitfalls

- Assuming unknown keys are accepted in object payloads.
- Using `safeParse()` with async-only schemas containing `.refineAsync()`.
- Returning raw `ValidationError` messages to clients without shaping response fields.

### Related Recipes

- [Async](./async.md)
- [Forms](./forms.md)
- [Unions](./unions.md)
