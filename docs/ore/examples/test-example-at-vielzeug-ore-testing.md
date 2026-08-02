---
title: 'Ore Examples — Test Example (@vielzeug/ore/testing)'
description: 'Test Example (@vielzeug/ore/testing) example for @vielzeug/ore.'
---

## Test Example (`@vielzeug/ore/testing`)

### Problem

You want to write unit tests for a Ore custom element — rendering it in a test environment, triggering events, and asserting on its DOM output without a real browser.

### Solution

Use `mount()` from `@vielzeug/ore/testing` to render components, and import generic interactions and async waiting
from `@vielzeug/assay`.

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { fireClick } from '@vielzeug/assay';
import { signal } from '@vielzeug/ripple';
import { define, html } from '@vielzeug/ore';
import { cleanup, mount } from '@vielzeug/ore/testing';

define('simple-counter', {
  setup() {
    const count = signal(0);

    return html`
      <button @click=${() => count.value--}>-</button>
      <strong>${count}</strong>
      <button @click=${() => count.value++}>+</button>
    `;
  },
});

describe('simple-counter', () => {
  afterEach(cleanup);

  it('increments on click', async () => {
    const fixture = await mount('simple-counter');
    const inc = fixture.queryAll<HTMLButtonElement>('button')[1]!;

    fireClick(inc);
    fireClick(inc);

    await fixture.flush();
    expect(fixture.get('strong').textContent).toBe('2');

    fixture.dispose();
  });
});
```

### Pitfalls

- Omitting `cleanup()` in `afterEach` leaks mounted elements into subsequent tests, causing flaky failures from shared DOM state.
- Shadow DOM queries require `fixture.query()` (which searches inside the shadow root), not `document.querySelector()` which only searches the light DOM.
- `fireClick()` is synchronous. Await `fixture.flush()` after an Ore interaction, or use Assay's
  `waitUntil()` only when application code schedules asynchronous work.

### Related

- [Vitest](https://vitest.dev/) for the test runner used by all Vielzeug packages
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
