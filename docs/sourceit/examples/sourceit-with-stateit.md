---
title: Sourceit + Stateit
description: Drive a Sourceit model from Stateit signals and stores.
---

`@vielzeug/stateit` complements Sourceit when filters, search text, or view settings are shared across multiple UI elements.

```ts
import { effect, store } from '@vielzeug/stateit';
import { createLocalSource, sortBy } from '@vielzeug/sourceit';

const users = [
  { id: 1, name: 'Ada Lovelace', role: 'admin' },
  { id: 2, name: 'Grace Hopper', role: 'admin' },
  { id: 3, name: 'Linus Torvalds', role: 'member' },
  { id: 4, name: 'Margaret Hamilton', role: 'member' },
];

const source = createLocalSource(users, { limit: 2 });
const controls = store({
  query: '',
  role: 'all' as 'all' | 'admin' | 'member',
  sort: 'name' as 'name' | 'role',
});

// Reactively project shared UI state into the source model.
effect(() => {
  source.update((ctx) => {
    ctx.search(controls.value.query);
    ctx.setFilter(
      controls.value.role === 'all'
        ? undefined
        : (user) => user.role === controls.value.role,
    );
    ctx.setSort(
      controls.value.sort === 'name'
        ? sortBy((user) => user.name, 'asc')
        : sortBy((user) => user.role, 'asc'),
    );
  });
});

controls.patch({ query: 'a' });
controls.patch({ role: 'admin' });
console.log(source.current, source.meta);
```

Use this pattern when Sourceit is your list engine and Stateit is your app-wide reactive coordination layer.
