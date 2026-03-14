# Progress

A progress indicator for conveying operation completion. Supports a classic linear bar and a circular spinner, both with determinate (known value) and indeterminate (unknown duration) modes.

For loading placeholders before progress can be determined, see [Skeleton](./skeleton.md).

## Features

- 📊 **2 Types**: `linear` (default) and `circular`
- 🌈 **6 Color Themes**: primary, secondary, info, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- 🔄 **Indeterminate Mode**: animated sliding bar or spinning circle when progress is unknown
- ♿ **Accessible**: `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, and `aria-label`
- 🎨 **Customizable**: CSS custom properties for colors, size, and border radius
- 🎭 **Reduced Motion**: animations are disabled automatically for users who prefer reduced motion

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/progress/progress.ts
:::

## Basic Usage

```html
<bit-progress value="45"></bit-progress>

<script type="module">
  import '@vielzeug/buildit/progress';
</script>
```

## Linear Bar

### Determinate

Show a known value between 0 and `max` (default: 100).

<ComponentPreview vertical>

```html
<bit-progress value="0"></bit-progress>
<bit-progress value="25"></bit-progress>
<bit-progress value="60"></bit-progress>
<bit-progress value="100"></bit-progress>
```

</ComponentPreview>

### Indeterminate

Use `indeterminate` when the duration of an operation is unknown. The bar animates continuously.

<ComponentPreview vertical>

```html
<bit-progress indeterminate></bit-progress> <bit-progress indeterminate color="primary"></bit-progress>
```

</ComponentPreview>

## Circular

Set `type="circular"` to render a circular progress ring instead of a bar.

### Determinate

<ComponentPreview center>

```html
<bit-progress type="circular" value="25"></bit-progress>
<bit-progress type="circular" value="50" color="primary"></bit-progress>
<bit-progress type="circular" value="75" color="success"></bit-progress>
<bit-progress type="circular" value="100" color="info"></bit-progress>
```

</ComponentPreview>

### Indeterminate

<ComponentPreview center>

```html
<bit-progress type="circular" indeterminate></bit-progress>
<bit-progress type="circular" indeterminate color="primary"></bit-progress>
<bit-progress type="circular" indeterminate color="warning"></bit-progress>
```

</ComponentPreview>

## Colors

<ComponentPreview center>

```html
<bit-progress value="60"></bit-progress>
<bit-progress value="60" color="primary"></bit-progress>
<bit-progress value="60" color="secondary"></bit-progress>
<bit-progress value="60" color="info"></bit-progress>
<bit-progress value="60" color="success"></bit-progress>
<bit-progress value="60" color="warning"></bit-progress>
<bit-progress value="60" color="error"></bit-progress>
```

</ComponentPreview>

## Sizes

Three sizes that affect bar height (linear) or circle diameter (circular).

<ComponentPreview vertical>

```html
<bit-progress size="sm" value="60"></bit-progress>
<bit-progress size="md" value="60"></bit-progress>
<bit-progress size="lg" value="60"></bit-progress>
```

</ComponentPreview>

<ComponentPreview center>

```html
<bit-progress type="circular" size="sm" value="60"></bit-progress>
<bit-progress type="circular" size="md" value="60"></bit-progress>
<bit-progress type="circular" size="lg" value="60"></bit-progress>
```

</ComponentPreview>

## Custom Max Value

The default `max` is 100. Use `max` to track different units (e.g. steps, bytes).

<ComponentPreview vertical>

```html
<bit-progress value="3" max="10" color="primary" label="Step 3 of 10"></bit-progress>
<bit-progress type="circular" value="750" max="1000" color="success" label="750 MB of 1 GB"></bit-progress>
```

</ComponentPreview>

## Dynamic Updates

Update `value` programmatically to reflect real progress.

```js
const bar = document.querySelector('bit-progress');
let progress = 0;

const interval = setInterval(() => {
  progress += 5;
  bar.setAttribute('value', String(progress));
  if (progress >= 100) {
    clearInterval(interval);
  }
}, 200);
```

## Guideline Recipe: Delight During Long Operations

**Guideline: delight** — a progress bar combined with a status label turns a wait into a transparent, trustworthy experience.

```html
<div style="display:flex;flex-direction:column;gap:var(--size-2)">
  <div style="display:flex;justify-content:space-between">
    <bit-text variant="label" id="upload-label">Uploading…</bit-text>
    <bit-text variant="caption" id="upload-pct" color="subtle">0%</bit-text>
  </div>
  <bit-progress
    id="upload-bar"
    type="linear"
    color="primary"
    value="0"
    max="100"
    aria-labelledby="upload-label"></bit-progress>
</div>

<script>
  // Simulate progress updates
  let v = 0;
  const bar = document.getElementById('upload-bar');
  const pct = document.getElementById('upload-pct');
  const label = document.getElementById('upload-label');
  const iv = setInterval(() => {
    v = Math.min(v + 8, 100);
    bar.value = v;
    pct.textContent = `${v}%`;
    if (v === 100) {
      label.textContent = 'Upload complete!';
      clearInterval(iv);
    }
  }, 400);
</script>
```

**Tip:** Always pair `value`/`max` with an `aria-label` or `aria-labelledby` so screen reader users hear the percentage spoken aloud.

## API Reference

### Attributes

| Attribute       | Type                                                                      | Default      | Description                                                        |
| --------------- | ------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| `value`         | `number`                                                                  | `0`          | Current progress value (0 to `max`). Ignored when `indeterminate`. |
| `max`           | `number`                                                                  | `100`        | Maximum value                                                      |
| `indeterminate` | `boolean`                                                                 | `false`      | Show infinite animation when duration is unknown                   |
| `type`          | `'linear' \| 'circular'`                                                  | `'linear'`   | Bar style                                                          |
| `color`         | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —            | Theme color for the fill                                           |
| `size`          | `'sm' \| 'md' \| 'lg'`                                                    | —            | Bar height (linear) or circle diameter (circular)                  |
| `label`         | `string`                                                                  | `'Progress'` | Accessible label announced by screen readers                       |

### CSS Custom Properties

| Property                  | Description                                 | Default                |
| ------------------------- | ------------------------------------------- | ---------------------- |
| `--progress-height`       | Linear bar height override                  | Size-dependent         |
| `--progress-track-bg`     | Track (unfilled background) color           | `--color-contrast-200` |
| `--progress-fill`         | Fill bar / stroke color                     | Theme-dependent        |
| `--progress-radius`       | Linear bar border radius                    | `var(--rounded-full)`  |
| `--progress-circle-size`  | Circular indicator diameter                 | Size-dependent         |
| `--progress-stroke-width` | Circular indicator stroke width (SVG units) | `4`                    |

## Accessibility

The progress component follows WAI-ARIA best practices.

### `bit-progress`

✅ **Screen Readers**

- `role="progressbar"` is applied to the track element.
- `aria-valuenow` reflects the current `value` (omitted when `indeterminate`).
- `aria-valuemin` is always `0`; `aria-valuemax` reflects `max`.
- `aria-label` is set to the `label` attribute (default: `"Progress"`). Override with a meaningful description like `"Uploading file"`.
- Animations respect `prefers-reduced-motion`: the sliding/spinning animation is disabled and a static representation is shown.

## Best Practices

**Do:**

- Provide a descriptive `label` when context isn't clear from surrounding text (e.g. `label="Uploading profile photo"`).
- Use `indeterminate` for operations with unknown duration (API calls, file processing).
- Use `circular` inside cards, tables, or compact areas where horizontal space is limited.
- Use semantic `color` to reinforce state: `color="success"` when complete, `color="error"` on failure.

**Don't:**

- Use progress bars for step-based flows — use a stepper component instead.
- Animate the progress bar too quickly or too slowly — aim for real-time updates that reflect actual operation state.
