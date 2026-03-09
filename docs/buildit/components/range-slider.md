---
title: Range Slider
---

# Range Slider

## Guideline Recipe: Onboard with a Price Range Filter

**Guideline: onboard** — a range slider gives users an intuitive way to express a two-sided constraint (like a price range) without typing two separate numbers.

```html
<div style="display:flex;flex-direction:column;gap:var(--size-2)">
  <div style="display:flex;justify-content:space-between">
    <bit-text variant="label">Price range</bit-text>
    <bit-text variant="label" id="range-display" weight="semibold">$50 – $500</bit-text>
  </div>
  <bit-range-slider
    id="price-range"
    min="0"
    max="1000"
    step="10"
    value-start="50"
    value-end="500"
    color="primary"
    aria-label="Price range"></bit-range-slider>
  <div style="display:flex;justify-content:space-between">
    <bit-text variant="caption" color="subtle">$0</bit-text>
    <bit-text variant="caption" color="subtle">$1,000</bit-text>
  </div>
</div>

<script>
  const rs = document.getElementById('price-range');
  const display = document.getElementById('range-display');
  rs.addEventListener('input', (e) => {
    const { valueStart, valueEnd } = e.target;
    display.textContent = `$${valueStart} \u2013 $${valueEnd}`;
  });
</script>
```

**Tip:** Always show the live selected range in text above or beside the slider so users know their exact bounds without counting tick marks.

The Range Slider documentation has been merged into the [Slider](./slider) page.

## Accessibility

Range slider functionality is built into `bit-slider`. Refer to the [Slider accessibility section](./slider#accessibility) for full keyboard navigation and screen reader details.

### `bit-range-slider`

✅ **Keyboard Navigation**

- Each thumb follows the same keyboard behaviour as `bit-slider`: arrow keys step the value; `Home` / `End` jump to min / max.
- `Tab` moves focus between the start and end thumbs independently.

✅ **Screen Readers**

- Each thumb has its own `role="slider"` with `aria-valuenow`, `aria-valuemin`, and `aria-valuemax`.
- Use `from-value-text` and `to-value-text` to provide human-readable labels for each bound.
