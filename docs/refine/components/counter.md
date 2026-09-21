# Counter

A large-target tally control for counting things at a glance: `−` / value / `+` with an optional icon, label and hint. Built for touch and arm's-length use — tabletop trackers, inventories, scoreboards — rather than typed form entry. Holding either button auto-repeats; the value is announced through a live region and is keyboard-operable as a spinbutton.

Use [Number Input](./number-input) when the user should type a number inside a form.

## Basic Usage

```html
<ore-counter label="Stamina" value="3"></ore-counter>
```

Listen for changes:

```html
<ore-counter id="stamina" label="Stamina" value="3"></ore-counter>

<script type="module">
  document.getElementById('stamina').addEventListener('change', (e) => {
    console.log('Stamina:', e.detail.value, 'changed by', e.detail.delta);
  });
</script>
```

## Icon and Hint

Slot an icon or token artwork before the label and add a one-line `hint` under the controls to explain when the value changes.

<ComponentPreview center>

```html
<ore-counter label="Defense" value="1" hint="Discard after the attrition check">
  <ore-icon slot="icon" name="shield"></ore-icon>
</ore-counter>
<ore-counter label="Strain" value="2" hint="Fewer cards on refill" color="warning">
  <ore-icon slot="icon" name="weight"></ore-icon>
</ore-counter>
```

</ComponentPreview>

## Min, Max and Step

The value is clamped to `min` (default `0`) and `max`; the matching button disables at each bound.

<ComponentPreview center>

```html
<ore-counter label="Rounds" value="1" min="1" max="12"></ore-counter>
<ore-counter label="Score" value="50" step="5" large-step="25" max="100"></ore-counter>
```

</ComponentPreview>

## Quick Steps

Set `quick-steps` to add an outer −/+ pair that moves by `large-step`. Use it for values that change in chunks — damage, scores, currency — so players are not tapping a single-step button repeatedly. Holding a quick-step button auto-repeats like the primary pair.

<ComponentPreview center>

```html
<ore-counter label="Damage" value="12" large-step="5" quick-steps></ore-counter>
<ore-counter label="Gold" value="120" step="10" large-step="50" max="999" quick-steps color="warning"></ore-counter>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-counter label="Small" value="1" size="sm"></ore-counter>
<ore-counter label="Medium" value="2" size="md"></ore-counter>
<ore-counter label="Large" value="3" size="lg"></ore-counter>
```

</ComponentPreview>

## Colors

The theme color tints the value and the slotted icon.

<ComponentPreview center>

```html
<ore-counter label="Primary" value="4" color="primary"></ore-counter>
<ore-counter label="Success" value="4" color="success"></ore-counter>
<ore-counter label="Error" value="4" color="error"></ore-counter>
```

</ComponentPreview>

## Readonly and Disabled

`readonly` hides the buttons and shows the value only; `disabled` keeps the buttons visible but inert.

<ComponentPreview center>

```html
<ore-counter label="Readonly" value="7" readonly></ore-counter>
<ore-counter label="Disabled" value="7" disabled></ore-counter>
```

</ComponentPreview>

## Hero Value

Override `--counter-value-size` and `--counter-button-size` to turn a counter into a display-sized hero stat.

<ComponentPreview center>

```html
<ore-counter
  label="Damage"
  value="7"
  size="lg"
  color="error"
  style="--counter-value-size: 4rem; --counter-button-size: 3.5rem; min-width: 16rem">
  <ore-icon slot="icon" name="heart-crack"></ore-icon>
</ore-counter>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute    | Type                                                                      | Default | Description                                            |
| ------------ | ------------------------------------------------------------------------- | ------- | ------------------------------------------------------ |
| `value`      | `number`                                                                  | `0`     | Current value                                          |
| `min`        | `number`                                                                  | `0`     | Minimum value                                          |
| `max`        | `number`                                                                  | —       | Maximum value                                          |
| `step`       | `number`                                                                  | `1`     | Increment/decrement step                               |
| `large-step` | `number`                                                                  | `10 × step` | Step for `Page Up` / `Page Down` and the quick-step buttons |
| `quick-steps` | `boolean`                                                                | `false` | Adds an outer −/+ pair that moves by `large-step`      |
| `label`      | `string`                                                                  | —       | Visible label and accessible name                      |
| `hint`       | `string`                                                                  | —       | One-line hint under the controls                       |
| `readonly`   | `boolean`                                                                 | `false` | Hides the buttons and shows the value only             |
| `disabled`   | `boolean`                                                                 | `false` | Disables the control                                   |
| `color`      | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —       | Theme color for the value and slotted icon             |
| `size`       | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`  | Component size                                         |

### Events

| Event    | Detail                             | Description                                                  |
| -------- | ---------------------------------- | ------------------------------------------------------------ |
| `change` | `{ value: number; delta: number }` | Fired after every accepted change (click, hold, or keyboard) |

### Slots

| Slot   | Description                                              |
| ------ | -------------------------------------------------------- |
| `icon` | Leading icon or token artwork shown before the label     |
| `hint` | Custom hint content (replaces the `hint` attribute text) |

### Parts

| Part            | Description            |
| --------------- | ---------------------- |
| `counter`       | Root container         |
| `header`        | Icon and label row     |
| `label`         | Label element          |
| `controls`      | Buttons and value row  |
| `decrement-large-btn` | Quick-step decrement button (`quick-steps` only) |
| `decrement-btn` | Decrement button       |
| `value`         | Value output           |
| `increment-btn` | Increment button       |
| `increment-large-btn` | Quick-step increment button (`quick-steps` only) |
| `hint`          | Hint element           |

### CSS Custom Properties

| Property                 | Default                       | Description                        |
| ------------------------ | ----------------------------- | ---------------------------------- |
| `--counter-value-size`   | `var(--text-2xl)` (sized)     | Font size of the value             |
| `--counter-button-size`  | `var(--size-11)` (sized)      | Width and height of the −/+ buttons |
| `--counter-gap`          | `var(--size-3)`               | Gap between the buttons and value  |
| `--counter-bg`           | `var(--color-contrast-100)`   | Background of the control          |
| `--counter-border-color` | `var(--color-divider)`        | Border color of the control        |
| `--counter-radius`       | `var(--rounded-lg)`           | Border radius of the control       |
| `--counter-icon-size`    | `var(--size-6)` (sized)       | Size of the slotted icon           |

## Accessibility

The root is a `role="group"` labelled by the visible label. The value is an `<output role="spinbutton">` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-readonly` and `aria-live="polite"`, so every change is announced without moving focus. The `hint` is linked through `aria-describedby`. The −/+ buttons are named `Decrease <label>` / `Increase <label>` (quick-step buttons add `by <large-step>`) and are removed from the tab order — keyboard users operate the spinbutton directly: `↑` / `↓` step, `Page Up` / `Page Down` step by `large-step`, `Home` / `End` jump to `min` / `max`.

Buttons meet the 44 px touch target on coarse pointers and are separated by at least `--size-3` so a thumb cannot hit both. Press-and-hold auto-repeat starts after 400 ms and stops at either bound. The value bump animation is suppressed under `prefers-reduced-motion: reduce`.

## Related Components

- [Number Input](./number-input) — typed numeric form field with spin buttons
- [Stats](./stats) — read-only metric display
