# Avatar

A circular (or shaped) user representation that renders an image, falls back to initials, and falls back again to a generic person icon. Supports online-presence status indicators, theme colors, and size variants.

## Fallback to Initials

When no image is provided (or the image fails to load), the avatar displays initials derived from the `alt` attribute, or explicitly from `initials`.

<ComponentPreview center>

```html
<ore-avatar alt="Jane Doe"></ore-avatar>
<ore-avatar initials="JD" color="primary"></ore-avatar>
<ore-avatar initials="AB" color="success"></ore-avatar>
<ore-avatar initials="XY" color="warning"></ore-avatar>
```

</ComponentPreview>

## Colors

Use `color` to apply one of the semantic theme colors to the initials background.

<ComponentPreview center>

```html
<ore-avatar initials="PR" color="primary"></ore-avatar>
<ore-avatar initials="SE" color="secondary"></ore-avatar>
<ore-avatar initials="IN" color="info"></ore-avatar>
<ore-avatar initials="SU" color="success"></ore-avatar>
<ore-avatar initials="WA" color="warning"></ore-avatar>
<ore-avatar initials="ER" color="error"></ore-avatar>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<ore-avatar initials="SM" size="sm"></ore-avatar>
<ore-avatar initials="MD" size="md"></ore-avatar>
<ore-avatar initials="LG" size="lg"></ore-avatar>
```

</ComponentPreview>

## Rounded

Control the border-radius with `rounded`. Defaults to `full` (circular).

<ComponentPreview center>

```html
<ore-avatar initials="SM" rounded="sm"></ore-avatar>
<ore-avatar initials="MD" rounded="md"></ore-avatar>
<ore-avatar initials="LG" rounded="lg"></ore-avatar>
<ore-avatar initials="FL" rounded="full"></ore-avatar>
```

</ComponentPreview>

## Status Indicator

Add a colored status dot with the `status` attribute. Status indicator dots are visual only — pair them with a contextual label in the surrounding UI when the status is meaningful to assistive technology users.

<ComponentPreview center>

```html
<ore-avatar initials="ON" color="primary" status="online"></ore-avatar>
<ore-avatar initials="OF" status="offline"></ore-avatar>
<ore-avatar initials="BU" color="error" status="busy"></ore-avatar>
<ore-avatar initials="AW" color="warning" status="away"></ore-avatar>
```

</ComponentPreview>

## Avatar Group

Use `ore-avatar-group` to stack `ore-avatar` elements in an overlapping row with automatic overflow handling. When more avatars are provided than `max` allows, the excess count is shown in a `+N` badge.

<ComponentPreview center>

```html
<ore-avatar-group max="3">
  <ore-avatar src="/a.jpg" alt="Alice" color="primary"></ore-avatar>
  <ore-avatar src="/b.jpg" alt="Bob" color="secondary"></ore-avatar>
  <ore-avatar src="/c.jpg" alt="Carol" color="success"></ore-avatar>
  <ore-avatar alt="Dave" color="warning"></ore-avatar>
</ore-avatar-group>
```

</ComponentPreview>

## API Reference

**`ore-avatar` Attributes**

| Attribute  | Type                                                                      | Default  | Description                                          |
| ---------- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| `src`      | `string`                                                                  | —        | Image source URL                                     |
| `alt`      | `string`                                                                  | —        | Alt text; also used to derive initials automatically |
| `initials` | `string`                                                                  | —        | Explicit initials (e.g. `"JD"`) when no image loads  |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —        | Theme color for initials background                  |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`   | Component size                                       |
| `rounded`  | `'sm' \| 'md' \| 'lg' \| 'full'`                                          | `'full'` | Border radius                                        |
| `status`   | `'online' \| 'offline' \| 'busy' \| 'away'`                               | —        | Online presence indicator dot                        |

**`ore-avatar` CSS Custom Properties**

| Property                | Description                              |
| ----------------------- | ---------------------------------------- |
| `--avatar-size`         | Override the avatar width and height     |
| `--avatar-bg`           | Background color (initials background)   |
| `--avatar-color`        | Text / icon foreground color             |
| `--avatar-radius`       | Border radius                            |
| `--avatar-border`       | Border shorthand (e.g. `2px solid`)      |
| `--avatar-border-color` | Border color (also used for status ring) |
| `--avatar-font-size`    | Initials font size                       |
| `--avatar-font-weight`  | Initials font weight                     |

**`ore-avatar-group` Attributes**

| Attribute | Type     | Default | Description                                                               |
| --------- | -------- | ------- | ------------------------------------------------------------------------- |
| `max`     | `number` | `5`     | Maximum visible avatars. Excess avatars are hidden behind a `+N` badge    |
| `total`   | `number` | —       | Override the count shown in the overflow badge (defaults to hidden count) |

**`ore-avatar-group` Slots**

| Slot      | Description                   |
| --------- | ----------------------------- |
| (default) | `ore-avatar` elements to group |

**`ore-avatar-group` CSS Parts**

| Part       | Description                   |
| ---------- | ----------------------------- |
| `overflow` | The `+N` overflow count badge |

**`ore-avatar-group` CSS Custom Properties**

| Property                 | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `--avatar-group-overlap` | Negative margin creating the overlap (default: `-0.75rem`) |

## Accessibility

The avatar component follows WAI-ARIA best practices. Provide a meaningful `alt` attribute on each `ore-avatar` — it serves as the accessible name and is also used to derive initials automatically. Initials backgrounds are decorative; the `alt` text provides the accessible name for screen readers.
