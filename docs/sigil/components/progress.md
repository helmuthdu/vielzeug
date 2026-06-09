# Progress

A progress indicator for conveying operation completion. Supports a classic linear bar and a circular spinner, both with determinate (known value) and indeterminate (unknown duration) modes.

For loading placeholders before progress can be determined, see [Skeleton](./skeleton.md).

## Features

- <sg-icon name="bar-chart-2" size="16"></sg-icon> **2 Types**: `linear` (default) and `circular`
- <sg-icon name="rainbow" size="16"></sg-icon> **6 Color Themes**: primary, secondary, info, success, warning, error
- <sg-icon name="ruler" size="16"></sg-icon> **3 Sizes**: sm, md, lg
- <sg-icon name="refresh-cw" size="16"></sg-icon> **Indeterminate Mode**: animated sliding bar or spinning circle when progress is unknown
- <sg-icon name="tag" size="16"></sg-icon> **Label**: visible trailing text (linear) or large text centered inside the ring (circular); moves to a header row when combined with `title` on linear
- <sg-icon name="map-pin" size="16"></sg-icon> **Title**: header text above the bar (linear) or smaller text below the label inside the ring (circular)
- <sg-icon name="message-circle" size="16"></sg-icon> **Floating Label**: chip anchored above the fill endpoint — moves as value changes (linear only)
- <sg-icon name="accessibility" size="16"></sg-icon> **Accessible**: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`
- <sg-icon name="palette" size="16"></sg-icon> **Customizable**: CSS custom properties for colors, size, and border radius
- <sg-icon name="theater" size="16"></sg-icon> **Reduced Motion**: animations are disabled automatically for users who prefer reduced motion

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/feedback/progress/progress.ts
:::

## Basic Usage

```html
<sg-progress value="45"></sg-progress>
```

## Linear Bar

### Determinate

Show a known value between 0 and `max` (default: 100).

<ComponentPreview vertical>

```html
<sg-progress value="0"></sg-progress>
<sg-progress value="25"></sg-progress>
<sg-progress value="60"></sg-progress>
<sg-progress value="100"></sg-progress>
```

</ComponentPreview>

### Indeterminate

Use `indeterminate` when the duration of an operation is unknown. The bar animates continuously.

<ComponentPreview vertical>

```html
<sg-progress indeterminate></sg-progress> <sg-progress indeterminate color="primary"></sg-progress>
```

</ComponentPreview>

## Label

The `label` attribute renders visible text and doubles as the accessible `aria-label`.

**Linear:**

- Without `title` — rendered at the **end of the bar** (trailing inline).
- With `title` — moved into the **header row** above the bar.

**Circular:** renders as large, bold text **centered inside the ring**.

<ComponentPreview vertical>

```html
<sg-progress value="40" label="40%"></sg-progress>
<sg-progress value="70" color="primary" label="70 / 100 tasks"></sg-progress>
<sg-progress value="100" color="success" label="Complete"></sg-progress>
```

</ComponentPreview>

## Title

The `title` attribute provides contextual text.

**Linear:** displayed as a header row above the bar. When both `title` and `label` are set, the label moves into the header row right-aligned next to the title.

**Circular:** displayed as smaller text **below the label** inside the ring.

<ComponentPreview vertical>

```html
<!-- Title only -->
<sg-progress value="60" title="Uploading files…"></sg-progress>

<!-- Title + label in header row -->
<sg-progress value="60" color="primary" title="Uploading files…" label="60%"></sg-progress>
```

</ComponentPreview>

## Floating Label

The `floating-label` attribute renders a chip **above the fill endpoint**, centered on the current progress position. The chip tracks the fill value as it changes. It is automatically hidden when `indeterminate` is set.

<ComponentPreview vertical>

```html
<sg-progress value="40" floating-label="40%"></sg-progress>
<sg-progress value="65" color="primary" floating-label="65 pts"></sg-progress>
```

</ComponentPreview>

## Circular

Set `type="circular"` to render a circular progress ring. The default diameter is `6rem` (sm: `4rem`, lg: `9rem`) — large enough to display content inside.

### Determinate

<ComponentPreview center>

```html
<sg-progress type="circular" value="25"></sg-progress>
<sg-progress type="circular" value="50" color="primary"></sg-progress>
<sg-progress type="circular" value="75" color="success"></sg-progress>
<sg-progress type="circular" value="100" color="info"></sg-progress>
```

</ComponentPreview>

### Label and Title inside the ring

Use `label` for the primary value text centered inside the ring, and `title` for a smaller descriptor below it.

<ComponentPreview center>

```html
<!-- Label only -->
<sg-progress type="circular" value="75" color="primary" label="75%"></sg-progress>

<!-- Label + title -->
<sg-progress type="circular" value="512" max="1024" color="warning" label="50%" title="Storage"></sg-progress>

<!-- lg size -->
<sg-progress type="circular" size="lg" value="3" max="10" color="success" label="3 / 10" title="Steps"></sg-progress>
```

</ComponentPreview>

### Indeterminate

<ComponentPreview center>

```html
<sg-progress type="circular" indeterminate></sg-progress>
<sg-progress type="circular" indeterminate color="primary"></sg-progress>
<sg-progress type="circular" indeterminate color="warning"></sg-progress>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<sg-progress value="60"></sg-progress>
<sg-progress value="60" color="primary"></sg-progress>
<sg-progress value="60" color="secondary"></sg-progress>
<sg-progress value="60" color="info"></sg-progress>
<sg-progress value="60" color="success"></sg-progress>
<sg-progress value="60" color="warning"></sg-progress>
<sg-progress value="60" color="error"></sg-progress>
```

</ComponentPreview>

## Sizes

Three sizes that affect bar height (linear) or ring diameter (circular). Default circular diameter is `6rem`.

<ComponentPreview vertical>

```html
<sg-progress size="sm" value="60"></sg-progress>
<sg-progress size="md" value="60"></sg-progress>
<sg-progress size="lg" value="60"></sg-progress>
```

</ComponentPreview>

<ComponentPreview center>

```html
<!-- sm: 4rem -->
<sg-progress type="circular" size="sm" value="60" label="60%"></sg-progress>
<!-- md: 6rem (default) -->
<sg-progress type="circular" size="md" value="60" label="60%"></sg-progress>
<!-- lg: 9rem -->
<sg-progress type="circular" size="lg" value="60" label="60%"></sg-progress>
```

</ComponentPreview>

## Custom Max Value

The default `max` is 100. Use `max` to track different units (e.g. steps, bytes).

<ComponentPreview vertical>

```html
<sg-progress value="3" max="10" color="primary" title="Step 3 of 10" label="3 / 10"></sg-progress>
<sg-progress type="circular" value="750" max="1000" color="success" label="750 MB of 1 GB"></sg-progress>
```

</ComponentPreview>

## Dynamic Updates

Update `value` programmatically to reflect real progress.

```js
const bar = document.querySelector('sg-progress');
let progress = 0;

const interval = setInterval(() => {
  progress += 5;
  bar.setAttribute('value', String(progress));
  if (progress >= 100) {
    clearInterval(interval);
  }
}, 200);
```

## API Reference

### Attributes

| Attribute        | Type                                                                      | Default    | Description                                                                                                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`          | `number`                                                                  | `0`        | Current progress value (0 to `max`). Ignored when `indeterminate`.                                                                                                                                                                                       |
| `max`            | `number`                                                                  | `100`      | Maximum value                                                                                                                                                                                                                                            |
| `indeterminate`  | `boolean`                                                                 | `false`    | Show infinite animation when duration is unknown                                                                                                                                                                                                         |
| `type`           | `'linear' \| 'circular'`                                                  | `'linear'` | Bar style                                                                                                                                                                                                                                                |
| `color`          | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —          | Theme color for the fill                                                                                                                                                                                                                                 |
| `size`           | `'sm' \| 'md' \| 'lg'`                                                    | —          | Bar height (linear) or circle diameter (circular)                                                                                                                                                                                                        |
| `label`          | `string`                                                                  | —          | Visible text label and accessible name. **Linear** without `title`: rendered at bar end. **Linear** with `title`: moved to the header row. **Circular**: large text centered inside the ring. Falls back to `title`, then `"Progress"` for `aria-label`. |
| `title`          | `string`                                                                  | —          | **Linear**: header text above the bar; moves `label` to the header row when combined. **Circular**: smaller text below the `label` inside the ring.                                                                                                      |
| `floating-label` | `string`                                                                  | —          | Text for the floating chip above the fill endpoint (linear only). Hidden when `indeterminate`.                                                                                                                                                           |
| `value-text`     | `string`                                                                  | —          | Human-readable value for screen readers (e.g. `"Step 2 of 5"`). Overrides the raw `aria-valuenow`.                                                                                                                                                       |

### CSS Custom Properties

| Property                         | Description                                                   | Default                      |
| -------------------------------- | ------------------------------------------------------------- | ---------------------------- |
| `--progress-height`              | Linear bar height override                                    | Size-dependent               |
| `--progress-track-bg`            | Track (unfilled background) color                             | `--color-contrast-200`       |
| `--progress-fill`                | Fill bar / stroke color                                       | Theme-dependent              |
| `--progress-radius`              | Linear bar border radius                                      | `var(--rounded-full)`        |
| `--progress-circle-size`         | Circular ring diameter                                        | `6rem` (size-dependent)      |
| `--progress-stroke-width`        | Circular stroke width                                         | Height-dependent             |
| `--progress-circular-label-size` | Font size of the label inside the ring                        | `--text-xl` (size-dependent) |
| `--progress-circular-title-size` | Font size of the title inside the ring                        | `--text-xs` (size-dependent) |
| `--progress-label-gap`           | Gap between header/bar row and between bar and trailing label | `0.25rem`                    |
| `--progress-title-color`         | Title text color                                              | `currentColor`               |
| `--progress-label-color`         | Label text color                                              | `currentColor`               |

## Accessibility

The progress component follows WAI-ARIA best practices.

### `sg-progress`

<sg-icon name="circle-check" size="16"></sg-icon> **Screen Readers**

- `role="progressbar"` is applied to the track element.
- `aria-valuenow` reflects the current `value` (omitted when `indeterminate`).
- `aria-valuemin` is always `0`; `aria-valuemax` reflects `max`.
- `aria-label` resolves in priority order: `label` → `title` → `"Progress"`. Set `label` to a meaningful description like `"Uploading file — 45%"`.
- `aria-valuetext` can be set via `value-text` for a human-readable override (e.g. `"Step 3 of 10"`).
- The inner `.circular-inner` overlay (label + title) is positioned with `position: absolute; inset: 0` so the SVG ring renders independently; text never spins even when `indeterminate` is active.
- Animations respect `prefers-reduced-motion`: the sliding/spinning animation is disabled and a static representation is shown.

## Best Practices

**Do:**

- Use `title` + `label` together to build a self-contained progress widget — the title names the operation and the label shows the current value.
- Use `floating-label` to surface the exact value visually without breaking layout (linear only).
- For circular, combine `label` (value like `"75%"`) with `title` (context like `"Storage"`) for a self-contained widget.
- Use `circular` for dashboard metrics, profile completions, or storage indicators where the ring itself communicates the proportion.
- Use semantic `color` to reinforce state: `color="success"` when complete, `color="error"` on failure.

**Don't:**

- Omit `label` or `title` when context is not clear from surrounding text — screen readers need a meaningful `aria-label`.
- Use `floating-label` with `indeterminate` — the chip is hidden in that state since there is no defined endpoint to pin it to.
- Use progress bars for step-based flows — use a stepper component instead.
- Animate the progress bar too quickly or too slowly — aim for real-time updates that reflect actual operation state.
