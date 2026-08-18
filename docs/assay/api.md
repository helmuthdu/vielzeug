---
title: Assay — API Reference
description: API reference for @vielzeug/assay queries, event dispatch, and async waiting.
---

[[toc]]

## API Overview

| Symbol                                       | Purpose                                     | Execution mode | Common gotcha                                    |
| -------------------------------------------- | ------------------------------------------- | -------------- | ------------------------------------------------ |
| `within`                                     | Creates scoped query API                    | Sync           | Required `get*` methods throw `AssayQueryError`  |
| `queryInShadow` / `queryPart` / `getSlotted` | Crosses custom-element boundaries           | Sync           | Open shadow roots are required                   |
| `fire*` / `dispatch`                         | Dispatches platform event instances         | Sync           | Does not reproduce browser default behavior      |
| `waitUntil` / `retry` / `waitForEvent`       | Waits for conditions, assertions, or events | Async          | Use a signal or timeout for bounded waits        |
| `delay` / `nextTick`                         | Schedules timers or microtasks              | Async          | Prefer `nextTick()` for microtask-scheduled work |

## Package Entry Point

| Import            | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `@vielzeug/assay` | DOM queries, events, wait helpers, errors, and types |

## Queries

### `within(root)`

Creates a `QueryScope` for an `Element`, `ShadowRoot`, `Document`, or `DocumentFragment`.

| Method                            | Returns           | Use                                          |
| --------------------------------- | ----------------- | -------------------------------------------- |
| `get(selector)`                   | `Element`         | Required CSS match; throws `AssayQueryError` |
| `query(selector)`                 | `Element \| null` | Optional CSS match                           |
| `queryAll(selector)`              | `Element[]`       | All CSS matches                              |
| `getByText(text, selector?)`      | `Element`         | Required exact trimmed-text match            |
| `queryByText(text, selector?)`    | `Element \| null` | Optional exact trimmed-text match            |
| `queryAllByText(text, selector?)` | `Element[]`       | All exact trimmed-text matches               |
| `getByTestId(id)`                 | `Element`         | Required `data-testid` match                 |
| `queryByTestId(id)`               | `Element \| null` | Optional `data-testid` match                 |
| `queryAllByTestId(id)`            | `Element[]`       | All `data-testid` matches                    |

Text selectors default to `'*'`. Required-query failures include the lookup and a bounded view of the scoped DOM.

### Shadow and slot helpers

| Function                           | Returns           | Description                                          |
| ---------------------------------- | ----------------- | ---------------------------------------------------- |
| `queryInShadow(host, selector)`    | `Element \| null` | First match in an open shadow root                   |
| `queryAllInShadow(host, selector)` | `Element[]`       | All matches in an open shadow root                   |
| `queryPart(host, part)`            | `Element \| null` | First shadow element whose `part` token matches      |
| `getSlotted(host, slotName?)`      | `Element[]`       | Direct light-DOM children in a named or default slot |

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
fireCustom(element, 'item-added', { detail: { id: '42' } });
dispatch(element, new Event('ready'));
```

| Function                    | Event class     | Defaults                                               |
| --------------------------- | --------------- | ------------------------------------------------------ |
| `fireBlur` / `fireFocus`    | `FocusEvent`    | Platform defaults (`bubbles: false`)                   |
| `fireChange`                | `Event`         | `bubbles: true`                                        |
| `fireInput`                 | `InputEvent`    | `bubbles: true`                                        |
| `fireClick`                 | `MouseEvent`    | `bubbles: true`, `cancelable: true`                    |
| `fireKeyDown` / `fireKeyUp` | `KeyboardEvent` | `bubbles: true`, `cancelable: true`                    |
| `fireSubmit`                | `SubmitEvent`   | `bubbles: true`, `cancelable: true`                    |
| `fireCustom`                | `CustomEvent`   | `bubbles: true`, `cancelable: true`, `composed: false` |

`fireCustom(target, type, init?)` dispatches a `CustomEvent` with the given type. Assay intentionally does not
provide browser-default or fallback pointer/touch simulation.

## Async waiting

```ts
await waitUntil(() => ready, { interval: 20, signal, timeout: 1000 });
await retry(() => expect(spy).toHaveBeenCalled(), { signal, timeout: 1000 });
await waitForEvent(target, 'ready', { signal, timeout: 1000 });
await delay(100, { signal });
await nextTick();
```

| Function                               | Success condition        | Options                                    |
| -------------------------------------- | ------------------------ | ------------------------------------------ |
| `waitUntil(predicate, options?)`       | Predicate returns `true` | `timeout`, `interval`, `signal`            |
| `retry(assertion, options?)`           | Assertion stops throwing | `timeout`, `interval`, `signal`, `message` |
| `waitForEvent(target, type, options?)` | Target emits `type`      | `timeout`, `signal`                        |
| `delay(ms?, options?)`                 | Timer elapses            | `signal`                                   |
| `nextTick()`                           | Next microtask           | none                                       |

`waitUntil`, `retry`, and `waitForEvent` reject with `AssayTimeoutError` when their timeout expires. A supplied abort
signal rejects with its reason and removes timers and event listeners.

## Types

```ts
export interface QueryScope {
  get<E extends Element = Element>(selector: string): E;
  getByTestId<E extends Element = Element>(testId: string): E;
  getByText<E extends Element = Element>(text: string, selector?: string): E;
  query<E extends Element = Element>(selector: string): E | null;
  queryAll<E extends Element = Element>(selector: string): E[];
  queryAllByTestId<E extends Element = Element>(testId: string): E[];
  queryAllByText<E extends Element = Element>(text: string, selector?: string): E[];
  queryByTestId<E extends Element = Element>(testId: string): E | null;
  queryByText<E extends Element = Element>(text: string, selector?: string): E | null;
}
```

Scoped query helpers returned by `within(root)`.

```ts
export interface WaitOptions {
  /** Polling interval in ms (default: 50). */
  interval?: number;
  /** Cancel the pending wait. */
  signal?: AbortSignal;
  /** Maximum wait time in ms (default: 1000). */
  timeout?: number;
}

export interface RetryOptions extends WaitOptions {
  /** Context included in the timeout error. */
  message?: string;
}

export interface DelayOptions {
  /** Cancel the pending delay. */
  signal?: AbortSignal;
}
```

`WaitOptions` configures `waitUntil`. `RetryOptions` extends it for `retry`. `DelayOptions` configures `delay`.

## Errors

| Error               | Meaning                                |
| ------------------- | -------------------------------------- |
| `AssayError`        | Base class for Assay-originated errors |
| `AssayQueryError`   | A required `get*` query had no match   |
| `AssayTimeoutError` | A wait operation reached its timeout   |

Use `instanceof AssayError` to narrow any value to the Assay error hierarchy.
