# Separator

A simple visual divider for separating sections of content. Supports horizontal and vertical orientation, an optional centered label, and semantic vs. decorative modes.

## Features

- <sg-icon name="arrow-left-right" size="16"></sg-icon> **Horizontal** (default) and <sg-icon name="arrow-up-down" size="16"></sg-icon> **Vertical** orientations
- <sg-icon name="tag" size="16"></sg-icon> **Optional label** — centered text on the divider line
- <sg-icon name="palette" size="16"></sg-icon> **6 Theme Colors**: primary, secondary, info, success, warning, error
- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: decorative mode sets `aria-hidden`; semantic mode uses `role="separator"`
- <sg-icon name="wrench" size="16"></sg-icon> **Customizable** line thickness, color, and spacing via CSS custom properties

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/content/separator/separator.ts
:::

## Basic Usage

```html
<p>Section one content.</p>
<sg-separator></sg-separator>
<p>Section two content.</p>
```

## Horizontal (Default)

<ComponentPreview vertical>

```html
<p>Above the separator</p>
<sg-separator></sg-separator>
<p>Below the separator</p>
```

</ComponentPreview>

## Vertical

Set `orientation="vertical"` for inline use. The separator stretches to match the line height of surrounding flex / inline content.

<ComponentPreview center>

```html
<div style="display:flex; align-items:center; gap: 0.75rem;">
  <span>Home</span>
  <sg-separator orientation="vertical" style="height: 1.25rem;"></sg-separator>
  <span>Docs</span>
  <sg-separator orientation="vertical" style="height: 1.25rem;"></sg-separator>
  <span>Blog</span>
</div>
```

</ComponentPreview>

## With Label

Add a centered label to split the line into two segments.

<ComponentPreview vertical>

```html
<sg-separator label="or"></sg-separator>
<sg-separator label="continue with"></sg-separator>
<sg-separator label="Section 2"></sg-separator>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<sg-separator color="primary"></sg-separator>
<sg-separator color="secondary"></sg-separator>
<sg-separator color="success"></sg-separator>
<sg-separator color="warning"></sg-separator>
<sg-separator color="error"></sg-separator>
```

</ComponentPreview>

## Colors with Label

<ComponentPreview vertical>

```html
<sg-separator color="primary" label="primary"></sg-separator>
<sg-separator color="success" label="success"></sg-separator>
<sg-separator color="error" label="error"></sg-separator>
```

</ComponentPreview>

## Semantic Separator

By default the separator is decorative (`aria-hidden="true"`). Set `decorative="false"` for sections where the separator carries structural meaning.

```html
<sg-separator decorative="false" aria-label="End of navigation"></sg-separator>
```

## API Reference

### Attributes

| Attribute     | Type                                                                      | Default        | Description                                                             |
| ------------- | ------------------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `orientation` | `'horizontal' \| 'vertical'`                                              | `'horizontal'` | Direction of the divider line                                           |
| `decorative`  | `boolean`                                                                 | `true`         | When `true`, sets `aria-hidden`. Set to `false` for semantic separators |
| `label`       | `string`                                                                  | —              | Optional text centered on the separator line                            |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —              | Theme color for the line                                                |

### CSS Custom Properties

| Property              | Description                              |
| --------------------- | ---------------------------------------- |
| `--separator-color`   | Line color                               |
| `--separator-size`    | Line thickness (defaults to `1px`)       |
| `--separator-spacing` | Vertical margin above and below the line |

## Accessibility

The separator component follows WAI-ARIA best practices.

### `sg-separator`

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- By default, the separator is decorative and has `aria-hidden="true"`.
- Set `decorative="false"` for separators that carry structural meaning and pair with `aria-label` to describe the separation.
