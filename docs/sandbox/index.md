---
title: Sandbox — Sandboxed iframe runtime
description: Isolated iframe runtime with a typed postMessage bridge for safe execution of AI-generated UI components.
package: sandbox
category: ai-tooling
keywords: [sandbox, iframe, generative-ui, ai, postmessage, csp, security]
exports: [buildCsp, buildDocument, createSandbox, SandboxBridge]
related: [codex, refine]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sandbox" />

## Why Sandbox?

Running AI-generated HTML in the main window is unsafe — generated code can access the DOM, cookies, and user data. Sandbox creates an isolated `<iframe sandbox="allow-scripts">` that receives content over a typed postMessage bridge. The sandbox cannot reach the host page.

| Feature                    | Raw `<iframe>`              | Sandbox                                                |
| -------------------------- | --------------------------- | ------------------------------------------------------ |
| Bundle size                | 0 B (built-in)              | <PackageInfo package="sandbox" type="size" />          |
| Zero dependencies          | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon> |
| Content-Security-Policy    | Manual                      | Auto-generated, strict by default                      |
| Typed postMessage protocol | <ore-icon name="x" size="16"></ore-icon> | `setState()` / `SandboxMessage` union           |
| Error forwarding           | <ore-icon name="x" size="16"></ore-icon> | `onerror` + `unhandledrejection` → host         |
| Dispose / `using`          | Manual `remove()`           | `dispose()` + `[Symbol.dispose]`                       |

<div class="decision-callout">

**Use Sandbox when** you need to render AI-generated or untrusted HTML in the browser with guaranteed isolation, CSP enforcement, and a typed event bridge.

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

// Await load, then render
await sandbox.ready;
sandbox.render('<ore-button variant="primary">Click me</ore-button>');

// Push state into the sandbox
sandbox.setState('theme', 'dark');

// Receive events from sandbox code (ready is not forwarded — use sandbox.ready instead)
sandbox.onMessage((msg) => {
  if (msg.type === 'custom') console.log(msg.event, msg.detail);
  if (msg.type === 'error') console.error(msg.message);
});

// Await subsequent renders
await sandbox.nextReady();

// Clean up — removes iframe, clears listeners
sandbox.dispose();
// or: using sandbox = createSandbox(container);
```

## Features

<div class="features-grid">

- `createSandbox()` — Creates an isolated `<iframe sandbox="allow-scripts">` in the given container
- `SandboxHandle.ready` — First-load Promise; resolves on first render or dispose (never hangs)
- `SandboxHandle.nextReady()` — Fresh Promise per re-render; supports multiple simultaneous callers
- `SandboxHandle.disposed` — Observable disposed state; check before deferred calls
- `render(html, { signal? })` — Lazy iframe creation; pass `AbortSignal` to skip cancelled renders
- `setState(key, value)` — Push state into the sandbox; received as `sandbox:state-update` CustomEvent
- `SandboxBridge` type — Ambient type for `window.__sandbox__` in sandbox-side TypeScript
- `custom` messages — Sandbox code emits `window.__sandbox__.emit(event, detail)` to the host
- Strict CSP — `default-src 'none'`, inline scripts only, no network by default
- `nonce` option — Cryptographic nonce for bridge `<script>` tag and `script-src` CSP
- `scripts` option — Inject CDN scripts with `crossorigin="anonymous"`; origins auto-added to `script-src`
- `buildCsp()` — Build a standalone CSP string using the same `SandboxOptions`
- `buildDocument()` — Build a complete sandbox HTML document for server-side or Codex use
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
