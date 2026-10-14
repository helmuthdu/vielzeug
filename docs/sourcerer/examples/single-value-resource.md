---
title: 'Sourcerer Examples: Load a Single Value'
description: 'Load one reactive value with createResource and refetch it on demand.'
---

## Load a Single Value

### Problem

A profile needs observable loading, error, and refresh state without collection pagination.

### Solution

Use `createResource()` with `start: false` when you want to await the first load.

```ts
import { createResource } from '@vielzeug/sourcerer';

type Profile = { name: string };

const profile = createResource<Profile>({
  load: async ({ signal }) => {
    const response = await fetch('/api/me', { signal });
    if (!response.ok) throw new Error(`Profile request failed: ${response.status}`);
    return (await response.json()) as Profile;
  },
  start: false,
});

console.log(profile.state);
const stop = profile.subscribe((state) => console.log(state.data, state.loading, state.error));
try {
  await profile.reload();
} catch (error) {
  console.error(error);
} finally {
  stop();
  profile.dispose();
}
```

### Pitfalls

- A resource starts loading during construction by default; `start: false` defers it to `reload()`.
- The initial load has no caller to reject to, so its failure surfaces through `state.error`.
- A later `reload()` rejects so the awaiting caller sees the failure, and the previous `data` survives it.
- Disposal aborts the in-flight load and leaves `state` as it was.

### Related

- [Usage Guide](../usage#load-a-single-value)
- [Remote Data with Courier](./sourcerer-with-courier.md)
- [Resource types](../api#resource-types)
