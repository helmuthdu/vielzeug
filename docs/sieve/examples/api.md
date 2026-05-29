---
title: 'Sieve Examples — API and Response Validation'
description: 'API and response validation example for @vielzeug/sieve.'
---

## API and Response Validation

### Problem

Validate request bodies, query parameters, and outbound service responses at the application boundary without duplicating ad-hoc checks.

### Solution

Use `s.object()` combined with `safeParse()`, `s.coerce.*`, and `s.variant()` to validate request bodies, query parameters, and typed webhook payloads at every application boundary.

```ts
import { s } from '@vielzeug/sieve';

const CreateArticleSchema = s.object({
  title: s.string().min(5).max(200),
  body: s.string().min(20),
  tags: s.array(s.string().trim().min(1)).max(10).unique().default([]),
  status: s.union('draft', 'published').default('draft'),
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

const QuerySchema = s.object({
  page: s.coerce.number().int().min(1).default(1),
  limit: s.coerce.number().int().min(1).max(100).default(20),
  sort: s.union('newest', 'oldest').default('newest'),
});

const query = QuerySchema.parse(req.query);

const UserResponseSchema = s.object({
  id: s.number().int().positive(),
  email: s.string().email(),
  createdAt: s.string().isoDateTime(),
});

const payload = await service.getUser(id);
const safePayload = UserResponseSchema.parse(payload);

const WebhookSchema = s.variant('type', {
  invoice_paid: s.object({ amount: s.number().positive(), invoiceId: s.string().uuid() }),
  subscription_canceled: s.object({ reason: s.string(), subscriptionId: s.string().uuid() }),
});

const event = WebhookSchema.parse(req.body);
```

### Pitfalls

- Assuming unknown keys are accepted in object payloads.
- Using `safeParse()` with async-only schemas containing async `check()`.
- Returning raw `ValidationError` messages to clients without shaping response fields.

### Related

- [Async](./async.md)
- [Forms](./forms.md)
- [Unions](./unions.md)
