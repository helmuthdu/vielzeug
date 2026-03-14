# Separator

A simple visual divider for separating sections of content. Supports horizontal and vertical orientation, an optional centered label, and semantic vs. decorative modes.

## Features

- ↔️ **Horizontal** (default) and ↕️ **Vertical** orientations
- 🏷️ **Optional label** — centered text on the divider line
- 🎨 **6 Theme Colors**: primary, secondary, info, success, warning, error
- ♿ **Accessible**: decorative mode sets `aria-hidden`; semantic mode uses `role="separator"`
- 🔧 **Customizable** line thickness, color, and spacing via CSS custom properties

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/content/separator/separator.ts
:::

## Basic Usage

```html
<p>Section one content.</p>
<bit-separator></bit-separator>
<p>Section two content.</p>

<script type="module">
  import '@vielzeug/buildit';
</script>
```

## Horizontal (Default)

<ComponentPreview vertical>

```html
<p>Above the separator</p>
<bit-separator></bit-separator>
<p>Below the separator</p>
```

</ComponentPreview>

## Vertical

Set `orientation="vertical"` for inline use. The separator stretches to match the line height of surrounding flex / inline content.

<ComponentPreview center>

```html
<div style="display:flex; align-items:center; gap: 0.75rem;">
  <span>Home</span>
  <bit-separator orientation="vertical" style="height: 1.25rem;"></bit-separator>
  <span>Docs</span>
  <bit-separator orientation="vertical" style="height: 1.25rem;"></bit-separator>
  <span>Blog</span>
</div>
```

</ComponentPreview>

## With Label

Add a centered label to split the line into two segments.

<ComponentPreview vertical>

```html
<bit-separator label="or"></bit-separator>
<bit-separator label="continue with"></bit-separator>
<bit-separator label="Section 2"></bit-separator>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<bit-separator color="primary"></bit-separator>
<bit-separator color="secondary"></bit-separator>
<bit-separator color="success"></bit-separator>
<bit-separator color="warning"></bit-separator>
<bit-separator color="error"></bit-separator>
```

</ComponentPreview>

## Colors with Label

<ComponentPreview vertical>

```html
<bit-separator color="primary" label="primary"></bit-separator>
<bit-separator color="success" label="success"></bit-separator>
<bit-separator color="error" label="error"></bit-separator>
```

</ComponentPreview>

## Semantic Separator

By default the separator is decorative (`aria-hidden="true"`). Set `decorative="false"` for sections where the separator carries structural meaning.

```html
<bit-separator decorative="false" aria-label="End of navigation"></bit-separator>
```

## Guideline Recipe: Distill with Visual Section Breaks

**Guideline: distill** — a labeled separator gives a long form or settings page clear, scannable sections without adding visual bulk.

```html
<section>
  <bit-input name="display-name" label="Display name"></bit-input>
  <bit-input name="email" label="Email" type="email"></bit-input>

  <bit-separator label="Security" style="margin-block:var(--size-4)"></bit-separator>

  <bit-input name="current-password" label="Current password" type="password"></bit-input>
  <bit-input name="new-password" label="New password" type="password"></bit-input>
</section>
```

**Tip:** Prefer the `label` variant over a plain `<h3>` heading inside dense forms — it occupies less vertical space while still marking the transition.

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

### `bit-separator`

✅ **Screen Readers**

- By default, the separator is decorative and has `aria-hidden="true"`.
- Set `decorative="false"` for separators that carry structural meaning and pair with `aria-label` to describe the separation.
