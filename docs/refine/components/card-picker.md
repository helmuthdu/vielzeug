# Card Picker

Browse image-led cards and select any number of them. The active card is separate from the selected set: swipe or browse controls change the card in view, while its checkbox changes selection.

## Basic Usage

Import `@vielzeug/refine/card-picker` to register the picker and its required child controls, including the reading drawer. Register `@vielzeug/refine/skeleton` separately for this example. Give each item a stable `value` and accessible `label`. Put a short identity in `header`, artwork in `media`, a concise summary in the default slot, and optional long-form rules in `details`.

<ComponentPreview>

```html
<ore-card-picker label="Choose action cards" values="ember-strike">
  <ore-card-picker-item value="ember-strike" label="Ember Strike" details-label="Rules">
    <ore-skeleton
      slot="media"
      striped
      width="100%"
      height="var(--size-40)"
      radius="0"
      style="display: block;"></ore-skeleton>
    <span slot="header">Ember Strike</span>
    <p>Deal damage, then move one space.</p>
    <div slot="details">
      <h3>Full rules</h3>
      <p>Resolve the attack before moving. Apply any printed conditions after damage.</p>
      <h3>Timing</h3>
      <p>
        Choose a target within reach. Resolve its reaction before calculating damage. Movement happens only after the
        attack has finished.
      </p>
      <h3>Conditions</h3>
      <p>
        Apply each printed condition once. If a condition is already present, use the duration stated on the card rather
        than adding another copy.
      </p>
    </div>
  </ore-card-picker-item>
  <ore-card-picker-item value="guarding-step" label="Guarding Step">
    <ore-skeleton
      slot="media"
      striped
      width="100%"
      height="var(--size-40)"
      radius="0"
      style="display: block;"></ore-skeleton>
    <span slot="header">Guarding Step</span>
    <p>Reduce incoming damage and hold your position.</p>
  </ore-card-picker-item>
  <ore-card-picker-item value="quick-recovery" label="Quick Recovery">
    <ore-skeleton
      slot="media"
      striped
      width="100%"
      height="var(--size-40)"
      radius="0"
      style="display: block;"></ore-skeleton>
    <span slot="header">Quick Recovery</span>
    <p>Recover stamina before your next action.</p>
  </ore-card-picker-item>
</ore-card-picker>
```

</ComponentPreview>

The active card is fully interactive. Adjacent cards peek in from the sides on mobile and desktop to indicate horizontal browsing. These previews are non-interactive. Use swipes, the previous/next buttons, or keyboard navigation to browse.

Set `show-neighbors="false"` to keep the stage to the active card alone, with nothing of the next card visible at either edge. Browsing is unchanged: swipes, arrows, indicators, and keyboard paging all still work, and a card being dragged in appears under the finger for the length of the drag.

```html
<ore-card-picker show-neighbors="false" label="Choose action cards">
  <ore-card-picker-item value="swift-strike" label="Swift Strike">
    <ore-skeleton slot="media" striped width="100%" height="var(--size-64)"></ore-skeleton>
    <span slot="header">Swift Strike</span>
    <p>Deal damage, then move one space.</p>
  </ore-card-picker-item>
</ore-card-picker>
```

## Orientation

`orientation` changes the image/content layout, not the browsing direction. Swipes and keyboard browsing remain horizontal in every layout.

| Value        | Layout                                                                                  |
| ------------ | --------------------------------------------------------------------------------------- |
| `vertical`   | Artwork above the title and body. This is the default.                                  |
| `horizontal` | Artwork on the left and the title, body, and selection controls on the right.           |
| `auto`       | Horizontal when the picker container is at least 48rem wide; vertical below that width. |

Use `auto` for a picker that appears in both desktop dialogs and mobile screens:

<ComponentPreview>

```html
<ore-card-picker orientation="auto" label="Choose action cards">
  <ore-card-picker-item value="swift-strike" label="Swift Strike">
    <ore-skeleton slot="media" striped width="100%" height="var(--size-64)"></ore-skeleton>
    <span slot="header">Swift Strike</span>
    <p>Deal damage, then move one space.</p>
  </ore-card-picker-item>
</ore-card-picker>
```

</ComponentPreview>

Horizontal artwork uses `object-fit: contain`, so card scans are not cropped. `--card-picker-media-max-height` overrides the image height limit for either layout. Its defaults are `32dvh` vertically and `70dvh` horizontally.

## Navigation Controls

The picker and carousel use the same [media navigation component](./media-navigation.md): translucent rounded bar, small inactive dots, a wider active indicator, and right-aligned arrow buttons. Indicators represent the card in view, not selected cards. Activating one emits `browse-change` without changing selection.

Both controls are enabled by default. Set `show-controls="false"` to hide arrows or `show-indicators="false"` to hide dots. Setting both to `false` hides the navigation bar while retaining swipe and keyboard browsing.

Large decks show a moving window of at most seven indicators rather than one dot per card. Set `max-indicators="5"` for a smaller bar. This limits only the visible dots; all cards remain reachable by arrows, keyboard, and swipe.

`controls-placement="below"` places the bar below the card. `controls-placement="inset"` floats it over the bottom edge of the card's media, centred on the artwork rather than taking a row under the card. Cards without a media slot keep the stage's bottom edge. The visual design is the same in both placements.

```html
<ore-card-picker
  orientation="auto"
  controls-placement="inset"
  show-controls="true"
  show-indicators="true"
  label="Choose equipment">
  <ore-card-picker-item value="equipment" label="Equipment">
    <ore-skeleton slot="media" striped width="100%" height="var(--size-64)"></ore-skeleton>
    <span slot="header">Equipment</span>
    <p>Inspect the card before selecting it.</p>
  </ore-card-picker-item>
</ore-card-picker>
```

## Larger Card Preview

Register `@vielzeug/refine/dialog` and put the picker inside your existing zoom dialog. Use `active-index` to open on the clicked card and `values` for its selected state. Keep domain-specific confirmation and selection rules in the consuming application.

```html
<ore-dialog title="Choose a card" size="full">
  <ore-card-picker
    label="Card preview"
    orientation="auto"
    active-index="0"
    values="swift-strike"
    style="--card-picker-media-max-height: 60dvh;">
    <ore-card-picker-item value="swift-strike" label="Swift Strike">
      <ore-skeleton slot="media" striped width="100%" height="var(--size-96)"></ore-skeleton>
      <span slot="header">Swift Strike</span>
      <p>Deal damage, then move one space.</p>
    </ore-card-picker-item>
  </ore-card-picker>
</ore-dialog>
```

Replace the media placeholder with the application's card or equipment scan. The `media` slot accepts an `img` without changing the rest of the picker API.

## Reading Details

The secondary **Details** action appears only when you provide a `details` slot. Use `details-label` to name the content, for example `Rules` or `Specifications`. Artwork comes first, followed by the title and decision summary together in the card body. Selection and Details remain below the body text.

Below 48rem of picker width, details open in a modal bottom sheet. Short content determines its height; longer content scrolls beneath a fixed title and above a fixed selection footer. The sheet uses the drawer's real drag handle, close button, backdrop dismissal, and focus return. The grip belongs to the open sheet, not the card action.

At 48rem or wider, details open in an adjacent, non-modal reading pane. Its close action and keyboard path follow the title. The breakpoint follows the picker container, so a narrow sidebar still uses the sheet on a desktop viewport. Resizing moves the same details nodes between surfaces, preserving their content and form values. Browsing another card closes the previous reading surface.

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

The picker focuses on the current card. Present a selected-card list or count in a separate component using `values` and `change`; the picker does not render selection-list UI.

## Keyboard and Touch

- Focus the picker and use Left/Right Arrow, Home, and End to browse.
- Use Tab to reach current-card selection, the Details action, and navigation.
- Focus an indicator and use Left/Right Arrow, Home, or End to browse directly. Only the active indicator is in the sequential Tab order.
- Opening the sheet focuses its title and traps focus inside it. Escape, its close button, backdrop tap, or a downward handle drag dismiss it and return focus to the opener.
- Opening the desktop pane focuses its reading region. Tab proceeds to Close details, the scrollable content, and its interactive descendants. Escape closes the pane and returns focus to Details.
- Swipe horizontally to browse on touch screens. Cards follow your drag, then spring into place using the release velocity. Dragging beyond the first or last card meets resistance and springs back. Vertical movement remains page scrolling.
- Selection is always an explicit checkbox action. A swipe never selects or removes a card.
- Reduced-motion preferences keep direct drag feedback but settle released cards immediately instead of springing.

## Item Slots

| Slot      | Purpose                                                  |
| --------- | -------------------------------------------------------- |
| `media`   | Card artwork or other visual content                     |
| `header`  | Card title or short identity                             |
| default   | Concise summary that remains visible                     |
| `details` | Longer information shown in the adaptive reading surface |
| `actions` | Consumer-owned secondary actions                         |

Each `ore-card-picker-item` requires a stable `value`. `label` names the card for assistive technology and defaults to `value`. Selection controls have visible `Select`/`Selected` labels and card-specific accessible names. Item `disabled` disables selection; reading and browsing remain available.

## API

### `ore-card-picker`

| Attribute            | Type                                   | Default       | Description                              |
| -------------------- | -------------------------------------- | ------------- | ---------------------------------------- |
| `label`              | `string`                               | `Card picker` | Accessible name for the browsing region  |
| `values`             | `string`                               | empty         | Comma-separated selected item values     |
| `active-index`       | `number`                               | `0`           | Active item index, zero-based            |
| `disabled`           | `boolean`                              | `false`       | Disables browsing and selection controls |
| `orientation`        | `'vertical' \| 'horizontal' \| 'auto'` | `vertical`    | Card image/content layout                |
| `show-controls`      | `boolean`                              | `true`        | Show previous/next buttons               |
| `show-indicators`    | `boolean`                              | `true`        | Show direct card indicators              |
| `show-neighbors`     | `boolean`                              | `true`        | Show neighbouring cards' edges           |
| `max-indicators`     | `number`                               | `7`           | Maximum visible indicator buttons        |
| `controls-placement` | `'below' \| 'inset'`                   | `below`       | Navigation placement                     |

| Event           | Detail                                                                         | Description                  |
| --------------- | ------------------------------------------------------------------------------ | ---------------------------- |
| `change`        | `{ labels: string[]; originalEvent?: Event; value: string; values: string[] }` | A checkbox changes selection |
| `browse-change` | `{ index: number; label: string \| null; value: string \| null }`              | The active card changes      |

CSS custom properties: `--card-picker-gap` (stage-to-controls spacing), `--card-picker-min-height` (optional minimum stage height, default `0`), `--card-picker-media-max-height` (image height limit), and `--card-picker-transition-duration` (non-drag preview transitions, default `var(--duration-300)`, zero under reduced motion). Swipe settling uses a physical spring rather than this duration.

Parts: `stage`, `navigation`, `navigation-bar`, `indicators`, `indicator`, `controls`, `previous`, and `next`.

### `ore-card-picker-item`

| Attribute       | Type      | Default   | Description                                         |
| --------------- | --------- | --------- | --------------------------------------------------- |
| `value`         | `string`  | none      | Stable selection value                              |
| `label`         | `string`  | `value`   | Accessible card name                                |
| `disabled`      | `boolean` | `false`   | Prevents selection while leaving the card browsable |
| `details-label` | `string`  | `Details` | Accessible reading action text                      |

The picker reflects selection on each item with a read-only `selected` attribute. Parts: `card`, `media`, `content`, `selection`, `details-trigger`, `details`, `details-sheet`, and `actions`.
