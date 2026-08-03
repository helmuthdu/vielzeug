---
title: 'Forge Examples — Search Form with Debounce'
description: Debounce application-owned search work from a field subscription.
---

## Search Form with Debounce

### Problem

A search input should request results after typing pauses. Search is application behavior, not form validation, so it needs its own timer and cancellation policy.

### Solution

Subscribe to the query field and debounce the search side effect outside Forge.

```ts
import { createForm } from '@vielzeug/forge';

const form = createForm({ initialValues: { query: '' } });
const query = form.field('query');
let timer: ReturnType<typeof setTimeout> | undefined;

const stop = query.subscribe(({ value }) => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (value.length >= 2) console.log(`Search for ${value}`);
  }, 300);
});

query.set('forge');
stop();
clearTimeout(timer);
```

### Pitfalls

- Cancel the timer when the screen unmounts.
- Abort in-flight network requests separately; a debounce timer cannot cancel a completed request.
- Keep search effects outside the form validator unless search validity is part of submission rules.

### Related

- [Dynamic Form Fields](./dynamic-form-fields.md)
- [Scout](/scout/)
- [Sourcerer](/sourcerer/)
