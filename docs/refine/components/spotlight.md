# Spotlight

A dim layer with a hole punched in it: one region of the page stays at full brightness while everything else recedes. Pair it with [Tour](./tour) (via its `spotlight` prop) or drive it directly with any rectangle you already have.

## Basic Usage

<ComponentPreview center height="300px">

```html
<div style="padding:2rem;">
  <ore-button id="target" color="primary">Click me to toggle the dim</ore-button>
</div>
<ore-spotlight id="spot"></ore-spotlight>

<script type="module">
  import '@vielzeug/refine/button';
  import '@vielzeug/refine/spotlight';

  const spot = document.getElementById('spot');
  const target = document.getElementById('target');

  // The dim never captures pointer events, so the button inside the cutout
  // stays clickable: clicking it toggles the spotlight.
  spot.rect = target.getBoundingClientRect();
  target.addEventListener('click', () => {
    spot.visible = !spot.visible;
  });
</script>
```

</ComponentPreview>

## How It Works

The dim is a single oversized `box-shadow` on the cutout element, so the hole animates with the element's own geometry: when a tour moves to the next step, the highlight slides to the new target instead of blinking out and back.

The layer never captures pointer events: a beacon shows the way, it does not block the road. The element inside the cutout stays clickable. The overlay is decorative by definition and carries `aria-hidden`; whatever dialog or popover owns the moment handles interaction and announcement.

Omit `rect` (or pass a zero-size one) to dim the whole page without a cutout.

## API Reference

### Attributes

| Attribute | Type    | Default | Description                                        |
| --------- | ------- | ------- | -------------------------------------------------- |
| `radius`  | `number` | `8`     | Cutout corner radius in px                         |
| `visible` | `boolean` | `true`  | Show the dim layer                                 |

The `rect` prop is JS-only (no attribute): assign a `DOMRect` or a plain `{ x, y, width, height }` in viewport pixels.

```ts
spotlight.rect = element.getBoundingClientRect();
spotlight.rect = null; // dim the whole page
```

### CSS Custom Properties

| Property             | Description                                     |
| -------------------- | ----------------------------------------------- |
| `--spotlight-dim`    | Dim color (default `--color-scrim`) |
| `--spotlight-ring`   | Ring drawn around the cutout (default: `none`)  |
| `--spotlight-radius` | Cutout corner radius                            |
| `--spotlight-transition` | Geometry transition (default: `var(--duration-250) var(--ease-spring)`) |

### Parts

| Part      | Description                  |
| --------- | ---------------------------- |
| `overlay` | The fixed dim layer          |
| `cutout`  | The highlighted rectangle    |

## Accessibility

The overlay is purely decorative and always `aria-hidden`. It never intercepts pointer events, so page content outside the cutout stays interactive: use a dialog or popover presentation when you want to block interaction.

## Related Components

- [Tour](./tour): product-tour step card with a built-in spotlight option
- [Dialog](./dialog): modal presentation with focus trap and background lock
