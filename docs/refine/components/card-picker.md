# Card Picker

Browse image-led cards and select any number of them. The active card is separate from the selected set: swipe or browse controls change the card in view, while its checkbox changes selection.

## Basic Usage

Register the picker and skeleton entries and provide a stable `value` and accessible `label` for each item. Put artwork or a striped media placeholder in `media`, a short identity in `header`, and decision-supporting detail in the default slot.

<ComponentPreview>

```html
<ore-card-picker label="Choose action cards" values="ember-strike">
  <ore-card-picker-item value="ember-strike" label="Ember Strike">
    <ore-skeleton slot="media" striped width="100%" height="18rem" radius="0" style="display: block;"></ore-skeleton>
    <span slot="header">Ember Strike</span>
    <p>Deal damage, then move one space.</p>
  </ore-card-picker-item>
  <ore-card-picker-item value="guarding-step" label="Guarding Step">
    <ore-skeleton slot="media" striped width="100%" height="18rem" radius="0" style="display: block;"></ore-skeleton>
    <span slot="header">Guarding Step</span>
    <p>Reduce incoming damage and hold your position.</p>
  </ore-card-picker-item>
  <ore-card-picker-item value="quick-recovery" label="Quick Recovery">
    <ore-skeleton slot="media" striped width="100%" height="18rem" radius="0" style="display: block;"></ore-skeleton>
    <span slot="header">Quick Recovery</span>
    <p>Recover stamina before your next action.</p>
  </ore-card-picker-item>
</ore-card-picker>
```

</ComponentPreview>

The active card is fully interactive. Adjacent cards are visual previews only. Use the previous/next buttons or keyboard navigation to browse them.

## Selection State

Set `values` to a comma-separated list of selected item values. Listen for `change` to update application state. Its detail contains the toggled value and the complete selected values and labels.

```ts
const picker = document.querySelector('ore-card-picker');

picker?.addEventListener('change', (event) => {
  const { values } = (event as CustomEvent<{ values: string[] }>).detail;
  saveSelection(values);
});
```

Set `active-index` to browse to an item programmatically. `browse-change` reports the active index, value, and label; changing the active card never changes `values`.

## Keyboard and Touch

- Focus the picker and use Left/Right Arrow, Home, and End to browse.
- Use Tab to reach the active card's checkbox and the previous/next buttons.
- Swipe horizontally to browse on touch screens. Vertical movement remains page scrolling.
- Selection is always an explicit checkbox action. A swipe never selects or removes a card.
- Transitions stop under reduced-motion preferences.

## Item Slots

| Slot | Purpose |
| --- | --- |
| `media` | Card artwork or other visual content |
| `header` | Card title or short identity |
| default | Supporting content used to make the choice |
| `actions` | Consumer-owned secondary actions |

Each `ore-card-picker-item` requires a stable `value`. `label` names the card for assistive technology and defaults to `value`. Its footer checkbox has a visible `Select`/`Selected` label as well as a card-specific accessible name. `disabled` disables only its selection checkbox; the item remains browsable.

## API

### `ore-card-picker`

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `Card picker` | Accessible name for the browsing region |
| `values` | `string` | empty | Comma-separated selected item values |
| `active-index` | `number` | `0` | Active item index, zero-based |
| `disabled` | `boolean` | `false` | Disables browsing and selection controls |

| Event | Detail | Description |
| --- | --- | --- |
| `change` | `{ labels: string[]; originalEvent?: Event; value: string; values: string[] }` | A checkbox changes selection |
| `browse-change` | `{ index: number; label: string \| null; value: string \| null }` | The active card changes |

CSS custom properties: `--card-picker-gap` (stage-to-controls spacing), `--card-picker-min-height` (default `var(--size-80)`), and `--card-picker-transition-duration` (default `var(--duration-300)`, zero under reduced motion).

### `ore-card-picker-item`

| Attribute | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `string` | none | Stable selection value |
| `label` | `string` | `value` | Accessible card name |
| `disabled` | `boolean` | `false` | Prevents selection while leaving the card browsable |
