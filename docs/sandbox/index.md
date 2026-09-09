---
title: Sandbox — Sandboxed iframe runtime
description: Isolated iframe runtime with a typed state bridge and explicit message trust boundary for safe execution of untrusted HTML — component previews, playgrounds, plugin sandboxes, and more.
package: sandbox
category: ui-primitives
keywords: [sandbox, iframe, isolation, playground, csp, postmessage, security, components]
exports:
  [
    createSandbox,
    SandboxConfigurationError,
    SandboxError,
    SandboxTimeoutError,
    SandboxHandle,
    SandboxOptions,
    SandboxBridge,
    SandboxMessage,
  ]
related: [codex, refine]
environments: [browser]
---

<!-- markdownlint-disable MD025 MD033 MD060 -->

<PackageHero package="sandbox" />

## Why Sandbox?

Running untrusted HTML in the main window is unsafe — arbitrary code can access the DOM, cookies, and user data. Sandbox creates an isolated `<iframe sandbox="allow-scripts">` that receives content over a typed state bridge and explicit message trust boundary. The sandbox cannot reach the host page.

```ts
// Before
container.innerHTML = untrustedHtml;

// After
const sandbox = createSandbox(container);
await sandbox.render(untrustedHtml);
```

Common use cases:

- **Component previews** — render isolated HTML/CSS examples in documentation or design tools
- **Code playgrounds** — execute user-provided code with full error forwarding and state injection
- **Plugin sandboxes** — host third-party or user-authored plugin UI without granting host access
- **User-generated content** — display untrusted HTML (emails, form output, external widgets) safely
- **Widget embedding** — wrap third-party widgets with strict CSP and bidirectional messaging
- **AI-generated UI** — render LLM-produced HTML components with guaranteed isolation

| Feature                    | Raw `<iframe>`                               | Sandbox                                       |
| -------------------------- | -------------------------------------------- | --------------------------------------------- |
| Bundle size                | 0 B (built-in)                               | <PackageInfo package="sandbox" type="size" /> |
| Zero dependencies          | <ore-icon name="check" size="16"></ore-icon> | <ore-icon name="check" size="16"></ore-icon>  |
| Content-Security-Policy    | Manual                                       | Auto-generated, strict by default             |
| Managed message protocol   | <ore-icon name="x" size="16"></ore-icon>     | Typed host state; untrusted inbound details   |
| Error forwarding           | <ore-icon name="x" size="16"></ore-icon>     | `onerror` + `unhandledrejection` → host       |
| Dispose / `using`          | Manual `remove()`                            | `dispose()` + `[Symbol.dispose]`              |

<div class="decision-callout">

**Use Sandbox when** you need to render untrusted or user-provided HTML in the browser with iframe isolation, CSP enforcement, and explicit host/sandbox messaging.

**Consider a raw `<iframe>` when** you only need to embed a known third-party URL — Sandbox is for programmatic `srcdoc` content, not URL-based embedding.

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
const sandbox = createSandbox<{ theme: 'dark' | 'light' }>(container);

sandbox.onMessage((message) => {
  if (message.type === 'custom') console.log(message.event, message.detail);
  if (message.type === 'error') console.error(message.message);
  if (message.type === 'resize') console.log('height:', message.height);
});

try {
  await sandbox.render('<ore-button variant="primary">Click me</ore-button>');
  sandbox.setState({ theme: 'dark' });
} catch (error) {
  console.error('Sandbox render failed', error);
} finally {
  sandbox.dispose();
}
```

## Features

<div class="features-grid">

- `createSandbox<State>()` — Creates an isolated `<iframe sandbox="allow-scripts">` with typed outbound state
- `render(html)` — Creates or replaces the document and resolves when its bridge reports ready
- `setState(update)` — Pushes one or more typed state values in one message
- `replaceBody(html)` — Updates streamed body content without resetting head scripts and styles
- `updateStyle(id, css)` — Patches a named style without replacing the document
- `SandboxMessage` — Keeps sandbox-controlled custom details typed as `unknown` on the host
- `SandboxBridge<State, Events>` — Types authored sandbox-side state subscriptions and event emission
- `readyTimeout` — Rejects blocked document initialization with `SandboxTimeoutError`
- Strict CSP — Uses `default-src 'none'` and blocks network requests by default
- Error forwarding — Installs before user scripts and forwards uncaught errors and rejections
- Stale-message protection — Rejects messages from superseded render generations
- Disposable — Supports `dispose()`, `disposalSignal`, and `[Symbol.dispose]`

</div>

## Documentation

<div class="doc-links">

- [Usage Guide](./usage.md)
- [API Reference](./api.md)
- [Examples](./examples.md)
- [Migration Guide](./migration.md)

</div>

## See Also

<div class="see-also">

- [Codex](/codex/) — MCP server with `generate-sandbox-document` and `get-state-bridge-spec` tools; generates document templates for use with Sandbox
- [Refine](/refine/) — Web component library; renders correctly inside the sandbox via `<script>` injection and `allowedScriptOrigins`

</div>

<!-- markdownlint-enable MD025 MD033 MD060 -->
