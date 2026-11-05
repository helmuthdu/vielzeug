---
title: 'Pull to Refresh: Refine'
description: A spring-driven pull-to-refresh scroll container for touch and pointer input.
---

# Pull to Refresh

A pull-to-refresh scroll container. Drag the content down — once it is scrolled to the top — past the threshold and release to trigger a refresh. A spring-physics indicator tracks the finger, rubber-bands past the threshold, carries the release momentum, and holds at the refresh position until you signal that the load finished.

The component owns the gesture and the motion; you own the data. Listen for `refresh`, load, then call `refreshed()` on the element when the load resolves.

## Basic Usage

Wrap scrollable content, listen for `refresh`, and call `refreshed()` when the work is done.

<ComponentPreview center>

```html
<ore-pull-to-refresh id="feed" style="height: 20rem; border: var(--border) solid var(--color-divider);">
  <ul style="margin: 0; padding: var(--size-4); display: flex; flex-direction: column; gap: var(--size-2);">
    <li>Pull me down from the top.</li>
    <li>Release past the spinner to refresh.</li>
    <li>The indicator holds until you call refreshed().</li>
  </ul>
</ore-pull-to-refresh>

<script type="module">
  import '@vielzeug/refine/pull-to-refresh';

  const feed = document.getElementById('feed');

  feed.addEventListener('refresh', async () => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    feed.refreshed();
  });
</script>
```

</ComponentPreview>

## Threshold

`threshold` is the pull distance in pixels past which a release commits the refresh. A larger value needs a longer, more deliberate drag.

<ComponentPreview center>

```html
<ore-pull-to-refresh threshold="120" style="height: 14rem; border: var(--border) solid var(--color-divider);">
  <p style="padding: var(--size-4);">Needs a 120px pull before releasing commits.</p>
</ore-pull-to-refresh>
```

</ComponentPreview>

## Disabled

Set `disabled` to turn off the pull gesture while keeping the content scrollable.

<ComponentPreview center>

```html
<ore-pull-to-refresh disabled style="height: 14rem; border: var(--border) solid var(--color-divider);">
  <p style="padding: var(--size-4);">This list scrolls but never refreshes.</p>
</ore-pull-to-refresh>
```

</ComponentPreview>

## Phases

The current phase is reflected on the host as `data-phase`, so you can restyle per stage or drive a status line.

| `data-phase`   | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| _(absent)_     | At rest, nothing pending                                      |
| `pulling`      | An active drag, not yet past the threshold                    |
| `ready`        | An active drag past the threshold: releasing starts the refresh |
| `refreshing`   | A refresh is in flight; the indicator holds at the threshold  |
| `done`         | The refresh ended; the indicator springs back to rest         |

## API Reference

### Attributes

| Attribute   | Type      | Default | Description                                              |
| ----------- | --------- | ------- | -------------------------------------------------------- |
| `threshold` | `number`  | `64`    | Pull distance in px before a release commits the refresh |
| `disabled`  | `boolean` | `false` | Disables the pull gesture                                |

### Properties and Methods

| Member       | Kind     | Description                                                        |
| ------------ | -------- | ------------------------------------------------------------------ |
| `refreshed()` | method  | End the in-flight refresh and retract the indicator                |

### Events

| Event     | Detail | Description                                                        |
| --------- | ------ | ------------------------------------------------------------------ |
| `refresh` | N/A | Fired when a pull commits. Call `refreshed()` when the load finishes |

### Parts

| Part        | Description                              |
| ----------- | ---------------------------------------- |
| `indicator` | The indicator region holding the spinner |
| `spinner`   | The spinner element                      |
| `content`   | The dragged content wrapper              |

### CSS Custom Properties

| Property                        | Default            | Description                 |
| ------------------------------- | ------------------ | --------------------------- |
| `--pull-to-refresh-spinner-size`  | `var(--size-6)`    | Spinner diameter            |
| `--pull-to-refresh-spinner-color` | `var(--color-primary)` | Spinner color           |

## Behavior Notes

- A pull only begins when the content is already scrolled to the top (`scrollTop <= 0`). Mid-scroll drags belong to the scroller, so nested scrolling stays intact.
- The gesture is pointer-based with `overscroll-behavior-y: contain`, so the browser's own overscroll glow does not compete with the custom pull.
- The indicator springs back on a spring seeded with the release velocity, so a flick retracts with momentum and a slow release settles without overshoot. The motion honors Motion Mode.

## Accessibility

The spinner is a persistent `role="status"` region, announced politely when a refresh begins. The gesture itself is a pointer interaction; there is no keyboard affordance to pull, which matches native pull-to-refresh. Provide a separate refresh control (a button that runs the same load) for keyboard and assistive-technology users.

## Related Components

- [State](./state): full loading/empty/error lifecycle for the refreshed content
- [Skeleton](./skeleton): placeholder content while a refresh loads
