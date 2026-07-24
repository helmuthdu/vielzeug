# List

A vertical list container for rows of content — a plain display list by default, or a
keyboard-navigable single-select listbox via `selectable`. Each `ore-list-item` can independently
reveal a left/right action panel via a horizontal pointer/touch swipe (or by focusing into the
panel's contents) — useful for mobile-style row actions like archive or delete.

## Basic Usage

`ore-list-item` renders its default slot as the row title, plus optional `leading`, `description`,
and `trailing` slots.

<ComponentPreview vertical>

```html
<ore-list>
  <ore-list-item>
    <ore-icon slot="leading" name="inbox" size="18"></ore-icon>
    Inbox
    <ore-badge slot="trailing">12</ore-badge>
  </ore-list-item>
  <ore-list-item>
    <ore-icon slot="leading" name="file-pen" size="18"></ore-icon>
    Drafts
  </ore-list-item>
  <ore-list-item>
    <ore-icon slot="leading" name="send" size="18"></ore-icon>
    Sent
    <span slot="description">Last sent 2 hours ago</span>
  </ore-list-item>
</ore-list>
```

</ComponentPreview>

## Variants

`plain` (default) has no dividers, `bordered` wraps the whole list in an outer border with row
dividers, and `separated` renders each item as its own bordered card.

<ComponentPreview vertical>

```html
<ore-list variant="bordered">
  <ore-list-item>Notifications</ore-list-item>
  <ore-list-item>Privacy</ore-list-item>
  <ore-list-item>Appearance</ore-list-item>
</ore-list>
<ore-list variant="separated">
  <ore-list-item>Notifications</ore-list-item>
  <ore-list-item>Privacy</ore-list-item>
  <ore-list-item>Appearance</ore-list-item>
</ore-list>
```

</ComponentPreview>

## Sizes

Three sizes control the row padding, gap, and font size.

<ComponentPreview vertical>

```html
<ore-list variant="bordered" size="sm">
  <ore-list-item>Small</ore-list-item>
</ore-list>
<ore-list variant="bordered" size="md">
  <ore-list-item>Medium (default)</ore-list-item>
</ore-list>
<ore-list variant="bordered" size="lg">
  <ore-list-item>Large</ore-list-item>
</ore-list>
```

</ComponentPreview>

## Selectable Listbox

Set `selectable` to turn the list into a single-selection `role="listbox"` — clicking (or pressing
<kbd>Enter</kbd>/<kbd>Space</kbd> on) an item selects it and deselects any previously-selected
sibling. Arrow keys move focus between items (manual activation — pressing <kbd>Enter</kbd>/
<kbd>Space</kbd> on the focused item commits the selection). A `role="listbox"` needs an accessible
name, so set `aria-label` (or `aria-labelledby`) directly, same as `ore-menu`.

`ore-list`'s own `value` is the single source of truth for selection — set it to seed the initial
selection, bind it for two-way control, or read it back from `change`. `ore-list-item` has no
`selected` prop of its own to set; its `selected` attribute is always derived by comparing its
`value` against the list's.

<ComponentPreview vertical>

```html
<ore-list selectable value="inbox" aria-label="Folders" variant="bordered">
  <ore-list-item value="inbox">Inbox</ore-list-item>
  <ore-list-item value="drafts">Drafts</ore-list-item>
  <ore-list-item value="sent">Sent</ore-list-item>
</ore-list>

<script type="module">
  import '@vielzeug/refine/list';
  import '@vielzeug/refine/list-item';

  document.querySelector('ore-list').addEventListener('change', (event) => {
    console.log('selected', event.detail.value);
  });
</script>
```

</ComponentPreview>

## Swipe Actions

Slot content into `actions-left`/`actions-right` and it becomes reachable by swiping the row with
a pointer or touch — the side with content reveals; swiping toward an empty side does nothing.
Only one item can have its actions revealed at a time: opening another item, tapping the row
itself, or tapping anywhere outside the item closes it again. Reverse-swiping an already-open item
is not supported — close it one of the three ways above instead.

A single slotted action fills the whole panel (`flex: 1; height: 100%` on the slot itself), the
big-tappable-target look of iOS Mail's/Gmail's row actions. For `ore-button` specifically, also
set its own [`fullheight`](./button.md#full-height) attribute — its visible surface is an inner
element with a fixed height from its size preset, independent of its own light-DOM box size, so
stretching the light-DOM box alone isn't enough.

Swiping all the way through (well past the reveal distance) auto-confirms the action instead of
just revealing it — the same "swipe all the way" shortcut as iOS Mail's delete gesture. It clicks
the slot's own first element (so a real action button's own click handler runs) and fires
`confirm`; the panel closes on its own afterward. The row and action panel tint slightly once the
drag is close to that point, as a heads-up before it fires.

<ComponentPreview vertical>

```html
<ore-list variant="separated">
  <ore-list-item>
    Newsletter
    <span slot="description">From Acme Inc.</span>
    <ore-button slot="actions-right" color="error" fullheight rounded="none">
      <ore-icon name="trash-2" size="16"></ore-icon>
    </ore-button>
  </ore-list-item>
  <ore-list-item>
    Weekly Digest
    <span slot="description">From The Editor</span>
    <ore-button slot="actions-left" color="primary" fullheight rounded="none">
      <ore-icon name="archive" size="16"></ore-icon>
    </ore-button>
    <ore-button slot="actions-right" color="error" fullheight rounded="none">
      <ore-icon name="trash-2" size="16"></ore-icon>
    </ore-button>
  </ore-list-item>
</ore-list>
```

</ComponentPreview>

::: tip Keyboard access without a gesture
Swipe actions stay reachable from the keyboard independently of any pointer gesture: tabbing into
a slotted action button reveals its panel via `:focus-within`, without touching the `revealed`
attribute. You can also open a panel programmatically by setting `revealed="left"` /
`revealed="right"` directly.
:::

Override `--list-item-actions-width` to change how much of the row each panel occupies (default
`6rem`):

```html
<ore-list-item style="--list-item-actions-width: 8rem;">
  Wide actions
  <ore-button slot="actions-right" color="error" fullheight>Delete</ore-button>
</ore-list-item>
```

## Disabled State

Disable the whole list (blocks pointer interaction and removes items from tab order) or an
individual item (also excludes it from arrow-key navigation).

<ComponentPreview vertical>

```html
<ore-list variant="bordered">
  <ore-list-item>Available</ore-list-item>
  <ore-list-item disabled>Unavailable</ore-list-item>
</ore-list>
```

</ComponentPreview>

## API Reference

**`ore-list`** Attributes

| Attribute    | Type                                      | Default   | Description                                              |
| ------------ | ------------------------------------------ | --------- | ---------------------------------------------------------- |
| `variant`    | `'plain' \| 'bordered' \| 'separated'`     | `'plain'` | Visual variant                                              |
| `size`       | `'sm' \| 'md' \| 'lg'`                     | `'md'`    | Size applied to all items                                    |
| `selectable` | `boolean`                                   | `false`   | Enable single-selection listbox behavior                    |
| `disabled`   | `boolean`                                   | `false`   | Disable the entire list                                      |
| `value`      | `string`                                    | —         | Selected item's value (`selectable` only) — the single source of truth for selection |

**`ore-list`** Events

| Event    | Detail                                     | Description                                    |
| -------- | -------------------------------------------- | ------------------------------------------------- |
| `change` | `{ value: string \| null }`                  | Fired when the selected value changes (`selectable` only) |

**`ore-list-item`** Attributes

| Attribute  | Type                 | Default | Description                                                |
| ---------- | ---------------------- | --------- | -------------------------------------------------------------- |
| `disabled` | `boolean`              | `false`   | Disable this item                                              |
| `selected` | `boolean` (read-only)  | `false`   | Derived — `true` when this item's `value` matches the parent list's `value`. Not independently settable. |
| `value`    | `string`               | —         | Opaque value compared against the parent list's `value` to derive `selected`; also reported in select/change events |
| `revealed` | `'left' \| 'right'`    | —         | Which action panel is revealed; settable programmatically      |

**`ore-list-item`** Events

| Event      | Detail                                        | Description                          |
| ---------- | ------------------------------------------------ | ---------------------------------------- |
| `select`   | `{ item: HTMLElement, value: string \| null }`   | Item becomes selected                    |
| `deselect` | `{ item: HTMLElement, value: string \| null }`   | Item becomes deselected                  |
| `reveal`   | `{ item: HTMLElement, side: 'left' \| 'right' }` | An action panel opens                    |
| `conceal`  | `{ item: HTMLElement }`                          | The revealed action panel closes         |
| `confirm`  | `{ item: HTMLElement, side: 'left' \| 'right' }` | Swiped all the way through; fires just before the slot's own click |

**`ore-list-item`** Slots

| Slot             | Description                                    |
| ---------------- | ------------------------------------------------- |
| (default)        | Item title                                         |
| `leading`        | Content before the title (icon, avatar, …)         |
| `description`    | Secondary line below the title                     |
| `trailing`       | Content after the title (meta text, chevron, …)    |
| `actions-left`   | Buttons revealed by swiping right (or focusing in) |
| `actions-right`  | Buttons revealed by swiping left (or focusing in)  |

**`ore-list-item`** CSS Custom Properties

| Property                       | Description                    | Default              |
| -------------------------------- | --------------------------------- | ----------------------- |
| `--list-item-actions-width`     | Width of each action panel        | `6rem`                  |
| `--list-item-bg`                | Row background color              | `var(--color-canvas)`   |
| `--list-item-hover-bg`          | Row background on hover           | `var(--color-contrast-100)` |
| `--list-item-selected-bg`       | Row background when selected      | `color-mix(in oklch, var(--color-primary) 10%, transparent)` |

## Accessibility

- `ore-list` exposes `role="list"` by default, or `role="listbox"` when `selectable` — set
  `aria-label`/`aria-labelledby` on it in listbox mode, same as any native listbox or `ore-menu`.
- `ore-list-item` exposes `role="listitem"` by default, or `role="option"` with `aria-selected`
  when its parent list is `selectable`.
- Arrow keys / Home / End move focus between items when `selectable`; Enter/Space commits the
  selection on the focused item (manual activation, not selection-follows-focus).
- Swipe-revealed action panels stay reachable from the keyboard independently of the gesture —
  tabbing into a slotted action button reveals its panel via `:focus-within`.
- Combining `selectable` with swipe actions **on the same item** — a `role="option"` element
  containing a real focusable descendant — is a known WAI-ARIA tension (axe's `nested-interactive`
  rule) inherent to that exact combination, not something a different role can route around; using
  either feature on its own (a plain swipeable list, or a selectable list without row actions) has
  no such gap.
