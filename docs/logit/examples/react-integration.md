---
title: 'Logit Examples — React Integration'
description: 'React Integration examples for logit.'
---

## React Integration

## Problem

Implement react integration in a production-friendly way with `@vielzeug/logit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/logit` installed.

```tsx
import { Logit } from '@vielzeug/logit';
import { useEffect } from 'react';

const log = Logit.scope('UserProfile');

export function UserProfile({ userId }: { userId: string }) {
  useEffect(() => {
    log.debug('mounted', { userId });

    return () => log.debug('unmounted', { userId });
  }, [userId]);

  return null;
}
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Child Logger Overrides](./child-logger-overrides.md)
- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
