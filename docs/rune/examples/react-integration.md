---
title: 'Rune Examples — React Integration'
description: 'React Integration example for @vielzeug/rune.'
---

## React Integration

### Problem

Components deep in a React tree need to log without importing the logger directly. A context-based logger makes the same instance available everywhere without prop-drilling.

### Solution

Create the logger outside the component body or inside a stable initializer, and use `withBindings()` in `useEffect` to pin per-instance fields.

```tsx
import { Rune } from '@vielzeug/rune';
import { useEffect } from 'react';

const log = Rune.child({ namespace: 'UserProfile' });

export function UserProfile({ userId }: { userId: string }) {
  useEffect(() => {
    // pin userId once — every call in this effect includes it automatically
    const scopedLog = log.withBindings({ userId });
    scopedLog.debug('mounted');

    return () => scopedLog.debug('unmounted');
  }, [userId]);

  return null;
}
```


### Pitfalls

- Creating a new logger inside the component body (not in a context) runs on every render, generating a new instance each time. Always create loggers outside the component or memoize them.
- `useContext(LogContext)` falls back to the default value passed to `createContext` when rendered outside a `Provider`. Ensure the default is a valid logger, not `null`.
- Logging inside the component body (not in `useEffect`) fires on every render, including React Strict Mode's double-invocations in development.

### Related

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
- [Dependency Injection (Conduit)](/conduit/)
