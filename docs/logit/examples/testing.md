---
title: 'Logit Examples — Testing'
description: 'Testing examples for logit.'
---

## Testing

## Problem

Implement testing in a production-friendly way with `@vielzeug/logit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/logit` installed.

```ts
import { Logit } from '@vielzeug/logit';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  Logit.setConfig({ logLevel: 'off' });
});

afterEach(() => {
  Logit.setConfig({ logLevel: 'debug' });
  vi.restoreAllMocks();
});

it('emits errors when enabled', () => {
  Logit.setConfig({ logLevel: 'error' });
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

  Logit.error('failure');

  expect(spy).toHaveBeenCalled();
});
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
