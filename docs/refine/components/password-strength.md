# Password Strength

A segmented password strength meter that provides real-time feedback during account creation and password updates.

For entropy-aware scoring with advanced dictionaries and pattern detection, compute a score externally (e.g. with [zxcvbn](https://github.com/dropbox/zxcvbn)) and pass it through the `score` attribute.

## Common Registration Flow

Bind the meter to a password input by forwarding the `input` event's value.

<ComponentPreview vertical>

```html
<ore-input id="password" type="password" label="Password"></ore-input>
<ore-password-strength id="meter"></ore-password-strength>

<script type="module">
  document.getElementById('password').addEventListener('input', (e) => {
    document.getElementById('meter').setAttribute('value', e.detail?.value ?? '');
  });
</script>
```

</ComponentPreview>

## External Scoring

Pass a normalized score from your own scoring engine. Set `score` to `0`–`4`; the built-in heuristic is bypassed.

<ComponentPreview vertical>

```html
<ore-password-strength score="3" label="Account password strength"></ore-password-strength>
```

</ComponentPreview>

## Custom Level Labels

Override the default level strings (`Weak`, `Fair`, `Good`, `Strong`) by providing all five labels in order: empty, weak, fair, good, strong.

<ComponentPreview vertical>

```html
<ore-password-strength value="Hello1!" :labels='["", "Too weak", "Almost", "Good enough", "Excellent"]'>
</ore-password-strength>
```

</ComponentPreview>

## Bar Only (No Visible Label)

Set `show-label="false"` to render only the visual segments while preserving the full meter semantics for screen readers.

<ComponentPreview vertical>

```html
<ore-password-strength value="Abcdef12!" show-label="false"></ore-password-strength>
```

</ComponentPreview>

## How the Built-in Scorer Works

The component uses a conservative heuristic based on length and character variety. The rules, from weakest to strongest:

| Score | Level  | Condition                                      |
| ----- | ------ | ---------------------------------------------- |
| `0`   | empty  | No value                                       |
| `1`   | weak   | Length < 6                                     |
| `2`   | fair   | Length ≥ 8 with mixed case                     |
| `3`   | good   | Length ≥ 8 with mixed case + digit or symbol   |
| `4`   | strong | Length ≥ 12 with mixed case, digit, and symbol |

For production use, prefer an external scorer like zxcvbn and pass the result via `score`.

## API Reference

### Attributes

| Attribute    | Type       | Default              | Description                                                    |
| ------------ | ---------- | -------------------- | -------------------------------------------------------------- |
| `value`      | `string`   | —                    | Password string to evaluate with the built-in heuristic        |
| `score`      | `number`   | `-1`                 | External score override `0..4`; `-1` means use built-in scorer |
| `show-label` | `boolean`  | `true`               | Show visible textual level feedback below the bar              |
| `label`      | `string`   | `Password strength`  | Accessible name (`aria-label`) on the meter element            |
| `labels`     | `string[]` | Built-in level names | All five level labels: `[empty, weak, fair, good, strong]`     |

### Parts

| Part   | Description                 |
| ------ | --------------------------- |
| (none) | No shadow parts are exposed |

### CSS Custom Properties

| Property                           | Default                     | Description                       |
| ---------------------------------- | --------------------------- | --------------------------------- |
| `--password-strength-height`       | `0.375rem`                  | Segment bar height                |
| `--password-strength-gap`          | `var(--space-1)`            | Gap between segments              |
| `--password-strength-radius`       | `var(--rounded-full)`       | Segment corner radius             |
| `--password-strength-track-bg`     | `var(--color-contrast-300)` | Inactive segment background color |
| `--password-strength-track-border` | `var(--color-contrast-400)` | Inactive segment border color     |
| `--password-strength-label-size`   | `var(--text-sm)`            | Visible label font size           |
| `--password-strength-label-color`  | `currentColor`              | Visible label color               |
| `--password-strength-weak-color`   | `var(--color-warning-500)`  | Active color for weak score       |
| `--password-strength-fair-color`   | `var(--color-warning-600)`  | Active color for fair score       |
| `--password-strength-good-color`   | `var(--color-success-500)`  | Active color for good score       |
| `--password-strength-strong-color` | `var(--color-success-600)`  | Active color for strong score     |

## Accessibility

The component uses `role="meter"` with `aria-valuemin="0"`, `aria-valuemax="4"`, and a dynamic `aria-valuenow`. It provides human-readable state through `aria-valuetext` (`Weak`, `Fair`, `Good`, `Strong`). When `score` is `0` (empty), `aria-valuetext` is omitted to avoid announcing "empty".

The visible label uses `aria-live="polite"` and `aria-atomic="true"` to announce level transitions to screen readers. Decorative segments are hidden from the accessibility tree via `aria-hidden="true"`. The shimmer transition respects `prefers-reduced-motion: reduce`.

## Related Components

- [Input](./input.md) — collect password values; forward `input` events to the meter.
- [Progress](./progress.md) — generic determinate and indeterminate process tracking.
- [Form](./form.md) — compose validated authentication flows.
