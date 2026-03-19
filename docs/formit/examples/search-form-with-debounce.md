---
title: 'Formit Examples — Search Form with Debounce'
description: 'Search Form with Debounce examples for formit.'
---

## Search Form with Debounce

## Problem

Implement search form with debounce in a production-friendly way with `@vielzeug/formit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/formit` installed.

Search form with debounced API calls.

```typescript
import { createForm } from '@vielzeug/formit';

const searchForm = createForm({
  defaultValues: {
    query: '',
    category: 'all',
    sortBy: 'relevance',
  },
});

let searchTimeout: ReturnType<typeof setTimeout>;

// Subscribe and debounce search
searchForm.subscribe(() => {
  clearTimeout(searchTimeout);

  const query = searchForm.get<string>('query');

  if (!query || query.length < 2) {
    updateResultsUI([]);
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const category = searchForm.get('category');
      const sortBy = searchForm.get('sortBy');

      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&category=${category}&sort=${sortBy}`);

      const results = await response.json();
      updateResultsUI(results);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }, 300);
});

function updateResultsUI(results: unknown[]) {
  console.log('Search results:', results);
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
