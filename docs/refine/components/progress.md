# Progress

A progress indicator for conveying operation completion. Supports a classic linear bar and a circular spinner, both with determinate (known value) and indeterminate (unknown duration) modes.

For loading placeholders before progress can be determined, see [Skeleton](./skeleton.md).

## Linear Bar

### Determinate

Show a known value between 0 and `max` (default: 100).

<ComponentPreview vertical>

```html
<ore-progress value="0"></ore-progress>
<ore-progress value="25"></ore-progress>
<ore-progress value="60"></ore-progress>
<ore-progress value="100"></ore-progress>
```

</ComponentPreview>

### Indeterminate

Use `indeterminate` when the duration of an operation is unknown. The bar animates continuously.

<ComponentPreview vertical>

```html
<ore-progress indeterminate></ore-progress> <ore-progress indeterminate color="primary"></ore-progress>
```

</ComponentPreview>

## Label

The `label` attribute renders visible text and doubles as the accessible `aria-label`.

**Linear:**

- Without `title` — rendered at the **end of the bar** (trailing inline).
- With `title` — moved into the **header row** above the bar.

**Circular:** renders as large, bold text **centered inside the ring**.

Always set `label` (or `title`) to a meaningful description like `"Uploading file — 45%"` so screen readers have a useful accessible name. When neither is set, `aria-label` falls back to `"Progress"`.

<ComponentPreview vertical>

```html
<ore-progress value="40" label="40%"></ore-progress>
<ore-progress value="70" color="primary" label="70 / 100 tasks"></ore-progress>
<ore-progress value="100" color="success" label="Complete"></ore-progress>
```

</ComponentPreview>

## Title

The `title` attribute provides contextual text.

**Linear:** displayed as a header row above the bar. When both `title` and `label` are set, the label moves into the header row right-aligned next to the title.

**Circular:** displayed as smaller text **below the label** inside the ring.

Use `title` + `label` together to build a self-contained progress widget — the title names the operation and the label shows the current value.

<ComponentPreview vertical>

```html
<!-- Title only -->
<ore-progress value="60" title="Uploading files…"></ore-progress>

<!-- Title + label in header row -->
<ore-progress value="60" color="primary" title="Uploading files…" label="60%"></ore-progress>
```

</ComponentPreview>

## Floating Label

The `floating-label` attribute renders a chip **above the fill endpoint**, centered on the current progress position. The chip tracks the fill value as it changes. It is automatically hidden when `indeterminate` is set.

<ComponentPreview vertical>

```html
<ore-progress value="40" floating-label="40%"></ore-progress>
<ore-progress value="65" color="primary" floating-label="65 pts"></ore-progress>
```

</ComponentPreview>

## Circular

Set `type="circular"` to render a circular progress ring. The default diameter is `6rem` (sm: `4rem`, lg: `9rem`) — large enough to display content inside. Use `circular` for dashboard metrics, profile completions, or storage indicators where the ring itself communicates the proportion. For circular, combine `label` (value like `"75%"`) with `title` (context like `"Storage"`) for a self-contained widget.

### Determinate

<ComponentPreview center>

```html
<ore-progress type="circular" value="25"></ore-progress>
<ore-progress type="circular" value="50" color="primary"></ore-progress>
<ore-progress type="circular" value="75" color="success"></ore-progress>
<ore-progress type="circular" value="100" color="info"></ore-progress>
```

</ComponentPreview>

### Label and Title inside the ring

Use `label` for the primary value text centered inside the ring, and `title` for a smaller descriptor below it.

<ComponentPreview center>

```html
<!-- Label only -->
<ore-progress type="circular" value="75" color="primary" label="75%"></ore-progress>

<!-- Label + title -->
<ore-progress type="circular" value="512" max="1024" color="warning" label="50%" title="Storage"></ore-progress>

<!-- lg size -->
<ore-progress type="circular" size="lg" value="3" max="10" color="success" label="3 / 10" title="Steps"></ore-progress>
```

</ComponentPreview>

### Indeterminate

<ComponentPreview center>

```html
<ore-progress type="circular" indeterminate></ore-progress>
<ore-progress type="circular" indeterminate color="primary"></ore-progress>
<ore-progress type="circular" indeterminate color="warning"></ore-progress>
```

</ComponentPreview>

## Colors

Use semantic `color` to reinforce state: `color="success"` when complete, `color="error"` on failure.

<ComponentPreview center>

```html
<ore-progress value="60"></ore-progress>
<ore-progress value="60" color="primary"></ore-progress>
<ore-progress value="60" color="secondary"></ore-progress>
<ore-progress value="60" color="info"></ore-progress>
<ore-progress value="60" color="success"></ore-progress>
<ore-progress value="60" color="warning"></ore-progress>
<ore-progress value="60" color="error"></ore-progress>
```

</ComponentPreview>

## Sizes

Three sizes that affect bar height (linear) or ring diameter (circular). Default circular diameter is `6rem`.

<ComponentPreview vertical>

```html
<ore-progress size="sm" value="60"></ore-progress>
<ore-progress size="md" value="60"></ore-progress>
<ore-progress size="lg" value="60"></ore-progress>
```

</ComponentPreview>

<ComponentPreview center>

```html
<!-- sm: 4rem -->
<ore-progress type="circular" size="sm" value="60" label="60%"></ore-progress>
<!-- md: 6rem (default) -->
<ore-progress type="circular" size="md" value="60" label="60%"></ore-progress>
<!-- lg: 9rem -->
<ore-progress type="circular" size="lg" value="60" label="60%"></ore-progress>
```

</ComponentPreview>

## Custom Max Value

The default `max` is 100. Use `max` to track different units (e.g. steps, bytes).

<ComponentPreview vertical>

```html
<ore-progress value="3" max="10" color="primary" title="Step 3 of 10" label="3 / 10"></ore-progress>
<ore-progress type="circular" value="750" max="1000" color="success" label="750 MB of 1 GB"></ore-progress>
```

</ComponentPreview>

## Dynamic Updates

Update `value` programmatically to reflect real progress.

```js
const bar = document.querySelector('ore-progress');
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

The progress component follows WAI-ARIA best practices. `role="progressbar"` is applied to the track element. `aria-valuenow` reflects the current `value` and is omitted when `indeterminate`. `aria-valuemin` is always `0`; `aria-valuemax` reflects `max`. `aria-label` resolves in priority order: `label` → `title` → `"Progress"`. Use `value-text` via the `value-text` attribute to provide a human-readable override for screen readers (e.g. `"Step 3 of 10"`), which sets `aria-valuetext`. The inner `.circular-inner` overlay (label + title) is positioned with `position: absolute; inset: 0` so the SVG ring renders independently; text never spins even when `indeterminate` is active. Animations respect `prefers-reduced-motion`: the sliding/spinning animation is disabled and a static representation is shown.
