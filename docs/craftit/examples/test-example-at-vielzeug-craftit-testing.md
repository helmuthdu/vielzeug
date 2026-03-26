---
title: 'Craftit Examples — Test Example (`@vielzeug/craftit/testing`)'
description: 'Test Example (`@vielzeug/craftit/testing`) for craftit.'
---

## Test Example (`@vielzeug/craftit/testing`)

## Problem

Implement test example (`@vielzeug/craftit/testing`) in a production-friendly way with `@vielzeug/craftit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/craftit` installed.

```ts
import { cleanup, mount, user, waitFor } from '@vielzeug/craftit/testing';

const fixture = await mount('simple-counter');
const inc = fixture.queryAll<HTMLButtonElement>('button')[1]!;

await user.click(inc);
await user.click(inc);

await waitFor(() => fixture.query('strong')?.textContent === '2');

fixture.destroy();
cleanup();
```

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Context Provider and Consumer](./context-provider-and-consumer.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
