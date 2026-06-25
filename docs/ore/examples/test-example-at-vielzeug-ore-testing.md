---
title: 'Ore Examples — Test Example (@vielzeug/ore/testing)'
description: 'Test Example (@vielzeug/ore/testing) example for @vielzeug/ore.'
---

## Test Example (`@vielzeug/ore/testing`)

### Problem

You want to write unit tests for a Ore custom element — rendering it in a test environment, triggering events, and asserting on its DOM output without a real browser.

### Solution

Use `mount()` from `@vielzeug/ore/testing` to render components, `fire.*` or `user.*` for interactions, and `waitFor()` for async assertions.

```ts
import { describe, expect, it } from 'vitest';
import { cleanup, mount, user, waitFor } from '@vielzeug/ore/testing';

// Assumes 'simple-counter' is defined elsewhere
describe('simple-counter', () => {
  afterEach(cleanup);

  it('increments on click', async () => {
    const fixture = await mount('simple-counter');
    const inc = fixture.queryAll<HTMLButtonElement>('button')[1]!;

    await user.click(inc);
    await user.click(inc);

    await waitFor(() => fixture.query('strong')?.textContent === '2');

    fixture.destroy();
  });
});
```

### Pitfalls

- Omitting `cleanup()` in `afterEach` leaks mounted elements into subsequent tests, causing flaky failures from shared DOM state.
- Shadow DOM queries require `fixture.query()` (which searches inside the shadow root), not `document.querySelector()` which only searches the light DOM.
- `user.click()` is async and triggers reactive updates. Always `await` it before asserting on DOM changes.

### Related

- [Vitest](https://vitest.dev/) for the test runner used by all Vielzeug packages
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
