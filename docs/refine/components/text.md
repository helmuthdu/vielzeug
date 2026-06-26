# Text

A versatile typography component with semantic variants for consistent text styling across your application. Provides complete control over typography with design system integration and accessibility built-in.

## Variants

### Body (Default)

Normal paragraph text with standard line height. The default variant for general content.

<ComponentPreview center vertical>

```html
<ore-text>
  This is body text with normal styling. It's perfect for paragraphs, descriptions, and general content throughout your
  application.
</ore-text>
```

</ComponentPreview>

### Heading

Emphasized text for headings with tighter line height and semibold weight. Defaults to `md` on the heading scale (`--heading-md`, 1.5rem / 24px) — set `size` explicitly to pick a different step.

::: info Heading scale vs body scale
`variant="heading"` maps the `size` attribute to the **heading scale** (`--heading-xs` → `--heading-2xl`) rather than the body text scale. This gives a much wider range: from 0.875rem (xs) all the way to 4rem (2xl). See [Size Options](#size-options) for the full mapping.
:::

Always set an explicit `size` when using `variant="heading"` to select the correct step from the heading scale — `size="2xl"` on a heading renders at 4rem (64px), not 1.5rem. Pair with `as="h1"`–`as="h6"` to get correct visual hierarchy and document semantics in one attribute set.

<ComponentPreview center vertical>

```html
<ore-text variant="heading">Default heading (md — 24px)</ore-text>
<ore-text variant="heading" size="xs">Heading xs (14px)</ore-text>
<ore-text variant="heading" size="sm">Heading sm (16px)</ore-text>
<ore-text variant="heading" size="md">Heading md (24px)</ore-text>
<ore-text variant="heading" size="lg">Heading lg (32px)</ore-text>
<ore-text variant="heading" size="xl">Heading xl (48px)</ore-text>
<ore-text variant="heading" size="2xl">Heading 2xl (64px)</ore-text>
```

</ComponentPreview>

### Label

Medium weight text for form labels and UI labels.

<ComponentPreview center vertical>

```html
<ore-text variant="label">Email Address</ore-text>
<ore-text variant="label">Password</ore-text>
<ore-text variant="label">Remember me</ore-text>
```

</ComponentPreview>

### Caption

Smaller, secondary text for additional context or metadata. Use `variant="caption"` with `color="muted"` for helper text, timestamps, and metadata.

<ComponentPreview center vertical>

```html
<ore-text variant="caption" color="muted"> Last updated 2 hours ago </ore-text>
<ore-text variant="caption" color="muted"> Optional field </ore-text>
<ore-text variant="caption" color="muted"> File size: 2.4 MB </ore-text>
```

</ComponentPreview>

### Overline

Uppercase text with letter spacing, ideal for categories or eyebrow text. Pair `variant="overline"` with `size="xs"` for category labels and eyebrow headings.

<ComponentPreview center vertical>

```html
<ore-text variant="overline" size="xs">Featured</ore-text>
<ore-text variant="overline" size="xs">New Release</ore-text>
<ore-text variant="overline" size="xs">Trending</ore-text>
```

</ComponentPreview>

### Code

Monospace text for inline code snippets.

<ComponentPreview center vertical>

```html
<ore-text variant="code">npm install @vielzeug/refine</ore-text>
<ore-text variant="code">const foo = 'bar';</ore-text>
<ore-text variant="code">git commit -m "Initial commit"</ore-text>
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
<ore-text size="xs">Extra small text (xs)</ore-text>
<ore-text size="sm">Small text (sm)</ore-text>
<ore-text size="md">Medium text (md)</ore-text>
<ore-text size="lg">Large text (lg)</ore-text>
<ore-text size="xl">Extra large text (xl)</ore-text>
<ore-text size="2xl">2XL text (2xl)</ore-text>
```

</ComponentPreview>

## Colors

### Semantic Colors

Use semantic colors to convey meaning and maintain consistency. Do not rely on `color` alone to convey meaning — always pair with a descriptive text label.

<ComponentPreview center vertical>

```html
<ore-text color="primary">Primary colored text</ore-text>
<ore-text color="secondary">Secondary colored text</ore-text>
<ore-text color="info">Info colored text</ore-text>
<ore-text color="success">Success colored text</ore-text>
<ore-text color="warning">Warning colored text</ore-text>
<ore-text color="error">Error colored text</ore-text>
```

</ComponentPreview>

### Text Colors

Automatic text colors that adapt to your theme. Each value maps to a semantic `--text-color-*` token from the theme. Note that `color="muted"` resolves to `--text-color-secondary` (contrast-600) and may not meet AAA for small heading sizes.

| `color`    | Token                    | Contrast step          | WCAG                 |
| ---------- | ------------------------ | ---------------------- | -------------------- |
| `heading`  | `--text-color-heading`   | `--color-contrast-900` | AAA                  |
| `body`     | `--text-color-body`      | `--color-contrast-800` | AAA                  |
| `muted`    | `--text-color-secondary` | `--color-contrast-600` | AA                   |
| `tertiary` | `--text-color-tertiary`  | `--color-contrast-500` | AA (large text)      |
| `disabled` | `--text-color-disabled`  | `--color-contrast-400` | decorative only      |
| `contrast` | `--text-color-contrast`  | `--color-contrast-100` | for dark backgrounds |

<ComponentPreview center vertical>

```html
<ore-text color="heading">Heading color (highest contrast)</ore-text>
<ore-text color="body">Body text color (default)</ore-text>
<ore-text color="muted">Muted/secondary text</ore-text>
<ore-text color="tertiary">Tertiary text</ore-text>
<ore-text color="disabled">Disabled text</ore-text>
<ore-text color="contrast">Contrast text (for colored backgrounds)</ore-text>
```

</ComponentPreview>

## Font Weights

Four weight options for emphasis control.

<ComponentPreview center vertical>

```html
<ore-text weight="normal">Normal weight (400)</ore-text>
<ore-text weight="medium">Medium weight (500)</ore-text>
<ore-text weight="semibold">Semibold weight (600)</ore-text>
<ore-text weight="bold">Bold weight (700)</ore-text>
```

</ComponentPreview>

## Text Alignment

Control text alignment for layout purposes.

::: info Display behaviour
`ore-text` is `display: block` by default. `as="span"`, `as="label"`, and `as="code"` switch it to `display: inline`. The `align` attribute has no effect on these inline variants unless `display: block` is also applied.
:::

<ComponentPreview center vertical>

```html
<ore-box style="width: 100%">
  <ore-text align="left">Left aligned text</ore-text>
</ore-box>
<ore-box style="width: 100%;">
  <ore-text align="center">Centered text</ore-text>
</ore-box>
<ore-box style="width: 100%;">
  <ore-text align="right">Right aligned text</ore-text>
</ore-box>
<ore-box style="width: 100%;">
  <ore-text align="justify">
    Justified text distributes words evenly across the line width. This is useful for formal documents or
    newspaper-style layouts.
  </ore-text>
</ore-box>
```

</ComponentPreview>

## Special Features

### Truncate

Enable single-line truncation with ellipsis for overflow text. The `truncate` attribute is a boolean flag. Set a width constraint on the element or its container for truncation to apply.

<ComponentPreview center vertical>

```html
<ore-box style="width: 100%; max-width: 400px;">
  <ore-text truncate>
    This is a very long text that will be truncated with an ellipsis when it exceeds the width of its container. The
    truncation happens automatically using CSS text-overflow.
  </ore-text>
</ore-box>
```

</ComponentPreview>

### Line Clamp

Clamp text to a fixed number of lines with an ellipsis — ideal for card descriptions and teasers. Use `lines` for multi-line truncation and `truncate` for single-line. They are mutually exclusive — `lines` takes precedence if both are present.

<ComponentPreview center vertical>

```html
<ore-box style="width: 100%; max-width: 400px;">
  <ore-text lines="2">
    This long description will be clamped to exactly two lines regardless of how much text is provided. The overflow is
    hidden with a trailing ellipsis, keeping layouts consistent without JavaScript.
  </ore-text>
</ore-box>
```

</ComponentPreview>

### Italic Style

Apply italic styling to text.

<ComponentPreview center vertical>

```html
<ore-text italic>Italic text</ore-text>
<ore-text italic weight="bold">Bold italic text</ore-text>
<ore-text italic color="primary">Italic colored text</ore-text>
```

</ComponentPreview>

### Semantic HTML Tags

The `as` attribute controls document semantics. Use the `as` attribute to render a semantically correct element (`h1`–`h6`, `p`, `label`, `code`) — especially inside forms, articles, and page headers. For `h1`–`h6`, the component automatically sets `role="heading"` and the correct `aria-level` on the host so screen readers announce the correct heading level without any extra markup. Changing `as` dynamically (e.g. by removing the attribute) removes both attributes.

Block elements (`p`, `div`, `h1`–`h6`) render as `display: block`. Inline elements (`span`, `label`, `code`) render as `display: inline`.

<ComponentPreview center vertical>

```html
<!-- Block-level — role="heading" + aria-level set automatically -->
<ore-text as="h1" variant="heading" size="2xl">H1 Heading</ore-text>
<ore-text as="h2" variant="heading" size="xl">H2 Heading</ore-text>
<ore-text as="p">Paragraph with proper semantics</ore-text>
<ore-text as="div">Div container</ore-text>

<!-- Inline — renders as display: inline -->
<ore-text as="span">Inline span</ore-text>
<ore-text as="label">Form label</ore-text>
<ore-text as="code" variant="code">inline code</ore-text>
```

</ComponentPreview>

## Combined Examples

### Card Header

Combine multiple text components for rich layouts.

<ComponentPreview center vertical>

```html
<ore-box style="width: 100%;">
  <ore-text variant="overline" color="primary" size="xs">Featured Product</ore-text>
  <ore-text variant="heading" size="xl" as="h2" style="margin-top: var(--size-2);"> Premium Headphones </ore-text>
  <ore-text variant="caption" color="muted" style="display: block; margin-top: var(--size-1);">
    Added 2 days ago • Electronics
  </ore-text>
  <ore-text style="display: block; margin-top: var(--size-3);">
    High-quality wireless headphones with active noise cancellation, 40-hour battery life, and premium comfort for
    all-day wear.
  </ore-text>
</ore-box>
```

</ComponentPreview>

### Form Field

Label with helper text pattern.

<ComponentPreview center vertical>

```html
<div>
  <ore-text variant="label" as="label" style="display: block; margin-bottom: var(--size-1);"> Email Address </ore-text>
  <ore-text variant="caption" color="muted" size="xs" style="display: block; margin-bottom: var(--size-2);">
    We'll never share your email with anyone else
  </ore-text>
  <ore-input type="email" placeholder="you@example.com" />
</div>
```

</ComponentPreview>

### Status Messages

Use semantic colors for feedback.

<ComponentPreview center vertical>

```html
<ore-text color="success" weight="medium" style="display: block; margin-bottom: var(--size-2);">
  <ore-icon name="check" size="16"></ore-icon> Your changes have been saved successfully
</ore-text>
<ore-text color="warning" weight="medium" style="display: block; margin-bottom: var(--size-2);">
  <ore-icon name="triangle-alert" size="16"></ore-icon> Please review the highlighted fields
</ore-text>
<ore-text color="error" weight="medium" style="display: block;">
  <ore-icon name="x" size="16"></ore-icon> An error occurred. Please try again
</ore-text>
```

</ComponentPreview>

### Truncated Filename

Show file information with truncation using width constraints.

<ComponentPreview center vertical>

```html
<ore-box style="max-width: 250px;">
  <ore-text truncate color="primary" weight="medium">
    very-long-document-name-that-needs-truncation-for-display.pdf
  </ore-text>
  <ore-text variant="caption" color="muted" size="xs" style="display: block; margin-top: var(--size-1);">
    2.4 MB • PDF Document
  </ore-text>
</ore-box>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                                                                                                                  | Default | Description                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| `variant`  | `'body' \| 'heading' \| 'label' \| 'caption' \| 'overline' \| 'code'`                                                                                 | —       | Text variant style                                                                                                         |
| `size`     | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl'`                                                                                                       | —       | Font size. `variant="heading"` resolves against `--heading-*` tokens; all other variants resolve against `--text-*` tokens |
| `weight`   | `'normal' \| 'medium' \| 'semibold' \| 'bold'`                                                                                                        | —       | Font weight (falls back to variant default, then `normal`)                                                                 |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error' \| 'heading' \| 'body' \| 'muted' \| 'tertiary' \| 'disabled' \| 'contrast'` | —       | Text color (falls back to variant default, then `inherit`)                                                                 |
| `align`    | `'left' \| 'center' \| 'right' \| 'justify'`                                                                                                          | —       | Text alignment (forces `display: block`)                                                                                   |
| `truncate` | `boolean`                                                                                                                                             | —       | Single-line truncation with ellipsis                                                                                       |
| `lines`    | `number`                                                                                                                                              | —       | Clamp to N lines with ellipsis (multi-line truncation)                                                                     |
| `italic`   | `boolean`                                                                                                                                             | —       | Italic font style                                                                                                          |
| `as`       | `'span' \| 'p' \| 'div' \| 'h1' \| 'h2' \| 'h3' \| 'h4' \| 'h5' \| 'h6' \| 'label' \| 'code'`                                                         | —       | Semantic element; `h1`–`h6` auto-sets `role="heading"` + `aria-level`                                                      |

### Variant Defaults

| Variant    | Default size          | Default weight          | Default color                           | Line height              | Letter spacing                 |
| ---------- | --------------------- | ----------------------- | --------------------------------------- | ------------------------ | ------------------------------ |
| `body`     | `--text-base` (16px)  | `--font-normal` (400)   | `--text-color-body` (contrast-800)      | `--leading-normal` (1.5) | `normal`                       |
| `heading`  | `--heading-md` (24px) | `--font-semibold` (600) | `--text-color-heading` (contrast-900)   | `--leading-tight` (1.15) | `--tracking-header` (-0.05em)  |
| `label`    | `--text-sm` (14px)    | `--font-medium` (500)   | `--text-color-heading` (contrast-900)   | `--leading-snug` (1.375) | `normal`                       |
| `caption`  | `--text-sm` (14px)    | `--font-normal` (400)   | `--text-color-secondary` (contrast-600) | `--leading-normal` (1.5) | `normal`                       |
| `overline` | `--text-xs` (12px)    | `--font-semibold` (600) | `--text-color-body` (contrast-800)      | `--leading-none` (1)     | `0.08em`                       |
| `code`     | `--text-sm` (14px)    | `--font-normal` (400)   | `--text-color-body` (contrast-800)      | `--leading-normal` (1.5) | `normal`                       |

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

The text component follows WAI-ARIA best practices. It uses `rem` units throughout to respect the user's browser font size preferences, maintains WCAG-compliant line height (1.5 default for body text), and text colors maintain accessible contrast ratios with backgrounds.

When using `as="h1"` through `as="h6"`, the component automatically sets `role="heading"` and the matching `aria-level` (1–6) on the host element. Screen readers announce the correct heading level without any extra markup. Changing `as` dynamically (e.g. by removing the attribute) removes both attributes.

Use the `as` attribute to give the element correct document semantics (`h1`–`h6`, `p`, `label`, etc.). `as="span"`, `as="label"`, and `as="code"` render as `display: inline` matching their native HTML counterparts.
