# Card Component

A versatile and feature-rich card container component with purposeful variants, color themes, elevation control, and interactive states. Perfect for grouping related content, creating structured layouts, and building modern UI patterns. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🎨 **4 Variants**: solid, flat, glass, frost
- 🌈 **6 Color Themes**: primary, secondary, info, success, warning, error
- 📏 **5 Padding Sizes**: none, sm, md, lg, xl
- 📊 **6 Elevation Levels**: 0-5 for precise shadow control
- 🖼️ **5 Slots**: media, header, content, footer, actions
- 📱 **Horizontal orientation** for side-by-side media layouts
- 🎯 **Interactive States**: interactive, disabled, loading
- ♿ **Fully Accessible**: WCAG 2.1 Level AA compliant with keyboard navigation
- 🔧 **Customizable**: CSS custom properties for complete control
- ⚡ **Custom Events**: Emits `activate` with event details (`trigger`, `originalEvent`)

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/content/card/card.ts
:::

## Basic Usage

```html
<bit-card>
  <img slot="media" src="/hero.jpg" alt="Card hero image" />
  <bit-text slot="header" variant="heading" size="xl">Card Title</bit-text>
  <bit-text>This is the card content. It can contain any HTML elements.</bit-text>
  <bit-text slot="footer" size="sm" variant="caption">Additional information</bit-text>
  <div slot="actions">
    <bit-button size="sm">Primary</bit-button>
    <bit-button size="sm" variant="ghost">Secondary</bit-button>
  </div>
</bit-card>

<script type="module">
  import '@vielzeug/buildit/card';
  import '@vielzeug/buildit/button';
  import '@vielzeug/buildit/text';
</script>
```

## Visual Options

### Variants

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
<bit-card elevation="0">Flat appearance</bit-card>

<!-- High elevation -->
<bit-card elevation="4">High shadow</bit-card>
```

:::

<ComponentPreview center>

```html
<bit-card>
  <bit-text slot="header" variant="heading" size="lg">Default Card</bit-text>
  <bit-text>Clean, subtle background with gentle borders. Use elevation prop for shadow depth.</bit-text>
</bit-card>

<bit-card variant="solid" color="primary">
  <bit-text slot="header" variant="heading" size="lg">Solid Card</bit-text>
  <bit-text>Filled with the theme color background.</bit-text>
</bit-card>

<bit-card variant="flat" color="primary">
  <bit-text slot="header" variant="heading" size="lg">Flat Card</bit-text>
  <bit-text>Subtle backdrop tint, low visual weight.</bit-text>
</bit-card>
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
<bit-card variant="frost" padding="lg">
  <bit-text slot="header" variant="heading" size="xl">Neutral Frost Card</bit-text>
  <bit-text>Subtle canvas-based transparency with backdrop blur.</bit-text>
  <div slot="footer">
    <bit-button variant="frost" size="sm">Learn More</bit-button>
  </div>
</bit-card>
```

</ComponentPreview>

### Padding Sizes

Control the internal spacing of the card.

<ComponentPreview center>

```html
<bit-card padding="none" elevation="1">
  <bit-text slot="header" variant="heading" size="lg">No Padding</bit-text>
  <bit-text>Content reaches the edges.</bit-text>
</bit-card>

<bit-card padding="sm" elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Small Padding</bit-text>
  <bit-text>Compact spacing.</bit-text>
</bit-card>

<bit-card padding="md" elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Medium Padding</bit-text>
  <bit-text>Default spacing (if not specified).</bit-text>
</bit-card>

<bit-card padding="lg" elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Large Padding</bit-text>
  <bit-text>Generous spacing.</bit-text>
</bit-card>

<bit-card padding="xl" elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Extra Large Padding</bit-text>
  <bit-text>Maximum spacing for spacious layouts.</bit-text>
</bit-card>
```

</ComponentPreview>

### Color Themes

Apply semantic color themes to cards for different contexts.

<ComponentPreview center>

```html
<bit-card color="primary">
  <bit-text slot="header" variant="heading" size="lg">Primary Card</bit-text>
  <bit-text>Uses the primary brand color.</bit-text>
</bit-card>

<bit-card color="secondary">
  <bit-text slot="header" variant="heading" size="lg">Secondary Card</bit-text>
  <bit-text>Uses the secondary brand color.</bit-text>
</bit-card>

<bit-card color="info">
  <bit-text slot="header" variant="heading" size="lg">Info Card</bit-text>
  <bit-text>Perfect for positive messages.</bit-text>
</bit-card>

<bit-card color="success">
  <bit-text slot="header" variant="heading" size="lg">Success Card</bit-text>
  <bit-text>Perfect for positive messages.</bit-text>
</bit-card>

<bit-card color="warning">
  <bit-text slot="header" variant="heading" size="lg">Warning Card</bit-text>
  <bit-text>Great for caution messages.</bit-text>
</bit-card>

<bit-card color="error">
  <bit-text slot="header" variant="heading" size="lg">Error Card</bit-text>
  <bit-text>Ideal for error states.</bit-text>
</bit-card>
```

</ComponentPreview>

### Elevation Levels

Control shadow depth with explicit elevation levels (0-5).

<ComponentPreview center>

```html
<bit-card elevation="0">
  <bit-text slot="header" variant="heading" size="lg">Elevation 0</bit-text>
  <bit-text>No shadow - flat appearance.</bit-text>
</bit-card>

<bit-card elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Elevation 1</bit-text>
  <bit-text>Subtle shadow.</bit-text>
</bit-card>

<bit-card elevation="2">
  <bit-text slot="header" variant="heading" size="lg">Elevation 2</bit-text>
  <bit-text>Medium shadow (default).</bit-text>
</bit-card>

<bit-card elevation="3">
  <bit-text slot="header" variant="heading" size="lg">Elevation 3</bit-text>
  <bit-text>Prominent shadow.</bit-text>
</bit-card>

<bit-card elevation="4">
  <bit-text slot="header" variant="heading" size="lg">Elevation 4</bit-text>
  <bit-text>High elevation.</bit-text>
</bit-card>

<bit-card elevation="5">
  <bit-text slot="header" variant="heading" size="lg">Elevation 5</bit-text>
  <bit-text>Maximum elevation.</bit-text>
</bit-card>
```

</ComponentPreview>

### Orientation

Set `orientation="horizontal"` for a side-by-side media + content layout. The vertical layout is the default and requires no attribute.

<ComponentPreview center>

```html
<bit-card orientation="horizontal" elevation="2" style="max-width: 600px;">
  <div
    slot="media"
    style="background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-4xl);">
    📷
  </div>
  <bit-text slot="header" variant="heading" size="xl">Horizontal Card</bit-text>
  <bit-text>Media appears on the left side, perfect for list items, product cards, and profile layouts.</bit-text>
  <div slot="actions">
    <bit-button size="sm">View</bit-button>
  </div>
</bit-card>
```

</ComponentPreview>

## Media & Actions Slots

### Media Slot

Add images, videos, or custom content at the top of the card (or left side in horizontal orientation).

<ComponentPreview center>

```html
<bit-card elevation="2" style="max-width: 350px;">
  <img
    slot="media"
    src="https://images.unsplash.com/photo-1557683316-973673baf926?w=400"
    alt="Gradient"
    style="width: 100%; height: 200px; object-fit: cover;" />
  <bit-text slot="header" variant="heading" size="xl">Beautiful Gradient</bit-text>
  <bit-text>Images automatically fill the media slot with proper sizing.</bit-text>
</bit-card>
```

</ComponentPreview>

### Actions Slot

Separate slot for action buttons with automatic layout.

<ComponentPreview center>

```html
<bit-card elevation="2">
  <bit-text slot="header" variant="heading" size="xl">Action Card</bit-text>
  <bit-text>This card has multiple actions in a dedicated slot.</bit-text>
  <div slot="actions">
    <bit-button color="primary" size="sm">Confirm</bit-button>
    <bit-button variant="outline" color="primary" size="sm">Cancel</bit-button>
    <bit-button variant="ghost" size="sm">Learn More</bit-button>
  </div>
</bit-card>
```

</ComponentPreview>

## States

### Disabled State

Prevent interaction and show visual feedback.

<ComponentPreview center>

```html
<bit-card interactive disabled elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Disabled Card</bit-text>
  <bit-text>This card is disabled and cannot be interacted with.</bit-text>
  <div slot="actions">
    <bit-button size="sm">Action</bit-button>
  </div>
</bit-card>
```

</ComponentPreview>

### Loading State

Show an animated loading indicator while content is being fetched.

<ComponentPreview center>

```html
<bit-card loading color="primary" elevation="2">
  <bit-text slot="header" variant="heading" size="lg">Loading Content</bit-text>
  <bit-text>An animated loading bar appears at the top of the card.</bit-text>
</bit-card>
```

</ComponentPreview>

## Interactive Cards

Set `interactive` to enable hover/active states, keyboard activation (Enter/Space), and typed `activate` events.

<ComponentPreview center>

```html
<bit-card interactive elevation="2">
  <bit-text slot="header" variant="heading" size="lg">Activate Me</bit-text>
  <bit-text> This card supports keyboard activation and emits an 'activate' event with trigger metadata. </bit-text>
</bit-card>

<script>
  document.querySelector('bit-card[interactive]')?.addEventListener('activate', (e) => {
    console.log('Card activated', e.detail.trigger, e.detail.originalEvent);
  });
</script>
```

</ComponentPreview>

## Practical Examples

### User Profile Card

<ComponentPreview center>

```html
<bit-card padding="lg" elevation="2" style="max-width: 320px">
  <div slot="media" style="text-align: center; padding: var(--size-4) var(--size-4) 0;">
    <div
      style="width: 80px; height: 80px; border-radius: 50%; background: var(--color-primary); margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-2xl); font-weight: var(--font-bold);">
      JD
    </div>
  </div>
  <div slot="header" style="text-align: center">
    <bit-text variant="heading" size="xl">Jane Doe</bit-text>
    <bit-text size="sm" variant="caption" color="muted">Software Engineer</bit-text>
  </div>
  <bit-text align="center" color="body"> Building beautiful web experiences with modern technologies. </bit-text>
  <div slot="actions" style="display: flex; width: 100%;">
    <bit-button-group attached fullwidth>
      <bit-button color="primary" style="flex: 1">Follow</bit-button>
      <bit-button variant="outline" color="primary" style="flex: 1">Message</bit-button>
    </bit-button-group>
  </div>
</bit-card>
```

</ComponentPreview>

### Product Card

<ComponentPreview center>

```html
<bit-card elevation="2" interactive padding="none" style="max-width: 280px">
  <div
    slot="media"
    style="height: 180px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-4xl);">
    📦
  </div>
  <div style="padding: var(--size-4)">
    <bit-text variant="heading" size="lg">Premium Package</bit-text>
    <bit-text color="muted" style="margin: var(--size-2) 0 var(--size-3) 0;">
      Everything you need to get started with our platform.
    </bit-text>
    <div style="display: flex; align-items: baseline; gap: var(--size-2); margin-bottom: var(--size-3)">
      <span style="font-size: var(--text-2xl); font-weight: var(--font-bold);">$49</span>
      <span style="color: var(--color-contrast-500);">/month</span>
    </div>
  </div>
  <div slot="actions" style="padding: 0 var(--size-4) var(--size-4); width: 100%;">
    <bit-button color="primary" fullwidth> Get Started </bit-button>
  </div>
</bit-card>
```

</ComponentPreview>

### Status Card

<ComponentPreview center>

```html
<bit-card color="success" variant="flat" elevation="1" padding="lg" style="max-width: 400px">
  <div style="display: flex; align-items: start; gap: var(--size-3)">
    <div
      style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-success); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
      ✓
    </div>
    <div style="flex: 1">
      <bit-text variant="heading" size="lg" color="success"> Success! </bit-text>
      <bit-text color="body"> Your changes have been saved successfully. </bit-text>
    </div>
  </div>
</bit-card>
```

</ComponentPreview>

### Stats Card

<ComponentPreview center>

```html
<bit-card elevation="2" padding="lg" style="max-width: 200px; text-align: center;">
  <div
    style="font-size: var(--text-4xl); font-weight: var(--font-bold); color: var(--color-primary); margin-bottom: var(--size-2);">
    1,234
  </div>
  <div style="color: var(--color-contrast-600); font-size: var(--text-sm);">Total Users</div>
  <div style="color: var(--color-success); font-size: var(--text-sm); margin-top: var(--size-2);">
    ↑ 12% from last month
  </div>
</bit-card>
```

</ComponentPreview>

### Horizontal Product List

Perfect for compact layouts and list views:

<ComponentPreview center>

```html
<div style="display: flex; flex-direction: column; gap: var(--size-3); max-width: 700px;">
  <bit-card orientation="horizontal" variant="flat" elevation="1" interactive>
    <div
      slot="media"
      style="background: linear-gradient(135deg, #667eea, #764ba2); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-3xl);">
      📱
    </div>
    <bit-text slot="header" variant="heading" size="lg">Smartphone Pro</bit-text>
    <bit-text>Latest model with advanced features.</bit-text>
    <div slot="actions" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <bit-text weight="bold">$999</bit-text>
      <bit-button size="sm" color="primary">Buy Now</bit-button>
    </div>
  </bit-card>

  <bit-card orientation="horizontal" variant="flat" elevation="1" interactive>
    <div
      slot="media"
      style="background: linear-gradient(135deg, #f093fb, #f5576c); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-3xl);">
      💻
    </div>
    <bit-text slot="header" variant="heading" size="lg">Laptop Elite</bit-text>
    <bit-text>Powerful performance for professionals.</bit-text>
    <div slot="actions" style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
      <bit-text weight="bold">$1,499</bit-text>
      <bit-button size="sm" color="primary">Buy Now</bit-button>
    </div>
  </bit-card>
</div>
```

</ComponentPreview>

## Guideline Recipe: Bolder Product Card CTA

**Guideline: bolder** — combining solid card elevation with a clear primary button ensures the call-to-action stands out without needing extra visual weight elsewhere.

```html
<bit-card variant="elevated" elevation="2" style="max-width:320px">
  <img slot="media" src="/product-thumbnail.jpg" alt="Pro Plan" />
  <bit-text slot="default" variant="heading" size="md">Pro Plan</bit-text>
  <bit-text slot="default" variant="body" color="subtle">
    Unlimited projects, priority support, and advanced analytics.
  </bit-text>
  <div slot="actions" style="display:flex;gap:var(--size-2)">
    <bit-button variant="solid" color="primary" style="flex:1">Upgrade — $12/mo</bit-button>
    <bit-button variant="ghost">Learn more</bit-button>
  </div>
</bit-card>
```

**Tip:** Use `elevation="2"` + `variant="elevated"` for product/pricing cards so they read as actionable containers.

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
| `--card-radius`       | `var(--rounded-md)`         | Border radius      |
| `--card-padding`      | `var(--size-4)`             | Internal padding   |
| `--card-shadow`       | `var(--shadow-sm)`          | Box shadow         |
| `--card-hover-shadow` | `var(--shadow-md)`          | Hover state shadow |

## Customization

### Custom Styling

```html
<bit-card
  style="
    --card-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --card-color: white;
    --card-radius: var(--rounded-2xl);
    --card-padding: var(--size-8);
  ">
  <bit-text slot="header" variant="heading" size="xl">Custom Styled Card</bit-text>
  <bit-text>This card has custom colors and spacing.</bit-text>
</bit-card>
```

### Custom Shadow

```html
<bit-card
  style="
    --card-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --card-hover-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  "
  interactive>
  <bit-text slot="header" variant="heading" size="xl">Enhanced Shadow</bit-text>
  <bit-text>Hover to see the custom shadow effect.</bit-text>
</bit-card>
```

## Accessibility

The card component follows WCAG 2.1 Level AA standards.

### `bit-card`

✅ **Keyboard Navigation**

- `Enter` / `Space` activate the card when `interactive` is set.
- `Tab` moves focus to the card.
- Disabled cards have `tabindex="-1"` and cannot receive focus.

✅ **Screen Readers**

- `role="button"` is applied when `interactive` is set; `aria-disabled` reflects the disabled state.
- `aria-busy` reflects the loading state.
- Proper content hierarchy with semantic slots for screen reader users.

✅ **Semantic Structure**

- Uses semantic HTML for proper content organization.
- Compliant with WCAG 2.1 Level AA color contrast requirements.

## Best Practices

1. Use semantic headings in the `header` slot to maintain proper document structure.
2. Add meaningful `alt` text for images in the `media` slot.
3. Make a card `interactive` only when the whole card acts as a single action.
4. If you need inner actions, place buttons/links in the `actions` slot; nested interactive elements do not trigger card activation.
5. Maintain color contrast when using custom `--card-bg` overrides.
6. Use `disabled` instead of removing interactive cards from the DOM.
7. Use the `loading` state to provide visual feedback during async operations.
