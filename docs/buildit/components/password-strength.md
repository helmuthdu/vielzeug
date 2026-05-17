# Password Strength

A segmented password strength meter that provides real-time feedback during account creation and password updates.

For entropy-aware scoring with advanced dictionaries and pattern detection, compute score externally (for example with zxcvbn) and pass it through the `score` prop.

## Features

- Real-time strength feedback from password input
- 4-segment progress bar with semantic levels
- Built-in heuristic scoring (length + character variety)
- Optional external score override (`0..4`)
- Accessible meter semantics (`role="meter"`, `aria-valuenow`, `aria-valuetext`)
- Live label updates for assistive technologies
- Themeable through CSS custom properties

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/password-strength/password-strength.ts
:::

## Basic Usage

```html
<bit-password-strength value="Tr0ub4dor&3"></bit-password-strength>

<script type="module">
  import '@vielzeug/buildit/password-strength';
</script>
```

## Common Registration Flow

Bind the password meter to your password input in `input` events.

<ComponentPreview vertical>

```html
<bit-input id="password" type="password" label="Password"></bit-input>
<bit-password-strength id="meter-1"></bit-password-strength>

<script type="module">
  import '@vielzeug/buildit/input';
  import '@vielzeug/buildit/password-strength';

  const input = document.getElementById('password');
  const meter = document.getElementById('meter-1');

  input.addEventListener('input', (event) => {
    const value = event?.detail?.value ?? '';

    if (!meter) return;

    meter.setAttribute('value', value);
  });
</script>
```

</ComponentPreview>

## External Scoring Integration

If your backend or client uses a dedicated scoring engine, pass normalized score directly.

<ComponentPreview vertical>

```html
<bit-password-strength score="3" label="Account password strength"></bit-password-strength>
```

</ComponentPreview>

## Hide Visible Label

Set the property `show-label` to `false` if you only want the visual bar while preserving meter semantics.

<ComponentPreview vertical>

```html
<bit-password-strength id="meter-2" value="Abcdef12!"></bit-password-strength>

<script>
  document.getElementById('meter-2')['show-label'] = false;
</script>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute    | Type      | Default               | Description                                |
| ------------ | --------- | --------------------- | ------------------------------------------ |
| `value`      | `string`  | `''`                  | Password string to evaluate                |
| `score`      | `number`  | computed from `value` | Optional external score override (`0..4`)  |
| `show-label` | `boolean` | `true`                | Show visible textual level feedback        |
| `label`      | `string`  | `Password strength`   | Accessible name for assistive technologies |

### CSS Custom Properties

| Property                           | Default                     | Description                   |
| ---------------------------------- | --------------------------- | ----------------------------- |
| `--password-strength-height`       | `0.375rem`                  | Segment bar height            |
| `--password-strength-gap`          | `0.25rem`                   | Gap between segments          |
| `--password-strength-radius`       | `var(--rounded-full)`       | Segment corner radius         |
| `--password-strength-track-bg`     | `var(--color-contrast-300)` | Inactive segment color        |
| `--password-strength-label-size`   | `var(--text-sm)`            | Visible label font size       |
| `--password-strength-label-color`  | `currentColor`              | Visible label color           |
| `--password-strength-weak-color`   | `var(--color-warning-500)`  | Active color for weak score   |
| `--password-strength-fair-color`   | `var(--color-warning-600)`  | Active color for fair score   |
| `--password-strength-good-color`   | `var(--color-success-500)`  | Active color for good score   |
| `--password-strength-strong-color` | `var(--color-success-600)`  | Active color for strong score |

## Accessibility

- Uses `role="meter"` with `aria-valuemin="0"`, `aria-valuemax="4"` and dynamic `aria-valuenow`.
- Provides human-readable state through `aria-valuetext` (`Weak`, `Fair`, `Good`, `Strong`).
- Uses `aria-live="polite"` on visible label to announce level transitions.
- Decorative segments are hidden from screen readers via `aria-hidden="true"`.

## Related Components

- [Input](./input.md) for collecting password values.
- [Progress](./progress.md) for generic determinate and indeterminate process tracking.
- [Form](./form.md) for composing validated authentication flows.
