# Text

A versatile typography component with semantic variants for consistent text styling across your application. Provides complete control over typography with design system integration and accessibility built-in.

## Features

- <sg-icon name="palette" size="16"></sg-icon> **6 Semantic Variants**: body, heading, label, caption, overline, code
- <sg-icon name="ruler" size="16"></sg-icon> **6 Sizes**: xs, sm, md, lg, xl, 2xl (body scale) — heading variant uses the heading scale
- <sg-icon name="scale" size="16"></sg-icon> **4 Font Weights**: normal, medium, semibold, bold
- <sg-icon name="rainbow" size="16"></sg-icon> **12 Colors**: semantic (primary, secondary, info, success, warning, error) + text colors (heading, body, muted, tertiary, disabled, contrast)
- <sg-icon name="triangle-right" size="16"></sg-icon> **4 Alignments**: left, center, right, justify
- <sg-icon name="scissors" size="16"></sg-icon> **Truncate**: Single-line ellipsis truncation
- <sg-icon name="clipboard" size="16"></sg-icon> **Line Clamp**: Multi-line truncation with ellipsis via `lines` prop
- <sg-icon name="type" size="16"></sg-icon> **Semantic HTML**: Render as different HTML tags (span, p, div, h1-h6, label, code)
- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: `as="h1"–"h6"` sets `role="heading"` + `aria-level` automatically
- <sg-icon name="theater" size="16"></sg-icon> **Italic Style**: Font style support
- <sg-icon name="wrench" size="16"></sg-icon> **Customizable**: CSS custom properties for full control

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/content/text/text.ts
:::

## Basic Usage

```html
<sg-text>Regular paragraph text</sg-text>
```

## Variants

### Body (Default)

Normal paragraph text with standard line height. The default variant for general content.

<ComponentPreview center vertical>

```html
<sg-text>
  This is body text with normal styling. It's perfect for paragraphs, descriptions, and general content throughout your
  application.
</sg-text>
```

</ComponentPreview>

### Heading

Emphasized text for headings with tighter line height and semibold weight. Defaults to `md` on the heading scale (`--heading-md`, 1.5rem / 24px) — set `size` explicitly to pick a different step.

::: info Heading scale vs body scale
`variant="heading"` maps the `size` attribute to the **heading scale** (`--heading-xs` → `--heading-2xl`) rather than the body text scale. This gives a much wider range: from 0.875rem (xs) all the way to 4rem (2xl). See [Size Options](#size-options) for the full mapping.
:::

<ComponentPreview center vertical>

```html
<sg-text variant="heading">Default heading (md — 24px)</sg-text>
<sg-text variant="heading" size="xs">Heading xs (14px)</sg-text>
<sg-text variant="heading" size="sm">Heading sm (16px)</sg-text>
<sg-text variant="heading" size="md">Heading md (24px)</sg-text>
<sg-text variant="heading" size="lg">Heading lg (32px)</sg-text>
<sg-text variant="heading" size="xl">Heading xl (48px)</sg-text>
<sg-text variant="heading" size="2xl">Heading 2xl (64px)</sg-text>
```

</ComponentPreview>

### Label

Medium weight text for form labels and UI labels.

<ComponentPreview center vertical>

```html
<sg-text variant="label">Email Address</sg-text>
<sg-text variant="label">Password</sg-text>
<sg-text variant="label">Remember me</sg-text>
```

</ComponentPreview>

### Caption

Smaller, secondary text for additional context or metadata.

<ComponentPreview center vertical>

```html
<sg-text variant="caption" color="muted"> Last updated 2 hours ago </sg-text>
<sg-text variant="caption" color="muted"> Optional field </sg-text>
<sg-text variant="caption" color="muted"> File size: 2.4 MB </sg-text>
```

</ComponentPreview>

### Overline

Uppercase text with letter spacing, ideal for categories or eyebrow text.

<ComponentPreview center vertical>

```html
<sg-text variant="overline" size="xs">Featured</sg-text>
<sg-text variant="overline" size="xs">New Release</sg-text>
<sg-text variant="overline" size="xs">Trending</sg-text>
```

</ComponentPreview>

### Code

Monospace text for inline code snippets.

<ComponentPreview center vertical>

```html
<sg-text variant="code">npm install @vielzeug/sigil</sg-text>
<sg-text variant="code">const foo = 'bar';</sg-text>
<sg-text variant="code">git commit -m "Initial commit"</sg-text>
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
<sg-text size="xs">Extra small text (xs)</sg-text>
<sg-text size="sm">Small text (sm)</sg-text>
<sg-text size="md">Medium text (md)</sg-text>
<sg-text size="lg">Large text (lg)</sg-text>
<sg-text size="xl">Extra large text (xl)</sg-text>
<sg-text size="2xl">2XL text (2xl)</sg-text>
```

</ComponentPreview>

## Colors

### Semantic Colors

Use semantic colors to convey meaning and maintain consistency.

<ComponentPreview center vertical>

```html
<sg-text color="primary">Primary colored text</sg-text>
<sg-text color="secondary">Secondary colored text</sg-text>
<sg-text color="info">Info colored text</sg-text>
<sg-text color="success">Success colored text</sg-text>
<sg-text color="warning">Warning colored text</sg-text>
<sg-text color="error">Error colored text</sg-text>
```

</ComponentPreview>

### Text Colors

Automatic text colors that adapt to your theme. Each value maps to a semantic `--text-color-*` token from the theme.

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
<sg-text color="heading">Heading color (highest contrast)</sg-text>
<sg-text color="body">Body text color (default)</sg-text>
<sg-text color="muted">Muted/secondary text</sg-text>
<sg-text color="tertiary">Tertiary text</sg-text>
<sg-text color="disabled">Disabled text</sg-text>
<sg-text color="contrast">Contrast text (for colored backgrounds)</sg-text>
```

</ComponentPreview>

## Font Weights

Four weight options for emphasis control.

<ComponentPreview center vertical>

```html
<sg-text weight="normal">Normal weight (400)</sg-text>
<sg-text weight="medium">Medium weight (500)</sg-text>
<sg-text weight="semibold">Semibold weight (600)</sg-text>
<sg-text weight="bold">Bold weight (700)</sg-text>
```

</ComponentPreview>

## Text Alignment

Control text alignment for layout purposes.

::: info Display behaviour
`sg-text` is `display: block` by default. `as="span"`, `as="label"`, and `as="code"` switch it to `display: inline`. The `align` attribute has no effect on these inline variants unless `display: block` is also applied.
:::

<ComponentPreview center vertical>

```html
<sg-box style="width: 100%">
  <sg-text align="left">Left aligned text</sg-text>
</sg-box>
<sg-box style="width: 100%;">
  <sg-text align="center">Centered text</sg-text>
</sg-box>
<sg-box style="width: 100%;">
  <sg-text align="right">Right aligned text</sg-text>
</sg-box>
<sg-box style="width: 100%;">
  <sg-text align="justify">
    Justified text distributes words evenly across the line width. This is useful for formal documents or
    newspaper-style layouts.
  </sg-text>
</sg-box>
```

</ComponentPreview>

## Special Features

### Truncate

Enable single-line truncation with ellipsis for overflow text.

<ComponentPreview center vertical>

```html
<sg-box style="width: 100%; max-width: 400px;">
  <sg-text truncate>
    This is a very long text that will be truncated with an ellipsis when it exceeds the width of its container. The
    truncation happens automatically using CSS text-overflow.
  </sg-text>
</sg-box>
```

</ComponentPreview>

::: tip Usage
The `truncate` attribute is a boolean flag. Set a width constraint on the element or its container for truncation to apply.
:::

### Line Clamp

Clamp text to a fixed number of lines with an ellipsis — ideal for card descriptions and teasers.

<ComponentPreview center vertical>

```html
<sg-box style="width: 100%; max-width: 400px;">
  <sg-text lines="2">
    This long description will be clamped to exactly two lines regardless of how much text is provided. The overflow is
    hidden with a trailing ellipsis, keeping layouts consistent without JavaScript.
  </sg-text>
</sg-box>
```

</ComponentPreview>

::: tip Usage
Use `lines` for multi-line truncation and `truncate` for single-line. They are mutually exclusive — `lines` takes precedence if both are present.
:::

### Italic Style

Apply italic styling to text.

<ComponentPreview center vertical>

```html
<sg-text italic>Italic text</sg-text>
<sg-text italic weight="bold">Bold italic text</sg-text>
<sg-text italic color="primary">Italic colored text</sg-text>
```

</ComponentPreview>

### Semantic HTML Tags

The `as` attribute controls document semantics. For `h1`–`h6`, the component automatically sets `role="heading"` and the correct `aria-level` on the host so screen readers announce the correct heading level — no extra ARIA needed.

Block elements (`p`, `div`, `h1`–`h6`) render as `display: block`. Inline elements (`span`, `label`, `code`) render as `display: inline`.

<ComponentPreview center vertical>

```html
<!-- Block-level — role="heading" + aria-level set automatically -->
<sg-text as="h1" variant="heading" size="2xl">H1 Heading</sg-text>
<sg-text as="h2" variant="heading" size="xl">H2 Heading</sg-text>
<sg-text as="p">Paragraph with proper semantics</sg-text>
<sg-text as="div">Div container</sg-text>

<!-- Inline — renders as display: inline -->
<sg-text as="span">Inline span</sg-text>
<sg-text as="label">Form label</sg-text>
<sg-text as="code" variant="code">inline code</sg-text>
```

</ComponentPreview>

## Combined Examples

### Card Header

Combine multiple text components for rich layouts.

<ComponentPreview center vertical>

```html
<sg-box style="width: 100%;">
  <sg-text variant="overline" color="primary" size="xs">Featured Product</sg-text>
  <sg-text variant="heading" size="xl" as="h2" style="margin-top: var(--size-2);"> Premium Headphones </sg-text>
  <sg-text variant="caption" color="muted" style="display: block; margin-top: var(--size-1);">
    Added 2 days ago • Electronics
  </sg-text>
  <sg-text style="display: block; margin-top: var(--size-3);">
    High-quality wireless headphones with active noise cancellation, 40-hour battery life, and premium comfort for
    all-day wear.
  </sg-text>
</sg-box>
```

</ComponentPreview>

### Form Field

Label with helper text pattern.

<ComponentPreview center vertical>

```html
<div>
  <sg-text variant="label" as="label" style="display: block; margin-bottom: var(--size-1);"> Email Address </sg-text>
  <sg-text variant="caption" color="muted" size="xs" style="display: block; margin-bottom: var(--size-2);">
    We'll never share your email with anyone else
  </sg-text>
  <sg-input type="email" placeholder="you@example.com" />
</div>
```

</ComponentPreview>

### Status Messages

Use semantic colors for feedback.

<ComponentPreview center vertical>

```html
<sg-text color="success" weight="medium" style="display: block; margin-bottom: var(--size-2);">
  <sg-icon name="check" size="16"></sg-icon> Your changes have been saved successfully
</sg-text>
<sg-text color="warning" weight="medium" style="display: block; margin-bottom: var(--size-2);">
  <sg-icon name="triangle-alert" size="16"></sg-icon> Please review the highlighted fields
</sg-text>
<sg-text color="error" weight="medium" style="display: block;">
  <sg-icon name="x" size="16"></sg-icon> An error occurred. Please try again
</sg-text>
```

</ComponentPreview>

### Truncated Filename

Show file information with truncation using width constraints.

<ComponentPreview center vertical>

```html
<sg-box style="max-width: 250px;">
  <sg-text truncate color="primary" weight="medium">
    very-long-document-name-that-needs-truncation-for-display.pdf
  </sg-text>
  <sg-text variant="caption" color="muted" size="xs" style="display: block; margin-top: var(--size-1);">
    2.4 MB • PDF Document
  </sg-text>
</sg-box>
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
| `heading`  | `--heading-md` (24px) | `--font-semibold` (600) | `--text-color-heading` (contrast-900)   | `--leading-tight` (1.15) | `--tracking-header` (-0.025em) |
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

The text component follows WAI-ARIA best practices.

### `sg-text`

<sg-icon name="check" size="16"></sg-icon> **Automatic Heading ARIA**

- `as="h1"` through `as="h6"` automatically sets `role="heading"` and the matching `aria-level` (1–6) on the host element. Screen readers announce the correct heading level without any extra markup.
- Changing `as` dynamically (e.g. by removing the attribute) removes both attributes.

<sg-icon name="check" size="16"></sg-icon> **Semantic Structure**

- Use the `as` attribute to give the element correct document semantics (`h1`–`h6`, `p`, `label`, etc.).
- `as="span"`, `as="label"`, and `as="code"` render as `display: inline` matching their native HTML counterparts.

<sg-icon name="check" size="16"></sg-icon> **Screen Readers**

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
- Use `sg-text` as a replacement for native block elements (`<p>`, `<h2>`, etc.) in long-form content — prefer the `as` attribute instead.
- Set both `truncate` and `lines` on the same element; use one or the other.
- Use `color="muted"` for headings — it resolves to `--text-color-secondary` (contrast-600) which may not meet AAA for small heading sizes.
