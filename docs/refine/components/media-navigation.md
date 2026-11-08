# Media Navigation

Controlled arrows and indicators for media browsing. `ore-carousel` and `ore-card-picker` use this component internally. It requests navigation; the consuming component owns the current item and any autoplay timer.

## Basic Usage

Import `@vielzeug/refine/media-navigation`. Update `active-index` in response to `navigate`:

<ComponentPreview>

```html
<ore-media-navigation id="media-navigation" count="3" active-index="0"
  label="Browse card scans" labels='["Front scan","Back scan","Equipment scan"]'>
</ore-media-navigation>

<script>
  const navigation = document.getElementById('media-navigation');
  navigation.addEventListener('navigate', (event) => {
    navigation.setAttribute('active-index', String(event.detail.index));
  });
</script>
```

</ComponentPreview>

Without an owner updating `active-index`, the component keeps displaying the supplied index. This avoids a second source of browsing state when used inside another component. A zero item count hides navigation.

## Layout and Controls

`orientation="horizontal"` places indicators and arrows in a row. `orientation="vertical"` arranges them in a column and uses Up/Down Arrow for indicator navigation. Horizontal navigation follows the element's text direction.

`show-controls="false"` hides arrows. `show-indicators="false"` hides indicators. Disabling both hides the whole navigation surface. `loop` permits requests to wrap from either end; otherwise the corresponding boundary arrow is disabled.

The component supplies the visual bar, not its page position. Place it below media or position its host over a dedicated navigation area. The carousel and picker retain their own placement rules.

## Large Collections

The bar shows at most seven indicators by default, even when `count` is much larger. Its window follows the active item and stays within the collection boundaries. Smaller edge dots hint that more items exist outside the window.

Set `max-indicators` to a smaller positive number for a narrow layout. The limit changes only the visible indicators: arrows, Home/End, directional keys, and looping still navigate the complete collection. Keyboard focus follows the requested item when the owner updates `active-index`.

Navigation animates as a directional progress hand-off. Forward: the new slot widens and fills while the previous indicator's fill drains and its pill collapses. Backward the staging mirrors so no motion ever points against the travel direction: the previous fill drains, its pill collapses leftward, and only then does the new slot widen and fill. Indicators also animate in briefly when they appear and edge dots ease their size, so a sliding window stays visible while the active position stays centered. The motion follows the shared reduced-motion settings.

<ComponentPreview>

```html
<ore-media-navigation id="large-deck-navigation" count="50" active-index="8" max-indicators="7" label="Browse deck"></ore-media-navigation>
<script>
  const navigation = document.getElementById('large-deck-navigation');
  navigation.addEventListener('navigate', (event) => {
    navigation.setAttribute('active-index', String(event.detail.index));
  });
</script>
```

</ComponentPreview>

## Progress Rendering

Set `progress-duration` to a duration in milliseconds to animate the active indicator's fill. It is visual feedback only: finishing the animation never advances the index or emits `navigate`. The owner must handle timing and update `active-index` itself. `ore-carousel` passes its autoplay interval here.

## API Reference

### Attributes

| Attribute           | Type                         | Default            | Purpose                                                                |
| ------------------- | ---------------------------- | ------------------ | ---------------------------------------------------------------------- |
| `count`             | `number`                     | `0`                | Number of browsable items                                              |
| `active-index`      | `number`                     | `0`                | Owner-controlled current index                                         |
| `orientation`       | `'horizontal' \| 'vertical'` | `horizontal`       | Control layout and keyboard axis                                       |
| `loop`              | `boolean`                    | `false`            | Wrap requests at the ends                                              |
| `disabled`          | `boolean`                    | `false`            | Block navigation requests                                              |
| `show-controls`     | `boolean`                    | `true`             | Show arrows                                                            |
| `show-indicators`   | `boolean`                    | `true`             | Show indicators                                                        |
| `max-indicators`    | `number`                     | `7`                | Maximum visible indicators; positive values round down to at least one |
| `label`             | `string`                     | `Media navigation` | Accessible group name                                                  |
| `indicator-label`   | `string`                     | `Media indicators` | Accessible indicator-group name                                        |
| `labels`            | `readonly string[]` / JSON   | `[]`               | Accessible indicator names                                             |
| `previous-label`    | `string`                     | `Previous item`    | Previous button name                                                   |
| `next-label`        | `string`                     | `Next item`        | Next button name                                                       |
| `color`             | Theme color                  | unset              | Arrow and progress color                                               |
| `progress-duration` | `number`                     | `0`                | Active fill duration in milliseconds                                   |

### Events

| Event      | Detail              | Purpose                               |
| ---------- | ------------------- | ------------------------------------- |
| `navigate` | `{ index: number }` | Requests an index; does not mutate it |

### Parts and Styling

Parts: `bar`, `controls`, `indicators`, `indicator`, `previous`, and `next`. CSS custom properties: `--media-navigation-bg` and `--media-navigation-dot-bg`.

### Types

Exported types: `OreMediaNavigationProps`, `OreMediaNavigationEvents`, `MediaNavigationNavigateDetail`, and `MediaNavigationOrientation`.

## Accessibility

- `label` names the navigation group; `indicator-label` names the indicator group.
- `labels` is a JSON array of accessible indicator names. Missing or blank names fall back to `Go to item N`.
- Indicators are native buttons with `aria-current`, not tabs. Only the active indicator enters sequential Tab order.
- Left/Right Arrow or Up/Down Arrow follows the orientation. Home and End request the first and last items.
- `disabled` blocks requests and disables every control.
- Progress visuals are hidden from assistive technology; the current indicator communicates the active item.
