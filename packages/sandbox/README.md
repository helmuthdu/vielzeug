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

// render() returns a Promise per call — resolves on 'ready', or rejects with
// SandboxTimeoutError if the document never signals ready within 5s (in every build,
// not just dev — always handle it).
await sandbox.render('<ore-button variant="primary">Click me</ore-button>');

// Subsequent renders — same contract, a fresh Promise each time
await sandbox.render(newHtml);

// Replace body descendants without a full page reset
sandbox.replaceBody('<p>updated</p>');

// Push state into the sandbox
sandbox.setState('theme', 'dark');
sandbox.setStateAll({ locale: 'en', theme: 'dark' }); // multiple values, one message

// Hot-patch a named style block (see namedStyles below) without a full re-render
sandbox.updateStyle('theme', 'body { background: #111; }');

// Receive error and custom events (ready is not forwarded)
sandbox.onMessage((msg) => {
  if (msg.type === 'custom') console.log(msg.event, msg.detail);
  if (msg.type === 'error') console.error(msg.message);
  if (msg.type === 'resize') console.log('height:', msg.height);
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

| Option                 | Type                     | Description                                                                    |
| ---------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `scripts`               | `string[]`               | Absolute `http:` or `https:` script URLs injected with `crossorigin="anonymous"`; origins auto-added |
| `namedStyles`           | `Record<string, string>` | Named `<style>` blocks; keys start with a letter and use only letters, digits, `_`, or `-` |
| `nonce`                 | `string`                 | Non-empty base64/base64url-style token for both bridge scripts and `script-src` |
| `lang`                  | `string`                 | Basic language tag, such as `en`, `de`, or `zh-Hant`. Default: `'en'` |
| `title`                 | `string`                 | Document `<title>`. Default: `''` |
| `allowedScriptOrigins`  | `string[]`               | Absolute `http:` or `https:` origins added to `script-src` |
| `allowedStyleOrigins`   | `string[]`               | Absolute `http:` or `https:` origins added to `style-src` |
| `allowedImageOrigins`   | `string[]`               | Absolute `http:` or `https:` origins added to `img-src` |
| `allowedFontOrigins`    | `string[]`               | Absolute `http:` or `https:` origins added to `font-src` |

### `SandboxHandle`

| Member                       | Description                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `disposed`                   | `true` once `dispose()` has been called                                            |
| `disposalSignal`             | `AbortSignal` aborted on `dispose()` — tie async operations to the sandbox's lifetime |
| `ready`                      | Resolves on the **first** load or dispose; does not reset on re-renders            |
| `render(html, options?)`     | Full page reset; lazy iframe creation. Returns a Promise that resolves on ready or rejects with `SandboxTimeoutError` after 5s. Pass `signal` to skip if already aborted |
| `replaceBody(html)`          | Replace body descendants without navigating. Head scripts/styles survive; descendant listeners and state do not. Call after `render()` resolves |
| `setState(key, value)`       | Push a single state value into the sandbox; warns if called before ready           |
| `setStateAll(record)`        | Push multiple state values in one message; more efficient than repeated `setState()` |
| `updateStyle(id, css)`       | Hot-patch a `namedStyles` block by id, live and in the baseline for the next render |
| `onMessage(handler)`         | Subscribe to `error`, `custom`, and `resize` events; returns an unsubscribe function |
| `dispose()`                  | Tear down: removes iframe, clears listeners, resolves pending ready Promises       |
| `[Symbol.dispose]()`         | Explicit resource management alias for `dispose()`                                 |

### `buildCsp(options?): string`

Builds a strict Content-Security-Policy string from `SandboxOptions`. Origins from `scripts` URLs are extracted and merged with `allowedScriptOrigins` automatically.

### `buildDocument(html, options?): string`

Builds isolated markup with CSP meta tag, bridge script, and injected scripts/styles. It does not return a host runtime handle; use `createSandbox()` for state updates, body replacement, style updates, readiness, or disposal.

## Bridge Protocol

```ts
// Sandbox → host (received via onMessage)
// 'ready' is handled internally and NOT forwarded to subscribers
type SandboxMessage =
  | { type: 'error'; message: string; stack?: string }
  | { type: 'custom'; event: string; detail: unknown }
  | { type: 'resize'; height: number };

// Bridge API available as window.__sandbox__ inside sandbox documents
interface SandboxBridge {
  emit(event: string, detail?: unknown): void;
  // Subscribe to state pushed via sandbox.setState()/setStateAll() for one key
  onState(key: string, handler: (value: unknown) => void): () => void;
}
```

Sandbox code emits custom events to the host, and can subscribe to host-pushed state:

```js
window.__sandbox__.emit('button:click', { label: 'Save' });

const unsubscribe = window.__sandbox__.onState('theme', (value) => {
  document.body.dataset.theme = String(value);
});
```

For TypeScript support in sandbox-side code, add an ambient declaration:

```ts
// sandbox-env.d.ts
declare interface Window {
  __sandbox__: import('@vielzeug/sandbox').SandboxBridge;
}
```

## Errors

`SandboxError` is the base class for package errors. `SandboxConfigurationError` rejects malformed CSP/document options during construction. `SandboxTimeoutError extends SandboxError` and is thrown by `render()` when no `'ready'` signal arrives within 5 seconds (usually a document missing the bridge script). This rejection happens in every build, not just dev — always handle it:

```ts
import { SandboxTimeoutError } from '@vielzeug/sandbox';

try {
  await sandbox.render(html);
} catch (err) {
  if (err instanceof SandboxTimeoutError) {
    // document likely missing the bridge script
  }
}
```
