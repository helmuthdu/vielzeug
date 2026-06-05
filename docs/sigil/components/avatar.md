# Avatar

A circular (or shaped) user representation that renders an image, falls back to initials, and falls back again to a generic person icon. Supports online-presence status indicators, theme colors, and size variants.

## Features

- 🖼️ **Three-tier fallback**: image → initials → generic person icon
- 🟢 **Status indicator**: online, offline, busy, away badge
- 🎨 **6 Theme Colors**: primary, secondary, info, success, warning, error
- 📏 **3 Sizes**: sm, md, lg
- 🔵 **Rounded variants**: sm, md, lg, full (default)
- 🔧 **Customizable via CSS custom properties**

## Source Code

::: details View Source Code
<<< @/../packages/sigil/src/content/avatar/avatar.ts
:::

## Basic Usage

```html
<sg-avatar src="https://i.pravatar.cc/150?img=1" alt="Jane Doe"></sg-avatar>

<script type="module">
  import '@vielzeug/sigil';
</script>
```

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

Add a colored status dot with the `status` attribute.

<ComponentPreview center>

```html
<sg-avatar initials="ON" color="primary" status="online"></sg-avatar>
<sg-avatar initials="OF" status="offline"></sg-avatar>
<sg-avatar initials="BU" color="error" status="busy"></sg-avatar>
<sg-avatar initials="AW" color="warning" status="away"></sg-avatar>
```

</ComponentPreview>

## Avatar Group

Stack multiple avatars by applying a negative margin via CSS. You can use `--avatar-border` and `--avatar-border-color` to add an outline so overlapping avatars remain distinct.

<ComponentPreview center>

```html
<div style="display:flex; align-items:center;">
  <sg-avatar initials="AA" color="primary" style="--avatar-border: 2px solid; z-index:4;"></sg-avatar>
  <sg-avatar
    initials="BB"
    color="secondary"
    style="--avatar-border: 2px solid; margin-left:-0.5rem; z-index:3;"></sg-avatar>
  <sg-avatar
    initials="CC"
    color="success"
    style="--avatar-border: 2px solid; margin-left:-0.5rem; z-index:2;"></sg-avatar>
  <sg-avatar
    initials="DD"
    color="warning"
    style="--avatar-border: 2px solid; margin-left:-0.5rem; z-index:1;"></sg-avatar>
</div>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute  | Type                                                                      | Default  | Description                                          |
| ---------- | ------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| `src`      | `string`                                                                  | —        | Image source URL                                     |
| `alt`      | `string`                                                                  | —        | Alt text; also used to derive initials automatically |
| `initials` | `string`                                                                  | —        | Explicit initials (e.g. `"JD"`) when no image loads  |
| `color`    | `'primary' \| 'secondary' \| 'info' \| 'success' \| 'warning' \| 'error'` | —        | Theme color for initials background                  |
| `size`     | `'sm' \| 'md' \| 'lg'`                                                    | `'md'`   | Component size                                       |
| `rounded`  | `'sm' \| 'md' \| 'lg' \| 'full'`                                          | `'full'` | Border radius                                        |
| `status`   | `'online' \| 'offline' \| 'busy' \| 'away'`                               | —        | Online presence indicator dot                        |

### CSS Custom Properties

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

## Accessibility

The avatar component follows WAI-ARIA best practices.

### `sg-avatar`

✅ **Screen Readers**

- Provide a meaningful `alt` attribute — it serves as the accessible name and is also used to derive initials automatically.
- Initials backgrounds are decorative; the `alt` text provides the accessible name.
- Status indicator dots are visual only — pair them with a contextual label in the surrounding UI when the status is meaningful.
