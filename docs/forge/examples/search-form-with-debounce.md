---
title: 'Forge Examples — Search Form with Debounce'
description: 'Search Form with Debounce examples for forge.'
---

## Search Form with Debounce

### Problem

A search input should trigger an API query as the user types, but not on every keystroke. Requests must be debounced so only the final value after a pause is sent, and stale responses must be ignored.

### Solution

Search form with debounced API calls.

```typescript
import { createForm } from '@vielzeug/forge';

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

  const query = searchForm.get('query');

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

### Pitfalls

- The debounced function captures the field value via closure. If the component unmounts between the delay and the function firing, the API call still runs and may update unmounted state. Cancel on unmount.
- Using `subscribeForm` to trigger the search fires the callback on every field change, including programmatic writes. Add a dirty check if you only want user-initiated changes to trigger a search.
- Each keystroke must cancel the previous pending debounce timer, not create a new one. Use a single stable debounced function reference rather than creating a new one per event.

### Related
- [CRUD Operations (Courier)](@vielzeug/courier/examples/crud-operations)

- [Best Practices](./best-practices.md)
- [Contact Form with File Upload](./contact-form-with-file-upload.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
