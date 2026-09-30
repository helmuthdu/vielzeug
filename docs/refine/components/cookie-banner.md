# Cookie Banner

A fixed consent banner for cookie and tracker opt-in: a short policy text (default slot, links included), optional per-category opt-in checkboxes, and **Accept all** / **Reject non-essential** / **Save choices** actions.

The banner owns presentation only. **It never stores anything**: listen for `decide`, persist the emitted consent record yourself (`localStorage`, a CMP, your backend), and gate third-party embeds — analytics, video, music — on the stored choice. Call `show()` again to let the user revise their decision from a "Cookie settings" link.

## Basic Usage

Place the banner in the document with your policy text as content. Without `categories` it renders the text and the two unconditional decisions.

<ComponentPreview vertical>

```html
<ore-cookie-banner>
  We use cookies to keep you logged in.
  <a href="#privacy">Privacy policy</a> · <a href="#imprint">Imprint</a>
</ore-cookie-banner>

<script type="module">
  import '@vielzeug/refine/cookie-banner';

  const banner = document.querySelector('ore-cookie-banner');

  banner.addEventListener('decide', (event) => {
    console.log('consent:', event.detail.consent);
    banner.hide();
  });
</script>
```

</ComponentPreview>

## Consent Categories

Pass `categories` to offer granular opt-in. Each category renders as a checkbox; an **Essential** row is always shown, checked and disabled, because essential storage is not a choice. `decide` always emits every category id plus `essential: true`, so the stored record has one uniform shape.

<ComponentPreview vertical>

```html
<ore-cookie-banner id="granular">
  Some features embed third-party content. Choose what may load.
  <a href="#privacy">Privacy policy</a>
</ore-cookie-banner>

<script type="module">
  import '@vielzeug/refine/cookie-banner';

  const banner = document.getElementById('granular');

  banner.categories = [
    { id: 'music', label: 'Music embeds (YouTube)' },
    { id: 'stats', label: 'Anonymous statistics' },
  ];

  banner.addEventListener('decide', (event) => {
    console.log('consent:', event.detail.consent);
    // { essential: true, music: true|false, stats: true|false }
  });
</script>
```

</ComponentPreview>

## Revisiting the Decision

Seed `consent` with the stored record and call `show()` — the checkboxes start from the saved state. `decide` never hides the banner itself, so your code decides when it has been persisted.

```js
banner.consent = JSON.parse(localStorage.getItem('consent') ?? '{}');
banner.categories = [{ id: 'music', label: 'Music embeds (YouTube)' }];

document.getElementById('cookie-settings').addEventListener('click', () => banner.show());

banner.addEventListener('decide', (event) => {
  localStorage.setItem('consent', JSON.stringify(event.detail.consent));
  banner.hide();
});
```

## Positioning

The banner docks to the bottom edge by default; `position="top"` docks it to the top. Width, viewport inset, and stacking are CSS custom properties.

```html
<ore-cookie-banner
  position="top"
  style="--cookie-banner-width: 640px; --cookie-banner-inset: var(--size-6);">
  …
</ore-cookie-banner>
```

## Localising Labels

Every string the banner renders has an English default. Pass a `labels` object to override any subset — for a German deployment, translate the heading and the three actions; the policy text itself is your slot content.

```js
banner.labels = {
  acceptAll: 'Alle akzeptieren',
  essential: 'Notwendige',
  heading: 'Ihre Privatsphäre',
  reject: 'Nicht notwendige ablehnen',
  save: 'Auswahl speichern',
};
```

## API Reference

### Attributes

| Attribute  | Type                  | Default    | Description                        |
| ---------- | --------------------- | ---------- | ---------------------------------- |
| `position` | `'bottom' \| 'top'` | `'bottom'` | Viewport edge the banner docks to. |

`categories` and `labels` are JavaScript properties (not attributes) — assign arrays/objects directly.

### Properties

| Property     | Type                            | Default | Description                                                              |
| ------------ | ------------------------------- | ------- | ------------------------------------------------------------------------ |
| `categories` | `OreCookieBannerCategory[]`     | `[]`    | Opt-in categories rendered as checkboxes.                                |
| `consent`    | `Record<string, boolean>`       | `{}`    | Stored consent record used to seed the checkboxes.                       |
| `labels`     | `Partial<OreCookieBannerLabels>` | `{}`    | Overrides for the rendered labels.                                       |

A category is `{ id: string; label: string; description?: string }`.

### Methods

| Method    | Description                                                                        |
| --------- | ---------------------------------------------------------------------------------- |
| `show()`  | Reveals the banner and re-seeds the checkboxes from `consent`.                      |
| `hide()`  | Hides the banner without emitting anything — persistence stays with the consumer.  |

### Events

| Event     | Detail                             | Description                                                                     |
| --------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `decide`  | `{ consent: Record<string, boolean> }` | A decision was made. Every category id plus `essential: true`. Persist and `hide()`. |

### Slots

| Slot      | Description                                                  |
| --------- | ------------------------------------------------------------ |
| (default) | Policy text, including links to the privacy policy/imprint.  |

### CSS Custom Properties

| Property                   | Description                        | Default                              |
| -------------------------- | ---------------------------------- | ------------------------------------ |
| `--cookie-banner-width`    | Maximum width of the banner card   | `min(960px, calc(100vw - var(--size-8)))` |
| `--cookie-banner-inset`    | Distance from the viewport edges   | `var(--size-4)`                      |
| `--cookie-banner-z-index`  | Stacking order                     | `var(--z-modal)`                     |

### Parts

`banner`, `heading`, `text`, `categories`, `actions`.

## Accessibility

The banner is a labelled `role="region"` (named by the heading label), not a modal dialog — it never traps focus, so keyboard users reach the checkboxes and actions in normal tab order. The Essential checkbox is `disabled` and checked, communicating that it is not a choice. The entrance animation is suppressed under `prefers-reduced-motion`.

::: tip Consent before loading
Under the EU ePrivacy rules (and Germany's TTDSG §25 in particular), third-party scripts that set non-essential cookies must not load **before** the user opts in. Gate the embed's script injection on the stored record — render the banner first, load the tracker only on `decide` with that category true. "Reject" must be a same-rank, one-click option, which the default action row provides.
:::
