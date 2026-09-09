---
title: Sandbox — API Reference
description: API reference for the @vielzeug/sandbox managed iframe runtime, bridge, errors, and testing utilities.
---

[[toc]]

## API Overview

| Symbol | Purpose | Execution mode | Common gotcha |
| --- | --- | --- | --- |
| `createSandbox()` | Create a managed sandbox iframe | Sync | The iframe is created lazily by `render()` |
| `SandboxHandle.render()` | Replace the document and await readiness | Async | Injected scripts can trigger a timeout |
| `SandboxHandle` | Update, observe, and dispose the iframe | Sync methods | State/body updates require a ready document |
| `SandboxOptions` | Configure metadata, CSP sources, scripts, styles, and timeout | Sync validation | Invalid values throw during creation |
| `SandboxMessage` | Host-side message union | Sync callback | Custom details are always `unknown` |
| `SandboxBridge` | Typed sandbox-side `window.__sandbox__` API | Sync | Its generics do not validate host-side input |
| `SandboxError` | Base class for package errors | Thrown/rejected | Narrow caught values with `instanceof` |

## Package Entry Point

| Import | Exports |
| --- | --- |
| `@vielzeug/sandbox` | Runtime, errors, and public types |
| `@vielzeug/sandbox/testing` | `createSandboxTestHelpers()` |

```ts
import {
  createSandbox,
  SandboxConfigurationError,
  SandboxError,
  SandboxTimeoutError,
} from '@vielzeug/sandbox';
import type {
  SandboxBridge,
  SandboxHandle,
  SandboxMessage,
  SandboxOptions,
} from '@vielzeug/sandbox';
```

## Runtime

### `createSandbox<State>(container, options?)`

```ts
function createSandbox<State extends object = Record<string, unknown>>(
  container: HTMLElement,
  options?: SandboxOptions,
): SandboxHandle<State>;
```

Creates a managed `<iframe sandbox="allow-scripts">` in `container`. Construction validates options but does not create DOM. The first `render()` creates the iframe with `referrerpolicy="no-referrer"` and a generated CSP.

| Parameter | Type | Description |
| --- | --- | --- |
| `container` | `HTMLElement` | Host element that owns the iframe |
| `options` | `SandboxOptions` | Optional document and runtime configuration |

**Returns:** `SandboxHandle<State>`.

`State` describes values sent from the trusted host to the sandbox through `setState()`. Ordinary interfaces are supported.

```ts
interface PreviewState {
  locale: string;
  theme: 'dark' | 'light';
}

const sandbox = createSandbox<PreviewState>(container, {
  styles: { theme: 'body { color-scheme: light; }' },
  title: 'Preview',
});

await sandbox.render('<main>Ready</main>');
sandbox.setState({ locale: 'en', theme: 'dark' });
```

### `SandboxHandle<State>`

```ts
interface SandboxHandle<State extends object = Record<string, unknown>> {
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  dispose(): void;
  onMessage(handler: (message: SandboxMessage) => void): () => void;
  render(html: string): Promise<void>;
  replaceBody(html: string): void;
  setState(update: Partial<State>): void;
  updateStyle(id: string, css: string): void;
  [Symbol.dispose](): void;
}
```

| Method/property | Description |
| --- | --- |
| `render(html)` | Replace the complete document and await readiness |
| `replaceBody(html)` | Replace body descendants without navigation |
| `setState(update)` | Push typed host state |
| `updateStyle(id, css)` | Patch a named style |
| `onMessage(handler)` | Subscribe to untrusted iframe messages |
| `disposed` / `disposalSignal` | Observe lifecycle state |
| `dispose()` / `[Symbol.dispose]()` | Release the iframe and listeners |

#### `render(html)`

Replaces the complete `srcdoc` document. The returned Promise resolves when that document emits its internal ready message and rejects with `SandboxTimeoutError` after `readyTimeout`.

A newer render supersedes and resolves the previous pending render. Disposal also resolves a pending render. Messages from superseded generations are ignored.

The generated bridge is installed in `<head>` before injected scripts and user HTML, so it can capture script errors during document initialization. Its ready message is sent on `DOMContentLoaded`.

#### `replaceBody(html)`

Replaces `document.body.innerHTML` without navigating. Head scripts, document/window listeners, and named styles survive. Body descendants, descendant listeners, references, form state, and scripts in replacement HTML do not.

Call only after `render()` resolves. The method warns in development and does nothing when no ready document exists.

#### `setState(update)`

Sends one object containing one or more state values. Inside the iframe, each key dispatches its own `sandbox:state-update` `CustomEvent` and reaches matching `SandboxBridge.onState()` subscribers.

```ts
sandbox.setState({ locale: 'en', theme: 'dark' });
```

Calling before `render()` resolves can lose the update and emits a development warning.

#### `updateStyle(id, css)`

Updates a style declared in `options.styles`. Before the first render it updates only the render baseline. After readiness it also patches the live `<style>` element. Unknown IDs emit a development warning.

#### `onMessage(handler)`

Subscribes to application messages and returns an idempotent unsubscribe function. Internal ready messages are not forwarded.

```ts
sandbox.onMessage((message) => {
  if (message.type === 'resize') container.style.height = `${message.height}px`;
});
```

#### Lifecycle

`dispose()` removes the iframe, removes the host `message` listener, clears subscribers, resolves a pending render, and aborts `disposalSignal`. It is idempotent. `[Symbol.dispose]()` provides the same behavior for `using` declarations.

## Types

### `SandboxOptions`

```ts
interface SandboxOptions {
  allowedFontOrigins?: string[];
  allowedImageOrigins?: string[];
  allowedScriptOrigins?: string[];
  allowedStyleOrigins?: string[];
  lang?: string;
  nonce?: string;
  readyTimeout?: number;
  scripts?: string[];
  styles?: Record<string, string>;
  title?: string;
}
```

| Option | Default | Description |
| --- | --- | --- |
| `allowedFontOrigins` | `[]` | HTTP(S) origins added to `font-src`; otherwise `'none'` |
| `allowedImageOrigins` | `[]` | HTTP(S) origins added to `img-src`; `data:` is always included |
| `allowedScriptOrigins` | `[]` | HTTP(S) origins added to `script-src` |
| `allowedStyleOrigins` | `[]` | HTTP(S) origins added to `style-src` |
| `lang` | `'en'` | Basic BCP 47 language tag for `<html lang>` |
| `nonce` | `undefined` | Base64/base64url-style nonce for the bridge script and CSP |
| `readyTimeout` | `5000` | Positive finite timeout in milliseconds, at most `2^31 - 1` |
| `scripts` | `[]` | Absolute HTTP(S) scripts injected before user HTML |
| `styles` | `{}` | Named style blocks; IDs start with a letter and contain letters, digits, `_`, or `-` |
| `title` | `''` | Escaped document title |

Allowed origins reject paths, credentials, query strings, fragments, unsupported schemes, and CSP syntax. Script URLs must be absolute HTTP(S) URLs.

### `SandboxMessage`

```ts
type SandboxMessage =
  | { detail: unknown; event: string; type: 'custom' }
  | { message: string; stack?: string; type: 'error' }
  | { height: number; type: 'resize' };
```

All fields originate in sandboxed code and are untrusted. Validate custom `detail`, and render text through escaping APIs rather than HTML injection.

### `SandboxBridge<State, Events>`

The generated document exposes `window.__sandbox__`:

```ts
interface SandboxBridge<
  State extends object = Record<string, unknown>,
  Events extends object = Record<string, unknown>,
> {
  emit<K extends keyof Events & string>(
    event: K,
    ...detail: undefined extends Events[K] ? [detail?: Events[K]] : [detail: Events[K]]
  ): void;
  onState<K extends keyof State & string>(
    key: K,
    handler: (value: State[K]) => void,
  ): () => void;
}
```

Use an ambient declaration in authored sandbox-side TypeScript:

```ts
interface State {
  theme: 'dark' | 'light';
}

interface Events {
  saved: { id: string };
}

declare interface Window {
  __sandbox__: import('@vielzeug/sandbox').SandboxBridge<State, Events>;
}
```

These generics check authored sandbox code only. They do not make host-side messages trustworthy.

## Errors

### `SandboxError`

Base class for package errors. Accepts `opts?: ErrorOptions` for cause chaining.

### `SandboxConfigurationError`

Thrown synchronously by `createSandbox()` when an option cannot produce a valid document or CSP.

### `SandboxTimeoutError`

Rejected by `render()` when no ready message arrives before `readyTimeout`. An injected script may have blocked document initialization.

## Testing

```ts
import { createSandboxTestHelpers } from '@vielzeug/sandbox/testing';
```

`createSandboxTestHelpers(container)` returns `fireReady()`, `fireCustom()`, `fireError()`, and `fireResize()` helpers. Call `render()` first so the helper can read the iframe channel and generation metadata.
