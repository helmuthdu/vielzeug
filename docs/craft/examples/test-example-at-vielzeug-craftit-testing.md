---
title: 'Craft Examples — Test Example (`@vielzeug/craft/testing`)'
description: 'Test Example (`@vielzeug/craft/testing`) for craft.'
---

## Test Example (`@vielzeug/craft/testing`)

### Problem

You want to write unit tests for a Craft custom element — rendering it in a test environment, triggering events, and asserting on its DOM output without a real browser.

### Solution

```ts
import { cleanup, mount, user, waitFor } from '@vielzeug/craft/testing';

const fixture = await mount('simple-counter');
const inc = fixture.queryAll<HTMLButtonElement>('button')[1]!;

await user.click(inc);
await user.click(inc);

await waitFor(() => fixture.query('strong')?.textContent === '2');

fixture.destroy();
cleanup();
```


### Pitfalls

- Custom elements registered in one test can leak into subsequent tests. Use `TestBed.reset()` between tests to clear the registry.
- `connectedCallback` (and therefore `onMounted`) does not run until the element is appended to the test container. Reactive state reads before connection return initial values.
- Shadow DOM queries use `element.shadowRoot.querySelector`, not `document.querySelector`. Forgetting this silently returns `null`.

### Related

- [Context Provider and Consumer](./context-provider-and-consumer.md)
- [Counter Component](./counter-component.md)
- [Form-Associated Rating Input](./form-associated-rating-input.md)
