# Timeline

A vertical, read-only list of events. Items appear in the order supplied; the component does not parse or sort dates.

## Basic Usage

Import the timeline to register both elements:

```js
import '@vielzeug/refine/timeline';
```

Place each event in a direct `ore-timeline-item` child.

<ComponentPreview align="start" justify="start" vertical>

```html
<ore-timeline aria-label="Order history">
  <ore-timeline-item color="success">
    Shipped
    <time slot="meta" datetime="2026-06-10">June 10, 2026</time>
    <span slot="description">Handed to the carrier.</span>
  </ore-timeline-item>
  <ore-timeline-item>
    Ordered
    <time slot="meta" datetime="2026-06-08">June 8, 2026</time>
  </ore-timeline-item>
</ore-timeline>
```

</ComponentPreview>

The default slot contains the event title. Use `meta` for metadata, `description` for details, and `marker` for a custom marker. Supply meaningful status text: marker color alone does not communicate status. Set `hidden` on an item to hide it; the connector ends at the last item without a `hidden` attribute.

## Custom Marker

The marker slot accepts an element such as an icon or avatar. Decorative markers should be hidden from assistive technology; meaningful marker content remains available to it.

<ComponentPreview align="start" justify="start" vertical>

```html
<ore-timeline aria-label="Delivery history">
  <ore-timeline-item color="success">
    <ore-icon slot="marker" name="check" aria-hidden="true"></ore-icon>
    Delivered
    <time slot="meta" datetime="2026-06-11">June 11, 2026</time>
  </ore-timeline-item>
  <ore-timeline-item>Dispatched</ore-timeline-item>
</ore-timeline>
```

</ComponentPreview>

When using the icon outside the preview, also import `@vielzeug/refine/icon`.

## API

### Timeline Item Props

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `color` | `primary`, `secondary`, `info`, `success`, `warning`, `error` | Neutral | Marker color |

### Slots

| Slot | Description |
| ---- | ----------- |
| Default | Event title or content |
| `meta` | Metadata such as a `<time>` element |
| `description` | Additional event details |
| `marker` | Custom marker; replaces the default dot |

### CSS Parts

`ore-timeline-item` exposes `marker`, `content`, `title`, `meta`, and `description` for styling.

### CSS Custom Properties

| Property | Default | Description |
| -------- | ------- | ----------- |
| `--timeline-gap` | `--size-2` | Gap between events |
| `--timeline-marker-color` | Item theme color | Marker color; overrides `color` |
| `--timeline-line-color` | `--color-contrast-300` | Connecting line color |

Set these properties on the timeline to apply them to all items, or set marker and line colors on an individual item. The connecting line spans the configured gap.

## Accessibility

Name `ore-timeline` with `aria-label` or `aria-labelledby`. It exposes list semantics and its direct items expose list-item semantics. Use `<time datetime>` for machine-readable dates.
