---
title: Assay — Usage Guide
description: How-to guide for scoped queries, event dispatch, and async waiting with @vielzeug/assay.
---

[[toc]]

## Basic Usage

`within(element)` scopes queries to a subtree — useful for slotted content, shadow roots, or any container you don't want to re-select from `document` on every assertion.

```ts
import { within } from '@vielzeug/assay';

const panel = document.querySelector('.panel')!;
const { query, queryAll, queryByText } = within(panel);

query('.title'); // Element | null, scoped to panel
queryAll('.item'); // Element[], scoped to panel
queryByText('Save'); // matches trimmed textContent
```

`queryByTestId`/`queryAllByTestId` match a `data-testid` attribute — useful when text content or CSS structure is likely to change but a stable test hook is worth keeping:

```ts
const { queryByTestId } = within(panel);

queryByTestId('save-button')?.click();
```

Every `QueryScope` method is also available as a free function taking the root as its first argument — reach for these when you already have a root in scope and don't need the rest of `within()`'s object:

```ts
import { query, queryAll, queryByTestId, queryAllByTestId } from '@vielzeug/assay';

query(panel, '.title');
queryAll(panel, '.item');
queryByTestId(panel, 'save-button');
queryAllByTestId(panel, 'item-row');
```

For a custom element's shadow DOM, use `queryInShadow`/`queryAllInShadow`/`queryPart` instead — they return `null`/`[]` rather than throwing when the host has no shadow root (e.g. a `shadow: false` component), so you don't need an `if (host.shadowRoot)` guard at every call site:

```ts
import { queryAllInShadow, queryInShadow, queryPart } from '@vielzeug/assay';

queryInShadow(customEl, '.internal-label');
queryAllInShadow(customEl, '.option');
queryPart(customEl, 'trigger'); // shorthand for queryInShadow(host, '[part="trigger"]')
```

`getSlotted()` reads the *light*-DOM children a host projects into a named slot (or every slotted child with no argument) — the complement to the shadow-DOM helpers above:

```ts
import { getSlotted } from '@vielzeug/assay';

const slides = getSlotted(carousel); // default slot
const actions = getSlotted(dialog, 'footer'); // named slot
```

## Firing Events

`fire.*` dispatches real DOM events synchronously — no framework-specific event simulation layer, just `dispatchEvent` with sensible defaults (`bubbles: true`, `cancelable: true` where that matches the real event's behavior). Every method returns the same `boolean` `dispatchEvent` itself returns (`false` when a listener called `preventDefault()`), with no exceptions — useful for asserting a handler actually intercepted the event:

```ts
import { fire } from '@vielzeug/assay';

fire.click(button);
fire.input(textInput); // fires a plain 'input' Event
fire.keyDown(textInput, { key: 'Enter' });
fire.custom(el, 'value-change', { detail: { value: 42 } });

const notPrevented = fire.click(link); // false if a listener called preventDefault()
```

Pointer events fall back to `MouseEvent` in environments without a `PointerEvent` constructor (some older jsdom versions) — Assay logs a one-time `console.warn` the first time this happens, so an environment gap doesn't show up as a confusing, unrelated test failure instead:

```ts
fire.pointerDown(slider);
fire.pointerMove(slider, { clientX: 120 });
fire.pointerUp(slider);
```

Dispatch a pre-built event instance directly with `fire.event` when you need full control over the event's properties:

```ts
fire.event(el, new CustomEvent('ready', { bubbles: true, detail: { ok: true } }));
```

## Waiting for Async Conditions

`waitFor()` polls a callback until it returns truthy (or doesn't throw, for a bare `expect()` call) — use it for anything that updates asynchronously (a reactive framework's next render, a debounced input handler, a `fetch` completing).

```ts
import { waitFor } from '@vielzeug/assay';

await waitFor(() => panel.querySelector('.status')?.textContent === 'Ready');

// Works with `expect()` assertions too — a thrown assertion error means "not yet",
// and its message is folded into the AssayTimeoutError thrown if the timeout is reached
// (see below — the assertion's own error type never escapes waitFor() directly).
await waitFor(() => expect(callback).toHaveBeenCalled());
```

Tune the polling interval and timeout per call — the defaults (1000ms timeout, 50ms interval) suit most reactive UI updates:

```ts
await waitFor(() => queue.isEmpty(), { interval: 10, timeout: 5000 });
```

`waitForEvent()` resolves with the next matching event instead of polling — prefer it when you're waiting on something that's guaranteed to fire an event rather than settle into an observable DOM state:

```ts
import { fire, waitForEvent } from '@vielzeug/assay';

const promise = waitForEvent<CustomEvent<{ id: string }>>(el, 'item-added');

fire.click(addButton);

const event = await promise;
console.log(event.detail.id);
```

Both `waitFor()` and `waitForEvent()` reject with `AssayTimeoutError` on timeout — unconditionally, even if the last attempt inside `waitFor()` threw a different error type (an `expect()` assertion, say). Catch `AssayTimeoutError` specifically when you want to distinguish "the condition never became true" from other failures; the original failure is preserved on `.cause` if you need it:

```ts
import { AssayTimeoutError, waitForEvent } from '@vielzeug/assay';

try {
  await waitForEvent(el, 'never-fires', 100);
} catch (err) {
  if (err instanceof AssayTimeoutError) {
    // expected — assert on the timeout itself, or inspect err.cause for the original failure
  }
}
```

`nextTick()` and `wait()` cover the two other common timing needs: waiting for reactivity to settle, and waiting for a real macrotask delay.

```ts
import { nextTick, wait } from '@vielzeug/assay';

signal.value = 'updated';
await nextTick(); // let a microtask-scheduled effect run

await wait(300); // wait out a debounce timer — prefer nextTick()/waitFor() where possible
```

## Testing Custom Elements

Assay has no opinion about how your DOM was produced — it works the same way against a vanilla custom element, a framework-rendered component, or plain `document.createElement` output.

```ts
import { fire, waitFor, within } from '@vielzeug/assay';

customElements.define(
  'my-counter',
  class extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<button>+1</button><span class="count">0</span>`;
      this.querySelector('button')!.addEventListener('click', () => {
        const span = this.querySelector('.count')!;

        span.textContent = String(Number(span.textContent) + 1);
      });
    }
  },
);

const el = document.createElement('my-counter');

document.body.appendChild(el);

const { query } = within(el);

fire.click(query('button')!);

await waitFor(() => query('.count')?.textContent === '1');

el.remove();
```

## Working with Other Vielzeug Libraries

`@vielzeug/ore`'s `./testing` sub-path re-exports Assay's `within`, `fire`, `createPointerEvent`, `waitFor`, and `waitForEvent` directly — if you're already testing Ore components, you don't need a separate Assay import:

```ts
import { fire, mount, waitFor } from '@vielzeug/ore/testing';

const { query } = await mount(() => html`<button @click=${() => {}}>Click</button>`);

fire.click(query('button')!);
```

`@vielzeug/refine`'s `./testing` sub-path re-exports Assay's `queryInShadow`, `queryAllInShadow`, `queryPart`, `getSlotted`, `nextTick`, and `wait` the same way, alongside refine-specific helpers (ARIA attribute assertions, form-associated helpers) that stay in refine because they're specific to testing ore/refine component *contracts*, not generic DOM interaction:

```ts
import { getAriaState, getSlotted, nextTick } from '@vielzeug/refine/testing';
```

Import from `@vielzeug/assay` directly when testing DOM code that has nothing to do with Ore or Refine — a vanilla custom element, a framework-rendered component, or plain event-handler logic.

## Best Practices

- Prefer `within(element)` over repeated `element.querySelector(...)` calls — it reads better at call sites with multiple assertions against the same subtree.
- Use `queryByTestId` for elements whose text or structure is expected to change; use `queryByText` when the visible text itself is what you're asserting on.
- Reach for `waitForEvent()` over `waitFor()` when the thing you're waiting on is guaranteed to dispatch an event — it resolves on the first matching event instead of polling.
- Catch `AssayTimeoutError` specifically (not a bare `Error`) when a test needs to branch on "the condition never happened" versus any other failure.
- Keep `fire.*` calls synchronous where the real user interaction would be — `fire.click()` doesn't await anything; `await` the assertion that follows it instead.
- Remove elements you create directly with `document.createElement` (`el.remove()`) at the end of each test — Assay itself has no auto-cleanup registry, unlike `@vielzeug/ore/testing`'s `mount()`/`cleanup()`.
- Prefer `queryInShadow`/`queryAllInShadow` over `host.shadowRoot!.querySelector(...)` — the non-null assertion breaks the moment a component is tested with `shadow: false`, while `queryInShadow` degrades to `null` instead of throwing.
