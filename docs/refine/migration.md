---
title: Migration
description: Migrate command palette categories and the item type, the mobile input font-size floor, the standardized overlay backdrop, toast statuses, the human-interface-guideline adoption, surface variants, tabs density, the tabs active pill, the sidebar drawer overlay, DataGrid sources, and framework type declarations to Refine.
---

# Migration

## Command palette categories and searchable group headings

`ore-command-palette` gained drill-down categories: an item with nested items (a `children` array
in `items`, or nested `<ore-command-palette-item>` elements) renders as one category row that opens
on `ArrowRight`/`Enter`/click instead of selecting. Search stays global from the root, so a query
flattens category leaves into one result list.

- **`CommandPaletteItem` now carries a required `children` field.** The normalized item type gained
  `children: CommandPaletteItem[]`, always `[]` on a leaf. Code that builds a `CommandPaletteItem`
  literal by hand must add `children: []`; code that reads one from a `select` or `active-change`
  detail is unaffected, and `CommandPaletteItemInput` needs no change (`children` is optional).
- **Entering a category emits `category-open`, not `select`.** `{ value, label, count }` fires when
  a category row opens; `select` still only ever carries a command, so existing command handlers
  need no guard.
- **Group headings are now searchable and pinned.** A query that matches a `group` name keeps that
  group's items, and each heading sticks to the top of the list while its own group scrolls. Each
  named group is also a `role="group"` container labelled by its heading, which changes the
  accessibility tree for screen readers without changing any attribute consumers read.

## Touch inputs no longer trigger the iOS page zoom

iOS Safari zooms the whole page when a focused text control's computed font-size is below 16px.
Refine's coarse-pointer font promotion existed for this but was dead code: `touchTargetMixin` sat
before `sizeVariantMixin` in every field's `styles` array, and both sheets are unlayered, so the
size preset's own `--_font-size` declarations overrode the whole `@media (pointer: coarse)` block.
The ordering is fixed (`ore-input`, `ore-textarea`, `ore-message-composer`, `ore-file-input`,
`ore-button`, `ore-checkbox`, `ore-radio`), which means under a coarse pointer the promotion now
actually applies:

- **Fields render one size tier larger on touch devices.** A default/`md` `ore-input` now renders at
  the lg tier (16px text, taller field, wider padding); `sm` renders at the md tier's box. This is
  the documented promotion finally taking effect, not a new design.
- **Field text floors at 16px at every size on touch.** `size="sm"` text used to promote to 14px
  (still under the iOS threshold); it now promotes to 16px like every other size, so no focused
  field zooms the page. Pointer (desktop) rendering is unchanged at every size.

## One backdrop across every overlay

Dialog, drawer, command palette, tour, and the sidebar drawer now share one veil: the new
`--overlay-veil` token (`color-mix(in oklch, var(--color-scrim) 70%, transparent)`). Dialog, drawer,
command palette, and tour washed the page with `color-mix(in oklch, var(--color-canvas) 40%, transparent)`;
`--color-canvas` is near-white in light mode, so the "dim" brightened the page instead of darkening it.
Every overlay backdrop now dims in both schemes.

The `backdrop="opaque | blur | transparent"` prop (opaque = plain veil, the default everywhere;
blur = veil + `blur(var(--blur-xs))`; transparent = no veil, click-to-close still works) now covers
all five surfaces. Two behavior changes follow from the alignment:

- **`ore-command-palette` no longer always blurs.** Its backdrop used to hardcode a blur with no way
  to change it. The default is now the plain veil like everywhere else; set `backdrop="blur"` to
  restore the old look.
- **`ore-tour` gained `backdrop` and `--tour-backdrop-bg`.** Its veil was hardcoded.

CSS custom properties renamed to the `--<component>-backdrop-bg` convention:

| Old                             | New                                 |
| ------------------------------- | ----------------------------------- |
| `--dialog-backdrop`             | `--dialog-backdrop-bg`              |
| `--command-palette-backdrop`    | `--command-palette-backdrop-bg`     |

`--drawer-backdrop-bg`, `--sidebar-drawer-backdrop-bg`, and `--spotlight-dim` keep their names; all
of them now default to the shared veil (`--spotlight-dim` to `--color-scrim` directly, since the
spotlight ring is the full-strength dim rather than the lighter backdrop wash).

## Sidebar drawer becomes a dismissible overlay

The mobile/overlay drawer of `ore-sidebar` now behaves like `ore-drawer`: a dimming scrim veil, a visible close
button in the header, swipe-to-dismiss from the trailing-edge grabber, panel elevation, and a fade instead of a
pop. Three contracts changed:

- **`close-on-select` defaults to `true`.** Selecting an item inside an open drawer now closes it, which is what
  mobile navigation expects. Pass `close-on-select="false"` to keep the drawer open after activation.
- **`drawer` mode is a real overlay.** Previously a drawer-only sidebar rendered its panel as a visible inline
  block (inert while closed) and opened without a scrim or close button. It now uses the same off-canvas panel,
  scrim, close button, and swipe behavior as the bottom-nav drawer, with no bottom bar.
- **`ore-sidebar-group` emits `open-change`.** The documented group event never fired, and the native `toggle`
  event does not cross the shadow boundary. Toggling an uncontrolled collapsible group now emits
  `open-change` with `{ open }`, and `aria-expanded` reflects the real state (it previously read the controlled
  prop, which is `undefined` for uncontrolled groups). The host no longer mirrors the `open` attribute in
  uncontrolled mode (that reflection is what made every group read itself as controlled); style against
  `data-open` instead.

```js
// Before: never fired
group.addEventListener('toggle', (e) => console.log(e.detail?.open));

// After
group.addEventListener('open-change', (e) => console.log(e.detail.open));
```

The backdrop color moved from the text-contrast ramp (which inverted to a bright fog in dark mode) to the
theme's scrim veil (`--overlay-veil`), exposed as `--sidebar-drawer-backdrop-bg`, with `backdrop="opaque | blur |
transparent"` matching `ore-drawer`. The documented-but-dead `--sidebar-item-indicator` property was removed;
`--sidebar-drawer-width` now actually controls the drawer panel width.

## Toast statuses replace color and variant

`ToastItem` no longer has `color` or `variant`. Both were borrowed from `ore-alert` and made every
toast a filled block in a saturated theme color, which is rare in current product UI and fought the
page beneath it. Toasts now render on one neutral light-dark surface, and a single `status` option
carries meaning:

```ts
// Before: a solid primary block
toast.add({ color: 'success', message: 'Saved', variant: 'flat' });

// After: neutral surface, status icon, tinted accent
toast.add({ status: 'success', message: 'Saved' });
```

| Old option              | New option                                   |
| ----------------------- | -------------------------------------------- |
| `color: 'success'`      | `status: 'success'`                          |
| `color: 'error'`        | `status: 'danger'`                           |
| `color: 'primary'` / unset | leave `status` unset (`neutral`, no icon) |
| `variant: 'solid' / 'flat' / 'bordered'` | removed: toasts always render the neutral surface |

- `status` takes `'neutral' | 'info' | 'success' | 'warning' | 'danger'` (exported as
  `TOAST_STATUSES` / `ToastStatus`). Each non-neutral status renders a status icon and tints the
  progress bar; `neutral` (the default) shows a plain message.
- The shortcuts are unchanged: `toast.success()`, `info()`, `warning()`, `error()` map to the
  matching status, and `toast.promise()` still updates loading → success/error.
- Urgency now derives from status: `danger` is assertive by default (previously `color: 'error'`).
  `urgency` still overrides.
- Action buttons keep their own `color` and `variant` options; those are `ore-button` styling.
  Their default changed from `flat` to `ghost`: a lighter text treatment that keeps action rows
  from competing with the message. Pass `variant: 'flat'` (or any button variant) per action to
  opt back in.
- `snackbar` stays as the compact-bar layout axis; it no longer interacts with `variant`.
- CSS: `--toast-bg` now defaults to the neutral elevated surface (`--color-contrast-100`) instead
  of a color-tinted `--color-contrast-50`. New hooks: `--toast-color`, `--toast-border-color`, and
  `--toast-icon-size`.

## Human-interface-guideline adoption

A pass aligned the design system with platform human-interface guidance. Four contracts changed; the rest of the pass is additive (new tokens, `emphasis`, `expandable`, truncation reveal, increased-contrast and reduced-transparency paths).

**Text floor.** `--text-2xs` moves from 10px to 11px, the smallest size kept legible. Component text never ships below it. If you pinned a consumer to the old 10px micro-label, set `--text-2xs` explicitly.

**Tooltip dwell.** An unset `delay` now opens after 300ms on hover (immediate on focus/click), and an unset `close-delay` hides after 100ms on pointer leave (immediate on focus out). Previously both defaulted to 0. To restore the old instant behavior, set `delay="0"` and `close-delay="0"`.

**Button variant default.** `variant` no longer reflects `solid` when unset; the solid treatment is now applied by a `:not([variant])` rule, so a plain `<ore-button>` looks identical. Only code that read the `variant` attribute back (rather than the property) is affected.

**Dark tertiary text.** `--color-contrast-500`'s dark value lifts from 58% to 62% lightness so tertiary text clears 4.5:1 on canvas, card, and sunken surfaces.

```html
<!-- Before: instant tooltip on every trigger -->
<ore-tooltip content="Copy">…</ore-tooltip>

<!-- After: same instant behavior, now explicit -->
<ore-tooltip content="Copy" delay="0" close-delay="0">…</ore-tooltip>
```

## Motion mode, named animations, and component motion

Motion is now a first-class theme axis. Most of this is additive: a set of `--animate-*` named-animation tokens (`fade-in`, `scale-in`, `slide-in-from-*`, `spin`, `ping`, `pulse`, `bounce`, `progress-bar`) with matching keyframes, and a three-state motion mode driven by `setMotionMode(mode)` / `getMotionMode()` writing a `data-motion` attribute on the document root. `system` (the default) follows `prefers-reduced-motion`; `full` and `reduced` force either side regardless of the OS setting.

Four existing components gained motion, so their visible behavior changed:

- **Navigation-menu panels** now cross-fade with a small rise on open and hold the same fade through the top-layer close, instead of appearing and disappearing instantly.
- **DataGrid sorting** now plays a FLIP row transition (via `@vielzeug/necromancer`) when a client-side sort reorders rows. It is skipped for `source` data and `sort-mode="server"`, where the rows are replaced rather than reordered.
- **Command-palette results** slide to their new slots as the query filters the list, instead of snapping.
- **Toast stacks** slide their neighbours when a notification enters or leaves, instead of snapping. A toast now enters through pure CSS (`@starting-style`, no script-driven phase class) and, on dismissal, is removed the moment its `--toast-exit-duration` transition ends rather than on a fixed ~250ms timer, so a themed exit duration longer than the 200ms default is no longer clipped. The swipe-to-dismiss flight reuses that same duration, and the auto-dismiss progress bar hides under motion-mode reduction (previously it read only the OS preference).

All four honor reduced motion automatically: the tokens zero out, so the navigation-menu fade collapses to an instant show/hide and the FLIP transitions are skipped entirely. To force motion on regardless of the OS setting, call `setMotionMode('full')` (or set `data-motion="full"` on `<html>`); to force it off, use `'reduced'`. To slow or silence one component without a global mode, override its duration token (for the DataGrid FLIP, `--duration-200`; set it to `0` to disable the transition).

Four components that animated unconditionally now honor the motion mode: the DataGrid, command-palette, and input-style loading spinners and the navbar's mode/mobile-menu animations previously ignored `prefers-reduced-motion` and kept moving; the marquee ticker previously read the OS preference through its own media query and ignored `data-motion`. If you relied on any of them animating under a reduced-motion setting, opt back in with `setMotionMode('full')`.

Internally, the per-component reduced-motion mixin was removed; reduced motion is now declared once at `:root` (honoring the three-state mode) rather than mixed into every component's styles. That mixin was never exported from the package's public subpaths, so this is not a public API break.

## Rank-item bar visibility, RTL, and contrast

`ore-rank-item` defaults changed so the visualization survives its usual placements. `--rank-track-color` now defaults to `--color-contrast-200` instead of `--color-contrast-100`: `-100` is the card/elevated-surface color itself, so a rank list on a card rendered an invisible track. `--rank-number-color` now defaults to `--color-contrast-600` instead of `--color-500`, which is the AA-large-text tier and missed AA at the numeral's 12px size. The bar fill now grows from the reading start: under `dir="rtl"` it anchors right like the rest of the row instead of left. In Windows high-contrast mode the fill renders as the system highlight and the track as an outlined box. A `trailing` value wider than 40% of the row now ellipsizes instead of squeezing the label to nothing.

## Card interaction, responsiveness, and radius

`ore-card` tightens its interactive contract. Pressing Enter or Space on a control nested in an interactive card (a slotted button or link) now activates that control alone instead of the control *and* the card. `disabled` no longer sets `pointer-events: none` on the whole card: the card stops activating and dims, but a click on a slotted control reaches that control, so disable nested controls yourself to keep pointer and keyboard behavior identical. The hover lift and the colored-card hover tint now apply only to `interactive` cards, and only where hover is a real state (`@media (hover: hover)`), so a resting card no longer looks clickable and a tapped card no longer stays lifted on touch. The card's own transitions now honor `prefers-reduced-motion`.

`rounded` is now a registered prop (the radius variants it drives already shipped), so `card.rounded = 'xl'` works and is typed. Horizontal cards wrap to the stacked layout whenever the card itself is narrower than roughly 28rem, tracked on the card's own width rather than the viewport.

```html
<!-- Before: an interactive card hosting actions (an ARIA nested-interactive violation) -->
<ore-card interactive>
  <ore-button slot="actions">Buy</ore-button>
</ore-card>

<!-- After: a card with actions is a resting card; the card itself is interactive only when it is one action -->
<ore-card>
  <ore-button slot="actions">Buy</ore-button>
</ore-card>
```

## Speech-player transport, cycle, and readout

`ore-speech-player` adopts the package's transport pattern: its controls are now `ore-button` hosts (style them through their `button` part), the speed cycle runs `1 → 1.15 → 1.5 → 0.85` so the first tap speeds the reading up, and a sentence-position readout appears at the end of the row while reading. `OreSpeechPlayerLabels` grows one required key, `resumingFrom` (with a `{sentence}` placeholder), and drops three: `speedNormal`, `speedSlow`, and `speedFast`. The speed control's name is now its `speed` stem plus the numeric multiplier, so the announced name always contains the multiplier shown on the button. The `labels` property stays `Partial`, so existing runtime usage is unaffected; code annotated with the full `OreSpeechPlayerLabels` type drops the three keys and adds `resumingFrom`. The subpath now also re-exports `BUTTON_TAG` and `TOOLTIP_TAG` for its nested controls. `--speech-player-gap` defaults to `var(--size-2)`, and both it and `--speech-player-control-size` promote automatically under `@media (pointer: coarse)`.

While reading, every control now keeps one tone: the toggle no longer takes a lone accent, because an accent on one control splits the row into two colors and the playing state is already carried by the icon, the stop control, and the position readout. `--speech-player-active-color` is therefore removed; set `--speech-player-icon-color` on the host to tint the whole row.

The toggle is icon-only, like the stop and speed controls: the visible "Read aloud" label is gone, and the `read` key now feeds only the tooltip and accessible name. All three controls are the same circle, so `--speech-player-control-size` sizes the whole row uniformly. The stop control moved to the end of the controls, after the speed, so it no longer needs a reserved slot: idle, the toggle and the speed control sit side by side, and revealing the stop grows the row rightward without shifting a control.

```ts
// Before
const labels: OreSpeechPlayerLabels = {
  /* ...existing keys... */
  speedNormal: '1×',
  speedSlow: '0.85×',
  speedFast: '1.15×',
};

// After
const labels: OreSpeechPlayerLabels = {
  /* ...existing keys... */
  resumingFrom: 'Reading from sentence {sentence}.',
};
```

## Speed-reading fullscreen support

`ore-speed-reading` gains an opt-in fullscreen mode: a toolbar control, a read-only `fullscreen` attribute, and `enterFullscreen()`/`exitFullscreen()` methods. `OreSpeedReadingLabels` grows three required keys — `enterFullscreen`, `exitFullscreen`, and `fullscreenUnsupported`. The `labels` property stays `Partial`, so existing runtime usage is unaffected; code annotated with the full `OreSpeedReadingLabels` type needs the three new entries.

```ts
// Before
const labels: OreSpeedReadingLabels = {
  /* ...existing keys... */
};

// After
const labels: OreSpeedReadingLabels = {
  /* ...existing keys... */
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  fullscreenUnsupported: 'Fullscreen is unavailable in this browser.',
};
```

## Update speed-reading controls

`ore-speed-reading` replaces its numeric WPM field with an accessible slider and visible value. Wide readers show the slider inline; narrow readers show it full-width on a second row. The information button contains guidance only. The optional sentence progress bar and its `progress` label are removed; the word counter remains. The component subpath no longer re-exports `NUMBER_INPUT_TAG`; it now re-exports `SLIDER_TAG` for its nested control. `OreSpeedReadingLabels.invalidWpm` is removed because slider values are constrained, and `tapHint` is added. `--speed-reading-font-size` now defaults to `var(--text-3xl)` and represents the maximum fitted display size.

```ts
// Before
import { NUMBER_INPUT_TAG } from '@vielzeug/refine/speed-reading';
reader.labels = { invalidWpm: 'Enter a pace from 100 to 600.' };

// After
import { SLIDER_TAG } from '@vielzeug/refine/speed-reading';
reader.labels = { tapHint: 'Tap the sides to step.' };
```

If your application registered nested controls through the component subpath exports, update that registration list. `wpm-change` now reports slider changes as the user adjusts the pace, rather than a committed numeric-field value.

## Query bar filter layout and state echoes

The query bar retains its unified field and inline applied-filter pills. Its standard secondary row opens a vocabulary-driven drawer and can show curated quick filters. Use `::part(applied)` for inline filter styling and `::part(toolbar)` for secondary controls.

Breaking: state echoes now use semantic equality instead of token-array identity. To change free text externally, assign a new state object. To echo the current query, copy its actual text and tokens; that preserves an unfinished typed token.

```js
// Before: a text-only write with the same tokens array was ignored.
bar.state = { text: 'updated', tokens: bar.state.tokens };

// After: this updates text and dismisses pending drawer edits.
bar.state = { text: 'updated', tokens: bar.state.tokens };

// Equivalent echoes preserve composition even with a copied tokens array.
bar.state = { text: bar.state.text, tokens: [...bar.state.tokens] };
```

`open-change` now identifies the surface. Update handlers that assumed every event referred to suggestions:

```js
// Before
bar.addEventListener('open-change', (event) => updateSuggestions(event.detail.open));

// After
bar.addEventListener('open-change', (event) => {
  if (event.detail.surface === 'suggestions') updateSuggestions(event.detail.open);
});
```

Suggestion rows now flow naturally, wrap long labels, and have a 44px minimum height. `--query-bar-option-height` controls minimum height rather than a fixed row height. The unused `--query-bar-icon-size` declaration was removed. Applied-pill removal returns focus to Filters instead of the text field. See the [query bar reference](./components/query-bar.md).

`input` and `change` now fire only when the committed query actually changes. Composing an unfinished token or selecting an already-applied value does not announce an unchanged query.

### Multiple values and token helpers

Vocabulary entries default to single selection. Set `selection: 'multiple'` to allow additive values for the same key. The state remains `{ text, tokens: [{ key, value }] }`, with distinct pairs. Applications should match values with OR within a key and AND across keys; no values means unrestricted. The drawer uses checkboxes for multiple-selection keys and retains radios for single-selection keys.

Breaking: helper calls now identify a token by both key and value. `tokenValue` is removed in favor of `tokenValues`, which always returns an array. `removeToken` removes an exact pair; use `clearTokens` to clear a whole group.

```js
// Before
commitToken(state, 'fruit', 'apple');
removeToken(state, 'fruit');
const fruit = tokenValue(state, 'fruit');

// After
commitToken(state, { key: 'fruit', value: 'apple' }); // Single selection
commitToken(state, { key: 'fruit', value: 'apple' }, 'multiple'); // Additive
removeToken(state, { key: 'fruit', value: 'apple' }); // Exact value
clearTokens(state, 'fruit'); // Entire group
const fruits = tokenValues(state, 'fruit');
```

The Filters badge now counts active keys, not individual values. Removing a pill or deselecting a quick filter preserves other values of that key. Add `clearFilter` (`'Clear {filter}'`) and `selected` (`'{count} selected'`) to localized labels when using multiple-selection groups.

### Drawer draft feedback

Backdrop clicks and swipe gestures now keep the querybar drawer open when it has pending edits. Cancel, Close, and Escape still discard edits. An unchanged drawer can be dismissed through any of those paths. Reset is disabled for an empty draft.

Add `pending`, `hiddenSelected`, `selectedValues`, and `showAll` to localized labels for pending-edit feedback and search-hidden selection summaries. See the [localization reference](./components/query-bar.md#localization-and-styling) for placeholders. Single-selection vocabulary entries can set `anyLabel` to describe their unrestricted choice, for example `anyLabel: 'Default order'`.

## Register library-neutral icon definitions

Breaking: `IconNode` arrays are removed. `registerIcons` accepts only `IconDefinition` objects with a viewBox, presentation attributes, and recursive SVG children.

```ts
// Before
registerIcons({ Brand: [['path', { d: 'M0 0h24v24H0z' }]] });

// After
import { registerIcons, type IconDefinition } from '@vielzeug/refine/icons';

const brand: IconDefinition = {
  viewBox: [0, 0, 24, 24],
  presentation: { fill: 'currentColor' },
  children: [{ tag: 'path', attrs: { d: 'M0 0h24v24H0z' } }],
};
registerIcons({ Brand: brand });
```

For selected Lucide data, replace `registerIcons({ Search })` with `registerIcons(lucideIcons({ Search }))`, importing `lucideIcons` from `@vielzeug/refine/icons/lucide`. Full-library registration is an explicit side-effect import of `@vielzeug/refine/icons/lucide/all`. Only grouped icon entry points are published; no aliases for the previous adapter paths are retained.

Lucide is now an optional peer instead of a mandatory dependency. Applications using Lucide data or the full-set registrar must declare it explicitly (`pnpm add lucide@^1.48.0`). No icon-library dependency is needed for core components, neutral definitions, or supplied structural data.

For Heroicons, Tabler, or Material Design Icons, convert local Iconify data through `@vielzeug/refine/icons/iconify`. Shared registration and types live at `@vielzeug/refine/icons`; the component remains `@vielzeug/refine/icon`. See the [icon reference](./components/icon.md) for imports, licenses, aliases, transforms, and validation.

For caller-named individual data, the grouped entries `icons/heroicons`, `icons/tabler`, and `icons/mdi` expose `heroiconsIcons`, `tablerIcons`, and `mdiIcons`. This is an additive convenience; existing generic Iconify conversion remains supported:

```ts
import { registerIcons } from '@vielzeug/refine/icons';
import { heroiconsIcons } from '@vielzeug/refine/icons/heroicons';
import Search from '@iconify-icons/heroicons/magnifying-glass';
import Home from '@iconify-icons/heroicons/home';

registerIcons(heroiconsIcons({ Search, Home }));
```

Keys stay application-owned (`search`, `home`) rather than gaining a provider namespace. Install the chosen Iconify data package; native framework components are not accepted. Collection JSON still uses `iconifyIcons(collection, names?)`. No compatibility aliases or automatic registration are added.

Presentation now comes from each definition rather than forced Lucide styling. `stroke-width` is an explicit override (otherwise native widths are retained); `solid` overrides nested fill/stroke attributes too. `absolute-stroke-width` uses SVG non-scaling strokes, including CSS sizes. Application registrations override component defaults in either import order. Names normalize case, hyphens, and underscores consistently; namespace colons are preserved. Invalid data throws `RefineError` rather than being partially rendered.

## Replace glass with frost

The `glass` variant was removed because its browser-dependent SVG refraction was difficult to distinguish reliably from `frost`. Use the CSS-only `frost` variant for translucent cards, containers, navigation, tabs, accordions, and pagination.

```html
<!-- Before -->
<ore-card variant="glass">Content</ore-card>

<!-- After -->
<ore-card variant="frost">Content</ore-card>
```

Remove overrides for `--glass-blur`, `--glass-saturation`, `--glass-refraction-opacity`, and `--glass-highlight`.

## Tabs density and radius

`density="compact"` on `ore-tabs` no longer sets a 12px font or a `md` corner radius. Compact now trades vertical space only: `size` owns the font size, and the new `rounded` attribute owns the radius.

```html
<!-- Before: compact forced 12px text and a md radius -->
<ore-tabs density="compact">...</ore-tabs>

<!-- After: pin the old look explicitly -->
<ore-tabs density="compact" size="sm" rounded="md">...</ore-tabs>
```

Compact tabs also keep a 44px target on coarse pointers, so touch layouts grow taller than the compact desktop height. An unset `size` now promotes like `size="md"` on coarse pointers.

## Tabs active surface becomes a sliding pill

`ore-tabs` now marks the selected tab with one pill (`::part(indicator)`) that slides between tabs, instead of each `ore-tab-item` painting its own static active background. The pill's fill matches what each variant's active item used to paint, so the default look is the same surface in the same place: it only travels now.

Because the item no longer paints the active fill, `--tab-item-active-bg` and `--tab-item-active-shadow` default to nothing. Set them on `ore-tab-item` only when you want the item to paint its own active surface instead of the pill:

```css
/* Before: the item's active fill was always painted */
ore-tab-item {
  --tab-item-active-bg: var(--color-contrast-100);
  --tab-item-active-shadow: inset 0 0 0 1px var(--color-divider);
}

/* After: the same declarations still opt the item into painting its own
   active surface; unset, the sliding pill is the active surface */
ore-tab-item {
  --tab-item-active-bg: var(--color-contrast-100);
  --tab-item-active-shadow: inset 0 0 0 1px var(--color-divider);
}
```

Style the pill itself through `::part(indicator)` and `--tabs-indicator-color`. The old 2px underline geometry is gone: the pill covers the active tab's box in both orientations.

## Update DataGrid source state

Replace source snapshots with state, flatten navigation, and use string params for inline search.

```ts
import type { DataGridSource } from '@vielzeug/refine/datagrid';

type Row = { id: string };
const data: readonly Row[] = [];

// Before
const source = {
  snapshot: {
    data,
    error: null,
    isFetching: false,
    pagination: { count: 5, index: 1, size: 20, total: 100 },
    query: { search: '' },
  },
  setQuery(changes: { search?: string }) {},
  subscribe(listener: () => void) {
    return () => {};
  },
};

// After
const source: DataGridSource<Row> = {
  next() {},
  previous() {},
  setParams(search) {},
  state: {
    error: null,
    items: data,
    loading: false,
    pagination: { page: 1, pageCount: 5, pageSize: 20, totalItems: 100 },
  },
  subscribe(listener) {
    return () => {};
  },
};
```

`DataGridSource` now requires only fields consumed by `ore-datagrid`. Sourcerer `createPageSource()` values satisfy the contract directly.

## Use rows for in-memory data

Use the `rows` property for local collections. DataGrid owns local sorting, filtering, and pagination.

```ts
// Before
const source = createLocalSource(rows);
grid.source = source;

// After
grid.rows = rows;
```

Keep `source` for API-backed page data.

## Load framework declarations

Replace hand-written JSX or template declarations with Refine's generated type entry points.

```ts
// React
import type {} from '@vielzeug/refine/frameworks/react';

// Vue
import type {} from '@vielzeug/refine/frameworks/vue';

// DOM-only TypeScript
import type {} from '@vielzeug/refine/frameworks/elements';
```

The declarations include every supported Refine tag and derive component properties from the authoritative DOM element map. They do not register components at runtime.
