---
title: 'Logit Examples — Timing and Grouping'
description: 'Timing and Grouping examples for logit.'
---

## Timing and Grouping

## Problem

Implement timing and grouping in a production-friendly way with `@vielzeug/logit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/logit` installed.

```ts
const result = await Logit.group(
  'Checkout',
  async () => {
    Logit.info('validating cart');

    return Logit.time('process-order', () => processOrder(cart));
  },
  true,
);
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
