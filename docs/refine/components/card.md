# Card

A versatile and feature-rich card container component with purposeful variants, color themes, elevation control, and interactive states. Perfect for grouping related content, creating structured layouts, and building modern UI patterns. Built with accessibility in mind and fully customizable through CSS custom properties.

## Variants

Four named variants cover the full range from solid to translucent:

- **Default** (no `variant`) - Canvas background with gentle border. Picks up `color` as a tinted backdrop.
- **`solid`** - Filled with the theme color; best for prominent cards with a `color` attribute.
- **`flat`** - Subtle backdrop tint with a semi-transparent border; low visual weight.
- **`glass`** - Glassmorphism with backdrop blur and inset shadow; great for overlays.
- **`frost`** - Frosted glass with stronger blur and color-tinted transparency.

::: tip Elevation Control
Use the `elevation` prop (0-5) to control shadow depth. Works with any variant.

```html
<!-- No shadow -->
<ore-card elevation="0">Flat appearance</ore-card>

<!-- High elevation -->
<ore-card elevation="4">High shadow</ore-card>
```

:::

<ComponentPreview center>

```html
<ore-card>
  <ore-text slot="header" variant="heading" size="md">Default Card</ore-text>
  <ore-text>Clean, subtle background with gentle borders. Use elevation prop for shadow depth.</ore-text>
</ore-card>

<ore-card variant="solid" color="primary">
  <ore-text slot="header" variant="heading" size="md">Solid Card</ore-text>
  <ore-text>Filled with the theme color background.</ore-text>
</ore-card>

<ore-card variant="flat" color="primary">
  <ore-text slot="header" variant="heading" size="md">Flat Card</ore-text>
  <ore-text>Subtle backdrop tint, low visual weight.</ore-text>
</ore-card>
```

</ComponentPreview>

### Frost Variant

Modern frost effect with backdrop blur that adapts based on color:

- **Without color**: Subtle canvas-based frost overlay
- **With color**: Frosted glass effect with colored tint

::: tip Best Used With
Frost variant works best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center>

```html
<ore-card variant="frost" padding="lg">
  <ore-text slot="header" variant="heading" size="md">Neutral Frost Card</ore-text>
  <ore-text>Subtle canvas-based transparency with backdrop blur.</ore-text>
  <div slot="footer">
    <ore-button variant="frost" size="sm">Learn More</ore-button>
  </div>
</ore-card>
```

</ComponentPreview>

## Padding Sizes

Control the internal spacing of the card.

<ComponentPreview center>

```html
<ore-card padding="none" elevation="1">
  <ore-text slot="header" variant="heading" size="md">No Padding</ore-text>
  <ore-text>Content reaches the edges.</ore-text>
</ore-card>

<ore-card padding="sm" elevation="1">
  <ore-text slot="header" variant="heading" size="md">Small Padding</ore-text>
  <ore-text>Compact spacing.</ore-text>
</ore-card>

<ore-card padding="md" elevation="1">
  <ore-text slot="header" variant="heading" size="md">Medium Padding</ore-text>
  <ore-text>Default spacing (if not specified).</ore-text>
</ore-card>

<ore-card padding="lg" elevation="1">
  <ore-text slot="header" variant="heading" size="md">Large Padding</ore-text>
  <ore-text>Generous spacing.</ore-text>
</ore-card>

<ore-card padding="xl" elevation="1">
  <ore-text slot="header" variant="heading" size="md">Extra Large Padding</ore-text>
  <ore-text>Maximum spacing for spacious layouts.</ore-text>
</ore-card>
```

</ComponentPreview>

## Color Themes

Apply semantic color themes to cards for different contexts.

<ComponentPreview center>

```html
<ore-card color="primary">
  <ore-text slot="header" variant="heading" size="md">Primary Card</ore-text>
  <ore-text>Uses the primary brand color.</ore-text>
</ore-card>

<ore-card color="secondary">
  <ore-text slot="header" variant="heading" size="md">Secondary Card</ore-text>
  <ore-text>Uses the secondary brand color.</ore-text>
</ore-card>

<ore-card color="info">
  <ore-text slot="header" variant="heading" size="md">Info Card</ore-text>
  <ore-text>Perfect for positive messages.</ore-text>
</ore-card>

<ore-card color="success">
  <ore-text slot="header" variant="heading" size="md">Success Card</ore-text>
  <ore-text>Perfect for positive messages.</ore-text>
</ore-card>

<ore-card color="warning">
  <ore-text slot="header" variant="heading" size="md">Warning Card</ore-text>
  <ore-text>Great for caution messages.</ore-text>
</ore-card>

<ore-card color="error">
  <ore-text slot="header" variant="heading" size="md">Error Card</ore-text>
  <ore-text>Ideal for error states.</ore-text>
</ore-card>
```

</ComponentPreview>

## Elevation Levels

Control shadow depth with explicit elevation levels (0-5).

<ComponentPreview center>

```html
<ore-card elevation="0">
  <ore-text slot="header" variant="heading" size="md">Elevation 0</ore-text>
  <ore-text>No shadow - flat appearance.</ore-text>
</ore-card>

<ore-card elevation="1">
  <ore-text slot="header" variant="heading" size="md">Elevation 1</ore-text>
  <ore-text>Subtle shadow.</ore-text>
</ore-card>

<ore-card elevation="2">
  <ore-text slot="header" variant="heading" size="md">Elevation 2</ore-text>
  <ore-text>Medium shadow (default).</ore-text>
</ore-card>

<ore-card elevation="3">
  <ore-text slot="header" variant="heading" size="md">Elevation 3</ore-text>
  <ore-text>Prominent shadow.</ore-text>
</ore-card>

<ore-card elevation="4">
  <ore-text slot="header" variant="heading" size="md">Elevation 4</ore-text>
  <ore-text>High elevation.</ore-text>
</ore-card>

<ore-card elevation="5">
  <ore-text slot="header" variant="heading" size="md">Elevation 5</ore-text>
  <ore-text>Maximum elevation.</ore-text>
</ore-card>
```

</ComponentPreview>

## Orientation

Set `orientation="horizontal"` for a side-by-side media + content layout. The vertical layout is the default and requires no attribute.

<ComponentPreview center>

```html
<ore-card orientation="horizontal" elevation="2" style="max-width: 600px;">
  <div
    slot="media"
    style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-4xl);">
    <ore-icon name="camera" size="16"></ore-icon>
  </div>
  <ore-text slot="header" variant="heading" size="md">Horizontal Card</ore-text>
  <ore-text>Media appears on the left side, perfect for list items, product cards, and profile layouts.</ore-text>
  <div slot="actions">
    <ore-button size="sm">View</ore-button>
  </div>
</ore-card>
```

</ComponentPreview>

## Media & Actions Slots

### Media Slot

Add images, videos, or custom content at the top of the card (or left side in horizontal orientation). Always provide meaningful `alt` text for images placed in the `media` slot.

<ComponentPreview center>

```html
<ore-card elevation="2" style="max-width: 350px;">
  <img
    slot="media"
    src="https://images.unsplash.com/photo-1557683316-973673baf926?w=400"
    alt="Gradient"
    style="width: 100%; height: 200px; object-fit: cover;" />
  <ore-text slot="header" variant="heading" size="md">Beautiful Gradient</ore-text>
  <ore-text>Images automatically fill the media slot with proper sizing.</ore-text>
</ore-card>
```

</ComponentPreview>

### Actions Slot

Separate slot for action buttons with automatic layout. If the card needs inner actions, place buttons or links in the `actions` slot — nested interactive elements do not trigger card activation.

<ComponentPreview center>

```html
<ore-card elevation="2">
  <ore-text slot="header" variant="heading" size="md">Action Card</ore-text>
  <ore-text>This card has multiple actions in a dedicated slot.</ore-text>
  <div slot="actions">
    <ore-button color="primary" size="sm">Confirm</ore-button>
    <ore-button variant="outline" color="primary" size="sm">Cancel</ore-button>
    <ore-button variant="ghost" size="sm">Learn More</ore-button>
  </div>
</ore-card>
```

</ComponentPreview>

## States

### Disabled State

Prevent interaction and show visual feedback. Use `disabled` instead of removing interactive cards from the DOM.

<ComponentPreview center>

```html
<ore-card interactive disabled elevation="1">
  <ore-text slot="header" variant="heading" size="md">Disabled Card</ore-text>
  <ore-text>This card is disabled and cannot be interacted with.</ore-text>
  <div slot="actions">
    <ore-button size="sm">Action</ore-button>
  </div>
</ore-card>
```

</ComponentPreview>

### Loading State

Show an animated loading indicator while content is being fetched. Use the `loading` state to provide visual feedback during async operations.

<ComponentPreview center>

```html
<ore-card loading color="primary" elevation="2">
  <ore-text slot="header" variant="heading" size="md">Loading Content</ore-text>
  <ore-text>An animated loading bar appears at the top of the card.</ore-text>
</ore-card>
```

</ComponentPreview>

## Interactive Cards

Set `interactive` to enable hover/active states, keyboard activation (Enter/Space), and typed `activate` events. Make a card `interactive` only when the whole card acts as a single action.

<ComponentPreview center>

```html
<ore-card interactive elevation="2">
  <ore-text slot="header" variant="heading" size="md">Activate Me</ore-text>
  <ore-text> This card supports keyboard activation and emits an 'activate' event with trigger metadata. </ore-text>
</ore-card>

<script>
  document.querySelector('ore-card[interactive]')?.addEventListener('activate', (e) => {
    console.log('Card activated', e.detail.trigger, e.detail.originalEvent);
  });
</script>
```

</ComponentPreview>

## Practical Examples

### User Profile Card

<ComponentPreview center>

```html
<ore-card padding="lg" elevation="2" style="max-width: 320px">
  <div slot="media" style="text-align: center; padding: var(--size-4) var(--size-4) 0;">
    <ore-avatar initials="JD" color="primary" size="lg"></ore-avatar>
  </div>
  <div slot="header" style="text-align: center">
    <ore-text variant="heading" size="xl">Jane Doe</ore-text>
    <ore-text size="sm" variant="caption" color="muted">Software Engineer</ore-text>
  </div>
  <ore-text align="center" color="body"> Building beautiful web experiences with modern technologies. </ore-text>
  <div slot="actions" style="display: flex; width: 100%;">
    <ore-button-group attached fullwidth>
      <ore-button color="primary" style="flex: 1">Follow</ore-button>
      <ore-button variant="outline" color="primary" style="flex: 1">Message</ore-button>
    </ore-button-group>
  </div>
</ore-card>
```

</ComponentPreview>

### Product Card

<ComponentPreview center>

```html
<ore-card elevation="2" interactive padding="none" style="max-width: 280px">
  <div
    slot="media"
    style="height: 180px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-4xl);">
    <ore-icon name="package" size="16"></ore-icon>
  </div>
  <div style="padding: var(--size-4)">
    <ore-text variant="heading" size="lg">Premium Package</ore-text>
    <ore-text color="muted" style="margin: var(--size-2) 0 var(--size-3) 0;">
      Everything you need to get started with our platform.
    </ore-text>
    <div style="display: flex; align-items: baseline; gap: var(--size-2); margin-bottom: var(--size-3)">
      <span style="font-size: var(--text-2xl); font-weight: var(--font-bold);">$49</span>
      <span style="color: var(--color-contrast-500);">/month</span>
    </div>
  </div>
  <div slot="actions" style="padding: 0 var(--size-4) var(--size-4); width: 100%;">
    <ore-button color="primary" fullwidth> Get Started </ore-button>
  </div>
</ore-card>
```

</ComponentPreview>

### Status Card

<ComponentPreview center>

```html
<ore-card color="success" variant="flat" elevation="1" padding="lg" style="max-width: 400px">
  <div style="display: flex; align-items: start; gap: var(--size-3)">
    <div
      style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-success); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
      <ore-icon name="check" size="16"></ore-icon>
    </div>
    <div style="flex: 1">
      <ore-text variant="heading" color="success"> Success! </ore-text>
      <ore-text color="body"> Your changes have been saved successfully. </ore-text>
    </div>
  </div>
</ore-card>
```

</ComponentPreview>

### Stats Card

<ComponentPreview center>

```html
<ore-card elevation="2" padding="lg" style="max-width: 200px; text-align: center;">
  <ore-text color="primary" variant="heading" size="xl" style="margin-bottom: var(--size-2); display: block;">
    1,234
  </ore-text>
  <ore-text size="sm" color="secondary">Total Users</ore-text>
  <ore-text size="sm" color="success" style="margin-top: var(--size-2); display: block;">
    ↑ 12% from last month
  </ore-text>
</ore-card>
```

</ComponentPreview>

### Horizontal Product List

Perfect for compact layouts and list views:

<ComponentPreview center>

```html
<div style="display: flex; flex-direction: column; gap: var(--size-3); max-width: 700px;">
  <ore-card orientation="horizontal" variant="flat" elevation="1" interactive>
    <div
      slot="media"
      style="background: linear-gradient(135deg, #667eea, #764ba2); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-3xl);">
      <ore-icon name="smartphone" size="16"></ore-icon>
    </div>
    <ore-text slot="header" variant="heading" size="md">Smartphone Pro</ore-text>
    <ore-text>Latest model with advanced features.</ore-text>
    <div slot="actions" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <ore-text weight="bold">$999</ore-text>
      <ore-button size="sm" color="primary">Buy Now</ore-button>
    </div>
  </ore-card>

  <ore-card orientation="horizontal" variant="flat" elevation="1" interactive>
    <div
      slot="media"
      style="background: linear-gradient(135deg, #f093fb, #f5576c); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-3xl);">
      <ore-icon name="laptop" size="16"></ore-icon>
    </div>
    <ore-text slot="header" variant="heading" size="md">Laptop Elite</ore-text>
    <ore-text>Powerful performance for professionals.</ore-text>
    <div slot="actions" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <ore-text weight="bold">$1,499</ore-text>
      <ore-button size="sm" color="primary">Buy Now</ore-button>
    </div>
  </ore-card>
</div>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type                                                                      | Default | Description                                |
| ------------- | ------------------------------------------------------------------------- | ------- | ------------------------------------------ |
| `variant`     | `'solid' \| 'flat' \| 'glass' \| 'frost'`                                 | —       | Visual style variant                       |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Color theme for the card                   |
| `padding`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                  | —       | Internal padding size                      |
| `elevation`   | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                                  | —       | Shadow elevation level (0=none, 5=maximum) |
| `orientation` | `'horizontal'`                                                            | —       | Side-by-side media + content layout        |
| `interactive` | `boolean`                                                                 | `false` | Enable hover/active states and activation  |
| `disabled`    | `boolean`                                                                 | `false` | Disable card interaction                   |
| `loading`     | `boolean`                                                                 | `false` | Show animated loading bar at the top       |

### Slots

| Slot      | Description                                  |
| --------- | -------------------------------------------- |
| (default) | Main content area of the card                |
| `media`   | Media section (images/video) at the top      |
| `header`  | Header section below media                   |
| `footer`  | Footer section at the bottom of the card     |
| `actions` | Action buttons section (typically in footer) |

### Events

| Event      | Detail                                                                             | Description                                     |
| ---------- | ---------------------------------------------------------------------------------- | ----------------------------------------------- |
| `click`    | —                                                                                  | Native browser click (always available)         |
| `activate` | `{ trigger: 'pointer' \| 'keyboard', originalEvent: MouseEvent \| KeyboardEvent }` | Emitted when an `interactive` card is activated |

### CSS Custom Properties

| Property              | Default                     | Description        |
| --------------------- | --------------------------- | ------------------ |
| `--card-bg`           | `var(--color-canvas)`       | Background color   |
| `--card-color`        | `var(--color-contrast-900)` | Text color         |
| `--card-border`       | `var(--border)`             | Border width       |
| `--card-border-color` | `var(--color-contrast-300)` | Border color       |
| `--card-radius`       | `var(--rounded-lg)`         | Border radius      |
| `--card-padding`      | `var(--size-4)`             | Internal padding   |
| `--card-shadow`       | `var(--shadow-sm)`          | Box shadow         |
| `--card-hover-shadow` | `var(--shadow-md)`          | Hover state shadow |

## Customization

### Custom Styling

```html
<ore-card
  style="
    --card-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --card-color: white;
    --card-radius: var(--rounded-2xl);
    --card-padding: var(--size-8);
  ">
  <ore-text slot="header" variant="heading" size="md">Custom Styled Card</ore-text>
  <ore-text>This card has custom colors and spacing.</ore-text>
</ore-card>
```

### Custom Shadow

```html
<ore-card
  style="
    --card-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --card-hover-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  "
  interactive>
  <ore-text slot="header" variant="heading" size="md">Enhanced Shadow</ore-text>
  <ore-text>Hover to see the custom shadow effect.</ore-text>
</ore-card>
```

Maintain color contrast requirements (WCAG 2.1 Level AA) when using custom `--card-bg` overrides.

## Accessibility

The card component follows WCAG 2.1 Level AA standards. When `interactive` is set, `role="button"` is applied and `aria-disabled` reflects the disabled state. The `aria-busy` attribute reflects the loading state. Disabled cards receive `tabindex="-1"` and cannot receive focus. `Tab` moves focus to the card; `Enter` or `Space` activates it. Content is organized using semantic HTML with named slots that screen readers can navigate in a logical hierarchy. Use semantic headings in the `header` slot to maintain proper document structure.
