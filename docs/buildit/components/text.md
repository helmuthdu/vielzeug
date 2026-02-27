# Text Component

A versatile typography component with semantic variants for consistent text styling across your application. Provides complete control over typography with design system integration and accessibility built-in.

## Features

- 🎨 **6 Semantic Variants**: body, heading, label, caption, overline, code
- 📏 **13 Sizes**: xs to 9xl (12px to 128px)
- ⚖️ **4 Font Weights**: normal, medium, semibold, bold
- 🌈 **9 Colors**: semantic (primary, secondary, success, warning, error) + text colors (heading, body, muted, disabled)
- 📐 **4 Alignments**: left, center, right, justify
- ✂️ **Truncate**: Single-line text truncation with ellipsis
- 🔤 **Semantic HTML**: Render as different HTML tags (span, p, div, h1-h6, label, code)
- ♿ **Accessible**: Semantic HTML support, respects user font preferences
- 🎭 **Italic Style**: Font style support
- 🔧 **Customizable**: CSS custom properties for full control

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/base/text/text.ts
:::

## Basic Usage

```html
<bit-text>Regular paragraph text</bit-text>

<script type="module">
  import '@vielzeug/buildit/text';
</script>
```

## Variants

### Body (Default)

Normal paragraph text with standard line height. The default variant for general content.

<ComponentPreview center vertical>

```html
<bit-text>
  This is body text with normal styling. It's perfect for paragraphs, descriptions, and general content throughout your
  application.
</bit-text>
```

</ComponentPreview>

### Heading

Emphasized text for headings with tighter line height and semibold weight by default.

<ComponentPreview center vertical>

```html
<bit-text variant="heading" size="3xl">Main Heading</bit-text>
<bit-text variant="heading" size="2xl">Section Heading</bit-text>
<bit-text variant="heading" size="xl">Subsection Heading</bit-text>
<bit-text variant="heading" size="lg">Small Heading</bit-text>
```

</ComponentPreview>

### Label

Medium weight text for form labels and UI labels.

<ComponentPreview center vertical>

```html
<bit-text variant="label">Email Address</bit-text>
<bit-text variant="label">Password</bit-text>
<bit-text variant="label">Remember me</bit-text>
```

</ComponentPreview>

### Caption

Smaller, secondary text for additional context or metadata.

<ComponentPreview center vertical>

```html
<bit-text variant="caption" color="muted"> Last updated 2 hours ago </bit-text>
<bit-text variant="caption" color="muted"> Optional field </bit-text>
<bit-text variant="caption" color="muted"> File size: 2.4 MB </bit-text>
```

</ComponentPreview>

### Overline

Uppercase text with letter spacing, ideal for categories or eyebrow text.

<ComponentPreview center vertical>

```html
<bit-text variant="overline" size="xs">Featured</bit-text>
<bit-text variant="overline" size="xs">New Release</bit-text>
<bit-text variant="overline" size="xs">Trending</bit-text>
```

</ComponentPreview>

### Code

Monospace text for inline code snippets.

<ComponentPreview center vertical>

```html
<bit-text variant="code">npm install @vielzeug/buildit</bit-text>
<bit-text variant="code">const foo = 'bar';</bit-text>
<bit-text variant="code">git commit -m "Initial commit"</bit-text>
```

</ComponentPreview>

## Size Options

Choose from 13 size options to match your design hierarchy.

<ComponentPreview center vertical>

```html
<bit-text size="xs">Extra small text (12px)</bit-text>
<bit-text size="sm">Small text (14px)</bit-text>
<bit-text size="md">Medium text (16px)</bit-text>
<bit-text size="lg">Large text (18px)</bit-text>
<bit-text size="xl">Extra large text (20px)</bit-text>
<bit-text size="2xl">2XL text (24px)</bit-text>
<bit-text size="3xl">3XL text (30px)</bit-text>
<bit-text size="4xl">4XL text (36px)</bit-text>
<bit-text size="5xl">5XL text (48px)</bit-text>
```

</ComponentPreview>

::: tip Size Range
Sizes continue up to `9xl` (128px) for hero text and large displays.
:::

## Colors

### Semantic Colors

Use semantic colors to convey meaning and maintain consistency.

<ComponentPreview center vertical>

```html
<bit-text color="primary">Primary colored text</bit-text>
<bit-text color="secondary">Secondary colored text</bit-text>
<bit-text color="success">Success colored text</bit-text>
<bit-text color="warning">Warning colored text</bit-text>
<bit-text color="error">Error colored text</bit-text>
```

</ComponentPreview>

### Text Colors

Automatic text colors that adapt to your theme.

<ComponentPreview center vertical>

```html
<bit-text color="heading">Heading color (highest contrast)</bit-text>
<bit-text color="body">Body text color (default)</bit-text>
<bit-text color="muted">Muted/secondary text</bit-text>
<bit-text color="disabled">Disabled text</bit-text>
```

</ComponentPreview>

## Font Weights

Four weight options for emphasis control.

<ComponentPreview center vertical>

```html
<bit-text weight="normal">Normal weight (400)</bit-text>
<bit-text weight="medium">Medium weight (500)</bit-text>
<bit-text weight="semibold">Semibold weight (600)</bit-text>
<bit-text weight="bold">Bold weight (700)</bit-text>
```

</ComponentPreview>

## Text Alignment

Control text alignment for layout purposes.

::: info Display Change
When using the `align` attribute, the text component automatically changes from `display: inline` to `display: block` to enable text alignment. This is similar to how `truncate` works.
:::

<ComponentPreview center vertical>

```html
<div
  style="display: block; width: 100%; border: 1px solid var(--color-contrast-200); padding: 1rem; margin-bottom: 0.5rem;">
  <bit-text align="left">Left aligned text</bit-text>
</div>
<div
  style="display: block; width: 100%; border: 1px solid var(--color-contrast-200); padding: 1rem; margin-bottom: 0.5rem;">
  <bit-text align="center">Centered text</bit-text>
</div>
<div
  style="display: block; width: 100%; border: 1px solid var(--color-contrast-200); padding: 1rem; margin-bottom: 0.5rem;">
  <bit-text align="right">Right aligned text</bit-text>
</div>
<div style="display: block; width: 100%; border: 1px solid var(--color-contrast-200); padding: 1rem;">
  <bit-text align="justify">
    Justified text distributes words evenly across the line width. This is useful for formal documents or
    newspaper-style layouts.
  </bit-text>
</div>
```

</ComponentPreview>

## Special Features

### Truncate

Enable single-line truncation with ellipsis for overflow text.

<ComponentPreview center vertical>

```html
<div style="max-width: 300px;">
  <bit-text truncate>
    This is a very long text that will be truncated with an ellipsis when it exceeds the container width and
    demonstrates how the component handles overflow content gracefully
  </bit-text>
</div>
```

</ComponentPreview>

::: tip Usage
Set a `max-width` or width constraint on the container for truncation to work effectively.
:::

### Italic Style

Apply italic styling to text.

<ComponentPreview center vertical>

```html
<bit-text italic>Italic text</bit-text>
<bit-text italic weight="bold">Bold italic text</bit-text>
<bit-text italic color="primary">Italic colored text</bit-text>
```

</ComponentPreview>

### Semantic HTML Tags

Control the underlying HTML element for proper semantic structure.

<ComponentPreview center vertical>

```html
<!-- Block-level elements -->
<bit-text as="h1" variant="heading" size="3xl">H1 Heading Element</bit-text>
<bit-text as="h2" variant="heading" size="2xl">H2 Heading Element</bit-text>
<bit-text as="p">Paragraph element with proper semantics</bit-text>
<bit-text as="div">Div element for containers</bit-text>

<!-- Inline elements -->
<bit-text as="span">Span element (default)</bit-text>
<bit-text as="label">Label element for forms</bit-text>
<bit-text as="code" variant="code">Code element</bit-text>
```

</ComponentPreview>

## Combined Examples

### Card Header

Combine multiple text components for rich layouts.

<ComponentPreview center vertical>

```html
<div style="border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg); padding: var(--size-4);">
  <bit-text variant="overline" color="primary" size="xs">Featured Product</bit-text>
  <bit-text variant="heading" size="xl" as="h2" style="margin-top: var(--size-2);"> Premium Headphones </bit-text>
  <bit-text variant="caption" color="muted" style="display: block; margin-top: var(--size-1);">
    Added 2 days ago • Electronics
  </bit-text>
  <bit-text style="display: block; margin-top: var(--size-3);">
    High-quality wireless headphones with active noise cancellation, 40-hour battery life, and premium comfort for
    all-day wear.
  </bit-text>
</div>
```

</ComponentPreview>

### Form Field

Label with helper text pattern.

<ComponentPreview center vertical>

```html
<div>
  <bit-text variant="label" as="label" style="display: block; margin-bottom: var(--size-1);"> Email Address </bit-text>
  <bit-text variant="caption" color="muted" size="xs" style="display: block; margin-bottom: var(--size-2);">
    We'll never share your email with anyone else
  </bit-text>
  <bit-input type="email" placeholder="you@example.com" />
</div>
```

</ComponentPreview>

### Status Messages

Use semantic colors for feedback.

<ComponentPreview center vertical>

```html
<bit-text color="success" weight="medium" style="display: block; margin-bottom: var(--size-2);">
  ✓ Your changes have been saved successfully
</bit-text>
<bit-text color="warning" weight="medium" style="display: block; margin-bottom: var(--size-2);">
  ⚠ Please review the highlighted fields
</bit-text>
<bit-text color="error" weight="medium" style="display: block;"> ✗ An error occurred. Please try again </bit-text>
```

</ComponentPreview>

### Truncated Filename

Show file information with truncation.

<ComponentPreview center vertical>

```html
<div
  style="max-width: 250px; padding: var(--size-3); border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-md);">
  <bit-text truncate color="primary" weight="medium">
    very-long-document-name-that-needs-truncation-for-display.pdf
  </bit-text>
  <bit-text variant="caption" color="muted" size="xs" style="display: block; margin-top: var(--size-1);">
    2.4 MB • PDF Document
  </bit-text>
</div>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                                                                            | Default  | Description                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| `variant`  | `'body' \| 'heading' \| 'label' \| 'caption' \| 'overline' \| 'code'`                                           | `'body'` | Text variant style                                  |
| `size`     | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| '4xl' \| '5xl' \| '6xl' \| '7xl' \| '8xl' \| '9xl'`  | —        | Text size (uses variant default if not specified)   |
| `weight`   | `'normal' \| 'medium' \| 'semibold' \| 'bold'`                                                                  | —        | Font weight (uses variant default if not specified) |
| `color`    | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'heading' \| 'body' \| 'muted' \| 'disabled'` | —        | Text color (uses variant default if not specified)  |
| `align`    | `'left' \| 'center' \| 'right' \| 'justify'`                                                                    | —        | Text alignment                                      |
| `truncate` | `boolean`                                                                                                       | `false`  | Enable single-line truncation                       |
| `italic`   | `boolean`                                                                                                       | `false`  | Italic font style                                   |
| `as`       | `'span' \| 'p' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'label' \| 'code'`                   | —        | Semantic HTML tag to render                         |

### Slots

| Slot      | Description  |
| --------- | ------------ |
| (default) | Text content |

### CSS Custom Properties

| Property                | Description    | Default                  |
| ----------------------- | -------------- | ------------------------ |
| `--text-size`           | Font size      | `var(--text-base)`       |
| `--text-weight`         | Font weight    | `var(--font-normal)`     |
| `--text-color`          | Text color     | `var(--text-color-body)` |
| `--text-line-height`    | Line height    | `var(--leading-normal)`  |
| `--text-letter-spacing` | Letter spacing | `normal`                 |

## Accessibility

- **Semantic HTML**: Use the `as` attribute to render proper HTML elements (h1-h6, p, label, etc.)
- **Font Scaling**: Uses rem units to respect user's browser font size preferences
- **Line Height**: Maintains WCAG-compliant line height (1.5 default for body text)
- **Color Contrast**: Text colors maintain accessible contrast ratios with backgrounds

::: tip Best Practice
Always use semantic HTML tags (`as` attribute) for headings, paragraphs, and labels to maintain proper document structure and accessibility.
:::

## Design System Integration

The text component fully integrates with the Buildit design system:

- Uses design tokens exclusively (no hardcoded values)
- Automatically adapts to light/dark mode
- Follows internal variable pattern (`--_*`) for implementation
- Exposes public CSS custom properties for customization
- Supports all theme typography scales
