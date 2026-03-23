# Text

A versatile typography component with semantic variants for consistent text styling across your application. Provides complete control over typography with design system integration and accessibility built-in.

## Features

- 🎨 **6 Semantic Variants**: body, heading, label, caption, overline, code
- 📏 **6 Sizes**: xs, sm, md, lg, xl, 2xl (body scale) — heading variant uses the heading scale
- ⚖️ **4 Font Weights**: normal, medium, semibold, bold
- 🌈 **12 Colors**: semantic (primary, secondary, info, success, warning, error) + text colors (heading, body, muted, tertiary, disabled, contrast)
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

Emphasized text for headings with tighter line height and semibold weight. Defaults to `md` on the heading scale (`--heading-md`, 1.5rem / 24px) — set `size` explicitly to pick a different step.

::: info Heading scale vs body scale
`variant="heading"` maps the `size` attribute to the **heading scale** (`--heading-xs` → `--heading-2xl`) rather than the body text scale. This gives a much wider range: from 0.875rem (xs) all the way to 4rem (2xl). See [Size Options](#size-options) for the full mapping.
:::

<ComponentPreview center vertical>

```html
<bit-text variant="heading">Default heading (md — 24px)</bit-text>
<bit-text variant="heading" size="xs">Heading xs (14px)</bit-text>
<bit-text variant="heading" size="sm">Heading sm (16px)</bit-text>
<bit-text variant="heading" size="md">Heading md (24px)</bit-text>
<bit-text variant="heading" size="lg">Heading lg (32px)</bit-text>
<bit-text variant="heading" size="xl">Heading xl (48px)</bit-text>
<bit-text variant="heading" size="2xl">Heading 2xl (64px)</bit-text>
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

Choose from 6 size steps. The token scale resolved depends on the active variant:

| `size` | Body scale token | Value | Heading scale token | Value |
| ------ | ---------------- | ----- | ------------------- | ----- |
| `xs`   | `--text-xs`      | 12px  | `--heading-xs`      | 14px  |
| `sm`   | `--text-sm`      | 14px  | `--heading-sm`      | 16px  |
| `md`   | `--text-base`    | 16px  | `--heading-md`      | 24px  |
| `lg`   | `--text-lg`      | 18px  | `--heading-lg`      | 32px  |
| `xl`   | `--text-xl`      | 20px  | `--heading-xl`      | 48px  |
| `2xl`  | `--text-2xl`     | 24px  | `--heading-2xl`     | 64px  |

`variant="heading"` resolves sizes against the **heading scale**. All other variants (`body`, `label`, `caption`, `overline`, `code`) resolve against the **body scale**.

<ComponentPreview center vertical>

```html
<bit-text size="xs">Extra small text (xs)</bit-text>
<bit-text size="sm">Small text (sm)</bit-text>
<bit-text size="md">Medium text (md)</bit-text>
<bit-text size="lg">Large text (lg)</bit-text>
<bit-text size="xl">Extra large text (xl)</bit-text>
<bit-text size="2xl">2XL text (2xl)</bit-text>
```

</ComponentPreview>

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

Automatic text colors that adapt to your theme. Each value maps to a semantic `--text-color-*` token from the theme.

| `color`    | Token                      | Contrast step          | WCAG                |
| ---------- | -------------------------- | ---------------------- | ------------------- |
| `heading`  | `--text-color-heading`     | `--color-contrast-900` | AAA                 |
| `body`     | `--text-color-body`        | `--color-contrast-800` | AAA                 |
| `muted`    | `--text-color-secondary`   | `--color-contrast-600` | AA                  |
| `tertiary` | `--text-color-tertiary`    | `--color-contrast-500` | AA (large text)     |
| `disabled` | `--text-color-disabled`    | `--color-contrast-400` | decorative only     |
| `contrast` | `--text-color-contrast`    | `--color-contrast-100` | for dark backgrounds|

<ComponentPreview center vertical>

```html
<bit-text color="heading">Heading color (highest contrast)</bit-text>
<bit-text color="body">Body text color (default)</bit-text>
<bit-text color="muted">Muted/secondary text</bit-text>
<bit-text color="tertiary">Tertiary text</bit-text>
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
<bit-text as="h1" variant="heading" size="2xl">H1 Heading</bit-text>
<bit-text as="h2" variant="heading" size="xl">H2 Heading</bit-text>
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

## API Reference

### Attributes

| Attribute  | Type                                                                                                                                    | Default | Description                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| `variant`  | `'body' \| 'heading' \| 'label' \| 'caption' \| 'overline' \| 'code'`                                                                   | —       | Text variant style                                                                                                        |
| `size`     | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'`                                                                                        | —       | Font size. `variant="heading"` resolves against `--heading-*` tokens; all other variants resolve against `--text-*` tokens |
| `weight`   | `'normal' \| 'medium' \| 'semibold' \| 'bold'`                                                                                          | —       | Font weight (falls back to variant default, then `normal`)                                                                |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'heading' \| 'body' \| 'muted' \| 'tertiary' \| 'disabled' \| 'contrast'` | — | Text color (falls back to variant default, then `inherit`)                                                           |
| `align`    | `'left' \| 'center' \| 'right' \| 'justify'`                                                                                            | —       | Text alignment (forces `display: block`)                                                                                  |
| `truncate` | `boolean`                                                                                                                               | —       | Single-line truncation with ellipsis                                                                                      |
| `lines`    | `number`                                                                                                                                | —       | Clamp to N lines with ellipsis (multi-line truncation)                                                                    |
| `italic`   | `boolean`                                                                                                                               | —       | Italic font style                                                                                                         |
| `as`       | `'span' \| 'p' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'label' \| 'code'`                                         | —       | Semantic element; `h1`–`h6` auto-sets `role="heading"` + `aria-level`                                                     |

### Variant Defaults

| Variant    | Default size          | Default weight        | Default color                    | Line height               | Letter spacing            |
| ---------- | --------------------- | --------------------- | -------------------------------- | ------------------------- | ------------------------- |
| `body`     | `--text-base` (16px)  | `--font-normal` (400) | `--text-color-body` (contrast-800)    | `--leading-normal` (1.5)  | `normal`                  |
| `heading`  | `--heading-md` (24px) | `--font-semibold` (600) | `--text-color-heading` (contrast-900) | `--leading-tight` (1.15)  | `--tracking-header` (-0.025em) |
| `label`    | `--text-sm` (14px)    | `--font-medium` (500) | `--text-color-heading` (contrast-900) | `--leading-snug` (1.375)  | `normal`                  |
| `caption`  | `--text-sm` (14px)    | `--font-normal` (400) | `--text-color-secondary` (contrast-600) | `--leading-normal` (1.5) | `normal`                 |
| `overline` | `--text-xs` (12px)    | `--font-semibold` (600) | `--text-color-body` (contrast-800) | `--leading-none` (1)    | `0.08em`                  |
| `code`     | `--text-sm` (14px)    | `--font-normal` (400) | `--text-color-body` (contrast-800)    | `--leading-normal` (1.5)  | `normal`                  |

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
- Set an explicit `size` when using `variant="heading"` to select the correct step from the heading scale.

**Don't:**

- Forget that `variant="heading"` uses the heading scale — `size="2xl"` on a heading renders at 4rem (64px), not 1.5rem.
- Rely on `color` alone to convey meaning — always pair with a descriptive text label.
- Use `bit-text` as a replacement for native block elements (`<p>`, `<h2>`, etc.) in long-form content — prefer the `as` attribute instead.
- Set both `truncate` and `lines` on the same element; use one or the other.
- Use `color="muted"` for headings — it resolves to `--text-color-secondary` (contrast-600) which may not meet AAA for small heading sizes.
