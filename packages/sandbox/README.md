# @vielzeug/sandbox

Sandboxed iframe runtime with a typed postMessage state bridge for safe execution of AI-generated UI.

## Install

```sh
pnpm add @vielzeug/sandbox
```

## Usage

```ts
import { createSandbox } from '@vielzeug/sandbox';

const container = document.getElementById('preview')!;
const sandbox = createSandbox(container);

// Await first load, then render
await sandbox.ready;
sandbox.render('<ore-button variant="primary">Click me</ore-button>');

// Await subsequent renders
sandbox.render(newHtml);
await sandbox.nextReady();

// Push state into the sandbox
sandbox.setState('theme', 'dark');

// Receive error and custom events (ready is not forwarded)
sandbox.onMessage((msg) => {
  if (msg.type === 'custom') console.log(msg.event, msg.detail);
  if (msg.type === 'error') console.error(msg.message);
});

// Skip render if cancelled
sandbox.render(html, { signal: controller.signal });

// Clean up
sandbox.dispose();
// or using explicit resource management:
using s = createSandbox(container);
```

## API

### `createSandbox(container, options?): SandboxHandle`

Creates an isolated `<iframe sandbox="allow-scripts">` inside `container`.

**Options (`SandboxOptions`):**

| Option                  | Type       | Description                                                                |
| ----------------------- | ---------- | -------------------------------------------------------------------------- |
| `scripts`               | `string[]` | External scripts injected with `crossorigin="anonymous"`; origins auto-added |
| `styles`                | `string`   | CSS injected as a `<style>` block in the document head                     |
| `nonce`                 | `string`   | Cryptographic nonce for the bridge `<script>` tag and `script-src` CSP    |
| `allowedScriptOrigins`  | `string[]` | Extra origins added to `script-src`                                        |
| `allowedStyleOrigins`   | `string[]` | Extra origins added to `style-src`                                         |
| `allowedImageOrigins`   | `string[]` | Extra origins added to `img-src`                                           |
| `allowedFontOrigins`    | `string[]` | Extra origins added to `font-src`                                          |

### `SandboxHandle`

| Member                       | Description                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `disposed`                   | `true` once `dispose()` has been called                                            |
| `ready`                      | Resolves on the **first** load or dispose; does not reset on re-renders            |
| `nextReady()`                | Fresh Promise per re-render; supports multiple simultaneous callers                |
| `render(html, options?)`     | Full page reset; lazy iframe creation; pass `signal` to skip if already aborted    |
| `setState(key, value)`       | Push state into the sandbox; warns if called before the first `render()`           |
| `onMessage(handler)`         | Subscribe to `error` and `custom` events; returns an unsubscribe function          |
| `dispose()`                  | Tear down: removes iframe, clears listeners, resolves pending ready Promises       |
| `[Symbol.dispose]()`         | Explicit resource management alias for `dispose()`                                 |

### `buildCsp(options?): string`

Builds a strict Content-Security-Policy string from `SandboxOptions`. Origins from `scripts` URLs are extracted and merged with `allowedScriptOrigins` automatically.

### `buildDocument(html, options?): string`

Builds a complete, standalone sandbox HTML document including CSP meta tag, bridge script, and injected scripts/styles. Useful for server-side generation or direct `srcdoc` assignment.

## Bridge Protocol

```ts
// Sandbox → host (received via onMessage)
// 'ready' is handled internally and NOT forwarded to subscribers
type SandboxMessage =
  | { type: 'error'; message: string; stack?: string }
  | { type: 'custom'; event: string; detail: unknown };

// Bridge API available as window.__sandbox__ inside sandbox documents
interface SandboxBridge {
  emit(event: string, detail?: unknown): void;
}
```

Sandbox code emits custom events to the host:

```js
window.__sandbox__.emit('button:click', { label: 'Save' });
```

For TypeScript support in sandbox-side code, add an ambient declaration:

```ts
// sandbox-env.d.ts
declare interface Window {
  __sandbox__: import('@vielzeug/sandbox').SandboxBridge;
}
```
