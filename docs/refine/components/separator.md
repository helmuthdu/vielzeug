# Separator

A simple visual divider for separating sections of content. Supports horizontal and vertical orientation, an optional centered label, and semantic vs. decorative modes.

## Horizontal (Default)

<ComponentPreview vertical>

```html
<p>Above the separator</p>
<ore-separator></ore-separator>
<p>Below the separator</p>
```

</ComponentPreview>

## Vertical

Set `orientation="vertical"` for inline use. The separator stretches to match the line height of surrounding flex / inline content.

<ComponentPreview center>

```html
<div style="display:flex; align-items:center; gap: 0.75rem;">
  <span>Home</span>
  <ore-separator orientation="vertical" style="height: 1.25rem;"></ore-separator>
  <span>Docs</span>
  <ore-separator orientation="vertical" style="height: 1.25rem;"></ore-separator>
  <span>Blog</span>
</div>
```

</ComponentPreview>

## With Label

Add a centered label to split the line into two segments.

<ComponentPreview vertical>

```html
<ore-separator label="or"></ore-separator>
<ore-separator label="continue with"></ore-separator>
<ore-separator label="Section 2"></ore-separator>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<ore-separator color="primary"></ore-separator>
<ore-separator color="secondary"></ore-separator>
<ore-separator color="success"></ore-separator>
<ore-separator color="warning"></ore-separator>
<ore-separator color="error"></ore-separator>
```

</ComponentPreview>

## Colors with Label

<ComponentPreview vertical>

```html
<ore-separator color="primary" label="primary"></ore-separator>
<ore-separator color="success" label="success"></ore-separator>
<ore-separator color="error" label="error"></ore-separator>
```

</ComponentPreview>

## Semantic Separator

By default the separator is decorative (`aria-hidden="true"`). Set `decorative="false"` for sections where the separator carries structural meaning. When using a semantic separator, pair it with `aria-label` to describe the separation.

```html
<ore-separator decorative="false" aria-label="End of navigation"></ore-separator>
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

By default, `ore-separator` is decorative and rendered with `aria-hidden="true"`, so screen readers skip it entirely. When the separator carries structural meaning — for example, dividing distinct regions of a page — set `decorative="false"` and provide an `aria-label` to describe the separation. This switches the element to `role="separator"`, making it visible to assistive technology.
