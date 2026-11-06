# Dock

A bar of page actions that pins to a viewport edge while its container scrolls, then settles into the document flow once that container ends. Where `ore-navbar` carries a site's sections, `ore-dock` carries the verbs for the thing on screen: save, share, back, done.

## Places

A dock has three named places and a tool row. `start` and `commit` are the flanks, `center` is the one place allowed to hold a non-action (a clock, a read-out), and the default slot is the row of tools between them. A place nothing is assigned to leaves no gap and no flex line, so a bar with only tools is a tool bar.

Above the phone width (640 px) the bar is a full-width strip. A claimed `center` sits dead-center from the desktop width (1280 px) up, because both sides of the row then take an equal share and the middle holds whatever the flanks weigh; an empty `start` still flexes as the counterweight it is measured against. Below that width the middle leads the bar's left side and the tools trail right, which is the strip's natural reading order and needs no help.

<ComponentPreview>

```html
<ore-dock label="Document actions">
  <ore-button slot="start" icon-only label="Back">
    <ore-icon name="arrow-left"></ore-icon>
  </ore-button>
  <ore-button>Share</ore-button>
  <ore-button>Archive</ore-button>
  <ore-button slot="commit" color="primary">Save</ore-button>
</ore-dock>
```

</ComponentPreview>

<ComponentPreview>

```html
<ore-dock label="List actions">
  <ore-button>Import</ore-button>
  <ore-button color="primary">New item</ore-button>
</ore-dock>
```

</ComponentPreview>

## Sticky

With `sticky` (the default) the bar holds its edge while its container scrolls and wears a hairline only while it is actually pinned: once the container's end arrives, the bar has become content again and stops announcing itself as chrome.

A bottom dock is pulled up from its natural position at the end of its container, so it has to be the container's last child with the scrollable content before it.

<ComponentPreview>

```html
<div
  style="height: 260px; width: 100%; overflow: auto; border: 1px solid var(--color-contrast-200); border-radius: var(--rounded-lg);">
  <div style="padding: var(--size-4); min-height: 480px;">
    <ore-text>Scroll this container: the bar holds the bottom edge, then releases.</ore-text>
  </div>
  <ore-dock label="Example actions">
    <ore-button>Cancel</ore-button>
    <ore-button color="primary">Publish</ore-button>
  </ore-dock>
</div>
```

</ComponentPreview>

Set `side="top"` to pin the leading edge instead, or clear `sticky` for a bar that simply sits where the document puts it.

## Attached

`attached` fuses the tool row into one segmented capsule: the tools share an edge, take an equal share of the bar's width, and keep rounded ends with a square seam. The flanks stay outside the capsule, so a `slot="start"` back button keeps its own shape. Corner geometry reaches the buttons through `--button-radius`, the same channel `ore-button-group[attached]` uses, so an app-wide button radius must exclude a dock's tools the way it excludes an attached button group:

```css
/* Keep the app's default radius everywhere except inside a fused dock. */
ore-button:not(ore-button-group[attached] *):not(ore-dock[attached] *) {
  --button-radius: var(--rounded-sm);
}
```

<ComponentPreview>

```html
<ore-dock attached label="Editor actions">
  <ore-button icon-only label="Import">
    <ore-icon name="upload"></ore-icon>
  </ore-button>
  <ore-button icon-only label="Share">
    <ore-icon name="share"></ore-icon>
  </ore-button>
  <ore-button icon-only label="Export">
    <ore-icon name="download"></ore-icon>
  </ore-button>
  <ore-button color="primary" icon-only label="Save">
    <ore-icon name="check"></ore-icon>
  </ore-button>
</ore-dock>
```

</ComponentPreview>

## Phone layout

Below the phone width (640 px) the bar trades its strip for a tool row in the iOS toolbar grammar: the bar lifts off the viewport's foot, and a pinned bar detaches from the walls into a pill. `center` leaves the row and hovers above it, because the row is thumb territory and a read-out is not a button. How wide that row gets is `mobile-layout`'s decision: by default (`auto`) a bar carrying a single action zone hugs its content, `start` at the leading edge, `commit` at the trailing edge, tools in the middle; a lone `center` with no actions stays inside the bar rather than hovering over an empty row. Once the bar carries more than one action zone, or its tools are `attached`, the flanks stretch equally so the tools rest on the row's true middle while space permits.

A flank reserves the intrinsic width of its controls, including a slotted `ore-button-group`. When one side carries more controls than the other, centering yields before controls overlap or spill outside the bar. If the combined zones cannot fit, they wrap to another row rather than shrinking touch targets. Collapse surplus actions into an `ore-menu` when the product requires a single row.

The width is the bar's own media query, like every other refine breakpoint. `DOCK_PHONE_QUERY` is exported from `@vielzeug/refine/dock` for code that renders alongside the bar and has to switch on the same line:

<ComponentPreview>

```html
<div
  style="width: 340px; border: 1px dashed var(--color-contrast-300); border-radius: var(--rounded-lg); padding: var(--size-2);">
  <div style="height: 120px; display: flex; align-items: flex-end;">
    <ore-dock style="width: 100%" label="Narrow actions">
      <ore-button slot="start" icon-only label="Back">
        <ore-icon name="arrow-left"></ore-icon>
      </ore-button>
      <ore-button slot="center" variant="flat" size="sm">02:31</ore-button>
      <ore-button icon-only label="Share">
        <ore-icon name="share"></ore-icon>
      </ore-button>
      <ore-button slot="commit" color="primary" size="sm">Done</ore-button>
    </ore-dock>
  </div>
</div>
```

</ComponentPreview>

```ts
import { DOCK_PHONE_QUERY } from '@vielzeug/refine/dock';

// A header that hands its actions to the bar below the phone width reads the same query:
const phoneRow = window.matchMedia(DOCK_PHONE_QUERY);
```

## Mobile sizing

`mobile-layout` decides how the phone row distributes its width. `auto` (the default) adapts to the places the bar occupies: one action zone hugs its content at its logical edge, and anything wider fills the row. `full` always stretches edge to edge, which is what a multi-action commit flank wants. `compact` always hugs and centers, which is what a fight console or a timer wants. Above the phone width every mode is the same full-width strip: there the middle sits inline, and a hugging bar would shrink the wash and the pinned hairline away from the row they belong to.

<ComponentPreview>

```html
<div
  style="width: 340px; border: 1px dashed var(--color-contrast-300); border-radius: var(--rounded-lg); padding: var(--size-2);">
  <div style="height: 120px; display: flex; align-items: flex-end;">
    <ore-dock mobile-layout="compact" style="width: 100%" label="Hunt actions">
      <ore-button slot="start" icon-only label="Retreat">
        <ore-icon name="arrow-left"></ore-icon>
      </ore-button>
      <ore-button slot="center" variant="flat" size="sm">Round 4</ore-button>
      <ore-button slot="commit" color="primary" size="sm">End round</ore-button>
    </ore-dock>
  </div>
</div>
```

</ComponentPreview>

## Theming

The bar's surface rides a pseudo-element, never the host. `backdrop-filter` on an element makes it the containing block for `position: fixed` descendants, which would trap any panel a slotted control opens (a menu, a tooltip) inside the bar's own box. That is also why sizing reaches slotted content through custom properties only: a shadow-tree `::slotted()` declaration ranks below any document-tree rule on the same property, so a consumer that sets `flex` or `width` on a dock child always wins. `--dock-tool-flex` exists so the bar's own stretching can be tuned without fighting it.

Set the properties on a parent for contextual theming, or on the dock itself:

```html
<style>
  .console {
    --dock-bg: color-mix(in oklch, var(--color-ink) 88%, transparent);
    --dock-color: var(--color-contrast-900);
    --dock-offset: var(--size-4);
  }
</style>

<div class="console">
  <ore-dock>…</ore-dock>
</div>
```

## API Reference

### Attributes

| Attribute       | Type                            | Default          | Description                                      |
| --------------- | ------------------------------- | ---------------- | ------------------------------------------------ |
| `side`          | `'top' \| 'bottom'`             | `'bottom'`       | Viewport edge the bar pins to                    |
| `sticky`        | `boolean`                       | `true`           | Pin to the edge while the container scrolls      |
| `attached`      | `boolean`                       | `false`          | Fuse the tool row into one segmented capsule     |
| `mobile-layout` | `'auto' \| 'full' \| 'compact'` | `'auto'`         | Phone row sizing: adapt, fill, or hug and center |
| `label`         | `string`                        | `'Page actions'` | Accessible name for the toolbar landmark         |

### Slots

| Slot      | Description                                          |
| --------- | ---------------------------------------------------- |
| (default) | The tool row, between the flanks                     |
| `start`   | Leading flank: usually a back action                 |
| `center`  | Middle place: may carry a non-action such as a clock |
| `commit`  | Trailing flank: the commit action                    |

### Parts

| Part     | Description                                  |
| -------- | -------------------------------------------- |
| `bar`    | The bar itself, and the row's flex container |
| `start`  | Leading flank zone                           |
| `center` | Middle place zone                            |
| `tools`  | Tool row zone                                |
| `commit` | Trailing flank zone                          |

### State attributes

The host reflects the state its CSS reads. These exist because no selector can derive them: `:has()` cannot see slotted content and a `<slot>` always matches `:empty`.

| Attribute             | Set when                                   |
| --------------------- | ------------------------------------------ |
| `data-start-claimed`  | Something is assigned to the `start` slot  |
| `data-center-claimed` | Something is assigned to the `center` slot |
| `data-tools-claimed`  | Something is assigned to the default slot  |
| `data-commit-claimed` | Something is assigned to the `commit` slot |
| `data-pinned`         | The bar is holding its edge mid-scroll     |

### CSS Custom Properties

| Property              | Default                     | Description                                 |
| --------------------- | --------------------------- | ------------------------------------------- |
| `--dock-bg`           | 92% translucent canvas      | Bar fill                                    |
| `--dock-color`        | `var(--color-contrast-900)` | Bar ink                                     |
| `--dock-border-color` | `var(--color-divider)`      | Pinned hairline and the phone pill's border |
| `--dock-blur`         | `var(--blur-sm)`            | Blur radius behind the bar. `0` drops it    |
| `--dock-radius`       | `var(--rounded-full)`       | Corner radius of the pinned phone pill      |
| `--dock-offset`       | `var(--size-2)`             | Inset from the viewport's edges             |
| `--dock-gap`          | `var(--size-3)`             | Gap between the bar's places                |
| `--dock-tool-gap`     | `var(--size-2)`             | Gap between the tools in the row            |
| `--dock-padding`      | `var(--size-2)`             | Bar padding, before the safe-area inset     |
| `--dock-z-index`      | `var(--z-sticky)`           | Stacking order of the bar                   |
| `--dock-tool-flex`    | `1 1 0`                     | `flex` for each tool in `attached` mode     |
| `--dock-tool-radius`  | `var(--rounded-full)`       | Corner radius of a fused capsule's ends     |

## Accessibility

The bar is a `role="toolbar"` landmark with `aria-orientation="horizontal"`, named from `label`, so a screen reader announces what the row is for rather than leaving a nameless group of buttons. Give every dock a `label` that names its context: a page with a dock per view should not announce four identical "Page actions".

A toolbar's own contract is that its controls stay tabbable individually, so the bar does not implement roving focus: leave that to `ore-button-group` when a set of tools is really one radio-like choice. Zones the bar hides carry `hidden`, which removes them from the accessibility tree rather than leaving empty groups to announce.

The bar's translucent surface sits behind its content on a pseudo-element, so it never intercepts a pointer or a screen reader, and `prefers-reduced-transparency: reduce` swaps it for an opaque canvas with no blur. Under `forced-colors: active` the pinned hairline switches to `CanvasText` so the bar's edge stays visible in a forced palette.
