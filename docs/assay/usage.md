---
title: Assay — Usage Guide
description: Scoped DOM queries, exact event dispatch, and cancellable waiting with @vielzeug/assay.
---

[[toc]]

## Basic Usage

`within(root)` is Assay's query API. It accepts an element, document fragment, or shadow root and keeps every lookup
in that scope. Use `get*` when a match is required and nullable `query*` methods when absence is part of the assertion.

```ts
import { within } from '@vielzeug/assay';

const view = within(panel.shadowRoot!);

const save = view.get<HTMLButtonElement>('button.save');
const status = view.queryByText('Saved');

expect(view.query('.error')).toBeNull();
expect(view.getByTestId('summary').textContent).toContain('Complete');
```

`get()`, `getByText()`, and `getByTestId()` throw `AssayQueryError` with the lookup and a bounded rendering of the
scoped DOM. This keeps a failed required lookup diagnosable without non-null assertions.

Use the cross-boundary helpers for custom elements:

```ts
import { getSlotted, queryAllInShadow, queryPart } from '@vielzeug/assay';

const trigger = queryPart(menu, 'trigger');
const options = queryAllInShadow(menu, '[role="option"]');
const footerActions = getSlotted(dialog, 'footer');
```

## Exact event dispatch

Assay dispatches the platform event class named by each helper. It does not model browser activation, focus
management, or form defaults. `fireFocus()` and `fireBlur()` use their non-bubbling platform defaults; use
`focusin`/`focusout` events when testing delegated focus listeners. Use `element.click()` when native activation is
the behavior under test; use Assay when testing an event listener or a controlled state transition.

```ts
import { fireClick, fireCustom, fireInput, fireKeyDown } from '@vielzeug/assay';

input.value = 'Ada';
fireInput(input);

fireKeyDown(input, { key: 'Enter' });
fireClick(saveButton);
fireCustom(panel, { detail: { value: 42 }, type: 'value-change' });
```

Every helper returns `dispatchEvent()`'s boolean result. `dispatch(target, event)` is available when an existing
event instance is the clearest expression of the test.

## Waiting

Choose the waiting primitive by the test's assertion shape:

```ts
import { delay, retry, waitForEvent, waitUntil } from '@vielzeug/assay';

await waitUntil(() => panel.querySelector('.status')?.textContent === 'Ready');

await retry(() => {
  expect(onSave).toHaveBeenCalledOnce();
});

const completed = waitForEvent<CustomEvent<{ id: string }>>(panel, 'save-complete', {
  signal: AbortSignal.timeout(1000),
});
fireClick(saveButton);
expect((await completed).detail.id).toBeDefined();

await delay(100); // real timer dependency, such as a debounce
```

`waitUntil()` retries only a boolean predicate. `retry()` retries only a callback that throws until it succeeds.
Both, and `waitForEvent()`, accept `timeout` and `signal`; `waitUntil()` and `retry()` also accept `interval`.
Timeouts reject with `AssayTimeoutError`; aborts reject with the signal's reason.

`nextTick()` resolves after one microtask. Prefer it for microtask-scheduled reactive work over a timer delay.

## Testing custom elements

Use Ore for component mounting and Assay for generic DOM concerns:

```ts
import { fireClick } from '@vielzeug/assay';
import { html } from '@vielzeug/ore';
import { mount } from '@vielzeug/ore/testing';

const fixture = await mount(
  () => html`
    <button @click=${onSave}>Save</button>
  `,
);

fireClick(fixture.get('button'));
await fixture.flush();

expect(onSave).toHaveBeenCalledOnce();
```

Refine's testing entry point contains only Refine-specific assertions and typed mount wrappers. Import Assay helpers
directly instead of routing generic DOM operations through another package.

## Best Practices

- Scope multiple assertions with `within()` rather than repeatedly querying the document.
- Prefer `get*` for required controls and `query*` for intentional absence checks.
- Make form state and event boundaries explicit: assign `.value`, then call `fireInput()` or `fireChange()`.
- Use browser integration tests for focus, disabled activation, pointer capture, and other browser-default behavior.
- Use `waitForEvent()` for an emitted event, `waitUntil()` for a condition, and `retry()` for assertions.
