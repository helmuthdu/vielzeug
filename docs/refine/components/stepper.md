# Stepper

Displays progress through a sequence of logical, numbered steps. Renders a semantic `<nav>` with an ordered list of `ore-step` children, and can act as a pure progress indicator or as a clickable navigation control.

## Usage

<ComponentPreview>

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

</ComponentPreview>

By default, the stepper is display-only: steps before the current `value` are marked completed, the matching step is marked current, and nothing is clickable. Set `clickable` to let users navigate between steps, and listen for `change`:

<ComponentPreview>

```html
<ore-stepper id="wizard" value="cart" clickable>
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>

<script type="module">
  import '@vielzeug/refine/stepper';
  import '@vielzeug/refine/step';

  document.getElementById('wizard').addEventListener('change', (e) => {
    console.log('Now on step:', e.detail.value);
  });
</script>
```

</ComponentPreview>

## Linear Navigation

Add `linear` alongside `clickable` to restrict navigation to reached steps. Returning to an earlier step does not make later reached steps inaccessible. Advance the stepper by setting `value` after the application validates the current step; the component does not validate or advance a workflow itself.

The current step and the steps preceding it become reached when a selection is made. Reordering or removing steps does not make an unreached step navigable; a newly inserted step becomes reached when it precedes a later selection. Removing a step discards its reached state.

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

Use `description` for supporting text, `optional` to flag a skippable step, and `icon` to replace the number/check indicator. Use the `optional` slot to localize the hint, and supply status text when the visual indicator conveys information that is otherwise unavailable.

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
    <span slot="optional">Optional</span>
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
  <ore-step value="shipping" error>Shipping <span slot="status">Address needs attention</span></ore-step>
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

`orientation="horizontal"` (the default) suits wide desktop layouts. Switch to `orientation="vertical"` for narrow viewports, sidebars, or mobile wizard flows: the connector line moves below each indicator instead of between them.

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

## Step Counter

A visible counter can be composed alongside the stepper; drive it from the same state that sets `value`.

<ComponentPreview vertical>

```html
<ore-text id="stepper-counter" size="sm" style="color: var(--color-contrast-500)">Step 2 of 3</ore-text>
<ore-stepper id="stepper-counter-example" value="shipping" clickable color="primary" style="width:100%">
  <ore-step value="cart">Cart</ore-step>
  <ore-step value="shipping">Shipping</ore-step>
  <ore-step value="payment">Payment</ore-step>
</ore-stepper>
<script>
  const counterStepper = document.getElementById('stepper-counter-example');
  const counter = document.getElementById('stepper-counter');
  const values = [...counterStepper.querySelectorAll('ore-step')].map((step) => step.getAttribute('value'));

  counterStepper.addEventListener('change', (e) => {
    counter.textContent = `Step ${values.indexOf(e.detail.value) + 1} of ${values.length}`;
  });
</script>
```

</ComponentPreview>

## API Reference

**`ore-stepper`** Attributes

| Attribute     | Type                                                                      | Default        | Description                                                                       |
| ------------- | ------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| `value`       | `string`                                                                  | N/A            | The `value` of the currently active step                                          |
| `clickable`   | `boolean`                                                                 | `false`        | Allow clicking/focusing steps to navigate. Off by default (pure progress display) |
| `linear`      | `boolean`                                                                 | `false`        | Restrict navigation to reached steps                                              |
| `disabled`    | `boolean`                                                                 | `false`        | Disables the whole stepper: no step is navigable regardless of `clickable`        |
| `orientation` | `'horizontal' \| 'vertical'`                                              | `'horizontal'` | Layout direction: vertical suits mobile/narrow layouts                            |
| `color`       | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | N/A            | Theme color for the current/completed step indicators                             |
| `size`        | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`         | Component size                                                                    |
| `label`       | `string`                                                                  | `'Progress'`   | `aria-label` for the nav landmark                                                 |

**`ore-stepper`** Slots

| Slot      | Description         |
| --------- | ------------------- |
| (default) | `ore-step` elements |

**`ore-stepper`** Events

| Event    | Detail              | Description                                           |
| -------- | ------------------- | ----------------------------------------------------- |
| `change` | `{ value: string }` | Fired when the active step changes via click/keyboard |

**`ore-stepper`** CSS Custom Properties

| Property                    | Description                               |
| --------------------------- | ----------------------------------------- |
| `--stepper-gap`             | Gap between steps                         |
| `--stepper-connector-size`  | Thickness of the connector line           |
| `--stepper-connector-color` | Color of the connector line between steps |

**`ore-step`** Attributes

| Attribute  | Type      | Default | Description                                                                        |
| ---------- | --------- | ------- | ---------------------------------------------------------------------------------- |
| `value`    | `string`  | N/A     | Non-empty, unique identifier, matching the parent's `value` (required) |
| `disabled` | `boolean` | `false` | Removes this step from navigation entirely                                         |
| `error`    | `boolean` | `false` | Marks the step as failed/invalid                                                   |
| `optional` | `boolean` | `false` | Renders an "(optional)" hint next to the label                                     |

`current`, `completed`, `navigable`, `index`, and `total` are read-only: derived from this step's position relative to the parent `ore-stepper`'s `value`, `clickable`, and `linear`, and reflected onto this element for CSS/inspection only. `color`, `size`, and `orientation` are also inherited from the parent when nested inside one (overriding any value set directly), but remain independently settable for a standalone `ore-step`.

**`ore-step`** Slots

| Slot          | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| (default)     | Step label                                                       |
| `description` | Optional supporting text shown below the label                   |
| `icon`        | Custom icon replacing the automatic number/check/error indicator |
| `optional`    | Localized hint shown when `optional` is set                      |
| `status`      | Caller-supplied status text                                      |

**`ore-step`** CSS Custom Properties

| Property                | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `--step-indicator-size` | Indicator circle diameter (size tiers set 24/32/40 px for sm/md/lg) |
| `--step-font-size`      | Step label font size                                                |
| `--step-gap`            | Gap between the indicator and the label content                     |

Set them on `ore-step` (inline style or a document selector); outer declarations win over the component's own defaults.

## Accessibility

The stepper renders a `<nav>` landmark (labeled via `label`, default `"Progress"`) containing an `<ol>` of `ore-step` items, conveying sequence to screen readers. The step matching the current `value` receives `aria-current="step"`.

When `clickable` is set, navigable steps render as native buttons. Tab moves between them without changing the selection; Enter or Space selects the focused step. Disabled steps and steps beyond the linear boundary are not clickable or tabbable. When `clickable` is not set, steps render as static content.

The ordered list conveys the sequence. Supply localized text in the `status` slot for completion or error information when it matters; do not rely on indicator color or icons alone. Use the `optional` slot to replace the default English hint.

Each direct child step needs a unique, non-empty `value`. Invalid values disable navigation and produce a development warning. When the current step is removed, the first enabled step becomes current; if no steps remain, the value is cleared.
