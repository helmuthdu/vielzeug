# Copy Command

A styled, copy-to-clipboard command display component. Shows a command string in a monospace code block with a copy button. Clicking it copies the value to the clipboard, shows a transient check-mark confirmation, and emits a `copy` event. Optionally accepts extra controls in a `suffix` slot — useful for pairing a "next package" cycle button alongside the command.

## Variants

### Flat (Default)

Subtle neutral background with a fine border. Works on any surface.

<ComponentPreview center vertical>

```html
<ore-copy-command value="npm install @vielzeug/ripple"></ore-copy-command>
```

</ComponentPreview>

### Bordered

Transparent background with a pronounced border. Ideal on light backgrounds where contrast matters.

<ComponentPreview center vertical>

```html
<ore-copy-command value="npm install @vielzeug/ripple" variant="bordered"></ore-copy-command>
```

</ComponentPreview>

### Ghost

No background or border until hovered. Minimal visual footprint — good inside cards or panels.

<ComponentPreview center vertical>

```html
<ore-copy-command value="npx -y @vielzeug/codex" variant="ghost"></ore-copy-command>
```

</ComponentPreview>

## Sizes

Use `size="sm"` inside dense UI or inside other components (cards, sidebars).

<ComponentPreview center vertical>

```html
<ore-copy-command value="npm install @vielzeug/ripple" size="sm"></ore-copy-command>
<ore-copy-command value="npm install @vielzeug/ripple" size="md"></ore-copy-command>
<ore-copy-command value="npm install @vielzeug/ripple" size="lg"></ore-copy-command>
```

</ComponentPreview>

| `size` | Padding                  | Font size      |
| ------ | ------------------------ | -------------- |
| `sm`   | `--size-1` × `--size-2`  | `--text-xs`    |
| `md`   | `--size-2` × `--size-3`  | `--text-sm`    |
| `lg`   | `--size-2-5` × `--size-4` | `--text-base` |

## Border Radius

Use the `rounded` attribute to match your surrounding UI radius:

<ComponentPreview center vertical>

```html
<ore-copy-command value="npm install @vielzeug/ripple" rounded="none"></ore-copy-command>
<ore-copy-command value="npm install @vielzeug/ripple" rounded="sm"></ore-copy-command>
<ore-copy-command value="npm install @vielzeug/ripple" rounded="md"></ore-copy-command>
<ore-copy-command value="npm install @vielzeug/ripple" rounded="lg"></ore-copy-command>
<ore-copy-command value="npm install @vielzeug/ripple" rounded="full"></ore-copy-command>
```

</ComponentPreview>

Do not mix `--copy-command-radius` and `rounded` — the CSS property takes precedence over the attribute.

## With a Suffix Slot

Add any element to the `suffix` slot. It is separated by a divider that inherits the component's border color.

The most common use is a "cycle" button that switches between multiple commands without losing the copy button's position. Keep suffix slot controls lightweight — the slot is visually grouped with the copy button and should feel like a single unit. Suffix slot content is part of the light DOM and must carry its own accessible labels (e.g. `aria-label="Show next package"`).

<ComponentPreview center vertical>

```html
<ore-copy-command value="npm install @vielzeug/ripple" id="cmd">
  <button
    slot="suffix"
    type="button"
    style="display:flex;align-items:center;padding:var(--size-2);background:transparent;border:none;cursor:pointer;color:var(--text-color-secondary)"
    aria-label="Show next package"
    onclick="this.closest('ore-copy-command').setAttribute('value','npm install @vielzeug/arsenal')">
    <ore-icon name="chevron-right" size="14" aria-hidden="true"></ore-icon>
  </button>
</ore-copy-command>
```

</ComponentPreview>

## Handling the Copy Event

Listen for the `copy` event to react when the command is successfully copied. The event only fires on success; clipboard failures are silently ignored.

```html
<ore-copy-command value="npm install @vielzeug/ripple" id="install-cmd"></ore-copy-command>

<script type="module">
  document.getElementById('install-cmd').addEventListener('copy', (e) => {
    console.log('Copied:', e.detail.value);
  });
</script>
```

In Vue 3:

```html
<ore-copy-command :value="installCmd" @copy="onCopy"></ore-copy-command>
```

```ts
function onCopy({ detail }: CustomEvent<{ value: string }>) {
  console.log('Copied:', detail.value);
}
```

## Custom Styling

Override any CSS custom property on the host element:

```html
<ore-copy-command
  value="npm install @vielzeug/ripple"
  style="
    --copy-command-bg: var(--color-primary-backdrop);
    --copy-command-border-color: var(--color-primary);
    --copy-command-color: var(--color-primary);
    --copy-command-radius: var(--rounded-full);
  ">
</ore-copy-command>
```

Use `::part()` to pierce the shadow DOM for fine-grained overrides:

```css
ore-copy-command::part(command-text) {
  letter-spacing: 0.05em;
}

ore-copy-command::part(copy-icon) {
  opacity: 0.5;
}
```

## API Reference

### Attributes

| Attribute | Type                                                                        | Default    | Description                                       |
| --------- | --------------------------------------------------------------------------- | ---------- | ------------------------------------------------- |
| `value`   | `string`                                                                    | `''`       | The command string to display and copy            |
| `size`    | `'sm' \| 'md' \| 'lg'`                                                      | `'md'`     | Component size (affects padding and font size)    |
| `variant` | `'flat' \| 'bordered' \| 'ghost'`                                           | `'flat'`   | Visual style variant                              |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'`      | `'md'`     | Border radius                                     |

### Events

| Event  | Detail              | Description                                                   |
| ------ | ------------------- | ------------------------------------------------------------- |
| `copy` | `{ value: string }` | Emitted when the command is successfully written to clipboard |

### Slots

| Slot     | Description                                                                 |
| -------- | --------------------------------------------------------------------------- |
| `suffix` | Optional controls appended after the copy button, separated by a divider    |

### CSS Parts

| Part           | Element                                  | Description                                |
| -------------- | ---------------------------------------- | ------------------------------------------ |
| `wrapper`      | `<div>`                                  | Outer flex container                       |
| `command`      | `<button>`                               | The copy button                            |
| `command-text` | `<code>`                                 | The command string display                 |
| `copy-icon`    | `<span>`                                 | Icon wrapper (contains the copy/check icon)|
| `suffix`       | `<div>`                                  | Suffix slot container                      |

### CSS Custom Properties

| Property                     | Description                          | Default                         |
| ---------------------------- | ------------------------------------ | ------------------------------- |
| `--copy-command-bg`          | Background color                     | `var(--color-contrast-100)`     |
| `--copy-command-color`       | Command text color                   | `var(--text-color-body)`        |
| `--copy-command-border-color`| Border color                         | `var(--color-contrast-300)`     |
| `--copy-command-radius`      | Border radius (overrides `rounded`)  | `var(--rounded-md)`             |
| `--copy-command-padding`     | Inner padding of the command button  | Size-dependent (see Sizes)      |
| `--copy-command-font-size`   | Command string font size             | Size-dependent (see Sizes)      |
| `--copy-command-icon-color`  | Copy/check icon color                | `var(--text-color-secondary)`   |
| `--copy-command-hover-bg`    | Background color on hover            | `var(--color-contrast-200)`     |

## Accessibility

The inner `<button>` carries an `aria-label` that includes the command value (`Copy: <value>`). After a successful copy the label updates to `"Copied!"` for 2 seconds. A `role="status"` live region inside the shadow DOM announces `"Copied to clipboard."` to screen readers immediately after a successful copy, so assistive technology does not miss the state change even when focus remains on the button. The copy icon is marked `aria-hidden="true"` and is supplementary to the button label — the label alone is the accessible name. Set a descriptive `value` — the attribute is also used as the button's accessible name. Avoid placing a long, multi-line command in `value` — the command text is single-line and will truncate; use a `<ore-code-window>` instead for multi-line content.
