---
title: 'Spell Examples — Validating API Payloads'
description: 'Validate HTTP payloads with spell before application code reads them.'
---

## Validating API Payloads

### Problem

An API handler receives unknown JSON. It must reject malformed input, keep typed output for the rest of the function, and return field-level diagnostics.

### Solution

Use one schema at the request boundary, then reuse the parsed value everywhere else.

```ts
import { ValidationError, s } from '@vielzeug/spell';

const CreateArticle = s.object({
  body: s.string().min(20),
  published: s.boolean().default(false),
  slug: s.string().slug(),
  title: s.string().min(3).max(120),
  tags: s.array(s.string().min(1)).default(() => []),
}).strict();

function handleCreateArticle(payload: unknown) {
  const parsed = CreateArticle.parse(payload);

  return {
    ...parsed,
    id: 'article-1',
  };
}

try {
  const article = handleCreateArticle({
    body: 'Spell keeps validation at the edge of the system.',
    slug: 'spell-docs-sync',
    title: 'Spell docs sync',
  });

  console.log(article.id);
} catch (error) {
  if (ValidationError.is(error)) {
    console.log(error.flattenFirst());
  }
}
```

### Pitfalls

- Object schemas reject unknown keys unless you call `.relaxed()`. Keep strict mode at public API boundaries unless extra keys are part of the contract.
- `parse()` throws on failure. Switch to `safeParse()` when the failure path is part of normal request handling.
- Use `.default(() => [])` for arrays and `.default(() => new Map())` for mutable defaults.

### Related

- [Usage Guide](../usage.md)
- [API Reference](../api.md)
- [Form-Safe Parsing](./forms.md)
