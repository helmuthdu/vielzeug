# Rank List

A ranked display list where each row is its own visualization: an `ore-rank-item` renders a
rank numeral, an optional `leading` slot, the label, and a right-aligned value, with a
proportional bar under the row sized against the largest sibling `value`. The list itself
numbers the rows in DOM order and shares the bar scale — no separate chart, and no duplicated
text ranking beside one.

This is a read-only data display, not a selection control: rows carry no interactive state.
Sort the items before rendering; the list numbers them, it does not sort them.

## Basic Usage

Each item's `value` both sizes its bar (the widest sibling fills the track) and, without a
`trailing` slot, provides the row's own formatted display.

<ComponentPreview vertical>

```html
<ore-rank-list aria-label="Most visited pages">
  <ore-rank-item value="8">
    <span slot="leading">avatar</span>
    Documentation
  </ore-rank-item>
  <ore-rank-item value="6">Pricing</ore-rank-item>
  <ore-rank-item value="3">Blog</ore-rank-item>
</ore-rank-list>
```

</ComponentPreview>

## Non-Count Rows

Set `bar="false"` on rows whose `value` is not a comparable count (a median duration, a rating):
a scaled bar there would imply a ranking the data does not support. Such rows usually carry
their own display in the `trailing` slot and their context in the `description` slot.

<ComponentPreview vertical>

```html
<ore-rank-list aria-label="Median session time">
  <ore-rank-item value="8" bar="false">
    Documentation
    <span slot="description">6 timed sessions</span>
    <span slot="trailing">18m 24s</span>
  </ore-rank-item>
  <ore-rank-item value="6" bar="false">
    Pricing
    <span slot="description">4 timed sessions</span>
    <span slot="trailing">24m 11s</span>
  </ore-rank-item>
</ore-rank-list>
```

</ComponentPreview>

## Bar Scaling

The scale is the largest `value` among the item children, recomputed whenever an item is added,
removed, or has its `value` changed (property sets reflect to the attribute, so both authoring
styles converge). The widest row always fills its track exactly; a row above the current
maximum (a stale value written between rescans) is clamped rather than overflowing.

## Custom Colors

The bar, track, and rank numeral expose tokens; everything else follows the theme.

```css
ore-rank-item {
  --rank-bar-color: var(--color-success);
  --rank-track-color: var(--color-contrast-100);
  --rank-number-color: var(--color-contrast-500);
  --rank-bar-height: var(--size-1);
}
```

## Accessibility

The list renders `role="list"` and each item `role="listitem"`; name the ranking with
`aria-label` on the list, same as `ore-list`. The rank numeral and the bar are `aria-hidden`:
the list's own order carries the position and the `trailing` value carries the number, so the
ranking never depends on the visualization. The bar's color is reinforcement, never the only
carrier of meaning.
