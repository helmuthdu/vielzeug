---
title: 'Sourcerer Examples — Reactive Controls with Ripple'
description: 'Project page source state into Ripple signals.'
---

## Reactive Controls with Ripple

### Problem

You need a reactive search control to update one source and expose its current state.

### Solution

Subscribe once and replace source params from a Ripple effect.

```ts
import { effect, signal } from '@vielzeug/ripple';
import { createPageSource } from '@vielzeug/sourcerer';

const source = createPageSource({
  load: async ({ params: search }) => {
    const users = [{ name: 'Ada' }, { name: 'Grace' }, { name: 'Linus' }];
    const items = users.filter((user) => user.name.toLowerCase().includes(search.toLowerCase()));
    return { items, totalItems: items.length };
  },
  params: '',
});
const search = signal('');
const state = signal(source.state);
const stop = source.subscribe((next) => (state.value = next));
const stopEffect = effect(() => {
  void source.setParams(search.value).catch(() => undefined);
});

search.value = 'ada';

stopEffect.dispose();
stop();
source.dispose();
```

### Pitfalls

- Do not recreate a source inside an effect.
- Dispose both the subscription and effect with their owner.
- Debounce user input before changing remote params.

### Related

- [Ripple](/ripple/)
- [Framework integration](./framework-integration)
- [Page params with URL state](./remote-search-with-url-state)
