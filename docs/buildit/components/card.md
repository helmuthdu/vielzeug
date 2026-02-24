# Card Component

A versatile card container component with multiple variants, colors, padding options, and interactive states. Perfect for grouping related content and creating structured layouts. Built with accessibility in mind and fully customizable through CSS custom properties.

## Features

- 🎨 **8 Variants**: solid, flat, bordered, outline, ghost, text, glass, frost
- 📏 **4 Padding Sizes**: none, sm, md, lg
- 🎯 **Interactive States**: hoverable, clickable
- 🧩 **3 Slots**: header, default content, footer
- ♿ **Accessible**: WCAG 2.1 Level AA compliant
- 🔧 **Customizable**: CSS custom properties for complete control

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/base/card/card.ts
:::

## Basic Usage

```html
<bit-card>
  <h3 slot="header">Card Title</h3>
  <p>This is the card content. It can contain any HTML elements.</p>
  <div slot="footer">
    <bit-button size="sm">Action</bit-button>
  </div>
</bit-card>

<script type="module">
  import '@vielzeug/buildit/card';
  import '@vielzeug/buildit/button';
</script>
```

## Visual Options

### Variants

### Variants

The card comes with eight visual variants to match different UI needs, matching the accordion component's variants.

<ComponentPreview center>

```html
<bit-card variant="solid">
  <h4 slot="header" style="margin: 0;">Solid Card</h4>
  <p style="margin: 0;">Default variant with shadow elevation.</p>
</bit-card>

<bit-card variant="flat">
  <h4 slot="header" style="margin: 0;">Flat Card</h4>
  <p style="margin: 0;">Flat background, no shadow.</p>
</bit-card>

<bit-card variant="bordered">
  <h4 slot="header" style="margin: 0;">Bordered Card</h4>
  <p style="margin: 0;">Border with background.</p>
</bit-card>

<bit-card variant="outline">
  <h4 slot="header" style="margin: 0;">Outline Card</h4>
  <p style="margin: 0;">Transparent background with border.</p>
</bit-card>

<bit-card variant="ghost">
  <h4 slot="header" style="margin: 0;">Ghost Card</h4>
  <p style="margin: 0;">Transparent, shows hover effect.</p>
</bit-card>

<bit-card variant="text">
  <h4 slot="header" style="margin: 0;">Text Card</h4>
  <p style="margin: 0;">Minimal, transparent design.</p>
</bit-card>
```

</ComponentPreview>

### Glass & Frost Variants

Modern effects with backdrop blur for elevated UI elements.

::: tip Best Used With
Glass and frost variants work best when placed over colorful backgrounds or images to showcase the blur and transparency effects.
:::

<ComponentPreview center background="https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=3429&auto=format&fit=crop">

```html
<bit-card variant="glass" padding="lg">
  <h3 slot="header" style="margin: 0;">Glass Card</h3>
  <p style="margin: 0;">Beautiful translucent effect with backdrop blur.</p>
  <div slot="footer">
    <bit-button variant="glass" size="sm" color="secondary">Learn More</bit-button>
  </div>
</bit-card>

<bit-card variant="frost" padding="lg">
  <h3 slot="header" style="margin: 0;">Frost Card</h3>
  <p style="margin: 0;">Elegant frosted glass effect with transparency.</p>
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
<bit-card padding="none">
  <h4 slot="header" style="margin: 0;">No Padding</h4>
  <p style="margin: 0;">Content reaches the edges.</p>
</bit-card>

<bit-card padding="sm">
  <h4 slot="header" style="margin: 0;">Small Padding</h4>
  <p style="margin: 0;">Compact spacing.</p>
</bit-card>

<bit-card padding="md">
  <h4 slot="header" style="margin: 0;">Medium Padding</h4>
  <p style="margin: 0;">Default spacing (if not specified).</p>
</bit-card>

<bit-card padding="lg">
  <h4 slot="header" style="margin: 0;">Large Padding</h4>
  <p style="margin: 0;">Generous spacing.</p>
</bit-card>
```

</ComponentPreview>

## Interactive Cards

### Hoverable

Add a hover effect that lifts the card and increases shadow on mouse over.

<ComponentPreview center>

```html
<bit-card hoverable>
  <h4 slot="header" style="margin: 0;">Hover Over Me</h4>
  <p style="margin: 0;">This card responds to hover with a subtle lift animation.</p>
</bit-card>
<bit-card variant="flat" hoverable>
  <h4 slot="header" style="margin: 0;">Hover Over Me</h4>
  <p style="margin: 0;">This card responds to hover with a subtle lift animation.</p>
</bit-card>
<bit-card variant="bordered" hoverable>
  <h4 slot="header" style="margin: 0;">Hover Over Me</h4>
  <p style="margin: 0;">This card responds to hover with a subtle lift animation.</p>
</bit-card>
```

</ComponentPreview>

### Clickable

Make the entire card clickable with appropriate cursor and active states.

<ComponentPreview center>

```html
<bit-card clickable>
  <h4 slot="header" style="margin: 0;">Click Me</h4>
  <p style="margin: 0;">This entire card is clickable and emits a click event.</p>
</bit-card>
```

</ComponentPreview>

## Practical Examples

### User Profile Card

<ComponentPreview center>

```html
<bit-card padding="lg" style="max-width: 320px">
  <div slot="header" style="text-align: center">
    <div style="width: 80px; height: 80px; border-radius: 50%; background: var(--color-primary); margin: 0 auto var(--size-3); display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-2xl); font-weight: var(--font-bold);">
      JD
    </div>
    <h3 style="margin: 0">Jane Doe</h3>
    <p style="margin: var(--size-1) 0 0; color: var(--color-contrast-600); font-size: var(--text-sm);">Software Engineer</p>
  </div>
  <p style="text-align: center; color: var(--color-contrast-700);">
    Building beautiful web experiences with modern technologies.
  </p>
  <div slot="footer" style="display: flex; gap: var(--size-2);">
    <bit-button variant="solid" color="primary" style="flex: 1">Follow</bit-button>
    <bit-button variant="outline" color="primary" style="flex: 1">Message</bit-button>
  </div>
</bit-card>
```

</ComponentPreview>

### Product Card

<ComponentPreview center>

```html
<bit-card variant="outline" hoverable clickable padding="none" style="max-width: 280px">
  <div style="height: 180px; background: linear-gradient(135deg, var(--color-primary), var(--color-secondary)); display: flex; align-items: center; justify-content: center; color: white; font-size: var(--text-4xl);">
    📦
  </div>
  <div style="padding: var(--size-4)">
    <h4 style="margin: 0 0 var(--size-2)">Premium Package</h4>
    <p style="margin: 0 0 var(--size-3); color: var(--color-contrast-600);">
      Everything you need to get started with our platform.
    </p>
    <div style="display: flex; align-items: baseline; gap: var(--size-2); margin-bottom: var(--size-3)">
      <span style="font-size: var(--text-2xl); font-weight: var(--font-bold);">$49</span>
      <span style="color: var(--color-contrast-500);">/month</span>
    </div>
    <bit-button variant="solid" color="primary" fullwidth>
      Get Started
    </bit-button>
  </div>
</bit-card>
```

</ComponentPreview>

### Status Card

<ComponentPreview center>

```html
<bit-card color="success" variant="outline" padding="lg" style="max-width: 400px">
  <div style="display: flex; align-items: start; gap: var(--size-3)">
    <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--color-success); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;">
      ✓
    </div>
    <div style="flex: 1">
      <h4 style="margin: 0 0 var(--size-2); color: var(--color-success);">
        Success!
      </h4>
      <p style="margin: 0; color: var(--color-contrast-700);">
        Your changes have been saved successfully.
      </p>
    </div>
  </div>
</bit-card>
```

</ComponentPreview>

### Stats Card

<ComponentPreview center>

```html
<bit-card padding="lg" style="max-width: 200px; text-align: center;">
  <div style="font-size: var(--text-4xl); font-weight: var(--font-bold); color: var(--color-primary); margin-bottom: var(--size-2);">
    1,234
  </div>
  <div style="color: var(--color-contrast-600); font-size: var(--text-sm);">
    Total Users
  </div>
  <div style="color: var(--color-success); font-size: var(--text-sm); margin-top: var(--size-2);">
    ↑ 12% from last month
  </div>
</bit-card>
```

</ComponentPreview>

### Card Grid Layout

<ComponentPreview>

```html
<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--size-4);">
  <bit-card hoverable>
    <h4 slot="header">Feature 1</h4>
    <p>Description of the first feature.</p>
  </bit-card>
  
  <bit-card hoverable>
    <h4 slot="header">Feature 2</h4>
    <p>Description of the second feature.</p>
  </bit-card>
  
  <bit-card hoverable>
    <h4 slot="header">Feature 3</h4>
    <p>Description of the third feature.</p>
  </bit-card>
</div>
```

</ComponentPreview>

## API

### Attributes

| Attribute    | Type                                                  | Default     | Description                                           |
|-------------|-------------------------------------------------------|-------------|-------------------------------------------------------|
| `variant`   | `'solid' \| 'flat' \| 'bordered' \| 'outline' \| 'ghost' \| 'text' \| 'glass' \| 'frost'` | `'solid'`| Visual style variant                                  |
| `padding`   | `'none' \| 'sm' \| 'md' \| 'lg'`                     | `'md'`      | Internal padding size                                 |
| `hoverable` | `boolean`                                             | `false`     | Enable hover effect with lift animation               |
| `clickable` | `boolean`                                             | `false`     | Make card clickable and emit click events             |

### Slots

| Slot      | Description                                  |
|-----------|----------------------------------------------|
| (default) | Main content area of the card                |
| `header`  | Header section at the top of the card        |
| `footer`  | Footer section at the bottom of the card     |

### Events

| Event   | Detail                        | Description                            |
|---------|-------------------------------|----------------------------------------|
| `click` | `{ originalEvent: Event }`    | Emitted when clickable card is clicked |

### CSS Custom Properties

| Property                   | Default                        | Description                      |
|---------------------------|--------------------------------|----------------------------------|
| `--card-bg`               | `var(--color-contrast-50)`     | Background color                 |
| `--card-color`            | `var(--color-contrast-900)`    | Text color                       |
| `--card-border`           | `var(--border)`                | Border width                     |
| `--card-border-color`     | `var(--color-contrast-200)`    | Border color                     |
| `--card-radius`           | `var(--rounded-lg)`            | Border radius                    |
| `--card-padding`          | `var(--size-4)`                | Internal padding                 |
| `--card-shadow`           | `var(--shadow-sm)`             | Box shadow                       |
| `--card-hover-shadow`     | `var(--shadow-md)`             | Hover state shadow               |
| `--card-gap`              | `var(--size-3)`                | Gap between sections             |

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
  <h3 slot="header">Custom Styled Card</h3>
  <p>This card has custom colors and spacing.</p>
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
  <h3 slot="header">Enhanced Shadow</h3>
  <p>Hover to see the custom shadow effect.</p>
</bit-card>
```

## Accessibility

The card component is built with accessibility in mind:

- ✅ **Semantic HTML**: Uses proper structure for content organization
- ✅ **Keyboard Navigation**: Clickable cards are fully keyboard accessible
- ✅ **WCAG 2.1 Level AA**: Compliant with color contrast requirements
- ✅ **Screen Reader Friendly**: Proper content hierarchy with slots

### Best Practices

1. **Use semantic headings** in the header slot to maintain proper document outline
2. **Add meaningful content** - cards should group related information
3. **Consider keyboard users** when making cards clickable
4. **Maintain contrast** when using color variants or custom styling

## TypeScript

```typescript
import type { CardProps } from '@vielzeug/buildit/card';

const cardProps: CardProps = {
  variant: 'elevated',
  color: 'primary',
  padding: 'lg',
  hoverable: true,
  clickable: true,
};

// In your component
const card = document.querySelector('bit-card');
if (card) {
  card.setAttribute('variant', 'glass');
  card.addEventListener('click', (e) => {
    console.log('Card clicked', e.detail);
  });
}
```

## Browser Support

The card component works in all modern browsers that support:
- Web Components (Custom Elements v1)
- Shadow DOM v1
- CSS Custom Properties
- Backdrop Filter (for glass variant)

For older browsers, consider using appropriate polyfills.

