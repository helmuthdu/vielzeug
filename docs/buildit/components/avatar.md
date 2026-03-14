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
<<< @/../packages/buildit/src/content/avatar/avatar.ts
:::

## Basic Usage

```html
<bit-avatar src="https://i.pravatar.cc/150?img=1" alt="Jane Doe"></bit-avatar>

<script type="module">
  import '@vielzeug/buildit';
</script>
```

## Fallback to Initials

When no image is provided (or the image fails to load), the avatar displays initials derived from the `alt` attribute, or explicitly from `initials`.

<ComponentPreview center>

```html
<bit-avatar alt="Jane Doe"></bit-avatar>
<bit-avatar initials="JD" color="primary"></bit-avatar>
<bit-avatar initials="AB" color="success"></bit-avatar>
<bit-avatar initials="XY" color="warning"></bit-avatar>
```

</ComponentPreview>

## Colors

Use `color` to apply one of the semantic theme colors to the initials background.

<ComponentPreview center>

```html
<bit-avatar initials="PR" color="primary"></bit-avatar>
<bit-avatar initials="SE" color="secondary"></bit-avatar>
<bit-avatar initials="IN" color="info"></bit-avatar>
<bit-avatar initials="SU" color="success"></bit-avatar>
<bit-avatar initials="WA" color="warning"></bit-avatar>
<bit-avatar initials="ER" color="error"></bit-avatar>
```

</ComponentPreview>

## Sizes

<ComponentPreview center>

```html
<bit-avatar initials="SM" size="sm"></bit-avatar>
<bit-avatar initials="MD" size="md"></bit-avatar>
<bit-avatar initials="LG" size="lg"></bit-avatar>
```

</ComponentPreview>

## Rounded

Control the border-radius with `rounded`. Defaults to `full` (circular).

<ComponentPreview center>

```html
<bit-avatar initials="SM" rounded="sm"></bit-avatar>
<bit-avatar initials="MD" rounded="md"></bit-avatar>
<bit-avatar initials="LG" rounded="lg"></bit-avatar>
<bit-avatar initials="FL" rounded="full"></bit-avatar>
```

</ComponentPreview>

## Status Indicator

Add a colored status dot with the `status` attribute.

<ComponentPreview center>

```html
<bit-avatar initials="ON" color="primary" status="online"></bit-avatar>
<bit-avatar initials="OF" status="offline"></bit-avatar>
<bit-avatar initials="BU" color="error" status="busy"></bit-avatar>
<bit-avatar initials="AW" color="warning" status="away"></bit-avatar>
```

</ComponentPreview>

## Avatar Group

Stack multiple avatars by applying a negative margin via CSS. You can use `--avatar-border` and `--avatar-border-color` to add an outline so overlapping avatars remain distinct.

<ComponentPreview center>

```html
<div style="display:flex; align-items:center;">
  <bit-avatar initials="AA" color="primary" style="--avatar-border: 2px solid; z-index:4;"></bit-avatar>
  <bit-avatar
    initials="BB"
    color="secondary"
    style="--avatar-border: 2px solid; margin-left:-0.5rem; z-index:3;"></bit-avatar>
  <bit-avatar
    initials="CC"
    color="success"
    style="--avatar-border: 2px solid; margin-left:-0.5rem; z-index:2;"></bit-avatar>
  <bit-avatar
    initials="DD"
    color="warning"
    style="--avatar-border: 2px solid; margin-left:-0.5rem; z-index:1;"></bit-avatar>
</div>
```

</ComponentPreview>

## Guideline Recipe: Onboard User Identity

**Guideline: onboard** — pairing an avatar with a name and role helps new users immediately orient themselves in the product.

```html
<div style="display:flex;align-items:center;gap:var(--size-3)">
  <bit-avatar size="lg" initials="JS" color="primary" status="online"></bit-avatar>
  <div>
    <bit-text variant="label" weight="semibold">Jane Smith</bit-text>
    <bit-text variant="caption" color="subtle">Product Designer · Pro plan</bit-text>
  </div>
</div>
```

**Tip:** Use `status="online"` during onboarding flows to signal an active, connected account.

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

### `bit-avatar`

✅ **Screen Readers**

- Provide a meaningful `alt` attribute — it serves as the accessible name and is also used to derive initials automatically.
- Initials backgrounds are decorative; the `alt` text provides the accessible name.
- Status indicator dots are visual only — pair them with a contextual label in the surrounding UI when the status is meaningful.
