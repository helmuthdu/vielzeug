---
title: Sandbox — API Reference
description: Full API reference for @vielzeug/sandbox — createSandbox, buildCsp, buildDocument, SandboxHandle, and all types.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| ------ | ------- | -------------- | ------------- |
| `createSandbox()` | Create an isolated sandboxed iframe runtime | Sync (returns handle); `render()` is async | Iframe DOM is created lazily — nothing exists until the first `render()` call |
| `buildCsp()` | Build a CSP string from `SandboxOptions` | Sync | Origins and the `nonce` are sanitized — characters that could break out of the policy are silently stripped |
| `buildDocument()` | Build a complete standalone sandbox HTML document | Sync | `lang`/`title` are HTML-escaped automatically; don't pre-escape them yourself |
| `SandboxHandle` | Object returned by `createSandbox()` | — | `setState()`/`setStateAll()` warn in dev if called before `render()` resolves |
| `SandboxOptions` | Unified options for `createSandbox`, `buildCsp`, `buildDocument` | — | All fields are optional; defaults documented per field below |
| `SandboxBridge` | Bridge API at `window.__sandbox__` inside sandbox documents | — | Only `emit()` is available — there is no way to call host functions directly |
| `SandboxMessage` | Application messages the sandbox sends to the host | — | `'ready'` is not part of this union — it resolves `render()` internally instead |
| `SandboxError` | Base error class for `@vielzeug/sandbox` | — | Not yet thrown by any API — reserved for future error types |
| `Unsubscribe` | Return type of `onMessage()` | — | Calling it more than once is a safe no-op |

## Package Entry Points

| Import | Purpose |
| ------ | ------- |
| `@vielzeug/sandbox` | Main exports and types |
| `@vielzeug/sandbox/testing` | `createSandboxTestHelpers` — postMessage simulation helpers for tests |

```ts
import { buildCsp, buildDocument, createSandbox, SandboxError } from '@vielzeug/sandbox';
import type { SandboxBridge, SandboxHandle, SandboxMessage, SandboxOptions, Unsubscribe } from '@vielzeug/sandbox';

import { createSandboxTestHelpers } from '@vielzeug/sandbox/testing';
```

## `createSandbox(container, options?)`

Creates a sandboxed `<iframe>` inside `container` and returns a `SandboxHandle`.

```ts
function createSandbox(container: HTMLElement, options?: SandboxOptions): SandboxHandle
```

The iframe is created lazily on the first `render()` call — `createSandbox()` is a cheap factory with no DOM work until content is ready. The iframe uses `sandbox="allow-scripts"` and `referrerpolicy="no-referrer"`. Content is loaded via `srcdoc` with an auto-generated CSP meta tag. The sandbox cannot access host cookies, storage, or the DOM.

**Parameters**

- `container` — The DOM element to append the iframe to.
- `options` — Optional `SandboxOptions`.

**Returns** a `SandboxHandle`.

**Example**

```ts
const sandbox = createSandbox(document.getElementById('preview')!);
await sandbox.render('<p>Hello from the sandbox</p>');
```

## `SandboxHandle`

```ts
interface SandboxHandle {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  readonly ready: Promise<void>;
  dispose(): void;
  onMessage(handler: (msg: SandboxMessage) => void): Unsubscribe;
  patch(html: string): void;
  render(html: string, options?: { signal?: AbortSignal }): Promise<void>;
  setState(key: string, value: unknown): void;
  setStateAll(record: Record<string, unknown>): void;
  updateStyle(id: string, css: string): void;
  [Symbol.dispose](): void;
}
```

| Member | Description |
| ------ | ----------- |
| `disposalSignal` | `AbortSignal` that is aborted when `dispose()` is called. Pass to `fetch` and other async operations to tie their lifetime to the sandbox. |
| `disposed` | `true` once `dispose()` has been called. |
| `ready` | Promise that resolves when the **first** sandbox document signals it has loaded. Also resolves if the sandbox is disposed before the first render — check `sandbox.disposed` after awaiting to distinguish the two cases. Does **not** reset on re-renders — use the Promise returned by `render()` for subsequent renders. |
| `patch(html)` | Incrementally update the sandbox body without a full page reset. Replaces `document.body.innerHTML` via postMessage — scripts, event listeners, and `namedStyles` CSS are preserved. Must be called after `render()` resolves. Warns in dev if the bridge is not yet ready. |
| `render(html, options?)` | Replace the entire sandboxed document (full page reset). Creates the iframe lazily. Returns a `Promise<void>` that resolves when the new document signals ready. If a second `render()` starts before the first resolves, the first Promise resolves immediately. Pass `options.signal` to skip if already aborted. Emits a dev warning when `html` is empty or whitespace-only. |
| `updateStyle(id, css)` | Hot-patch a named `<style id="…">` block in the live iframe via postMessage, and update the baseline for the next `render()`. No-ops if the sandbox is disposed. Safe to call before the first render (baseline only). Warns in dev if `id` is not a known key in `namedStyles`. |
| `setState(key, value)` | Push a state value into the sandbox. Dispatches a `sandbox:state-update` CustomEvent inside the iframe. Warns in dev if called before `render()` resolves. |
| `setStateAll(record)` | Push multiple state values in a single postMessage. Dispatches one `sandbox:state-update` CustomEvent per key inside the iframe. More efficient than calling `setState()` repeatedly for initial state setup. Warns in dev if called before `render()` resolves. |
| `onMessage(handler)` | Subscribe to `SandboxMessage` events (`error`, `custom`, and `resize`). The `ready` lifecycle signal is not forwarded. Returns an `Unsubscribe` function. |
| `dispose()` | Remove the iframe from the DOM and clear all listeners. Resolves any pending `ready` Promise and aborts `disposalSignal`. |
| `[Symbol.dispose]()` | Alias for `dispose()` — enables `using sandbox = createSandbox(…)`. |

::: warning Dev warnings
Calling `render()`, `setState()`, `setStateAll()`, `updateStyle()`, or `onMessage()` on a disposed sandbox emits a warning in development (when `import.meta.env.PROD` is not `true`).

Calling `setState()` or `setStateAll()` before `render()` resolves emits a dev warning — the bridge may not have set up its listener yet and the state update may be silently dropped. Always await the Promise returned by `render()` before calling either.

In production all guard paths are silent no-ops (no warnings).
:::

## `SandboxOptions`

Unified options for `createSandbox`, `buildCsp`, and `buildDocument`. All fields are optional.

```ts
interface SandboxOptions {
  allowedFontOrigins?: string[];
  allowedImageOrigins?: string[];
  allowedScriptOrigins?: string[];
  allowedStyleOrigins?: string[];
  lang?: string;
  namedStyles?: Record<string, string>;
  nonce?: string;
  scripts?: string[];
  title?: string;
}
```

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `allowedFontOrigins` | `string[]` | `[]` | Origins added to `font-src`. Default directive value: `'none'`. |
| `allowedImageOrigins` | `string[]` | `[]` | Origins added to `img-src`. `data:` is always included. |
| `allowedScriptOrigins` | `string[]` | `[]` | Extra origins added to `script-src`. Merged with origins auto-extracted from `scripts`. |
| `allowedStyleOrigins` | `string[]` | `[]` | Origins added to `style-src`. `'unsafe-inline'` is always included. |
| `lang` | `string` | `'en'` | BCP 47 language tag for the generated document's `<html lang="…">` attribute. Pass the primary language of the sandbox content for correct screen-reader behaviour. |
| `namedStyles` | `Record<string, string>` | `{}` | Named CSS blocks injected as `<style id="key">` elements in the document `<head>`. Each block is individually patchable via `updateStyle(id, css)` without re-rendering. |
| `nonce` | `string` | `undefined` | Cryptographic nonce added to the bridge `<script>` tag and to `script-src`. In CSP Level 3 browsers the nonce suppresses `'unsafe-inline'`; `'unsafe-inline'` is retained for CSP Level 2 fallback only. |
| `scripts` | `string[]` | `[]` | External script URLs injected before user content with `crossorigin="anonymous"`. Origins are automatically added to `script-src`. |
| `title` | `string` | `''` | Title for the generated document, placed in `<title>` in `<head>`. Providing a title improves screen reader compatibility. |

::: warning Security
`lang`, `title`, `namedStyles` keys, script URLs, and `nonce` are all HTML-escaped or sanitized before interpolation into the generated document — they cannot be used to break out of their attribute or inject markup. CSP origins and `nonce` are stripped of characters (`;`, `"`, `'`, newlines) that could inject a new CSP directive.
:::

## `buildCsp(options?)`

Builds a strict Content-Security-Policy string for sandboxed iframe documents.

```ts
function buildCsp(options?: SandboxOptions): string
```

Accepts `SandboxOptions` directly. Origins from `scripts` URLs are extracted and merged with `allowedScriptOrigins` automatically. Returns a semicolon-separated CSP string with eight directives. `base-uri 'none'` is always included to block `<base>`-tag injection, and `connect-src 'none'` / `form-action 'none'` block network requests and form submission by default.

**Default output (no options)**

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; base-uri 'none'
```

**Example**

```ts
const csp = buildCsp({
  allowedStyleOrigins: ['https://fonts.googleapis.com'],
  allowedFontOrigins: ['https://fonts.gstatic.com'],
  scripts: ['https://cdn.example.com/refine.iife.js'],
});
// script-src includes 'unsafe-inline' + https://cdn.example.com automatically
```

## `buildDocument(html, options?)`

Builds a complete, standalone sandbox HTML document.

```ts
function buildDocument(html: string, options?: SandboxOptions): string
```

Includes the `<html lang="…">` attribute, `<title>`, CSP meta tag, injected scripts, `namedStyles` rendered as `<style id="key">` blocks, user content, and the bridge script. Suitable as an `iframe` `srcdoc` value or for server-side sandbox document generation (e.g., via `@vielzeug/codex`).

External scripts are placed **before** user content with `crossorigin="anonymous"`, so the bridge's error handler receives full error details for cross-origin script errors. The bridge fires the `ready` message after all preceding parser-blocking scripts have executed, then sets up a `ResizeObserver` on `document.body` that automatically emits `resize` messages as content height changes.

`lang` defaults to `'en'` and `title` defaults to `''` — both are HTML-escaped before interpolation.

**Example**

```ts
import { buildDocument } from '@vielzeug/sandbox';

const html = buildDocument('<p>Hello</p>', {
  lang: 'de',
  title: 'Component Preview',
  namedStyles: {
    base: 'body { font-family: sans-serif; }',
    theme: ':root { --bg: #fff; }',
  },
});

iframe.srcdoc = html;
```

## Bridge Protocol

### `SandboxMessage`

Application-level messages the sandbox sends to the host, received via `sandbox.onMessage(handler)`. The `ready` lifecycle signal is **intentionally excluded** — it resolves `sandbox.ready` and the Promise returned by `render()` internally and is not forwarded to subscribers.

```ts
type SandboxMessage =
  | { type: 'error'; message: string; stack?: string }
  | { type: 'custom'; event: string; detail: unknown }
  | { type: 'resize'; height: number };
```

| Type | Fields | Description |
| ---- | ------ | ----------- |
| `error` | `message: string`, `stack?: string` | Fired on uncaught errors or unhandled promise rejections inside the sandbox. |
| `custom` | `event: string`, `detail: unknown` | User-defined events emitted from sandbox code via `window.__sandbox__.emit(event, detail)`. |
| `resize` | `height: number` | Emitted automatically when sandbox content height changes. The bridge script sets up a `ResizeObserver` on `document.body` — no manual wiring needed. |

**Emitting custom events from inside the sandbox:**

```js
window.__sandbox__.emit('button:click', { label: 'Save', timestamp: Date.now() });
```

**Receiving on the host:**

```ts
sandbox.onMessage((msg) => {
  if (msg.type === 'custom' && msg.event === 'button:click') {
    console.log('Button clicked:', msg.detail);
  }
  if (msg.type === 'error') {
    console.error('[sandbox]', msg.message, msg.stack);
  }
  if (msg.type === 'resize') {
    container.style.height = `${msg.height}px`;
  }
});
```

### `SandboxBridge`

The bridge API available as `window.__sandbox__` inside sandbox documents. Export this type to add TypeScript support for sandbox-side code:

```ts
interface SandboxBridge {
  emit(event: string, detail?: unknown): void;
}
```

Add an ambient declaration in your sandbox-side TypeScript project:

```ts
// sandbox-env.d.ts
declare interface Window {
  __sandbox__: import('@vielzeug/sandbox').SandboxBridge;
}
```

### State updates

`sandbox.setState(key, value)` sends a single state value into the sandbox; `sandbox.setStateAll(record)` sends multiple values in one postMessage. Both dispatch a `sandbox:state-update` CustomEvent per key. Inside the sandbox, listen via the DOM:

```js
document.addEventListener('sandbox:state-update', (e) => {
  const { key, value } = e.detail;
  if (key === 'theme') document.body.dataset.theme = value;
});
```

```ts
// Single value
sandbox.setState('theme', 'dark');

// Multiple values in one postMessage — fires 'sandbox:state-update' twice, once per key
sandbox.setStateAll({ theme: 'dark', locale: 'en' });
```

::: warning Security
Treat all `SandboxMessage` data as untrusted. The sandbox controls what `custom` event payloads contain — do not execute or evaluate any message field.
:::

## Errors

### `SandboxError`

Base class for all `@vielzeug/sandbox` errors. No API in the current version throws it — it exists as scaffolding for future error types.

```ts
class SandboxError extends Error {
  static is(err: unknown): err is SandboxError;
}
```

`SandboxError.is()` is a type-safe static predicate — prefer it over `instanceof` in catch blocks that may receive unknown values:

```ts
import { SandboxError } from '@vielzeug/sandbox';

try {
  // ...
} catch (err) {
  if (SandboxError.is(err)) {
    console.error(err.message);
  }
}
```

## Test Utilities

`@vielzeug/sandbox/testing` exports helpers for code that integrates with the sandbox:

```ts
import { createSandboxTestHelpers } from '@vielzeug/sandbox/testing';

const helpers = createSandboxTestHelpers(container);

sandbox.render('<p>test</p>');
helpers.fireReady();      // simulate bridge ready signal
helpers.fireCustom('click', { x: 1 }); // simulate window.__sandbox__.emit()
helpers.fireResize(420);  // simulate ResizeObserver callback
helpers.fireError('TypeError: x is not defined', 'at eval:1');
```

These helpers encapsulate the internal postMessage protocol so test code doesn't need to know message shapes.
