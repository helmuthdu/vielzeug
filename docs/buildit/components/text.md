# Text

A versatile typography component with semantic variants for consistent text styling across your application. Provides complete control over typography with design system integration and accessibility built-in.

## Features

- 🎨 **6 Semantic Variants**: body, heading, label, caption, overline, code
- 📏 **13 Sizes**: xs to 9xl (12px to 128px)
- ⚖️ **4 Font Weights**: normal, medium, semibold, bold
- 🌈 **11 Colors**: semantic (primary, secondary, info, success, warning, error) + text colors (heading, body, muted, disabled, contrast)
- 📐 **4 Alignments**: left, center, right, justify
- ✂️ **Truncate**: Single-line ellipsis truncation
- 📋 **Line Clamp**: Multi-line truncation with ellipsis via `lines` prop
- 🔤 **Semantic HTML**: Render as different HTML tags (span, p, div, h1-h6, label, code)
- ♿ **Accessible**: `as="h1"–"h6"` sets `role="heading"` + `aria-level` automatically
- 🎭 **Italic Style**: Font style support
- 🔧 **Customizable**: CSS custom properties for full control

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/content/text/text.ts
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

Emphasized text for headings with tighter line height and semibold weight. Defaults to `2xl` size — override with `size` when needed.

<ComponentPreview center vertical>

```html
<bit-text variant="heading">Default heading (2xl)</bit-text>
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
<bit-text color="info">Info colored text</bit-text>
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
<bit-text color="contrast">Contrast text (for colored backgrounds)</bit-text>
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

::: info Display behaviour
`bit-text` is `display: block` by default. `as="span"`, `as="label"`, and `as="code"` switch it to `display: inline`. The `align` attribute has no effect on these inline variants unless `display: block` is also applied.
:::

<ComponentPreview center vertical>

```html
<bit-box style="width: 100%">
  <bit-text align="left">Left aligned text</bit-text>
</bit-box>
<bit-box style="width: 100%;">
  <bit-text align="center">Centered text</bit-text>
</bit-box>
<bit-box style="width: 100%;">
  <bit-text align="right">Right aligned text</bit-text>
</bit-box>
<bit-box style="width: 100%;">
  <bit-text align="justify">
    Justified text distributes words evenly across the line width. This is useful for formal documents or
    newspaper-style layouts.
  </bit-text>
</bit-box>
```

</ComponentPreview>

## Special Features

### Truncate

Enable single-line truncation with ellipsis for overflow text.

<ComponentPreview center vertical>

```html
<bit-box style="width: 100%; max-width: 400px;">
  <bit-text truncate>
    This is a very long text that will be truncated with an ellipsis when it exceeds the width of its container. The
    truncation happens automatically using CSS text-overflow.
  </bit-text>
</bit-box>
```

</ComponentPreview>

::: tip Usage
The `truncate` attribute is a boolean flag. Set a width constraint on the element or its container for truncation to apply.
:::

### Line Clamp

Clamp text to a fixed number of lines with an ellipsis — ideal for card descriptions and teasers.

<ComponentPreview center vertical>

```html
<bit-box style="width: 100%; max-width: 400px;">
  <bit-text lines="2">
    This long description will be clamped to exactly two lines regardless of how much text is provided. The overflow is
    hidden with a trailing ellipsis, keeping layouts consistent without JavaScript.
  </bit-text>
</bit-box>
```

</ComponentPreview>

::: tip Usage
Use `lines` for multi-line truncation and `truncate` for single-line. They are mutually exclusive — `lines` takes precedence if both are present.
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

The `as` attribute controls document semantics. For `h1`–`h6`, the component automatically sets `role="heading"` and the correct `aria-level` on the host so screen readers announce the correct heading level — no extra ARIA needed.

Block elements (`p`, `div`, `h1`–`h6`) render as `display: block`. Inline elements (`span`, `label`, `code`) render as `display: inline`.

<ComponentPreview center vertical>

```html
<!-- Block-level — role="heading" + aria-level set automatically -->
<bit-text as="h1" variant="heading" size="3xl">H1 Heading</bit-text>
<bit-text as="h2" variant="heading" size="2xl">H2 Heading</bit-text>
<bit-text as="p">Paragraph with proper semantics</bit-text>
<bit-text as="div">Div container</bit-text>

<!-- Inline — renders as display: inline -->
<bit-text as="span">Inline span</bit-text>
<bit-text as="label">Form label</bit-text>
<bit-text as="code" variant="code">inline code</bit-text>
```

</ComponentPreview>

## Combined Examples

### Card Header

Combine multiple text components for rich layouts.

<ComponentPreview center vertical>

```html
<bit-box style="width: 100%;">
  <bit-text variant="overline" color="primary" size="xs">Featured Product</bit-text>
  <bit-text variant="heading" size="xl" as="h2" style="margin-top: var(--size-2);"> Premium Headphones </bit-text>
  <bit-text variant="caption" color="muted" style="display: block; margin-top: var(--size-1);">
    Added 2 days ago • Electronics
  </bit-text>
  <bit-text style="display: block; margin-top: var(--size-3);">
    High-quality wireless headphones with active noise cancellation, 40-hour battery life, and premium comfort for
    all-day wear.
  </bit-text>
</bit-box>
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

Show file information with truncation using width constraints.

<ComponentPreview center vertical>

```html
<bit-box style="max-width: 250px;">
  <bit-text truncate color="primary" weight="medium">
    very-long-document-name-that-needs-truncation-for-display.pdf
  </bit-text>
  <bit-text variant="caption" color="muted" size="xs" style="display: block; margin-top: var(--size-1);">
    2.4 MB • PDF Document
  </bit-text>
</bit-box>
```

</ComponentPreview>

## Guideline Recipe: Distill Status at a Glance

**Guideline: distill** — consistent use of semantic `color` and `variant` attributes lets a page communicate status without icons or extra markup.

```html
<div style="display:flex;flex-direction:column;gap:var(--size-1)">
  <bit-text variant="overline" color="subtle">System status</bit-text>
  <bit-text variant="heading" size="sm" weight="bold">All systems operational</bit-text>
  <bit-text variant="caption" color="success">Checked 2 minutes ago</bit-text>
</div>

<!-- Incident variant -->
<div style="display:flex;flex-direction:column;gap:var(--size-1);margin-top:var(--size-4)">
  <bit-text variant="overline" color="subtle">Incident</bit-text>
  <bit-text variant="heading" size="sm" weight="bold" color="danger">Elevated error rate</bit-text>
  <bit-text variant="caption" color="subtle">Started 14 minutes ago · investigating</bit-text>
</div>
```

**Tip:** Use `variant="overline"` + `variant="heading"` + `variant="caption"` as a three-tier hierarchy to communicate label, title, and metadata without any extra container components.

## API Reference

### Attributes

| Attribute  | Type                                                                                                                                    | Default | Description                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| `variant`  | `'body' \| 'heading' \| 'label' \| 'caption' \| 'overline' \| 'code'`                                                                   | —       | Text variant style                                                    |
| `size`     | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| '4xl' \| '5xl' \| '6xl' \| '7xl' \| '8xl' \| '9xl'`                          | —       | Font size (falls back to variant default, then `base`)                |
| `weight`   | `'normal' \| 'medium' \| 'semibold' \| 'bold'`                                                                                          | —       | Font weight (falls back to variant default, then `normal`)            |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'heading' \| 'body' \| 'muted' \| 'disabled' \| 'contrast'` | —       | Text color (falls back to variant default, then `inherit`)            |
| `align`    | `'left' \| 'center' \| 'right' \| 'justify'`                                                                                            | —       | Text alignment (forces `display: block`)                              |
| `truncate` | `boolean`                                                                                                                               | —       | Single-line truncation with ellipsis                                  |
| `lines`    | `number`                                                                                                                                | —       | Clamp to N lines with ellipsis (multi-line truncation)                |
| `italic`   | `boolean`                                                                                                                               | —       | Italic font style                                                     |
| `as`       | `'span' \| 'p' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'label' \| 'code'`                                           | —       | Semantic element; `h1`–`h6` auto-sets `role="heading"` + `aria-level` |

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

The text component follows WAI-ARIA best practices.

### `bit-text`

✅ **Automatic Heading ARIA**

- `as="h1"` through `as="h6"` automatically sets `role="heading"` and the matching `aria-level` (1–6) on the host element. Screen readers announce the correct heading level without any extra markup.
- Changing `as` dynamically (e.g. by removing the attribute) removes both attributes.

✅ **Semantic Structure**

- Use the `as` attribute to give the element correct document semantics (`h1`–`h6`, `p`, `label`, etc.).
- `as="span"`, `as="label"`, and `as="code"` render as `display: inline` matching their native HTML counterparts.

✅ **Screen Readers**

- Uses `rem` units to respect user's browser font size preferences.
- Maintains WCAG-compliant line height (1.5 default for body text).
- Text colors maintain accessible contrast ratios with backgrounds.

::: tip Best Practice
Always set `as` for headings and form labels. For page titles, pair `as="h1"` with `variant="heading"` and the appropriate `size` to get correct visual hierarchy and document semantics in one attribute set.
:::

## Best Practices

**Do:**

- Use the `as` attribute to render a semantically correct element (`h1`–`h6`, `p`, `label`, `code`) — especially inside forms, articles, and page headers.
- Use `variant="caption"` with `color="muted"` for helper text, timestamps, and metadata.
- Pair `variant="overline"` with `size="xs"` for category labels and eyebrow headings.
- Use `truncate` (single-line) or `lines="N"` (multi-line) with a width constraint on the element or its container.
- Prefer `lines` over `truncate` for card bodies and article previews where two or three lines are acceptable.

**Don't:**

- Use heading sizes (`3xl` and above) without also setting `variant="heading"` — the variant controls line height and weight defaults.
- Rely on `color` alone to convey meaning — always pair with a descriptive text label.
- Use `bit-text` as a replacement for native block elements (`<p>`, `<h2>`, etc.) in long-form content — prefer the `as` attribute instead.
- Set both `truncate` and `lines` on the same element; use one or the other.
