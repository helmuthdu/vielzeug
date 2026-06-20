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
<sg-card elevation="0">Flat appearance</sg-card>

<!-- High elevation -->
<sg-card elevation="4">High shadow</sg-card>
```

:::

<ComponentPreview center>

```html
<sg-card>
  <sg-text slot="header" variant="heading" size="md">Default Card</sg-text>
  <sg-text>Clean, subtle background with gentle borders. Use elevation prop for shadow depth.</sg-text>
</sg-card>

<sg-card variant="solid" color="primary">
  <sg-text slot="header" variant="heading" size="md">Solid Card</sg-text>
  <sg-text>Filled with the theme color background.</sg-text>
</sg-card>

<sg-card variant="flat" color="primary">
  <sg-text slot="header" variant="heading" size="md">Flat Card</sg-text>
  <sg-text>Subtle backdrop tint, low visual weight.</sg-text>
</sg-card>
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
<sg-card variant="frost" padding="lg">
  <sg-text slot="header" variant="heading" size="md">Neutral Frost Card</sg-text>
  <sg-text>Subtle canvas-based transparency with backdrop blur.</sg-text>
  <div slot="footer">
    <sg-button variant="frost" size="sm">Learn More</sg-button>
  </div>
</sg-card>
```

</ComponentPreview>

## Padding Sizes

Control the internal spacing of the card.

<ComponentPreview center>

```html
<sg-card padding="none" elevation="1">
  <sg-text slot="header" variant="heading" size="md">No Padding</sg-text>
  <sg-text>Content reaches the edges.</sg-text>
</sg-card>

<sg-card padding="sm" elevation="1">
  <sg-text slot="header" variant="heading" size="md">Small Padding</sg-text>
  <sg-text>Compact spacing.</sg-text>
</sg-card>

<sg-card padding="md" elevation="1">
  <sg-text slot="header" variant="heading" size="md">Medium Padding</sg-text>
  <sg-text>Default spacing (if not specified).</sg-text>
</sg-card>

<sg-card padding="lg" elevation="1">
  <sg-text slot="header" variant="heading" size="md">Large Padding</sg-text>
  <sg-text>Generous spacing.</sg-text>
</sg-card>

<sg-card padding="xl" elevation="1">
  <sg-text slot="header" variant="heading" size="md">Extra Large Padding</sg-text>
  <sg-text>Maximum spacing for spacious layouts.</sg-text>
</sg-card>
```

</ComponentPreview>

## Color Themes

Apply semantic color themes to cards for different contexts.

<ComponentPreview center>

```html
<sg-card color="primary">
  <sg-text slot="header" variant="heading" size="md">Primary Card</sg-text>
  <sg-text>Uses the primary brand color.</sg-text>
</sg-card>

<sg-card color="secondary">
  <sg-text slot="header" variant="heading" size="md">Secondary Card</sg-text>
  <sg-text>Uses the secondary brand color.</sg-text>
</sg-card>

<sg-card color="info">
  <sg-text slot="header" variant="heading" size="md">Info Card</sg-text>
  <sg-text>Perfect for positive messages.</sg-text>
</sg-card>

<sg-card color="success">
  <sg-text slot="header" variant="heading" size="md">Success Card</sg-text>
  <sg-text>Perfect for positive messages.</sg-text>
</sg-card>

<sg-card color="warning">
  <sg-text slot="header" variant="heading" size="md">Warning Card</sg-text>
  <sg-text>Great for caution messages.</sg-text>
</sg-card>

<sg-card color="error">
  <sg-text slot="header" variant="heading" size="md">Error Card</sg-text>
  <sg-text>Ideal for error states.</sg-text>
</sg-card>
```

</ComponentPreview>

## Elevation Levels

Control shadow depth with explicit elevation levels (0-5).

<ComponentPreview center>

```html
<sg-card elevation="0">
  <sg-text slot="header" variant="heading" size="md">Elevation 0</sg-text>
  <sg-text>No shadow - flat appearance.</sg-text>
</sg-card>

<sg-card elevation="1">
  <sg-text slot="header" variant="heading" size="md">Elevation 1</sg-text>
  <sg-text>Subtle shadow.</sg-text>
</sg-card>

<sg-card elevation="2">
  <sg-text slot="header" variant="heading" size="md">Elevation 2</sg-text>
  <sg-text>Medium shadow (default).</sg-text>
</sg-card>

<sg-card elevation="3">
  <sg-text slot="header" variant="heading" size="md">Elevation 3</sg-text>
  <sg-text>Prominent shadow.</sg-text>
</sg-card>

<sg-card elevation="4">
  <sg-text slot="header" variant="heading" size="md">Elevation 4</sg-text>
  <sg-text>High elevation.</sg-text>
</sg-card>

<sg-card elevation="5">
  <sg-text slot="header" variant="heading" size="md">Elevation 5</sg-text>
  <sg-text>Maximum elevation.</sg-text>
</sg-card>
```

</ComponentPreview>

## Orientation

Set `orientation="horizontal"` for a side-by-side media + content layout. The vertical layout is the default and requires no attribute.

<ComponentPreview center>

```html
<sg-card orientation="horizontal" elevation="2" style="max-width: 600px;">
  <div
    slot="media"
    style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-4xl);">
    <sg-icon name="camera" size="16"></sg-icon>
  </div>
  <sg-text slot="header" variant="heading" size="md">Horizontal Card</sg-text>
  <sg-text>Media appears on the left side, perfect for list items, product cards, and profile layouts.</sg-text>
  <div slot="actions">
    <sg-button size="sm">View</sg-button>
  </div>
</sg-card>
```

</ComponentPreview>

## Media & Actions Slots

### Media Slot

Add images, videos, or custom content at the top of the card (or left side in horizontal orientation). Always provide meaningful `alt` text for images placed in the `media` slot.

<ComponentPreview center>

```html
<sg-card elevation="2" style="max-width: 350px;">
  <img
    slot="media"
    src="https://images.unsplash.com/photo-1557683316-973673baf926?w=400"
    alt="Gradient"
    style="width: 100%; height: 200px; object-fit: cover;" />
  <sg-text slot="header" variant="heading" size="md">Beautiful Gradient</sg-text>
  <sg-text>Images automatically fill the media slot with proper sizing.</sg-text>
</sg-card>
```

</ComponentPreview>

### Actions Slot

Separate slot for action buttons with automatic layout. If the card needs inner actions, place buttons or links in the `actions` slot — nested interactive elements do not trigger card activation.

<ComponentPreview center>

```html
<sg-card elevation="2">
  <sg-text slot="header" variant="heading" size="md">Action Card</sg-text>
  <sg-text>This card has multiple actions in a dedicated slot.</sg-text>
  <div slot="actions">
    <sg-button color="primary" size="sm">Confirm</sg-button>
    <sg-button variant="outline" color="primary" size="sm">Cancel</sg-button>
    <sg-button variant="ghost" size="sm">Learn More</sg-button>
  </div>
</sg-card>
```

</ComponentPreview>

## States

### Disabled State

Prevent interaction and show visual feedback. Use `disabled` instead of removing interactive cards from the DOM.

<ComponentPreview center>

```html
<sg-card interactive disabled elevation="1">
  <sg-text slot="header" variant="heading" size="md">Disabled Card</sg-text>
  <sg-text>This card is disabled and cannot be interacted with.</sg-text>
  <div slot="actions">
    <sg-button size="sm">Action</sg-button>
  </div>
</sg-card>
```

</ComponentPreview>

### Loading State

Show an animated loading indicator while content is being fetched. Use the `loading` state to provide visual feedback during async operations.

<ComponentPreview center>

```html
<sg-card loading color="primary" elevation="2">
  <sg-text slot="header" variant="heading" size="md">Loading Content</sg-text>
  <sg-text>An animated loading bar appears at the top of the card.</sg-text>
</sg-card>
```

</ComponentPreview>

## Interactive Cards

Set `interactive` to enable hover/active states, keyboard activation (Enter/Space), and typed `activate` events. Make a card `interactive` only when the whole card acts as a single action.

<ComponentPreview center>

```html
<sg-card interactive elevation="2">
  <sg-text slot="header" variant="heading" size="md">Activate Me</sg-text>
  <sg-text> This card supports keyboard activation and emits an 'activate' event with trigger metadata. </sg-text>
</sg-card>

<script>
  document.querySelector('sg-card[interactive]')?.addEventListener('activate', (e) => {
    console.log('Card activated', e.detail.trigger, e.detail.originalEvent);
  });
</script>
```

</ComponentPreview>

## Practical Examples

### User Profile Card

<ComponentPreview center>

```html
<sg-card padding="lg" elevation="2" style="max-width: 320px">
  <div slot="media" style="text-align: center; padding: var(--size-4) var(--size-4) 0;">
    <sg-avatar initials="JD" color="primary" size="lg"></sg-avatar>
  </div>
  <div slot="header" style="text-align: center">
    <sg-text variant="heading" size="xl">Jane Doe</sg-text>
    <sg-text size="sm" variant="caption" color="muted">Software Engineer</sg-text>
  </div>
  <sg-text align="center" color="body"> Building beautiful web experiences with modern technologies. </sg-text>
  <div slot="actions" style="display: flex; width: 100%;">
    <sg-button-group attached fullwidth>
      <sg-button color="primary" style="flex: 1">Follow</sg-button>
      <sg-button variant="outline" color="primary" style="flex: 1">Message</sg-button>
    </sg-button-group>
  </div>
</sg-card>
```

</ComponentPreview>

### Product Card

<ComponentPreview center>

```html
<sg-card elevation="2" interactive padding="none" style="max-width: 280px">
  <div
    slot="media"
    style="height: 180px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-4xl);">
    <sg-icon name="package" size="16"></sg-icon>
  </div>
  <div style="padding: var(--size-4)">
    <sg-text variant="heading" size="lg">Premium Package</sg-text>
    <sg-text color="muted" style="margin: var(--size-2) 0 var(--size-3) 0;">
      Everything you need to get started with our platform.
    </sg-text>
    <div style="display: flex; align-items: baseline; gap: var(--size-2); margin-bottom: var(--size-3)">
      <span style="font-size: var(--text-2xl); font-weight: var(--font-bold);">$49</span>
      <span style="color: var(--color-contrast-500);">/month</span>
    </div>
  </div>
  <div slot="actions" style="padding: 0 var(--size-4) var(--size-4); width: 100%;">
    <sg-button color="primary" fullwidth> Get Started </sg-button>
  </div>
</sg-card>
```

</ComponentPreview>

### Status Card

<ComponentPreview center>

```html
<sg-card color="success" variant="flat" elevation="1" padding="lg" style="max-width: 400px">
  <div style="display: flex; align-items: start; gap: var(--size-3)">
    <div
      style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-success); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
      <sg-icon name="check" size="16"></sg-icon>
    </div>
    <div style="flex: 1">
      <sg-text variant="heading" color="success"> Success! </sg-text>
      <sg-text color="body"> Your changes have been saved successfully. </sg-text>
    </div>
  </div>
</sg-card>
```

</ComponentPreview>

### Stats Card

<ComponentPreview center>

```html
<sg-card elevation="2" padding="lg" style="max-width: 200px; text-align: center;">
  <sg-text color="primary" variant="heading" size="xl" style="margin-bottom: var(--size-2); display: block;">
    1,234
  </sg-text>
  <sg-text size="sm" color="secondary">Total Users</sg-text>
  <sg-text size="sm" color="success" style="margin-top: var(--size-2); display: block;">
    ↑ 12% from last month
  </sg-text>
</sg-card>
```

</ComponentPreview>

### Horizontal Product List

Perfect for compact layouts and list views:

<ComponentPreview center>

```html
<div style="display: flex; flex-direction: column; gap: var(--size-3); max-width: 700px;">
  <sg-card orientation="horizontal" variant="flat" elevation="1" interactive>
    <div
      slot="media"
      style="background: linear-gradient(135deg, #667eea, #764ba2); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-3xl);">
      <sg-icon name="smartphone" size="16"></sg-icon>
    </div>
    <sg-text slot="header" variant="heading" size="md">Smartphone Pro</sg-text>
    <sg-text>Latest model with advanced features.</sg-text>
    <div slot="actions" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <sg-text weight="bold">$999</sg-text>
      <sg-button size="sm" color="primary">Buy Now</sg-button>
    </div>
  </sg-card>

  <sg-card orientation="horizontal" variant="flat" elevation="1" interactive>
    <div
      slot="media"
      style="background: linear-gradient(135deg, #f093fb, #f5576c); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-3xl);">
      <sg-icon name="laptop" size="16"></sg-icon>
    </div>
    <sg-text slot="header" variant="heading" size="md">Laptop Elite</sg-text>
    <sg-text>Powerful performance for professionals.</sg-text>
    <div slot="actions" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <sg-text weight="bold">$1,499</sg-text>
      <sg-button size="sm" color="primary">Buy Now</sg-button>
    </div>
  </sg-card>
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
<sg-card
  style="
    --card-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --card-color: white;
    --card-radius: var(--rounded-2xl);
    --card-padding: var(--size-8);
  ">
  <sg-text slot="header" variant="heading" size="md">Custom Styled Card</sg-text>
  <sg-text>This card has custom colors and spacing.</sg-text>
</sg-card>
```

### Custom Shadow

```html
<sg-card
  style="
    --card-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --card-hover-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  "
  interactive>
  <sg-text slot="header" variant="heading" size="md">Enhanced Shadow</sg-text>
  <sg-text>Hover to see the custom shadow effect.</sg-text>
</sg-card>
```

Maintain color contrast requirements (WCAG 2.1 Level AA) when using custom `--card-bg` overrides.

## Accessibility

The card component follows WCAG 2.1 Level AA standards. When `interactive` is set, `role="button"` is applied and `aria-disabled` reflects the disabled state. The `aria-busy` attribute reflects the loading state. Disabled cards receive `tabindex="-1"` and cannot receive focus. `Tab` moves focus to the card; `Enter` or `Space` activates it. Content is organized using semantic HTML with named slots that screen readers can navigate in a logical hierarchy. Use semantic headings in the `header` slot to maintain proper document structure.
