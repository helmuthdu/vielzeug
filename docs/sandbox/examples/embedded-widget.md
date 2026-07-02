---
title: 'Sandbox Examples — Embedded Widget'
description: Embedded Widget example for @vielzeug/sandbox.
---

## Embedded Widget

Host a third-party widget or plugin with strict CSP, scoped styles, and bidirectional messaging between the widget and your application.

### Problem

You want to let a third-party widget (a chart, a form, a payment UI) run in your application while keeping it isolated from your page's styles and data. The widget needs to receive configuration from your app and emit events back (e.g. form submission, resize, user interaction).

### Solution

```ts
import { createSandbox } from '@vielzeug/sandbox';

interface WidgetConfig {
  container: HTMLElement;
  widgetScriptUrl: string;
  theme: Record<string, string>;
  onEvent: (event: string, detail: unknown) => void;
}

function mountWidget({ container, widgetScriptUrl, theme, onEvent }: WidgetConfig) {
  const sandbox = createSandbox(container, {
    // Allow the widget's CDN origin
    allowedScriptOrigins: [new URL(widgetScriptUrl).origin],
    // Inject the widget's script before user content
    scripts: [widgetScriptUrl],
    // Scoped reset so widget styles don't clash with host
    namedStyles: {
      base: `
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; height: 100%; }
      `,
    },
  });

  // Forward widget events to the host application
  sandbox.onMessage((msg) => {
    if (msg.type === 'custom') {
      onEvent(msg.event, msg.detail);
    }
    if (msg.type === 'error') {
      console.error('[widget error]', msg.message);
    }
  });

  // Render the widget mount point — the injected script initialises on DOMContentLoaded
  sandbox.render('<div id="widget-root"></div>');

  return {
    // Push config changes without re-rendering — widget receives sandbox:state-update
    setTheme(tokens: Record<string, string>) {
      sandbox.setState('theme', tokens);
    },
    setLocale(locale: string) {
      sandbox.setState('locale', locale);
    },
    [Symbol.dispose]() {
      sandbox.dispose();
    },
  };
}

// Usage
using widget = mountWidget({
  container: document.getElementById('widget-slot')!,
  widgetScriptUrl: 'https://cdn.example.com/widget.iife.js',
  theme: { primary: '#0066cc', radius: '6px' },
  onEvent(event, detail) {
    if (event === 'submit') handleFormSubmission(detail);
    if (event === 'resize') adjustLayout(detail);
  },
});

// Update theme without re-mounting
widget.setTheme({ primary: '#cc6600', radius: '4px' });
```

Inside the widget (third-party code), it listens for state and emits events:

```js
// widget.iife.js (third-party, runs inside the sandbox)
document.addEventListener('sandbox:state-update', (e) => {
  if (e.detail.key === 'theme') applyTheme(e.detail.value);
  if (e.detail.key === 'locale') applyLocale(e.detail.value);
});

document.getElementById('submit-btn').addEventListener('click', () => {
  window.__sandbox__.emit('submit', { value: getFormData() });
});
```

#### With setStateAll (optional)

Bootstrap theme and locale together in one postMessage instead of two separate `setState()` calls:

```ts
sandbox.render('<div id="widget-root"></div>');

// One postMessage for both initial values
sandbox.setStateAll({
  theme: { primary: '#0066cc', radius: '6px' },
  locale: 'en',
});
```

### Pitfalls

- **`allowedScriptOrigins` vs `scripts`** — origins in the `scripts` array are automatically added to `script-src`. Use `allowedScriptOrigins` only for origins not covered by `scripts` (e.g. dynamically loaded sub-scripts the widget fetches).
- **`connect-src 'none'` by default** — the sandbox CSP blocks all network requests. If the widget makes fetch/XHR calls, they will fail silently. There is currently no `allowedConnectOrigins` option — for widgets that need network access, serve them from a URL (regular iframe) instead.
- **`setState` requires the document to be ready** — call `setState` after `sandbox.render()` resolves. Calling before the bridge initialises will drop the update with a dev warning.
- **Treat all `custom` message payloads as untrusted** — the widget controls what it emits. Validate before acting on `msg.detail`.

### Related

- [Usage Guide — Injecting Scripts and Styles](../usage.md#injecting-scripts-and-styles)
- [Usage Guide — Configuring CSP](../usage.md#configuring-csp)
- [Usage Guide — Passing State](../usage.md#passing-state)
- [Usage Guide — Batch State Updates](../usage.md#batch-state-updates)
- [Usage Guide — Receiving Events from the Sandbox](../usage.md#receiving-events-from-the-sandbox)
- [API Reference — SandboxOptions](../api.md#sandboxoptions)
