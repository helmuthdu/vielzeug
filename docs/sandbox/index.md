---
title: Sandbox — Sandboxed iframe runtime
description: Isolated iframe runtime with a typed postMessage bridge for safe execution of untrusted HTML — component previews, playgrounds, plugin sandboxes, and more.
package: sandbox
category: ui-primitives
keywords: [sandbox, iframe, isolation, playground, csp, postmessage, security, components]
exports:
  [
    createSandbox,
    buildCsp,
    buildDocument,
    SandboxError,
    SandboxTimeoutError,
    SandboxHandle,
    SandboxOptions,
    SandboxBridge,
    SandboxMessage,
    SandboxStateUpdateDetail,
    Unsubscribe,
  ]
related: [codex, refine]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sandbox" />

## Why Sandbox?

Running untrusted HTML in the main window is unsafe — arbitrary code can access the DOM, cookies, and user data. Sandbox creates an isolated `<iframe sandbox="allow-scripts">` that receives content over a typed postMessage bridge. The sandbox cannot reach the host page.

Common use cases:

- **Component previews** — render isolated HTML/CSS examples in documentation or design tools
- **Code playgrounds** — execute user-provided code with full error forwarding and state injection
- **Plugin sandboxes** — host third-party or user-authored plugin UI without granting host access
- **User-generated content** — display untrusted HTML (emails, form output, external widgets) safely
- **Widget embedding** — wrap third-party widgets with strict CSP and bidirectional messaging
- **AI-generated UI** — render LLM-produced HTML components with guaranteed isolation

| Feature                    | Raw `<iframe>`              | Sandbox                                                |
| -------------------------- | --------------------------- | ------------------------------------------------------ |
| Bundle size                | 0 B (built-in)              | <PackageInfo package="sandbox" type="size" />          |
| Zero dependencies          | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Content-Security-Policy    | Manual                      | Auto-generated, strict by default                      |
| Typed postMessage protocol | <ore-icon name="x" size="16"></ore-icon> | `setState()` / `SandboxMessage` union           |
| Error forwarding           | <ore-icon name="x" size="16"></ore-icon> | `onerror` + `unhandledrejection` → host         |
| Dispose / `using`          | Manual `remove()`           | `dispose()` + `[Symbol.dispose]`                       |

<div class="decision-callout">

**Use Sandbox when** you need to render untrusted or user-provided HTML in the browser with guaranteed isolation, CSP enforcement, and a typed event bridge.

**Stick with a raw `<iframe>` when** you only need to embed a known third-party URL — Sandbox is for programmatic `srcdoc` content, not URL-based embedding.

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/sandbox
```

```sh [npm]
npm install @vielzeug/sandbox
```

```sh [yarn]
yarn add @vielzeug/sandbox
```

:::

## Quick Start

```ts
import { createSandbox } from '@vielzeug/sandbox';

const container = document.getElementById('preview')!;
const sandbox = createSandbox(container);

// render() returns a Promise that resolves when the document is ready
await sandbox.render('<ore-button variant="primary">Click me</ore-button>');

// Push state into the sandbox
sandbox.setState('theme', 'dark');

// Receive events from sandbox code (ready is not forwarded — internal use only)
sandbox.onMessage((msg) => {
  if (msg.type === 'custom') console.log(msg.event, msg.detail);
  if (msg.type === 'error') console.error(msg.message);
  if (msg.type === 'resize') console.log('height:', msg.height);
});

// Re-render: await the returned Promise
await sandbox.render(newHtml);

// Clean up — removes iframe, clears listeners
sandbox.dispose();
// or: using sandbox = createSandbox(container);
```

## Features

<div class="features-grid">

- `createSandbox()` — Creates an isolated `<iframe sandbox="allow-scripts">` in the given container
- `SandboxHandle.ready` — Promise resolving on first render's ready signal (also resolves on dispose; check `sandbox.disposed` to distinguish)
- `SandboxHandle.disposalSignal` — `AbortSignal` aborted when the sandbox is disposed; tie async work to sandbox lifetime
- `SandboxHandle.disposed` — Observable disposed state; check before deferred calls
- `render(html, { signal? })` — Lazy iframe creation; returns `Promise<void>` resolving when ready, or rejecting with `SandboxTimeoutError` if the bridge never signals ready; pass `AbortSignal` to skip cancelled renders
- `patch(html)` — Incremental body update without page reset; preserves scripts, listeners, and CSS state; ideal for streaming content
- `updateStyle(id, css)` — Hot-patch a named `<style id="…">` block live without re-rendering; also updates baseline for next render
- `setState(key, value)` — Push state into the sandbox; received as `sandbox:state-update` CustomEvent
- `setStateAll(record)` — Push multiple state values in a single postMessage; more efficient than repeated `setState()` calls for initial setup
- `namedStyles` option — Named `<style id="key">` blocks in document `<head>`; individually patchable via `updateStyle()`
- `lang` / `title` options — Set `<html lang="…">` and `<title>` on the generated document for screen-reader correctness
- `SandboxBridge` type — Ambient type for `window.__sandbox__` in sandbox-side TypeScript; `onState(key, handler)` subscribes to state pushed via `setState()`/`setStateAll()`
- `custom` messages — Sandbox code emits `window.__sandbox__.emit(event, detail)` to the host
- `resize` messages — Auto-emitted by the bridge's built-in `ResizeObserver`; no manual wiring needed
- Strict CSP — `default-src 'none'`, inline scripts only, no network by default
- `nonce` option — Cryptographic nonce for bridge `<script>` tag and `script-src` CSP
- `scripts` option — Inject CDN scripts with `crossorigin="anonymous"`; origins auto-added to `script-src`
- `buildCsp()` — Build a standalone CSP string using the same `SandboxOptions`
- `buildDocument()` — Build a complete sandbox HTML document for server-side or offline use
- Error forwarding — `onerror` + `unhandledrejection` forwarded as `{ type: 'error' }` messages
- Disposable — `dispose()` + `[Symbol.dispose]` for `using` declarations

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)

</div>

## See Also

<div class="see-also">

- [Codex](/codex/) — MCP server with `generate-sandbox-document` and `get-state-bridge-spec` tools; generates document templates for use with Sandbox
- [Refine](/refine/) — Web component library; renders correctly inside the sandbox via `<script>` injection and `allowedScriptOrigins`

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
