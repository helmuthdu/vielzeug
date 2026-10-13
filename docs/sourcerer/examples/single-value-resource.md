---
title: 'Sourcerer Examples: Load a Single Value'
description: 'Load one reactive value with createResource and refetch it on demand.'
---

## Load a Single Value

### Problem

A profile, a settings document, or a pricing summary needs observable loading, error, and refresh state, but paginating one object would be ceremony.

### Solution

Use `createResource()` for the one-shot sibling of the paginated sources.

```ts
import { createResource } from '@vielzeug/sourcerer';

type Profile = { name: string };

const profile = createResource<Profile>({
  load: async ({ signal }) => {
    const response = await fetch('/api/me', { signal });
    return (await response.json()) as Profile;
  },
});

profile.subscribe((state) => render(state.data, state.loading, state.error));

await profile.reload();
profile.dispose();
```

### Pitfalls

- A resource starts loading during construction; pass `{ start: false }` to open the window yourself.
- The initial load has no caller to reject to, so its failure surfaces through `state.error`.
- A later `reload()` rejects so the awaiting caller sees the failure, and the previous `data` survives it.
- Disposal aborts the in-flight load and leaves `state` as it was.

### Related

- [Usage Guide](../usage#load-a-single-value)
- [Remote Data with Courier](./sourcerer-with-courier.md)
- [Resource types](../api#resource-types)
