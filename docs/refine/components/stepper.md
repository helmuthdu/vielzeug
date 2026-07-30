# Stepper

Displays progress through a sequence of logical, numbered steps. Renders a semantic `<nav>` with an ordered list of `ore-step` children, and can act as a pure progress indicator or as a clickable navigation control.

## Usage

```html
<ore-stepper value="shipping">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>

<script type="module">
  import '@vielzeug/refine/stepper';
  import '@vielzeug/refine/step';
</script>
```

By default the stepper is display-only — steps before the current `value` are marked completed, the matching step is marked current, and nothing is clickable. Set `clickable` to let users navigate between steps, and listen for `change`:

```html
<ore-stepper id="wizard" value="cart" clickable>
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>

<script type="module">
  import '@vielzeug/refine';

  document.getElementById('wizard').addEventListener('change', (e) => {
    console.log('Now on step:', e.detail.value);
  });
</script>
```

## Linear Navigation

Add `linear` alongside `clickable` to restrict navigation to completed steps and the current step — steps ahead of the current one render but cannot be clicked or keyboard-focused until the user reaches them.

<ComponentPreview center>

```html
<ore-stepper value="shipping" clickable linear color="primary">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
  <ore-step value="review">Review</ore-step>
</ore-stepper>
```

</ComponentPreview>

## Descriptions, Optional Steps, and Custom Icons

Use the `description` slot for supporting text, the `optional` attribute to flag a skippable step, and the `icon` slot to replace the number/check indicator with a custom icon.

<ComponentPreview center>

```html
<ore-stepper value="shipping" color="primary">
  <ore-step value="cart">
    Cart
    <span slot="description">3 items</span>
  </ore-step>
  <ore-step value="shipping">
    Shipping
    <span slot="description">Choose a delivery method</span>
  </ore-step>
  <ore-step value="gift" optional>
    Gift wrap
    <span slot="description">Optional add-on</span>
  </ore-step>
  <ore-step value="payment">
    Payment
    <ore-icon slot="icon" name="credit-card" size="14"></ore-icon>
  </ore-step>
</ore-stepper>
```

</ComponentPreview>

## Error and Disabled Steps

Mark a step `error` to flag a problem that needs attention, or `disabled` to remove it from navigation entirely (it's skipped by keyboard navigation and cannot be clicked).

<ComponentPreview center>

```html
<ore-stepper value="payment" clickable color="primary">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping" error>Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
  <ore-step value="review" disabled>Review</ore-step>
</ore-stepper>
```

</ComponentPreview>

## Colors

<ComponentPreview vertical>

```html
<ore-stepper value="shipping" color="primary">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
<ore-stepper value="shipping" color="success">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
<ore-stepper value="shipping" color="warning">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
```

</ComponentPreview>

## Sizes

<ComponentPreview vertical>

```html
<ore-stepper value="shipping" size="sm">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
<ore-stepper value="shipping" size="md">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
<ore-stepper value="shipping" size="lg">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
```

</ComponentPreview>

## Orientation (Desktop & Mobile)

`orientation="horizontal"` (the default) suits wide desktop layouts. Switch to `orientation="vertical"` for narrow viewports, sidebars, or mobile wizard flows — the connector line moves below each indicator instead of between them.

<ComponentPreview center>

```html
<ore-stepper value="shipping" orientation="vertical" color="primary">
  <ore-step value="cart">
    Cart
    <span slot="description">3 items</span>
  </ore-step>
  <ore-step value="shipping">
    Shipping
    <span slot="description">Choose a delivery method</span>
  </ore-step>
  <ore-step value="payment">
    Payment
    <span slot="description">Add a payment method</span>
  </ore-step>
</ore-stepper>
```

</ComponentPreview>

A common pattern is to switch orientation responsively based on viewport width, since `orientation` is a plain attribute rather than a CSS-driven layout:

```js
const stepper = document.querySelector('ore-stepper');
const mobileQuery = matchMedia('(max-width: 640px)');
const applyOrientation = () => stepper.setAttribute('orientation', mobileQuery.matches ? 'vertical' : 'horizontal');

mobileQuery.addEventListener('change', applyOrientation);
applyOrientation();
```

## Feedback After a Step Completes

`ore-stepper` only handles step navigation — for a transient status message after an async action (e.g. "Shipping details saved"), compose it with `ore-alert` or `ore-toast` alongside the stepper rather than looking for a stepper-owned message prop:

```html
<ore-stepper id="wizard" value="shipping" clickable>
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
<ore-alert id="saved-alert" hidden color="success" role="status" aria-live="polite">Shipping details saved</ore-alert>

<script type="module">
  import '@vielzeug/refine';

  async function saveShipping() {
    await api.saveShippingDetails();
    savedAlert.hidden = false;
    setTimeout(() => (savedAlert.hidden = true), 4000);
  }
</script>
```

## API Reference

**`ore-stepper`** Attributes

| Attribute          | Type                                                                      | Default      | Description                                                                             |
| ------------------ | -------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `value`             | `string`                                                                    | —            | The `value` of the currently active step                                                  |
| `clickable`         | `boolean`                                                                   | `false`      | Allow clicking/focusing steps to navigate. Off by default (pure progress display)         |
| `linear`            | `boolean`                                                                   | `false`      | Restrict navigation to completed steps and the current step                               |
| `disabled`          | `boolean`                                                                   | `false`      | Disables the whole stepper — no step is navigable regardless of `clickable`               |
| `orientation`       | `'horizontal' \| 'vertical'`                                               | `'horizontal'` | Layout direction — vertical suits mobile/narrow layouts                                  |
| `color`             | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'`  | —            | Theme color for the current/completed step indicators                                     |
| `size`              | `'sm' \| 'md' \| 'lg'`                                                      | `'md'`       | Component size                                                                             |
| `label`             | `string`                                                                    | `'Progress'` | `aria-label` for the nav landmark                                                          |

**`ore-stepper`** Slots

| Slot      | Description             |
| --------- | ------------------------ |
| (default) | `ore-step` elements      |

**`ore-stepper`** Events

| Event             | Detail            | Description                                             |
| ------------------ | ----------------- | -------------------------------------------------------- |
| `change`           | `{ value: string }` | Fired when the active step changes via click/keyboard   |

**`ore-stepper`** CSS Custom Properties

| Property                    | Description                             |
| ---------------------------- | ---------------------------------------- |
| `--stepper-gap`               | Gap between steps                        |
| `--stepper-connector-size`    | Thickness of the connector line          |
| `--stepper-connector-color`   | Color of the connector line between steps |

**`ore-step`** Attributes

| Attribute   | Type      | Default | Description                                                                    |
| ----------- | --------- | ------- | -------------------------------------------------------------------------------- |
| `value`     | `string`  | —       | Unique identifier, matches the parent `ore-stepper`'s `value` attribute (required) |
| `disabled`  | `boolean` | `false` | Removes this step from navigation entirely                                       |
| `error`     | `boolean` | `false` | Marks the step as failed/invalid                                                  |
| `optional`  | `boolean` | `false` | Renders an "(optional)" hint next to the label                                    |

`current`, `completed`, `navigable`, `index`, and `total` are read-only — derived from this step's position relative to the parent `ore-stepper`'s `value`, `clickable`, and `linear`, and reflected onto this element for CSS/inspection only. `color`, `size`, and `orientation` are also inherited from the parent when nested inside one (overriding any value set directly), but remain independently settable for a standalone `ore-step`.

**`ore-step`** Slots

| Slot          | Description                                                    |
| ------------- | ---------------------------------------------------------------- |
| (default)     | Step label                                                        |
| `description` | Optional supporting text shown below the label                   |
| `icon`        | Custom icon replacing the automatic number/check/error indicator  |

## Accessibility

The stepper renders a `<nav>` landmark (labeled via `label`, default `"Progress"`) containing an `<ol>` of `ore-step` items, conveying sequence to screen readers. The step matching the current `value` receives `aria-current="step"`.

When `clickable` is set, each navigable step renders as a real `<button>` with roving `tabindex` — arrow keys (Left/Right for horizontal, Up/Down for vertical) move focus and immediately activate the target step, `Home`/`End` jump to the first/last navigable step, and `Enter`/`Space` re-activates the focused step. Disabled steps, and — when `linear` is set — steps beyond the current one, are skipped entirely by keyboard navigation and are not clickable. When `clickable` is not set, steps render as static (non-interactive) content for pure progress display.

Each step's accessible name includes its position ("Step 2 of 4") and state ("completed", "current step", or "error") via visually-hidden text, in addition to its visible label and description.
