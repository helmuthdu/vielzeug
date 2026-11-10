# Drawer

A slide-in panel that overlays page content from any edge of the screen. Built on the native `<dialog>` element for correct top-layer stacking, focus trapping, and `Escape`-to-close behavior.

## Placements

Use `open` as the controlled state and update it from `open-change`; use `default-open` only to initialize an uncontrolled drawer. Use `placement` to control which edge the drawer slides in from: `left`, `right` (default), `top`, or `bottom`.

<ComponentPreview height="400px">

```html
<ore-button id="open-left">Left</ore-button>
<ore-button id="open-right">Right</ore-button>
<ore-button id="open-top">Top</ore-button>
<ore-button id="open-bottom">Bottom</ore-button>

<ore-drawer id="drawer-left" placement="left" label="Left drawer" dismissible>
  <p>Slides in from the left edge.</p>
</ore-drawer>
<ore-drawer id="drawer-right" placement="right" label="Right drawer" dismissible>
  <p>Slides in from the right edge (default).</p>
</ore-drawer>
<ore-drawer id="drawer-top" placement="top" label="Top drawer" dismissible>
  <p>Slides down from the top edge.</p>
</ore-drawer>
<ore-drawer id="drawer-bottom" placement="bottom" label="Bottom drawer" dismissible>
  <p>Slides up from the bottom edge.</p>
</ore-drawer>

<script>
  ['left', 'right', 'top', 'bottom'].forEach(function (p) {
    document.getElementById('open-' + p).addEventListener('click', function () {
      document.getElementById('drawer-' + p).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Sizes

<ComponentPreview height="400px">

```html
<ore-button id="open-sm">sm</ore-button>
<ore-button id="open-md">default</ore-button>
<ore-button id="open-lg">lg</ore-button>
<ore-button id="open-full">full</ore-button>
<ore-button id="open-content">content</ore-button>

<ore-drawer id="drawer-sm" size="sm" label="Small drawer" dismissible>
  <p>Compact drawer: ideal for quick-action panels.</p>
</ore-drawer>
<ore-drawer id="drawer-md" label="Medium drawer" dismissible>
  <p>The default size. Suitable for most use cases.</p>
</ore-drawer>
<ore-drawer id="drawer-lg" size="lg" label="Large drawer" dismissible>
  <p>More room for forms or detailed content.</p>
</ore-drawer>
<ore-drawer id="drawer-full" size="full" label="Full drawer" dismissible>
  <p>Takes up the full width or height of the viewport.</p>
</ore-drawer>
<ore-drawer id="drawer-content" size="content" placement="bottom" title="Reading sheet" dismissible>
  <p>A short passage determines the sheet height.</p>
</ore-drawer>

<script>
  ['sm', 'md', 'lg', 'full', 'content'].forEach(function (s) {
    document.getElementById('open-' + s).addEventListener('click', function () {
      document.getElementById('drawer-' + s).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

Use `size="content"` with `placement="bottom"` or `placement="top"` for a content-sized sheet. Short content fits naturally. The panel stops at the viewport height minus `var(--size-12)`, then scrolls its body while the header and footer remain visible. Leave detents unset for a two-state reading sheet.

## With Header and Footer Slots

Use the `header` slot to replace the default title bar and the `footer` slot for action buttons. A `dismissible` drawer with no title shows its close button with no header divider, so content-first drawers keep a light top edge.

<ComponentPreview height="400px">

```html
<ore-button id="open-slots-btn">Open with slots</ore-button>

<ore-drawer id="drawer-slots" label="Edit profile" dismissible>
  <div slot="header">
    <strong>Edit profile</strong>
    <ore-badge color="primary" size="sm">Beta</ore-badge>
  </div>
  <div style="display:flex; flex-direction:column; gap:1rem;">
    <ore-input label="Display name" placeholder="Your name"></ore-input>
    <ore-input label="Email" placeholder="you@example.com"></ore-input>
  </div>
  <div slot="footer">
    <ore-button variant="ghost" data-drawer-close>Cancel</ore-button>
    <ore-button color="primary">Save</ore-button>
  </div>
</ore-drawer>

<script>
  document.getElementById('open-slots-btn').addEventListener('click', function () {
    document.getElementById('drawer-slots').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Drag Handle Placement

The drag handle is a decorative pointer-gesture affordance, not a keyboard control. Use the Close button or Escape to dismiss with a keyboard. Preventing a swipe `close-request` restores the panel without losing its contents.

Use `drag-handle-placement` to control whether the swipe handle sits outside the panel edge or inset inside it.

<ComponentPreview height="400px">

```html
<ore-button id="open-handle-outside">Outside handle</ore-button>
<ore-button id="open-handle-inset">Inset handle</ore-button>

<ore-drawer
  id="drawer-handle-outside"
  label="Outside drag handle"
  placement="right"
  drag-handle-placement="outside"
  dismissible>
  <p>Default behavior. The drag handle sits outside the drawer edge.</p>
</ore-drawer>

<ore-drawer
  id="drawer-handle-inset"
  label="Inset drag handle"
  placement="right"
  drag-handle-placement="inset"
  dismissible>
  <p>Inset behavior. The drag handle stays inside the drawer edge.</p>
</ore-drawer>

<script>
  document.getElementById('open-handle-outside').addEventListener('click', function () {
    document.getElementById('drawer-handle-outside').setAttribute('open', '');
  });

  document.getElementById('open-handle-inset').addEventListener('click', function () {
    document.getElementById('drawer-handle-inset').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Detents (Snap Points)

On a `bottom` or `top` drawer, `detents` turns the panel into a sheet that can rest partway open. Pass comma-separated fractions of the panel size — `"0.5,0.75"` means the dragged panel can snap to half-open and three-quarters-open on its way between fully open and closed.

<ComponentPreview height="440px">

```html
<ore-button id="open-detents">Half / three-quarter sheet</ore-button>

<ore-drawer id="drawer-detents" placement="bottom" label="Detented sheet" detents="0.5,0.75" dismissible>
  <p>Drag the handle down: the sheet snaps to 75%, then 50%, then closes.</p>
</ore-drawer>

<script>
  document.getElementById('open-detents').addEventListener('click', function () {
    document.getElementById('drawer-detents').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

A drag released between two snap points settles to the nearer one, and a fling is projected forward with its release velocity before choosing a stop — so a quick flick carries through to the next detent (or closes) while a slow release settles without overshoot. Every rest position, including each detent, stays fully opaque so the sheet is readable at any stop. Detents are the bottom-sheet pattern only: setting `detents` on a `left` or `right` drawer warns and is ignored.

## Backdrop Styles (`backdrop`)

Use `backdrop` to match dialog behavior:

- `opaque` (default): dim overlay
- `blur`: dim + blur
- `transparent`: no overlay

<ComponentPreview height="400px">

```html
<ore-button id="open-backdrop-opaque">Opaque</ore-button>
<ore-button id="open-backdrop-blur">Blur</ore-button>
<ore-button id="open-backdrop-transparent">Transparent</ore-button>

<ore-drawer id="drawer-backdrop-opaque" label="Opaque backdrop" placement="right" backdrop="opaque" dismissible>
  <p>Default dimmed backdrop.</p>
</ore-drawer>

<ore-drawer id="drawer-backdrop-blur" label="Blur backdrop" placement="right" backdrop="blur" dismissible>
  <p>Backdrop uses blur + dim overlay.</p>
</ore-drawer>

<ore-drawer
  id="drawer-backdrop-transparent"
  label="Transparent backdrop"
  placement="right"
  backdrop="transparent"
  dismissible>
  <p>No dimmed backdrop, drawer still behaves like a dialog.</p>
</ore-drawer>

<script>
  ['opaque', 'blur', 'transparent'].forEach((kind) => {
    document.getElementById('open-backdrop-' + kind).addEventListener('click', () => {
      document.getElementById('drawer-backdrop-' + kind).setAttribute('open', '');
    });
  });
</script>
```

</ComponentPreview>

## Closing from Content

Mark any element inside the drawer with `data-drawer-close` and clicking it closes the drawer — nav rows, saved records, a footer "Done" button. No per-button wiring. The click takes the same path as the close button: a cancelable `close-request` with `reason: "trigger"` fires first, so validation logic can still keep the drawer open.

<ComponentPreview height="400px">

```html
<ore-button id="open-content-close">Open tasks</ore-button>

<ore-drawer id="drawer-content-close" label="Tasks" title="Tasks">
  <p>Open a task and the drawer closes itself.</p>
  <div style="display:flex; flex-direction:column; gap:var(--size-2); align-items:stretch;">
    <ore-button variant="flat" data-drawer-close>Ship the drawer recipes</ore-button>
    <ore-button variant="flat" data-drawer-close>Review the filter drawer</ore-button>
  </div>
</ore-drawer>

<script>
  document.getElementById('open-content-close').addEventListener('click', function () {
    document.getElementById('drawer-content-close').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## Listening to Events

```html
<ore-drawer id="my-drawer" label="Notifications" dismissible>
  <p>You have no new notifications.</p>
</ore-drawer>

<script type="module">
  import '@vielzeug/refine/drawer';

  const drawer = document.getElementById('my-drawer');
  drawer.addEventListener('open-change', (e) => console.log('drawer open:', e.detail.open, e.detail.reason));
  drawer.addEventListener('close-request', (e) => {
    if (e.detail.reason === 'outsideClick') {
      console.log('close requested from backdrop click');
    }
  });
</script>
```

## Recipes

Complete patterns assembled from the primitives above. Each one relies on `data-drawer-close` for content-driven dismissal instead of hand-wired listeners.

### Record detail

A detail drawer: identity row in the `header` slot, key/value facts in the body, row actions in the `footer`.

<ComponentPreview height="420px">

```html
<ore-button id="open-record">Open record</ore-button>

<ore-drawer id="drawer-record" size="lg" label="Acme Corp">
  <div
    slot="header"
    style="display:flex; align-items:center; gap:var(--size-3); min-width:0;">
    <ore-avatar initials="AC" color="primary" size="sm"></ore-avatar>
    <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">Acme Corp</span>
    <ore-badge color="success" size="sm">Active</ore-badge>
  </div>
  <dl style="display:grid; grid-template-columns:auto 1fr; gap:var(--size-3) var(--size-4); margin:0;">
    <dt style="color:var(--color-contrast-500);">Owner</dt>
    <dd style="margin:0;">Sarah Chen</dd>
    <dt style="color:var(--color-contrast-500);">Plan</dt>
    <dd style="margin:0;">Enterprise (annual)</dd>
    <dt style="color:var(--color-contrast-500);">Renewal</dt>
    <dd style="margin:0;">14 March</dd>
  </dl>
  <div slot="footer">
    <ore-button variant="ghost" data-drawer-close>Close</ore-button>
    <ore-button color="primary">Edit</ore-button>
  </div>
</ore-drawer>

<script>
  document.getElementById('open-record').addEventListener('click', function () {
    document.getElementById('drawer-record').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

### Filters

A filter drawer: controls in the body, `Reset` and `Apply` in the `footer`. Apply closes the drawer through `data-drawer-close`; the host app listens for `open-change` to read the controls when it closes.

<ComponentPreview height="420px">

```html
<ore-button id="open-filters">Filters</ore-button>

<ore-drawer id="drawer-filters" size="sm" label="Filters" title="Filters">
  <div style="display:flex; flex-direction:column; gap:var(--size-4);">
    <strong style="font-size:var(--text-sm);">Stage</strong>
    <ore-checkbox checked>Prospecting</ore-checkbox>
    <ore-checkbox checked>Proposal</ore-checkbox>
    <ore-checkbox>Negotiation</ore-checkbox>
    <strong style="font-size:var(--text-sm);">Owner</strong>
    <ore-switch checked>Only my records</ore-switch>
  </div>
  <div slot="footer">
    <ore-button variant="ghost">Reset</ore-button>
    <ore-button color="primary" data-drawer-close>Apply</ore-button>
  </div>
</ore-drawer>

<script>
  document.getElementById('open-filters').addEventListener('click', function () {
    document.getElementById('drawer-filters').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

### Quick-action sheet

A bottom sheet: `size="content"` fits the actions, `detents` lets a dragged sheet rest half-open, and every action closes the sheet on its way.

<ComponentPreview height="420px" vertical>

```html
<ore-button id="open-sheet">Share</ore-button>

<ore-drawer id="drawer-sheet" placement="bottom" size="content" label="Share" detents="0.5">
  <div style="display:flex; flex-direction:column; gap:var(--size-2); align-items:stretch;">
    <ore-button variant="flat" data-drawer-close>Copy link</ore-button>
    <ore-button variant="flat" data-drawer-close>Email invite</ore-button>
    <ore-button variant="flat" data-drawer-close>Manage access</ore-button>
  </div>
</ore-drawer>

<script>
  document.getElementById('open-sheet').addEventListener('click', function () {
    document.getElementById('drawer-sheet').setAttribute('open', '');
  });
</script>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute               | Type                                     | Default     | Description                                                                                                    |
| ----------------------- | ---------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| `open`                  | `boolean`                                | N/A         | Controlled visibility                                                                                          |
| `default-open`          | `boolean`                                | `false`     | Initial visibility when `open` is not provided                                                                 |
| `placement`             | `'left' \| 'right' \| 'top' \| 'bottom'` | `'right'`   | Edge the drawer slides in from                                                                                 |
| `size`                  | `'sm' \| 'lg' \| 'full' \| 'content'`    | unset       | Size preset; `content` fits top/bottom sheets to content with bounded body scrolling                           |
| `detents`               | `string`                                 | N/A         | Comma-separated drag snap points as fractions of panel size (e.g. `'0.5,0.75'`); `bottom`/`top` placement only |
| `title`                 | `string`                                 | N/A         | Visible header title text                                                                                      |
| `label`                 | `string`                                 | N/A         | Accessible name (`aria-label`); also shown as the header title when `title` is not set                        |
| `drag-handle-placement` | `'outside' \| 'inset'`                   | `'outside'` | Position of the swipe drag handle                                                                              |
| `dismissible`           | `boolean`                                | `true`      | Shows a close (×) button in the header                                                                         |
| `backdrop`              | `'opaque' \| 'blur' \| 'transparent'`    | `'opaque'`  | Backdrop style, matching `ore-dialog`                                                                          |
| `persistent`            | `boolean`                                | `false`     | Prevents backdrop click from requesting close                                                                  |

Beyond these attributes, any element inside the drawer's content — in the body or the slots — accepts `data-drawer-close`: clicking it closes the drawer through the same cancelable `close-request` path as the close button (reason `trigger`).

### Slots

| Slot      | Description                                                 |
| --------- | ----------------------------------------------------------- |
| (default) | Drawer body content                                         |
| `header`  | Replace the default header bar (overrides the `title` text) |
| `footer`  | Footer area, typically used for action buttons              |

### Events

| Event           | Detail                                                                                                       | Description                               |
| --------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| `open-change`   | `{ open: boolean, reason: string }`                                                                          | Fired whenever the drawer opens or closes |
| `close-request` | `{ placement: 'left' \| 'right' \| 'top' \| 'bottom', reason: 'trigger' \| 'escape' \| 'outsideClick' \| 'swipe' \| 'programmatic' }` | Fired before close and can be prevented   |

### CSS Custom Properties

| Property               | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `--drawer-backdrop-bg` | Backdrop veil color (default `--overlay-veil`) |
| `--drawer-bg`          | Panel background color                         |
| `--drawer-size`        | Panel width (horizontal) or height (vertical)  |
| `--drawer-shadow`      | Panel box shadow                               |
| `--drawer-panel-blur`  | Panel backdrop blur amount                     |

## Accessibility

The drawer component follows the WAI-ARIA Dialog Pattern best practices.

The panel uses `role="dialog"` with `aria-modal="true"` to signal that content outside is inert. Always provide a `label` attribute to give screen readers a descriptive panel title. When `dismissible` is set, the close button carries `aria-label="Close"` automatically.

`Tab` and `Shift+Tab` move focus between focusable elements inside the panel. `Escape` closes the drawer when `dismissible` is set. Focus moves into the panel on open and returns to the trigger element on close.

## Related Components

- [Dialog](./dialog): modal dialog for confirmations and focused tasks
