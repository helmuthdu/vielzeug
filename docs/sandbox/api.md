---
title: Sandbox — API Reference
description: Full API reference for @vielzeug/sandbox — createSandbox, buildCsp, buildDocument, SandboxHandle, and all types.
---

# API Reference

## API Overview

| Export | Kind | Description |
| ------ | ---- | ----------- |
| `createSandbox` | function | Creates an isolated sandboxed iframe runtime |
| `buildCsp` | function | Builds a Content-Security-Policy string from `SandboxOptions` |
| `buildDocument` | function | Builds a complete standalone sandbox HTML document |
| `SandboxHandle` | interface | Object returned by `createSandbox` |
| `SandboxOptions` | interface | Unified options for `createSandbox`, `buildCsp`, and `buildDocument` |
| `SandboxBridge` | interface | Bridge API available as `window.__sandbox__` in sandbox documents |
| `SandboxMessage` | type | Application-level messages the sandbox sends to the host |

## Package Entry Point

```ts
import { buildCsp, buildDocument, createSandbox } from '@vielzeug/sandbox';
import type { SandboxBridge, SandboxHandle, SandboxMessage, SandboxOptions } from '@vielzeug/sandbox';
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

await sandbox.ready;
sandbox.render('<p>Hello from the sandbox</p>');
```

## `SandboxHandle`

```ts
interface SandboxHandle {
  readonly disposed: boolean;
  readonly loaded: boolean;
  readonly ready: Promise<void>;
  dispose(): void;
  nextReady(): Promise<void>;
  onMessage(handler: (msg: SandboxMessage) => void): () => void;
  render(html: string, options?: { signal?: AbortSignal }): void;
  setState(key: string, value: unknown): void;
  [Symbol.dispose](): void;
}
```

| Member | Description |
| ------ | ----------- |
| `disposed` | `true` once `dispose()` has been called. |
| `loaded` | `true` once the current sandbox document has received its `ready` signal. Resets to `false` on each new `render()` call and returns to `true` after the next `ready`. Use to drive loading spinners or gate `setState()` calls. |
| `ready` | Promise that resolves when the **first** sandbox document signals it has loaded. Also resolves if the sandbox is disposed before the first render (unblocks waiters). Does **not** reset on re-renders — use `nextReady()` for that. |
| `nextReady()` | Returns a fresh `Promise<void>` that resolves after the **next** `render()` completes. Supports multiple simultaneous callers. Resolves immediately if the sandbox is disposed. |
| `render(html, options?)` | Replace the entire sandboxed document (full page reset). Creates the iframe lazily. Pass `options.signal` to skip if already aborted. Emits a dev warning when `html` is empty or whitespace-only. |
| `setState(key, value)` | Push a state value into the sandbox. Dispatches a `sandbox:state-update` CustomEvent inside the iframe. Warns in dev if called before the first `render()` or before `ready` fires for the current document. |
| `onMessage(handler)` | Subscribe to `SandboxMessage` events (`error` and `custom` only). The `ready` lifecycle signal is not forwarded. Returns an unsubscribe function. |
| `dispose()` | Remove the iframe from the DOM and clear all listeners. Resolves any pending `ready` / `nextReady()` Promises. |
| `[Symbol.dispose]()` | Alias for `dispose()` — enables `using sandbox = createSandbox(…)`. |

::: warning Dev warnings
Calling `render()`, `setState()`, or `onMessage()` on a disposed sandbox emits a `warn()` in development (`__SANDBOX_PROD__` unset).

Calling `setState()` before the first `render()` (no iframe yet) emits a dev warning. Calling `setState()` after `render()` but before the `ready` signal is received also emits a dev warning — the bridge may not have set up its listener yet and the state update may be silently dropped. Always await `sandbox.ready` (or use `sandbox.loaded`) before calling `setState()`.

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
  nonce?: string;
  scripts?: string[];
  styles?: string;
}
```

| Option | Type | Description |
| ------ | ---- | ----------- |
| `allowedFontOrigins` | `string[]` | Origins added to `font-src`. Default: `'none'`. |
| `allowedImageOrigins` | `string[]` | Origins added to `img-src`. `data:` is always included. |
| `allowedScriptOrigins` | `string[]` | Extra origins added to `script-src`. Merged with origins auto-extracted from `scripts`. |
| `allowedStyleOrigins` | `string[]` | Origins added to `style-src`. `'unsafe-inline'` is always included. |
| `nonce` | `string` | Cryptographic nonce added to the bridge `<script>` tag and to `script-src`. In CSP Level 3 browsers the nonce suppresses `'unsafe-inline'`; `'unsafe-inline'` is retained for CSP Level 2 fallback only. |
| `scripts` | `string[]` | External script URLs injected before user content with `crossorigin="anonymous"`. Origins are automatically added to `script-src`. |
| `styles` | `string` | CSS injected as a `<style>` block in the sandbox document `<head>`. |

## `buildCsp(options?)`

Builds a strict Content-Security-Policy string for sandboxed iframe documents.

```ts
function buildCsp(options?: SandboxOptions): string
```

Accepts `SandboxOptions` directly. Origins from `scripts` URLs are extracted and merged with `allowedScriptOrigins` automatically. Returns a semicolon-separated CSP string with seven directives.

**Default output (no options)**

```
default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'
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

Includes the CSP meta tag, injected scripts/styles, user content, and the bridge script. Suitable as an `iframe` `srcdoc` value or for server-side sandbox document generation (e.g., via `@vielzeug/codex`).

External scripts are placed **before** user content with `crossorigin="anonymous"`, so the bridge's error handler receives full error details for cross-origin script errors. Without `crossorigin`, CORS masks crashes as `"Script error."` even on CORS-enabled CDNs. The bridge fires the `ready` message after all preceding parser-blocking scripts have executed.

**Example**

```ts
import { buildDocument } from '@vielzeug/sandbox';

const html = buildDocument('<p>Hello</p>', {
  styles: 'body { font-family: sans-serif; }',
});

iframe.srcdoc = html;
```

## Bridge Protocol

### `SandboxMessage`

Application-level messages the sandbox sends to the host, received via `sandbox.onMessage(handler)`. The `ready` lifecycle signal is **intentionally excluded** — it resolves `sandbox.ready` and `sandbox.nextReady()` internally and is not forwarded to subscribers.

```ts
type SandboxMessage =
  | { type: 'error'; message: string; stack?: string }
  | { type: 'custom'; event: string; detail: unknown };
```

| Type | Fields | Description |
| ---- | ------ | ----------- |
| `error` | `message: string`, `stack?: string` | Fired on uncaught errors or unhandled promise rejections inside the sandbox. |
| `custom` | `event: string`, `detail: unknown` | User-defined events emitted from sandbox code via `window.__sandbox__.emit(event, detail)`. |

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

`sandbox.setState(key, value)` sends a state value into the sandbox. Inside the sandbox, listen via the DOM:

```js
document.addEventListener('sandbox:state-update', (e) => {
  const { key, value } = e.detail;
  if (key === 'theme') document.body.dataset.theme = value;
});
```

::: warning Security
Treat all `SandboxMessage` data as untrusted. The sandbox controls what `custom` event payloads contain — do not execute or evaluate any message field.
:::

---

## Errors

### `SandboxError`

Base class for all sandbox errors. Use `instanceof SandboxError` or `SandboxError.is()` to catch any sandbox-originated error.

```ts
class SandboxError extends Error {
  static is(err: unknown): err is SandboxError;
}
```

**Named subclasses**

| Class                  | Thrown when                                                                 |
| ---------------------- | --------------------------------------------------------------------------- |
| `SandboxDisposedError` | A method is called on a disposed sandbox instance                           |
| `SandboxTimeoutError`  | The sandbox iframe fails to initialize or respond within the expected timeout |
