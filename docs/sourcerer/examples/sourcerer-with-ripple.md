---
title: 'Sourcerer Examples — Reactive Controls with Ripple'
description: 'Project a local source into Ripple signals.'
---

## Reactive Controls with Ripple

### Problem

You need one search control to update a source and one reactive view to consume its current snapshot.

### Solution

Subscribe once, store source snapshots in a Ripple signal, and project control state through `setQuery()`.

```ts
import { effect, signal } from '@vielzeug/ripple';
import { createLocalSource } from '@vielzeug/sourcerer';

const users = [{ name: 'Ada' }, { name: 'Grace' }];
const source = createLocalSource(users, {
  match: (user, search) => user.name.toLowerCase().includes(search.toLowerCase()),
});
const search = signal('');
const snapshot = signal(source.snapshot);
const stop = source.subscribe((next) => (snapshot.value = next));

const stopEffect = effect(() => {
  source.setQuery({ search: search.value });
});

search.value = 'ada';
console.log(snapshot.value.data); // [{ name: 'Ada' }]

stopEffect.dispose();
stop();
source.dispose();
```

### Pitfalls

- Do not recreate a source inside a reactive effect.
- Dispose both the source subscription and the effect with their owner.
- Debounce UI input before writing remote source queries.

### Related

- [Ripple](/ripple/)
- [Local pagination and search](./local-pagination-and-filtering)
- [Framework integration](./framework-integration)
