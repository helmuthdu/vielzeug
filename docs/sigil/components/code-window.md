# Code Window

A presentational window chrome for code blocks and AI/MCP conversation flows.

- <sg-icon name="code" size="16"></sg-icon> **`variant="code"`** — language badge + optional filename header
- <sg-icon name="message-circle" size="16"></sg-icon> **`variant="chat"`** — traffic-light dots + title header
- <sg-icon name="panel-top" size="16"></sg-icon> **`header-end` slot** — pin a copy button or badge to the right of the header
- <sg-icon name="palette" size="16"></sg-icon> **Customizable** via six CSS custom properties

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/content/code-window/code-window.ts
:::

## Basic Usage

Import the component and wrap any content in the chrome:

```ts
import '@vielzeug/sigil/styles';
import '@vielzeug/sigil/code-window';
```

```html
<sg-code-window lang="ts" filename="app.ts">
  <pre><code>const x = 1;</code></pre>
</sg-code-window>
```

## Code Variant

The default variant. The header shows a `lang` badge and an optional `filename`.

<ComponentPreview vertical>

```html
<sg-code-window lang="ts" filename="app.ts">
  <pre style="margin:0;font-family:var(--font-mono);font-size:0.8125rem;line-height:1.7">
    <code>import { createLogger } from '@vielzeug/rune';

const log = createLogger('app');
log.info('Server started', { port: 3000 });</code>
  </pre>
</sg-code-window>
```

</ComponentPreview>

Omit `filename` to show only the language badge:

<ComponentPreview vertical>

```html
<sg-code-window lang="sh">
  <pre style="margin:0;font-family:var(--font-mono);font-size:0.875rem">
    <code>npx -y @vielzeug/codex</code>
  </pre>
</sg-code-window>
```

</ComponentPreview>

## Chat Variant

Set `variant="chat"` for conversation flows. The header shows three traffic-light dots and a `title` label (default: `"MCP tool call"`).

<ComponentPreview vertical>

```html
<sg-code-window variant="chat" title="MCP tool call">
  <div style="display:flex;flex-direction:column;gap:0.75rem">
    <div>
      <div style="font-size:0.6875rem;font-family:var(--font-mono);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-color-secondary);margin-bottom:4px">user</div>
      <span>How do I debounce a function in Arsenal?</span>
    </div>
    <div>
      <div style="font-size:0.6875rem;font-family:var(--font-mono);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:oklch(58% 0.16 250deg);margin-bottom:4px">tool</div>
      <pre style="margin:0;font-family:var(--font-mono);font-size:0.8rem;background:var(--color-contrast-100);border:1px solid var(--color-contrast-300);border-radius:6px;padding:0.5rem 0.75rem">get-docs({ packageSlug: "arsenal", page: "api" })</pre>
    </div>
    <div>
      <div style="font-size:0.6875rem;font-family:var(--font-mono);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-primary);margin-bottom:4px">assistant</div>
      <span>Use <code>debounce(fn, wait)</code> — returns a debounced version that delays invoking <code>fn</code> until <code>wait</code> ms after the last call.</span>
    </div>
  </div>
</sg-code-window>
```

</ComponentPreview>

## Header End Slot

Use `slot="header-end"` to append content to the trailing edge of the header — useful for copy buttons, badges, or status indicators.

<ComponentPreview vertical>

```html
<sg-code-window lang="ts" filename="logger.ts">
  <sg-button slot="header-end" size="sm" variant="ghost">Copy</sg-button>
  <pre style="margin:0;font-family:var(--font-mono);font-size:0.8125rem;line-height:1.7">
    <code>const log = createLogger('app');</code>
  </pre>
</sg-code-window>
```

</ComponentPreview>

::: tip Tightening body padding
Override `--code-window-body-padding` for a more compact look:

```html
<sg-code-window lang="sh" style="--code-window-body-padding: 0.75rem 1rem">
  <pre style="margin:0;font-family:var(--font-mono);font-size:0.875rem"><code>pnpm add @vielzeug/rune</code></pre>
</sg-code-window>
```
:::

## API Reference

### Attributes

| Attribute  | Type               | Default           | Description                                                 |
| ---------- | ------------------ | ----------------- | ----------------------------------------------------------- |
| `variant`  | `'code' \| 'chat'` | `'code'`          | Switches the header chrome between code and chat mode       |
| `lang`     | `string`           | `'ts'`            | Language badge text (`variant="code"` only)                 |
| `filename` | `string`           | —                 | Filename shown next to the badge (`variant="code"` only)    |
| `title`    | `string`           | `'MCP tool call'` | Label beside the traffic-light dots (`variant="chat"` only) |

### Slots

| Slot        | Description                                                        |
| ----------- | ------------------------------------------------------------------ |
| *(default)* | Main body content — code blocks, conversation turns, or any markup |
| `header-end`| Content pinned to the trailing edge of the header bar             |

### CSS Parts

| Part       | Description                                        |
| ---------- | -------------------------------------------------- |
| `window`   | The root window element                            |
| `header`   | The header bar                                     |
| `lang`     | The language badge (`variant="code"`)              |
| `filename` | The filename label (`variant="code"`)              |
| `dots`     | The traffic-light dot container (`variant="chat"`) |
| `title`    | The title label (`variant="chat"`)                 |
| `body`     | The body container wrapping the default slot       |

### CSS Custom Properties

| Property                     | Default              | Description             |
| ---------------------------- | -------------------- | ----------------------- |
| `--code-window-bg`           | `--color-canvas`     | Window background color |
| `--code-window-header-bg`    | `--color-contrast-100` | Header background color |
| `--code-window-border-color` | `--color-contrast-300` | Border color            |
| `--code-window-radius`       | `--rounded-lg`       | Border radius           |
| `--code-window-shadow`       | `--shadow-sm`        | Box shadow              |
| `--code-window-body-padding` | `--size-5 --size-6`  | Body slot padding       |

## Accessibility

`sg-code-window` is a presentational container with no interactive role.

- The traffic-light dots in `variant="chat"` carry `aria-hidden="true"` and have no semantic meaning.
- Use semantic `<pre><code>` markup for code content in the default slot.
- For conversation flows, ensure each speaker label is readable by screen readers — use visually hidden text or `aria-label` rather than relying solely on color or position.
