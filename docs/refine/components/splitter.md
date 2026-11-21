# Splitter

A two-pane layout with a resizable primary pane.

## Basic usage

Import the component once, then place content in the `primary` and `secondary` slots.

```ts
import '@vielzeug/refine/splitter';
```

Give the splitter a height and enable the buttons for a single-pointer alternative to dragging.

<ComponentPreview align="stretch" justify="start" vertical>

```html
<ore-splitter label="Files" value="35" min="20" max="80" show-buttons style="height: 16rem">
  <nav slot="primary" aria-label="Files">Files</nav>
  <div slot="secondary">Editor</div>
</ore-splitter>
```

</ComponentPreview>

The primary pane occupies `value` percent of the space remaining after the divider. The secondary pane occupies the rest. The value is clamped to `min` and `max`; changing these bounds can also clamp the current value.

## Vertical panes

Set `orientation="vertical"` to stack the primary pane above the secondary pane. Give the splitter a definite height so the panes have space to resize.

<ComponentPreview align="stretch" justify="start" vertical>

```html
<ore-splitter label="Editor" orientation="vertical" value="60" show-buttons style="height: 16rem">
  <div slot="primary">Editor</div>
  <div slot="secondary">Output</div>
</ore-splitter>
```

</ComponentPreview>

## Resizing and events

Drag the separator or focus it and use the arrow keys. Horizontal arrows move the separator in their physical direction, including in right-to-left layouts. For vertical panes, Up decreases and Down increases the primary pane. Home and End move to the minimum and maximum. Arrow keys and the optional buttons change the value by `step`; dragging is not restricted to step increments.

Buttons are hidden by default. Add `show-buttons` to expose decrease and increase buttons, which are disabled at their respective bounds. Enable them when a single-pointer alternative to dragging is needed, including for WCAG 2.2's Dragging Movements criterion.

Listen for `input` during user changes and `change` when a changed interaction completes. Both events carry the percentage in `detail.value`.

```js
const splitter = document.querySelector('ore-splitter');

splitter.addEventListener('change', (event) => {
  console.log('Primary pane:', event.detail.value);
});
```

Button and keyboard changes emit `input` and then `change`; a drag can emit multiple `input` events and emits `change` on completion if the final value differs from the starting value. Programmatic attribute changes do not emit these events.

## API reference

### Attributes

| Attribute        | Type                         | Default                      | Description                                        |
| ---------------- | ---------------------------- | ---------------------------- | -------------------------------------------------- |
| `label`          | `string`                     | `Primary pane`               | Accessible name for the primary pane and separator |
| `value`          | `number`                     | `50`                         | Primary pane percentage, clamped to the bounds     |
| `min`            | `number`                     | `10`                         | Minimum primary pane percentage                    |
| `max`            | `number`                     | `90`                         | Maximum primary pane percentage                    |
| `step`           | `number`                     | `5`                          | Percentage increment for buttons and arrow keys    |
| `orientation`    | `'horizontal' \| 'vertical'` | `'horizontal'`               | Side-by-side or stacked panes                      |
| `show-buttons`   | `boolean`                    | `false`                      | Show the non-drag resize buttons                   |
| `disabled`       | `boolean`                    | `false`                      | Disable user resizing                              |
| `decrease-label` | `string`                     | `Decrease primary pane size` | Accessible name of the decrease button             |
| `increase-label` | `string`                     | `Increase primary pane size` | Accessible name of the increase button             |

All numeric values must be finite, `0 <= min <= max <= 100`, and `step` must be positive. An invalid configuration disables resizing and logs a development warning; the layout uses 50% until the configuration is valid.

### Slots

| Slot        | Description                 |
| ----------- | --------------------------- |
| `primary`   | Content of the resized pane |
| `secondary` | Content of the other pane   |

### Events

| Event    | Detail              | Description                                                  |
| -------- | ------------------- | ------------------------------------------------------------ |
| `input`  | `{ value: number }` | The primary pane percentage changed through user interaction |
| `change` | `{ value: number }` | A changed user interaction completed                         |

### CSS parts

| Part        | Description                    |
| ----------- | ------------------------------ |
| `primary`   | Primary pane wrapper           |
| `secondary` | Secondary pane wrapper         |
| `separator` | Focusable, draggable separator |
| `decrease`  | Decrease button                |
| `increase`  | Increase button                |

### CSS custom properties

| Property                  | Default                                                | Description                                                     |
| ------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- |
| `--splitter-divider-size` | `var(--size-6)`; `var(--size-11)` for a coarse pointer | Divider width for horizontal panes or height for vertical panes |

Keep a custom divider at least 24px thick, or 44px for touch, so its controls remain usable.

## Accessibility

Set `label` to name the primary pane and the focusable separator. The separator exposes its current value and bounds to assistive technology. Localize `decrease-label` and `increase-label` when the buttons are shown. Keyboard resizing remains available without the buttons, but it does not replace a single-pointer alternative for users who cannot drag.
