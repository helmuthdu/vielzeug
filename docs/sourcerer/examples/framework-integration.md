---
title: 'Sourcerer Examples — Framework Integration'
description: 'Subscribe to page source snapshots from a React component.'
---

## Framework Integration

### Problem

You need framework rendering to follow source snapshots without recreating a source during every render.

### Solution

Create one source per component lifetime and subscribe through the framework’s external-store API.

```tsx
import { createPageSource } from '@vielzeug/sourcerer';
import { useEffect, useMemo, useSyncExternalStore } from 'react';

type User = { id: number; name: string };
const users: User[] = [{ id: 1, name: 'Ada' }];

export function UserList() {
  const source = useMemo(
    () =>
      createPageSource<User>({
        load: async () => ({ data: users, total: users.length }),
      }),
    [],
  );
  const snapshot = useSyncExternalStore(source.subscribe, () => source.snapshot);

  useEffect(() => () => source.dispose(), [source]);

  if (snapshot.isFetching && snapshot.data.length === 0) return <p>Loading</p>;
  if (snapshot.error) return <p>{snapshot.error.message}</p>;

  return <ul>{snapshot.data.map((user) => <li key={user.id}>{user.name}</li>)}</ul>;
}
```

### Pitfalls

- Keep the source stable with `useMemo()` or equivalent lifecycle ownership.
- Dispose sources when their component unmounts.
- Render loaded `snapshot.data` while `pendingQuery` indicates newer work.

### Related

- [Usage Guide](../usage#framework-integration)
- [Reactive controls with Ripple](./sourcerer-with-ripple)
- [Page source API](../api#createpagesource)
