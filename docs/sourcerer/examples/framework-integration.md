---
title: 'Sourcerer Examples — Framework Integration'
description: 'Subscribe to page source state from a React component.'
---

## Framework Integration

### Problem

You need framework rendering to follow source state without recreating a source during every render.

### Solution

Create one source per component lifetime and bridge `subscribe()` to the external-store API.

```tsx
import { createPageSource } from '@vielzeug/sourcerer';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

type User = { id: number; name: string };
const users: User[] = [{ id: 1, name: 'Ada' }];

export function UserList() {
  const source = useMemo(
    () => createPageSource<User>({ load: async () => ({ items: users, totalItems: users.length }) }),
    [],
  );
  const state = useSyncExternalStore(source.subscribe, () => source.state);

  useEffect(() => {
    void source.reload().catch(() => undefined);
    return () => source.dispose();
  }, [source]);

  if (state.loading && state.items.length === 0) return <p>Loading</p>;
  if (state.error) return <p>{state.error.message}</p>;
  return <ul>{state.items.map((user) => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

### Pitfalls

- Keep the source stable for the component lifetime.
- Dispose the source when the component unmounts.
- Handle command rejection while rendering failures from `state.error`.

### Related

- [Usage Guide](../usage#framework-integration)
- [Reactive controls with Ripple](./sourcerer-with-ripple)
- [Page source API](../api#createpagesource)
