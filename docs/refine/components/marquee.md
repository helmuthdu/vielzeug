# Marquee

A CSS-driven ticker for short, repeated announcements. It preserves the former Carousel marquee layout: a rounded canvas viewport with full-height scrolling cards. Direct child elements scroll continuously and are duplicated internally to create a seamless loop.

Use it for supplementary status or promotional content, not information users must read carefully. The duplicate items are hidden from assistive technology and inert; put interactive content only in the original children.

## Basic Usage

<ComponentPreview>

```html
<ore-marquee duration="24" pause-on-hover style="height:120px">
  <div style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);width:200px">
    Free shipping on orders over €50
  </div>
  <div style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);width:200px">
    New arrivals every Friday
  </div>
  <div style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-300);width:200px">
    Members earn double points this week
  </div>
</ore-marquee>
```

</ComponentPreview>

## Direction and Pause

The ticker moves left by default. Set `direction="right"` for the reverse motion. Add `pause-on-hover` when readers need to stop a moving announcement with a pointer. Set a height on the marquee and a width on each child card so the loop is predictable.

<ComponentPreview>

```html
<ore-marquee direction="right" duration="18" pause-on-hover style="height:120px">
  <div style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-100);width:200px">
    Live: Design systems conference
  </div>
  <div style="display:flex;align-items:center;justify-content:center;background:var(--color-contrast-200);width:200px">
    Next session starts in 10 minutes
  </div>
</ore-marquee>
```

</ComponentPreview>

## API Reference

### Attributes / Properties

| Name             | Type                | Default    | Description                            |
| ---------------- | ------------------- | ---------- | -------------------------------------- |
| `color`          | `ThemeColor`        | —          | Theme color for navigation controls    |
| `duration`       | `number`            | `20`       | Seconds for one complete ticker cycle  |
| `direction`      | `'left' \| 'right'` | `'left'`   | Horizontal scroll direction            |
| `pause-on-hover` | `boolean`           | `false`    | Pauses the animation while hovered     |
| `show-controls`  | `boolean`           | `true`     | Shows previous and next controls       |

### CSS Custom Properties

| Property        | Default         | Description              |
| --------------- | --------------- | ------------------------ |
| `--marquee-gap` | `var(--size-4)` | Gap between ticker items |

### CSS Parts

| Part    | Description               |
| ------- | ------------------------- |
| `track` | The animated ticker track |

## Accessibility

The animation stops automatically for `prefers-reduced-motion: reduce`. Add `pause-on-hover` whenever pointer users may need to read the content. Because a ticker repeats continuously, do not use it for essential instructions, time-sensitive actions, or content that needs keyboard interaction.
