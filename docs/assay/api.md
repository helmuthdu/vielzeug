---
title: Assay — API Reference
description: Full API reference for @vielzeug/assay — queries, event dispatch, and async waiting.
---

[[toc]]

## API Overview

| Symbol              | Purpose                                              | Execution mode | Common gotcha |
| -------------------- | ----------------------------------------------------- | -------------- | -------------- |
| `within(element)`    | Scoped query helpers for one element/subtree           | Sync            | Returns a fresh `QueryScope` per call — cheap, but don't cache it across DOM mutations you care about |
| `query()` / `queryAll()` | Free-function equivalents of `within(root).query`/`.queryAll` | Sync    | Use these when you already have a root and don't need the rest of `QueryScope` |
| `queryByTestId()` / `queryAllByTestId()` | Match a `data-testid` attribute        | Sync            | Free-function equivalents of `within(root).queryByTestId`/`.queryAllByTestId` |
| `queryByText()`      | First element matching trimmed text content            | Sync            | Matches exact trimmed text, not substrings |
| `queryAllByText()`   | Every element matching trimmed text content            | Sync            | Same exact-match caveat as `queryByText()` |
| `queryInShadow()` / `queryAllInShadow()` | Query inside a host's shadow root       | Sync            | Returns `null`/`[]` (not a throw) when the host has no shadow root |
| `queryPart()`        | Query a shadow-DOM element by its `part` attribute      | Sync            | Shorthand for `queryInShadow(host, '[part="x"]')` |
| `getSlotted()`       | Light-DOM children assigned to a slot                   | Sync            | Only direct children (`:scope >`) — doesn't recurse into further-nested slots |
| `fire.*`             | Dispatch a DOM event synchronously                     | Sync            | Doesn't wait for anything — pair with `waitFor()`/`await` for async reactions |
| `createPointerEvent()` | Build a `PointerEvent`, falling back to `MouseEvent` | Sync            | Only needed if you're constructing an event by hand instead of using `fire.pointer*` |
| `waitFor()`          | Poll until a callback returns truthy or resolves       | Async           | Always rejects with `AssayTimeoutError` on timeout — the original failure is `.cause`, never the thrown error's own type |
| `waitForEvent()`     | Resolve on the next matching event                     | Async           | Rejects with `AssayTimeoutError`, not a plain `Error`, on timeout |
| `nextTick()`         | Resolve after one microtask tick                        | Async           | Doesn't wait for `setTimeout`-scheduled work — use `wait()` for that |
| `wait()`             | Resolve after a fixed millisecond delay                 | Async           | A fixed delay, not a condition — prefer `waitFor()` when you can express a condition instead |

## Package Entry Point

| Import              | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------- |
| `@vielzeug/assay`    | The entire public API — queries, event dispatch, async waiting     |

## Query Helpers

### `within(element)`

Creates query helpers scoped to a single element or shadow root.

**Parameters**

| Name      | Type       | Description                          |
| --------- | ---------- | ------------------------------------- |
| `element` | `Element`  | The root to scope every query to      |

**Returns:** `QueryScope`

**Example**

```ts
import { within } from '@vielzeug/assay';

const { query, queryAll, queryByTestId, queryAllByTestId, queryByText, queryAllByText } = within(panel);
```

`QueryScope` methods:

| Method                            | Returns          |
| ---------------------------------- | ----------------- |
| `query(selector)`                  | `Element \| null` |
| `queryAll(selector)`               | `Element[]`       |
| `queryByText(text, selector?)`     | `Element \| null` |
| `queryAllByText(text, selector?)`  | `Element[]`       |
| `queryByTestId(testId)`            | `Element \| null` |
| `queryAllByTestId(testId)`         | `Element[]`       |

`selector` defaults to `'*'` for the text-matching methods.

---

### `query(root, selector)` / `queryAll(root, selector)`

Free-function equivalents of `within(root).query`/`.queryAll` — a thin wrapper over `root.querySelector(All)`, exported directly so every `QueryScope` method has both a scoped and unscoped form.

**Returns:** `Element | null` / `Element[]`

---

### `queryByTestId(root, testId)` / `queryAllByTestId(root, testId)`

Free-function equivalents of `within(root).queryByTestId`/`.queryAllByTestId` — matches a `data-testid` attribute.

**Returns:** `Element | null` / `Element[]`

---

### `queryByText(root, text, selector)`

The unscoped function `within()` is built on — useful when you already have a root and don't need the rest of `QueryScope`.

**Parameters**

| Name       | Type                   | Description                                  |
| ---------- | ---------------------- | ---------------------------------------------- |
| `root`     | `Element \| ShadowRoot`| Subtree to search                             |
| `text`     | `string`               | Exact text to match against trimmed `textContent` |
| `selector` | `string`               | CSS selector narrowing candidate elements      |

**Returns:** `Element | null` — the first matching element, or `null`.

---

### `queryAllByText(root, text, selector)`

Same matching rules as `queryByText`, returning every match.

**Returns:** `Element[]`

---

### `queryInShadow(host, selector)` / `queryAllInShadow(host, selector)`

Query inside `host.shadowRoot`. Returns `null` (or `[]` for the `All` variant) instead of throwing when `host` has no shadow root — safe to call without an `if (host.shadowRoot)` guard.

**Returns:** `Element | null` / `Element[]`

---

### `queryPart(host, part)`

Shorthand for `queryInShadow(host, '[part="' + part + '"]')`.

**Returns:** `Element | null`

---

### `getSlotted(host, slotName?)`

Returns the light-DOM children assigned to a named slot, or every slotted child (`:not([slot])`) when `slotName` is omitted.

**Returns:** `Element[]`

## Event Dispatch

### `fire`

An object of synchronous event dispatchers. Every method calls `element.dispatchEvent(...)` with an appropriately-typed `Event` subclass and sensible defaults, and returns `dispatchEvent`'s own boolean result.

```ts
import { fire } from '@vielzeug/assay';

fire.click(el, opts?: PointerEventInit);
fire.blur(el, opts?: FocusEventInit);
fire.change(el, opts?: EventInit);
fire.custom(el, name, opts?: CustomEventInit);
fire.event(el, event: Event);
fire.focus(el, name?, opts?: FocusEventInit);
fire.input(el, opts?: EventInit);
fire.keyboard(el, type, opts?: KeyboardEventInit);
fire.keyDown(el, opts?: KeyboardEventInit);
fire.keyUp(el, opts?: KeyboardEventInit);
fire.mouse(el, type, opts?: MouseEventInit);
fire.pointerCancel(el, opts?: PointerEventInit);
fire.pointerDown(el, opts?: PointerEventInit);
fire.pointerEnter(el, opts?: PointerEventInit);
fire.pointerLeave(el, opts?: PointerEventInit);
fire.pointerMove(el, opts?: PointerEventInit);
fire.pointerUp(el, opts?: PointerEventInit);
fire.submit(el, opts?: EventInit);
fire.touch(el, type, opts?: EventInit);
```

`fire.touch` falls back to `CustomEvent` in environments without a `TouchEvent` constructor. `fire.pointer*` methods route through `createPointerEvent()`, so they fall back to `MouseEvent` the same way.

---

### `createPointerEvent(type, init?)`

Builds a `PointerEvent`, or a `MouseEvent` when `PointerEvent` isn't available in the current environment.

**Returns:** `Event`

## Async Waiting

### `waitFor(fn, options?)`

Polls `fn` until it returns truthy, returns `undefined` (a bare `expect()` call that didn't throw), or the timeout elapses.

**Parameters**

| Name              | Type                | Default | Description                                  |
| ------------------ | ------------------- | ------- | ---------------------------------------------- |
| `fn`               | `() => unknown`      | —       | Condition to poll                             |
| `options.timeout`  | `number`             | `1000`  | Maximum wait time in ms                       |
| `options.interval` | `number`             | `50`    | Delay between polling attempts in ms          |
| `options.message`  | `string`             | —       | Prefixed in front of the default timing summary in the timeout error — never replaces it |

**Returns:** `Promise<void>`

**Throws:** `AssayTimeoutError` on timeout, unconditionally — regardless of whether the last polling attempt returned a falsy value or threw. The original failure (a thrown error, or its message) is preserved as `.cause` and folded into the timeout message; `fn`'s thrown error itself is never mutated.

**Example**

```ts
await waitFor(() => queryByText('Saved') !== null);
await waitFor(() => expect(spy).toHaveBeenCalled(), { timeout: 2000 });
```

---

### `waitForEvent<T>(element, name, timeout?)`

Resolves with the next event of the given name.

**Parameters**

| Name      | Type      | Default | Description                     |
| --------- | --------- | ------- | --------------------------------- |
| `element` | `Element` | —       | Element to listen on             |
| `name`    | `string`  | —       | Event name                       |
| `timeout` | `number`  | `1000`  | Maximum wait time in ms          |

**Returns:** `Promise<T>` — the event instance, typed as `T extends Event` (defaults to `Event`).

---

### `nextTick()`

Resolves after one microtask tick (`queueMicrotask`) — for waiting on reactivity (signal effects, promise-chain continuations) without moving into the macrotask queue.

**Returns:** `Promise<void>`

---

### `wait(ms?)`

Resolves after `ms` milliseconds (default `0`).

**Returns:** `Promise<void>`

## Types

```ts
interface QueryScope {
  query<E extends Element = Element>(selector: string): E | null;
  queryAll<E extends Element = Element>(selector: string): E[];
  queryByText<E extends Element = Element>(text: string, selector?: string): E | null;
  queryAllByText<E extends Element = Element>(text: string, selector?: string): E[];
  queryByTestId<E extends Element = Element>(testId: string): E | null;
  queryAllByTestId<E extends Element = Element>(testId: string): E[];
}

interface WaitOptions {
  timeout?: number;
  interval?: number;
  message?: string;
}
```

## Errors

| Error               | Thrown by                    | Notable properties |
| -------------------- | ------------------------------ | -------------------- |
| `AssayError`         | Base class for every Assay error — use `instanceof AssayError` to catch any of them | `AssayError.is(err)` static type guard |
| `AssayTimeoutError`  | `waitFor()`, `waitForEvent()` when the timeout elapses | Extends `AssayError` |
