# Stats Card

Displays a labeled metric with optional context, trend, icon, and visual content. Use `ore-stats` for dashboard summaries and compact KPI groups.

## Basic Usage

Set `label` and `value` for the primary metric. Add `description` when the value needs context.

<ComponentPreview center>

```html
<ore-stats label="Monthly revenue" value="$48,290" description="Across all active subscriptions">
  <ore-icon slot="icon" name="circle-dollar-sign" aria-hidden="true"></ore-icon>
</ore-stats>
```

</ComponentPreview>

## Trends

Use `trend` for the displayed change and `trend-direction` to apply up, down, or neutral treatment. Include a sign or word in the trend text so direction is not conveyed by color alone.

<ComponentPreview center>

```html
<ore-stats label="New customers" value="1,284" trend="+12.5%" trend-direction="up"></ore-stats>
<ore-stats label="Churn" value="2.1%" trend="-0.4 points" trend-direction="down" color="success"></ore-stats>
<ore-stats label="Open tickets" value="36" trend="No change" trend-direction="neutral"></ore-stats>
```

</ComponentPreview>

## Visual Slot

Place a compact chart or other supporting graphic in the `visual` slot. This example uses a live [Prism sparkline](../../prism/usage.md#sparklines) rather than static SVG. The sparkline is decorative because the value and signed trend already communicate the result.

<ComponentPreview center>

```html
<ore-stats label="Weekly traffic" value="84.2k" trend="+8.2%" trend-direction="up">
  <span id="weekly-traffic-sparkline" slot="visual" style="display:block;width:120px;height:40px"></span>
</ore-stats>

<script>
  const sparkline = Prism.createSparkline(document.getElementById('weekly-traffic-sparkline'), {
    a11y: { decorative: true },
    color: 'var(--color-primary)',
    curve: 'monotone',
    data: [52, 58, 55, 67, 63, 76, 84],
    strokeWidth: 2,
    variant: 'area',
  });

  window.addEventListener('pagehide', () => sparkline.dispose(), { once: true });
</script>
```

</ComponentPreview>

## Plain Groups

Use `variant="plain"` when a shared container supplies the group surface and separators.

<ComponentPreview>

```html
<div style="--stats-bg:var(--color-canvas);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:var(--color-divider);border:1px solid var(--color-divider);border-radius:var(--rounded-lg);overflow:hidden">
  <ore-stats variant="plain" label="Orders" value="2,408"></ore-stats>
  <ore-stats variant="plain" label="Revenue" value="$82.4k"></ore-stats>
  <ore-stats variant="plain" label="Refunds" value="1.8%"></ore-stats>
</div>
```

</ComponentPreview>

## Loading and Disabled

Set `loading` while the metric is being fetched. Use `disabled` when a metric is unavailable but should remain visible.

<ComponentPreview center>

```html
<ore-stats label="Active sessions" value="—" loading></ore-stats>
<ore-stats label="Forecast" value="$120k" description="Unavailable for this workspace" disabled></ore-stats>
```

</ComponentPreview>

## Accessibility

Use a concise `label` that identifies what the value measures. Do not rely on trend color or an arrow alone; provide meaningful `trend` text such as `+12.5%` or `No change`. Add accessible text to informative content in the `icon` and `visual` slots, and mark decorative content with `aria-hidden="true"`.

Loading cards expose a busy state, while disabled cards expose their unavailable state. `ore-stats` is presentational rather than interactive; place actions outside the card or use a semantic link or button instead of adding click behavior to the host.

## API Reference

### Attributes

| Attribute         | Type                                                                      | Default      | Description                                      |
| ----------------- | ------------------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `label`           | `string`                                                                  | —            | Metric label                                     |
| `value`           | `string`                                                                  | —            | Primary metric value                             |
| `description`     | `string`                                                                  | —            | Supporting context shown below the metric        |
| `trend`           | `string`                                                                  | —            | Displayed change or comparison text              |
| `trend-direction` | `'up' \| 'down' \| 'neutral'`                                            | `'neutral'`  | Semantic and visual direction of the trend       |
| `variant`         | `'outlined' \| 'plain' \| 'solid'`                                       | `'outlined'` | Surface treatment                                |
| `color`           | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —         | Semantic color theme                             |
| `size`            | `'sm' \| 'md' \| 'lg'`                                                   | `'md'`       | Component size                                   |
| `rounded`         | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| '3xl' \| 'full'` | —          | Border radius                                    |
| `disabled`        | `boolean`                                                                 | `false`      | Marks the metric as unavailable                  |
| `loading`         | `boolean`                                                                 | `false`      | Shows the loading state                          |

Attribute content is used when the corresponding named slot is empty.

### Slots

| Slot          | Description                                      |
| ------------- | ------------------------------------------------ |
| `icon`        | Leading icon or compact graphic                  |
| `label`       | Custom label content                             |
| `value`       | Custom value content                             |
| `visual`      | Supporting visualization, such as a sparkline    |
| `trend`       | Custom trend content                             |
| `description` | Custom supporting description                    |

### CSS Custom Properties

| Property                    | Description                         |
| --------------------------- | ----------------------------------- |
| `--stats-bg`           | Card background                     |
| `--stats-color`        | Card text color                     |
| `--stats-border-color` | Border color                        |
| `--stats-radius`       | Border radius                       |
| `--stats-padding`      | Internal padding                    |
| `--stats-min-height`   | Minimum card height                 |
| `--stats-value-size`   | Value font size                     |
| `--stats-icon-bg`      | Icon container background           |
| `--stats-trend-up`     | Upward trend color                  |
| `--stats-trend-down`   | Downward trend color                |

### CSS Parts

| Part          | Description                              |
| ------------- | ---------------------------------------- |
| `card`        | Outer card surface                       |
| `header`      | Header containing the icon and label     |
| `icon`        | Icon container                           |
| `label`       | Label container                          |
| `body`        | Main metric content                      |
| `value`       | Value container                          |
| `visual`      | Visual slot container                    |
| `footer`      | Footer containing trend and description  |
| `trend`       | Trend container                          |
| `description` | Description container                    |
| `loading`     | Loading indicator                        |
