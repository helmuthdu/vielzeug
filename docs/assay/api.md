---
title: Assay — API Reference
description: API reference for @vielzeug/assay queries, event dispatch, and async waiting.
---

[[toc]]

## Queries

### `within(root)`

Creates a `QueryScope` for an `Element`, `ShadowRoot`, `Document`, or `DocumentFragment`.

| Method | Returns | Use |
| --- | --- | --- |
| `get(selector)` | `Element` | Required CSS match; throws `AssayQueryError` |
| `query(selector)` | `Element \| null` | Optional CSS match |
| `queryAll(selector)` | `Element[]` | All CSS matches |
| `getByText(text, selector?)` | `Element` | Required exact trimmed-text match |
| `queryByText(text, selector?)` | `Element \| null` | Optional exact trimmed-text match |
| `queryAllByText(text, selector?)` | `Element[]` | All exact trimmed-text matches |
| `getByTestId(id)` | `Element` | Required `data-testid` match |
| `queryByTestId(id)` | `Element \| null` | Optional `data-testid` match |
| `queryAllByTestId(id)` | `Element[]` | All `data-testid` matches |

Text selectors default to `'*'`. Required-query failures include the lookup and a bounded view of the scoped DOM.

### Shadow and slot helpers

| Function | Returns | Description |
| --- | --- | --- |
| `queryInShadow(host, selector)` | `Element \| null` | First match in an open shadow root |
| `queryAllInShadow(host, selector)` | `Element[]` | All matches in an open shadow root |
| `queryPart(host, part)` | `Element \| null` | First shadow element whose `part` token matches |
| `getSlotted(host, slotName?)` | `Element[]` | Direct light-DOM children in a named or default slot |

These helpers return `null` or `[]` when there is no shadow root. Dynamic test IDs, parts, and slot names are matched
as attribute values rather than interpolated into CSS selectors.

## Event dispatch

All event helpers synchronously return `dispatchEvent()`'s boolean result.

```ts
import {
  dispatch,
  fireBlur,
  fireChange,
  fireClick,
  fireCustom,
  fireFocus,
  fireInput,
  fireKeyDown,
  fireKeyUp,
  fireSubmit,
} from '@vielzeug/assay';

fireClick(button, { clientX: 20 });
fireInput(input);
fireKeyDown(input, { key: 'Enter' });
fireCustom(element, { detail: { id: '42' }, type: 'item-added' });
dispatch(element, new Event('ready'));
```

| Function | Event class | Defaults |
| --- | --- | --- |
| `fireBlur` / `fireFocus` | `FocusEvent` | Platform defaults (`bubbles: false`) |
| `fireChange` | `Event` | `bubbles: true` |
| `fireInput` | `InputEvent` | `bubbles: true` |
| `fireClick` | `MouseEvent` | `bubbles: true`, `cancelable: true` |
| `fireKeyDown` / `fireKeyUp` | `KeyboardEvent` | `bubbles: true`, `cancelable: true` |
| `fireSubmit` | `SubmitEvent` | `bubbles: true`, `cancelable: true` |
| `fireCustom` | `CustomEvent` | `bubbles: true`, `cancelable: true`, `composed: false` |

`fireCustom(target, { type, ...init })` requires the event type in its options object. Assay intentionally does not
provide browser-default or fallback pointer/touch simulation.

## Async waiting

```ts
await waitUntil(() => ready, { interval: 20, signal, timeout: 1000 });
await retry(() => expect(spy).toHaveBeenCalled(), { signal, timeout: 1000 });
await waitForEvent(target, 'ready', { signal, timeout: 1000 });
await delay(100, { signal });
await nextTick();
```

| Function | Success condition | Options |
| --- | --- | --- |
| `waitUntil(predicate, options?)` | Predicate returns `true` | `timeout`, `interval`, `signal` |
| `retry(assertion, options?)` | Assertion stops throwing | `timeout`, `interval`, `signal`, `message` |
| `waitForEvent(target, type, options?)` | Target emits `type` | `timeout`, `signal` |
| `delay(ms?, options?)` | Timer elapses | `signal` |
| `nextTick()` | Next microtask | none |

`waitUntil`, `retry`, and `waitForEvent` reject with `AssayTimeoutError` when their timeout expires. A supplied abort
signal rejects with its reason and removes timers and event listeners.

## Errors

| Error | Meaning |
| --- | --- |
| `AssayError` | Base class for Assay-originated errors |
| `AssayQueryError` | A required `get*` query had no match |
| `AssayTimeoutError` | A wait operation reached its timeout |

`AssayError.is(value)` narrows any value to the Assay error hierarchy.
