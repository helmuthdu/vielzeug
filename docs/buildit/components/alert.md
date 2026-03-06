# Alert Component

A feedback banner for surface-level status messages — errors, warnings, successes, and informational notices. Supports a title, an icon slot, and a dismiss button.

## Features

- 🎨 **3 Variants**: flat (default), solid, outline
- 🌈 **Color Themes**: primary, secondary, info, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- ✖️ **Dismissable**: built-in close button that hides the alert and fires a `dismiss` event
- 🖼️ **Icon Slot**: prepend any SVG or icon font glyph
- 🏷️ **Title**: optional bold title above the message content
- ♿ **Accessible**: `role="alert"` with `aria-live="polite"`, close button labelled

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/alert/alert.ts
:::

## Basic Usage

```html
<bit-alert color="success">Your changes have been saved.</bit-alert>

<script type="module">
  import '@vielzeug/buildit/alert';
</script>
```

## Visual Options

### Variants

<ComponentPreview center vertical>

```html
<bit-alert color="primary">Flat (default)</bit-alert>
<bit-alert color="primary" variant="solid">Solid</bit-alert>
<bit-alert color="primary" variant="outline">Outline</bit-alert>
```

</ComponentPreview>

### Colors

<ComponentPreview center vertical>

```html
<bit-alert>Default</bit-alert>
<bit-alert color="primary">Primary</bit-alert>
<bit-alert color="secondary">Secondary</bit-alert>
<bit-alert color="info">Info</bit-alert>
<bit-alert color="success">Success</bit-alert>
<bit-alert color="warning">Warning</bit-alert>
<bit-alert color="error">Error</bit-alert>
```

</ComponentPreview>

### Sizes

<ComponentPreview center vertical>

```html
<bit-alert color="info" size="sm">Small alert</bit-alert>
<bit-alert color="info" size="md">Medium alert</bit-alert>
<bit-alert color="info" size="lg">Large alert</bit-alert>
```

</ComponentPreview>

## With Title

Use `title` to add a bold heading above the message.

<ComponentPreview center vertical>

```html
<bit-alert color="error" title="Something went wrong">
  The server returned a 500 error. Please try again later.
</bit-alert>
<bit-alert color="success" title="Payment confirmed">
  Your subscription has been updated. Changes take effect immediately.
</bit-alert>
```

</ComponentPreview>

## Dismissable

Add `dismissable` to show a close (×) button. Once dismissed the element hides itself via `display: none`. Listen to the `dismiss` event to remove it from the DOM or handle re-show logic.

<ComponentPreview center vertical>

```html
<bit-alert color="warning" dismissable>
  Your session expires in 5 minutes.
</bit-alert>
<bit-alert color="error" title="Validation failed" dismissable variant="solid">
  Please fix the highlighted fields before continuing.
</bit-alert>
```

</ComponentPreview>

```javascript
document.querySelector('bit-alert').addEventListener('dismiss', (e) => {
  // Optionally remove from DOM
  e.target.remove();
});
```

## With Icon

Use the `icon` slot to add a leading icon.

<ComponentPreview center vertical>

```html
<bit-alert color="success">
  <span slot="icon" class="material-symbols-rounded">check_circle</span>
  Changes saved successfully.
</bit-alert>
<bit-alert color="warning" title="Heads up">
  <span slot="icon" class="material-symbols-rounded">warning</span>
  Some features are currently in maintenance mode.
</bit-alert>
```

</ComponentPreview>

### Frost Variant

<ComponentPreview center vertical colorful>

```html
<bit-alert variant="frost" color="info">Frosted info alert</bit-alert>
<bit-alert variant="frost" color="success" dismissable>Frosted success alert</bit-alert>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type                                                                           | Default  | Description                          |
| ------------- | ------------------------------------------------------------------------------ | -------- | ------------------------------------ |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`      | -        | Theme color                          |
| `variant`     | `'flat' \| 'solid' \| 'outline' \| 'frost'`                                    | `'flat'` | Visual style variant                 |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                         | `'md'`   | Component size                       |
| `rounded`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'`                                     | -        | Border radius override               |
| `title`       | `string`                                                                       | `''`     | Bold title text above the content    |
| `dismissable` | `boolean`                                                                      | `false`  | Show a close (×) button              |

### Slots

| Slot      | Description                                    |
| --------- | ---------------------------------------------- |
| (default) | Alert message content                          |
| `icon`    | Icon displayed on the leading edge of the alert |

### Events

| Event     | Detail                            | Description                                           |
| --------- | --------------------------------- | ----------------------------------------------------- |
| `dismiss` | `{ originalEvent: MouseEvent }`   | Fired when the dismiss button is clicked              |

### CSS Custom Properties

| Property               | Description      | Default                      |
| ---------------------- | ---------------- | ---------------------------- |
| `--alert-bg`           | Background color | Theme-dependent              |
| `--alert-color`        | Text / icon color | Theme-dependent             |
| `--alert-border-color` | Border color     | Theme-dependent              |
| `--alert-radius`       | Border radius    | `var(--rounded-md)`          |
| `--alert-padding`      | Padding          | `var(--size-3) var(--size-4)` |
| `--alert-gap`          | Gap between sections | `var(--size-3)`          |
| `--alert-font-size`    | Font size        | `var(--text-sm)`             |

## Accessibility

✅ `role="alert"` and `aria-live="polite"` — screen readers announce the content on insertion.
✅ The dismiss button has an `aria-label="Dismiss alert"`.
✅ Setting `[dismissed]` uses `display: none`, which removes the element from the accessibility tree.

::: tip Dynamic insertion
When injecting alerts dynamically into the DOM, they will be announced automatically due to `role="alert"`. Avoid changing the `color` attribute after insertion to prevent re-announcement.
:::

## Best Practices

**Do:**
- Always supply a `color` to convey intent (e.g., `color="error"` for failure feedback).
- Use `title` when you need to distinguish between a short headline and a longer explanation.
- Listen to the `dismiss` event to remove the element from the DOM (hiding is not the same as removing).
- Prefer `bit-alert` over custom `div`-based banners for built-in semantics and theming.

**Don't:**
- Use alerts for short, transient toasts — reach for a toast/notification system instead.
- Nest interactive controls directly in the default slot unless necessary; keep alerts informational.
