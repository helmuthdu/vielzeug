# Card Component

A versatile and feature-rich card container component with purposeful variants, color themes, elevation control, and interactive states. Perfect for grouping related content, creating structured layouts, and building modern UI patterns. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🎨 **1 Special Variant**: Frost effect with smart color adaptation
- 🌈 **6 Color Themes**: primary, secondary, info, success, warning, error
- 📏 **5 Padding Sizes**: none, sm, md, lg, xl
- 📊 **6 Elevation Levels**: 0-5 for precise shadow control
- 🖼️ **5 Slots**: media, header, content, footer, actions
- 📱 **2 Orientations**: vertical (default) and horizontal layouts
- 🎯 **Interactive States**: hoverable, clickable, disabled, loading
- ♿ **Fully Accessible**: WCAG 2.1 Level AA compliant with keyboard navigation
- 🔧 **Customizable**: CSS custom properties for complete control
- ⚡ **Custom Events**: Enhanced event system with detailed information

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

The card has a **clean default style** with optional special variants for advanced effects:

- **Default** (no variant) - Subtle background with gentle border, perfect for most use cases
- **`glass`** - Modern glassmorphism effect with backdrop blur
- **`frost`** - Frosted glass effect with canvas-based transparency

::: tip Elevation Control
Use the `elevation` prop (0-5) to control shadow depth! The default style works beautifully with any elevation level, while glass and frost variants are perfect for floating UI elements.

**Example:**

```html
<!-- Default card with high elevation -->
<bit-card elevation="4">High shadow</bit-card>

<!-- Default card with no shadow -->
<bit-card elevation="0">Flat appearance</bit-card>
```

:::

<ComponentPreview center>

```html
<bit-card>
  <bit-text slot="header" variant="heading" size="lg">Default Card</bit-text>
  <bit-text>Clean, subtle background with gentle borders. Use elevation prop for shadow depth.</bit-text>
</bit-card>

<bit-card color="primary">
  <bit-text slot="header" variant="heading" size="lg">Colored Card</bit-text>
  <bit-text>Default style with semantic color applied.</bit-text>
</bit-card>
```

</ComponentPreview>

### Combining Colors with Elevation

The real power comes from combining colors with elevation levels:

<ComponentPreview center>

```html
<bit-card elevation="0">
  <bit-text slot="header" variant="heading" size="lg">No Shadow</bit-text>
  <bit-text>Flat appearance, subtle background.</bit-text>
</bit-card>

<bit-card elevation="3" color="primary">
  <bit-text slot="header" variant="heading" size="lg">Elevated + Colored</bit-text>
  <bit-text>High shadow with primary color.</bit-text>
</bit-card>

<bit-card elevation="1" color="secondary">
  <bit-text slot="header" variant="heading" size="lg">Subtle Shadow + Color</bit-text>
  <bit-text>Minimal style with secondary color.</bit-text>
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

Cards support both vertical (default) and horizontal layouts.

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
<bit-card clickable disabled elevation="1">
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

### Hoverable

Add a hover effect that lifts the card and increases shadow on mouse over.

<ComponentPreview center>

```html
<bit-card hoverable elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Hover Over Me</bit-text>
  <bit-text>This card responds to hover with a subtle lift animation.</bit-text>
</bit-card>

<bit-card variant="flat" hoverable elevation="1">
  <bit-text slot="header" variant="heading" size="lg">Flat + Hover</bit-text>
  <bit-text>Flat variant with hover effect.</bit-text>
</bit-card>
```

</ComponentPreview>

### Clickable

Make the entire card clickable with appropriate cursor, keyboard support, and custom events.

<ComponentPreview center>

```html
<bit-card clickable hoverable elevation="2">
  <bit-text slot="header" variant="heading" size="lg">Click Me</bit-text>
  <bit-text
    >This card is clickable, supports keyboard navigation (Enter/Space), and emits both 'click' and 'cardclick'
    events.</bit-text
  >
</bit-card>

<script>
  document.querySelector('bit-card[clickable]')?.addEventListener('cardclick', (e) => {
    console.log('Card clicked!', e.detail);
    // detail includes: { originalEvent, variant, color }
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
<bit-card elevation="2" hoverable clickable padding="none" style="max-width: 280px">
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
  <bit-card orientation="horizontal" variant="flat" elevation="1" hoverable clickable>
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

  <bit-card orientation="horizontal" variant="flat" elevation="1" hoverable clickable>
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

## API

### Attributes

| Attribute     | Type                                                                         | Default      | Description                                |
| ------------- | ---------------------------------------------------------------------------- | ------------ | ------------------------------------------ |
| `variant`     | `'solid' \| 'flat' \| 'frost'`                                               | `'solid'`    | Visual style variant                       |
| `color`       | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'neutral'` | `'neutral'`  | Color theme for the card                   |
| `padding`     | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'`                                     | `'md'`       | Internal padding size                      |
| `elevation`   | `'0' \| '1' \| '2' \| '3' \| '4' \| '5'`                                     | `undefined`  | Shadow elevation level (0=none, 5=maximum) |
| `orientation` | `'vertical' \| 'horizontal'`                                                 | `'vertical'` | Card layout direction                      |
| `hoverable`   | `boolean`                                                                    | `false`      | Enable hover effect with lift animation    |
| `clickable`   | `boolean`                                                                    | `false`      | Make card clickable with keyboard support  |
| `disabled`    | `boolean`                                                                    | `false`      | Disable card interaction                   |
| `loading`     | `boolean`                                                                    | `false`      | Show loading state with animated bar       |

### Slots

| Slot      | Description                                  |
| --------- | -------------------------------------------- |
| (default) | Main content area of the card                |
| `media`   | Media section (images/video) at the top      |
| `header`  | Header section below media                   |
| `footer`  | Footer section at the bottom of the card     |
| `actions` | Action buttons section (typically in footer) |

### Events

| Event       | Detail                                                     | Description                         |
| ----------- | ---------------------------------------------------------- | ----------------------------------- |
| `click`     | `{ originalEvent: Event }`                                 | Native click event (when clickable) |
| `cardclick` | `{ originalEvent: Event, variant: string, color: string }` | Custom event with card details      |

### CSS Custom Properties

| Property              | Default                     | Description          |
| --------------------- | --------------------------- | -------------------- |
| `--card-bg`           | `var(--color-contrast-50)`  | Background color     |
| `--card-color`        | `var(--color-contrast-900)` | Text color           |
| `--card-border`       | `var(--border)`             | Border width         |
| `--card-border-color` | `var(--color-contrast-200)` | Border color         |
| `--card-radius`       | `var(--rounded-lg)`         | Border radius        |
| `--card-padding`      | `var(--size-4)`             | Internal padding     |
| `--card-shadow`       | `var(--shadow-sm)`          | Box shadow           |
| `--card-hover-shadow` | `var(--shadow-md)`          | Hover state shadow   |
| `--card-gap`          | `var(--size-3)`             | Gap between sections |

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
  hoverable>
  <bit-text slot="header" variant="heading" size="xl">Enhanced Shadow</bit-text>
  <bit-text>Hover to see the custom shadow effect.</bit-text>
</bit-card>
```

## Accessibility

The card component is built with accessibility in mind:

- ✅ **Semantic HTML**: Uses proper structure for content organization
- ✅ **Keyboard Navigation**: Clickable cards are fully keyboard accessible (Enter/Space)
- ✅ **ARIA Attributes**: Proper `role="button"`, `aria-disabled`, and `tabindex` management
- ✅ **Focus Management**: Disabled cards have `tabindex="-1"` and cannot receive focus
- ✅ **WCAG 2.1 Level AA**: Compliant with color contrast requirements
- ✅ **Screen Reader Friendly**: Proper content hierarchy with semantic slots

### Keyboard Support

When a card has the `clickable` attribute:

- **Enter** or **Space**: Activates the card
- **Tab**: Moves focus to the card
- Disabled cards cannot receive focus

### Best Practices

1. **Use semantic headings** in the header slot to maintain proper document outline
2. **Add meaningful alt text** for images in the media slot
3. **Consider keyboard users** when making cards clickable
4. **Maintain contrast** when using color variants or custom styling
5. **Use disabled state** instead of removing clickable cards from the DOM
6. **Provide loading feedback** with the loading state for async operations

## TypeScript

```typescript
import type { CardProps } from '@vielzeug/buildit/card';

const cardProps: CardProps = {
  variant: 'solid',
  color: 'primary',
  padding: 'lg',
  elevation: '3',
  orientation: 'horizontal',
  hoverable: true,
  clickable: true,
  disabled: false,
  loading: false,
};

// In your component
const card = document.querySelector('bit-card');
if (card) {
  card.setAttribute('variant', 'glass');
  card.setAttribute('color', 'primary');
  card.setAttribute('elevation', '4');

  // Listen for cardclick event
  card.addEventListener('cardclick', (e) => {
    console.log('Card clicked', e.detail);
    // e.detail contains: { originalEvent, variant, color }
  });

  // Programmatically control states
  card.setAttribute('loading', '');
  setTimeout(() => {
    card.removeAttribute('loading');
  }, 2000);
}
```
