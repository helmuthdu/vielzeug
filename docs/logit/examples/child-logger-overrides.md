---
title: 'Logit Examples — Child Logger Overrides'
description: 'Child Logger Overrides examples for logit.'
---

## Child Logger Overrides

## Problem

Implement child logger overrides in a production-friendly way with `@vielzeug/logit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/logit` installed.

```ts
import { createLogger } from '@vielzeug/logit';

const base = createLogger({ logLevel: 'info', namespace: 'app' });
const verbose = base.child({ logLevel: 'debug' });

base.info('base flow');
verbose.debug('debug details for one path');
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Module Logger Pattern](./module-logger-pattern.md)
- [Production Setup](./production-setup.md)
- [React Integration](./react-integration.md)
