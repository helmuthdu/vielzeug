# Avatar

A circular (or shaped) user representation that renders an image, falls back to initials, and falls back again to a generic person icon. Supports online-presence status indicators, theme colors, and size variants.

## Fallback to Initials

When no image is provided (or the image fails to load), the avatar displays initials derived from the `alt` attribute, or explicitly from `initials`.

<ComponentPreview center>

```html
<sg-avatar alt="Jane Doe"></sg-avatar>
<sg-avatar initials="JD" color="primary"></sg-avatar>
<sg-avatar initials="AB" color="success"></sg-avatar>
<sg-avatar initials="XY" color="warning"></sg-avatar>
```

</ComponentPreview>

## Colors

Use `color` to apply one of the semantic theme colors to the initials background.

<ComponentPreview center>

```html
<sg-avatar initials="PR" color="primary"></sg-avatar>
<sg-avatar initials="SE" color="secondary"></sg-avatar>
<sg-avatar initials="IN" color="info"></sg-avatar>
<sg-avatar initials="SU" color="success"></sg-avatar>
<sg-avatar initials="WA" color="warning"></sg-avatar>
<sg-avatar initials="ER" color="error"></sg-avatar>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<sg-avatar initials="SM" size="sm"></sg-avatar>
<sg-avatar initials="MD" size="md"></sg-avatar>
<sg-avatar initials="LG" size="lg"></sg-avatar>
```

</ComponentPreview>

## Rounded

Control the border-radius with `rounded`. Defaults to `full` (circular).

<ComponentPreview center>

```html
<sg-avatar initials="SM" rounded="sm"></sg-avatar>
<sg-avatar initials="MD" rounded="md"></sg-avatar>
<sg-avatar initials="LG" rounded="lg"></sg-avatar>
<sg-avatar initials="FL" rounded="full"></sg-avatar>
```

</ComponentPreview>

## Status Indicator

Add a colored status dot with the `status` attribute. Status indicator dots are visual only — pair them with a contextual label in the surrounding UI when the status is meaningful to assistive technology users.

<ComponentPreview center>

```html
<sg-avatar initials="ON" color="primary" status="online"></sg-avatar>
<sg-avatar initials="OF" status="offline"></sg-avatar>
<sg-avatar initials="BU" color="error" status="busy"></sg-avatar>
<sg-avatar initials="AW" color="warning" status="away"></sg-avatar>
```

</ComponentPreview>

## Avatar Group

Use `sg-avatar-group` to stack `sg-avatar` elements in an overlapping row with automatic overflow handling. When more avatars are provided than `max` allows, the excess count is shown in a `+N` badge.

<ComponentPreview center>

```html
<sg-avatar-group max="3">
  <sg-avatar src="/a.jpg" alt="Alice" color="primary"></sg-avatar>
  <sg-avatar src="/b.jpg" alt="Bob" color="secondary"></sg-avatar>
  <sg-avatar src="/c.jpg" alt="Carol" color="success"></sg-avatar>
  <sg-avatar alt="Dave" color="warning"></sg-avatar>
</sg-avatar-group>
```

</ComponentPreview>

## API Reference

**`sg-avatar` Attributes**

| Attribute  | Type                                                                      | Default  | Description                                          |
| ---------- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| `src`      | `string`                                                                  | —        | Image source URL                                     |
| `alt`      | `string`                                                                  | —        | Alt text; also used to derive initials automatically |
| `initials` | `string`                                                                  | —        | Explicit initials (e.g. `"JD"`) when no image loads  |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —        | Theme color for initials background                  |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`   | Component size                                       |
| `rounded`  | `'sm' \| 'md' \| 'lg' \| 'full'`                                          | `'full'` | Border radius                                        |
| `status`   | `'online' \| 'offline' \| 'busy' \| 'away'`                               | —        | Online presence indicator dot                        |

**`sg-avatar` CSS Custom Properties**

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

**`sg-avatar-group` Attributes**

| Attribute | Type     | Default | Description                                                               |
| --------- | -------- | ------- | ------------------------------------------------------------------------- |
| `max`     | `number` | `5`     | Maximum visible avatars. Excess avatars are hidden behind a `+N` badge    |
| `total`   | `number` | —       | Override the count shown in the overflow badge (defaults to hidden count) |

**`sg-avatar-group` Slots**

| Slot      | Description                   |
| --------- | ----------------------------- |
| (default) | `sg-avatar` elements to group |

**`sg-avatar-group` CSS Parts**

| Part       | Description                   |
| ---------- | ----------------------------- |
| `overflow` | The `+N` overflow count badge |

**`sg-avatar-group` CSS Custom Properties**

| Property                 | Description                                                |
| ------------------------ | ---------------------------------------------------------- |
| `--avatar-group-overlap` | Negative margin creating the overlap (default: `-0.75rem`) |

## Accessibility

The avatar component follows WAI-ARIA best practices. Provide a meaningful `alt` attribute on each `sg-avatar` — it serves as the accessible name and is also used to derive initials automatically. Initials backgrounds are decorative; the `alt` text provides the accessible name for screen readers.
