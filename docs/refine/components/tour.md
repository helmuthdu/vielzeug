# Tour

The step card of a product tour: a compact dialog with title, body, progress, and Skip / Back / Next actions. Skip leads the row, pushed away from Next so a mis-tap cannot end the tour. The card is deliberately dumb: it owns no step logic and no persistence. It renders the step your app hands it and emits `next` / `back` / `skip` / `finish` / `dismiss`; a [`@vielzeug/beacon`](/beacon/) tour handle (or any state your app already keeps) decides what happens and drives the props back in.

## Basic Usage

<ComponentPreview center height="360px">

```html
<ore-tour
  id="card"
  open
  presentation="popover"
  title="Welcome"
  description="This card shows one tour step. The app owns the step logic."
  step-index="0"
  total-steps="3"></ore-tour>

<script type="module">
  import '@vielzeug/refine/tour';

  const card = document.getElementById('card');
  let step = 0;
  card.addEventListener('next', () => {
    step = Math.min(step + 1, 2);
    card['step-index'] = step;
  });
  card.addEventListener('back', () => {
    step = Math.max(step - 1, 0);
    card['step-index'] = step;
  });
</script>
```

</ComponentPreview>

## Presentations

| Presentation   | Behavior                                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| `popover`      | Anchored to `anchor` with an Orbit positioner in the Popover API top layer       |
| `modal`        | Native `<dialog>`: centered panel, focus trap, background lock                   |
| `bottom-sheet` | Native `<dialog>` docked to the bottom edge, full width                          |
| `auto`         | `bottom-sheet` on narrow viewports (≤ 640px), `popover` otherwise (default)      |

## Anchoring

In popover mode the card anchors to `anchor`: a real element, an Orbit virtual reference, or a plain viewport-space rectangle (the shape `@vielzeug/beacon` publishes on its `current` signal). Omit `anchor` to dock the card at the bottom center. With `spotlight`, the cutout follows the anchor: an element anchor is re-measured on scroll and resize, so the dim stays glued to the target.

```html
<ore-tour open spotlight title="Save your work" description="Hit save whenever." step-index="1" total-steps="4"></ore-tour>

<script type="module">
  import '@vielzeug/refine/tour';

  const card = document.querySelector('ore-tour');
  card.anchor = document.querySelector('#save-button'); // element or rect
</script>
```

## Wiring a Beacon Tour

One call replaces the whole bridge: `card.bind(handle)` renders the handle's `current` snapshot into the card's props and routes the card's `next` / `back` / `skip` / `finish` / `dismiss` actions back into the handle. A `@vielzeug/beacon` tour handle satisfies the binding in full; a coachmark handle works too (its missing step actions fall back to `dismiss`). `bind()` returns an unsubscribe and releases itself when the card disconnects.

```html
<ore-tour id="card"></ore-tour>

<script type="module">
  import { createTour } from '@vielzeug/beacon';
  import '@vielzeug/refine/tour';

  const tour = createTour({
    id: 'getting-started',
    steps: [
      { description: 'This is the nav.', id: 'nav', target: '#nav' },
      { description: 'Save lives here.', id: 'save', target: '#save' },
    ],
  });

  const card = document.getElementById('card');
  const unbind = card.bind(tour);

  tour.start();
  // On teardown: unbind(); tour.dispose();
</script>
```

Beacon keeps `current.rect` fresh on scroll and resize, so the anchored card follows the layout without app-side listeners. `presentation: 'auto'` picks the popover on wide viewports and the bottom sheet on narrow ones, and freezes that choice while the card is open so a mid-step resize never rebuilds it.

Apps that keep their own state drive the props directly instead: `tour.current` is a ripple `Readable<BeaconCurrentStep>` (read `tour.current.value`, subscribe with an argument-less listener), and `current.step === null` is exactly when the card should close. Note the kebab-case property keys — ore exposes props under their literal names (`card['step-index']`, never `card.stepIndex`).

## Media

Slotted into `media`, an image or illustration sits full-bleed above the copy, clipped to the card's top corners. The card caps the region against the viewport (`--tour-media-max-height`, tighter in the bottom sheet), so a tall asset can never push the Skip/Back/Next footer off a phone screen — supply art close to the card's aspect ratio for the best crop. The card renders whatever element you slot — use `<picture>` for responsive art direction, and always give raster images an `alt` (or `alt=""` when purely decorative):

```html
<ore-tour open title="Pin what matters" description="Star the metrics you check daily." step-index="2" total-steps="4">
  <img slot="media" alt="A board tile with the star highlighted" src="/media/tour-pin.webp" />
</ore-tour>

<script type="module">
  import '@vielzeug/refine/tour';
</script>
```

With `@vielzeug/beacon`, carry the media on the step's `data` field — Beacon never interprets it — and sync the slot when rendering `current`:

```js
const step = tour.current.value.step;
const media = step?.data; // { alt, src } — your shape
let img = card.querySelector('[slot="media"]');
if (!media) img?.remove();
if (media) {
  img ??= document.createElement('img');
  img.alt = media.alt;
  img.src = media.src;
  img.slot = 'media';
  card.prepend(img);
}
```

## Keyboard

- `Escape` requests dismissal (native in dialog presentations, keydown in popover mode). Suppressed by `persistent`.
- `ArrowLeft` / `ArrowRight` emit `back` / `next` while open (ignored while typing in a field).

## API Reference

### Attributes

| Attribute       | Type                                                                       | Default    | Description                                          |
| --------------- | -------------------------------------------------------------------------- | ---------- | ---------------------------------------------------- |
| `backdrop`      | `'opaque' \| 'blur' \| 'transparent'`                                       | `'opaque'` | Backdrop style in dialog presentations: veil only (default), veil + blur, or no overlay |
| `description`   | `string`                                                                    | N/A        | Body text (replaced by the default slot)             |
| `dismissible`   | `boolean`                                                                   | `true`     | Show a close (×) button                              |
| `initial-focus` | `string`                                                                    | N/A        | Selector to focus on open (dialog presentations)     |
| `offset`        | `number`                                                                    | `8`        | Anchor gap in px (popover mode)                      |
| `open`          | `boolean`                                                                   | N/A        | Controlled open state                                |
| `persistent`    | `boolean`                                                                   | `false`    | Escape/backdrop do not request dismissal             |
| `placement`     | Orbit `Placement`                                                            | `'bottom'` | Popover placement                                    |
| `presentation`  | `'auto' \| 'bottom-sheet' \| 'modal' \| 'popover'`                          | `'auto'`   | How the card presents                                |
| `return-focus`  | `boolean`                                                                   | `true`     | Restore focus after the card closes                  |
| `spotlight`     | `boolean`                                                                   | `false`    | Dim the page around the anchor rect                  |
| `step-index`    | `number`                                                                    | `0`        | Zero-based current step                              |
| `title`         | `string`                                                                    | N/A        | Card title                                           |
| `total-steps`   | `number`                                                                    | `0`        | Total steps; >0 shows the progress bar and "Step N of M" |

The `anchor` and `labels` props are JS-only. `labels` overrides the English defaults (`back`, `close`, `finish`, `next`, `skip`, `stepOf` with `{current}`/`{total}` placeholders).

### Methods

| Method | Returns | Description |
| -------------- | --------------- | --------------------------------------------------- |
| `bind(handle)` | `() => void` | Render a controller's `current` snapshot into the props and route the card's actions into it; see [Wiring a Beacon Tour](#wiring-a-beacon-tour). |

A controller is anything with `current: Readable<TourStepSnapshot>` plus `dismiss()` and the optional `next` / `back` / `skip` / `finish` actions — a beacon handle, or your own state.

### Slots

| Slot      | Description                                  |
| --------- | -------------------------------------------- |
| `media`   | Full-bleed media above the copy (`img`, `picture`, `video`, `svg`) |
| (default) | Body content (replaces `description`)        |
| `footer`  | Custom footer actions (replaces Skip/Back/Next) |

### Events

| Event         | Detail                  | Description                                       |
| ------------- | ----------------------- | ------------------------------------------------- |
| `back`        | —                       | Back was requested                                |
| `dismiss`     | `{ reason: string }`    | Close was requested (popover) / happened (dialog) |
| `finish`      | —                       | Advance pressed on the final step                 |
| `next`        | —                       | Next was requested                                |
| `open-change` | `{ open, reason }`      | Open state changed                                |
| `skip`        | —                       | Skip was requested                                |

### CSS Custom Properties

| Property                | Description                          |
| ----------------------- | ------------------------------------ |
| `--tour-bg`             | Card background color                |
| `--tour-backdrop-bg`    | Backdrop veil color (default `--overlay-veil`) |
| `--tour-border-color`   | Card border color                    |
| `--tour-max-width`      | Card max width (default 22rem)       |
| `--tour-media-max-height` | Media ceiling (default `min(38dvh, 16rem)`; bottom sheet `min(26dvh, 12rem)`) |
| `--tour-panel-blur`     | Backdrop blur (default `--blur-md`)  |
| `--tour-radius`         | Card border radius                   |
| `--tour-shadow`         | Card drop shadow                     |

## Accessibility

Dialog presentations use the native `<dialog>` element: browser-managed focus trap, top-layer stacking, and Escape handling, plus a reference-counted background lock (`inert`) on the rest of the page. The popover panel carries `role="dialog"` and receives focus on open; focus returns to the previously focused element on close. The progress bar is an `ore-progress` with `aria-valuetext` like "Step 2 of 3", paired with a visible "Step N of M" label. Footer actions follow the visual order Skip, Back, Next, so tab order matches what users see. On touch devices `ore-button` promotes the footer buttons to a 44px target.

## Related Components

- [Spotlight](./spotlight): the dim layer used by the `spotlight` prop
- [Dialog](./dialog): general-purpose modal
- [Beacon](/beacon/): the headless tour engine this card pairs with
