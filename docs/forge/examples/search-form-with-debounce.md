---
title: 'Forge Examples — Search Form with Debounce'
description: 'Search Form with Debounce examples for forge.'
---

## Search Form with Debounce

### Problem

A search input should trigger an API query as the user types, but not on every keystroke. Requests must be debounced so only the final value after a pause is sent, and stale responses must be ignored.

### Solution

Use `connect()` with `validateOnChange` and `debounce` to schedule async work after the user stops typing:

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({
  defaultValues: { query: '', category: 'all', sortBy: 'relevance' },
});

const queryConn = form.connect('query', {
  validateOnChange: true,
  debounce: 300,
});

// Register an async "validator" that runs the search and updates results
form.fields.setValidator('query', async (value, signal) => {
  if (!value || String(value).length < 2) {
    updateResultsUI([]);
    return undefined;
  }

  const category = form.get('category');
  const sortBy = form.get('sortBy');
  const url = `/api/search?q=${encodeURIComponent(String(value))}&category=${category}&sort=${sortBy}`;

  const response = await fetch(url, { signal });
  const results = await response.json();

  updateResultsUI(results);
  return undefined; // no error to display
});

function updateResultsUI(results: unknown[]) {
  console.log('Search results:', results);
}
```

### Pitfalls

- The validator receives an `AbortSignal`. Always pass it to `fetch` so stale requests are cancelled automatically when a newer keystroke triggers a new run.
- Subscribing to the full form state and triggering search inside `subscribe()` fires on every field change, including programmatic writes. Using `subscribeField('query', ...)` scopes the trigger correctly.
- Setting `debounce` too low defeats the purpose; 200–500 ms is a reasonable default for remote searches.

### Related

- [CRUD Operations (Courier)](/courier/examples/)
- [Login Form](./login-form.md)
- [Dynamic Form Fields](./dynamic-form-fields.md)
