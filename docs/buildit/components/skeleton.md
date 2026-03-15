# Skeleton

A loading placeholder component for representing content that has not loaded yet. Use it to reduce layout shift and provide immediate visual structure while data is fetched.

## Features

- Three visual variants: rect, circle, text
- Size variants: sm, md, lg
- First-class `width`, `height`, and `radius` attributes
- Multi-line text skeletons via `lines`
- Runtime animation toggle via `animated="false"`
- Diagonal striped pattern via `striped` for design-mode placeholders
- Shimmer animation with reduced-motion fallback
- Fully styleable through CSS custom properties
- Forced-colors support for high-contrast environments

## Source Code

::: details View Source Code
<<< @/../packages/buildit/src/feedback/skeleton/skeleton.ts
:::

## Basic Usage

```html
<bit-skeleton></bit-skeleton>
<bit-skeleton width="12rem" height="1rem"></bit-skeleton>

<script type="module">
  import '@vielzeug/buildit/skeleton';
</script>
```

## Variants

### Rectangle (Default)

<ComponentPreview center vertical>

```html
<bit-skeleton width="100%" height="1rem"></bit-skeleton> <bit-skeleton width="16rem" height="10rem"></bit-skeleton>
```

</ComponentPreview>

### Circle

<ComponentPreview center>

```html
<bit-skeleton variant="circle" size="sm"></bit-skeleton>
<bit-skeleton variant="circle" size="lg"></bit-skeleton>
<bit-skeleton variant="circle" width="3.5rem" height="3.5rem"></bit-skeleton>
```

</ComponentPreview>

### Text

<ComponentPreview center vertical>

```html
<bit-skeleton variant="text" lines="3" width="100%"></bit-skeleton>
<bit-skeleton variant="text" lines="2" width="70%"></bit-skeleton>
```

</ComponentPreview>

## Sizes

<ComponentPreview center vertical>

```html
<bit-skeleton size="sm" width="14rem"></bit-skeleton>
<bit-skeleton size="md" width="14rem"></bit-skeleton>
<bit-skeleton size="lg" width="14rem"></bit-skeleton>
```

</ComponentPreview>

## Common Patterns

### Card Placeholder

<ComponentPreview center vertical>

```html
<bit-card style="padding: var(--size-4); width: 20rem;">
  <bit-skeleton width="100%" height="10rem" style="margin-bottom: var(--size-4)"></bit-skeleton>
  <bit-skeleton variant="text" lines="3" width="100%"></bit-skeleton>
</bit-card>
```

</ComponentPreview>

### List Item Placeholder

<ComponentPreview center vertical>

```html
<div style="display: grid; gap: var(--size-3); width: 100%; max-width: 28rem;">
  <div style="display: flex; align-items: center; gap: var(--size-3);">
    <bit-skeleton variant="circle" width="2.25rem" height="2.25rem"></bit-skeleton>
    <div style="flex: 1; display: grid; gap: var(--size-2);">
      <bit-skeleton variant="text" width="40%"></bit-skeleton>
      <bit-skeleton variant="text" width="70%"></bit-skeleton>
    </div>
  </div>
</div>
```

</ComponentPreview>

## Animation Control

Use `animated="false"` for static placeholders.

<ComponentPreview center vertical>

```html
<bit-skeleton width="16rem" height="1rem"></bit-skeleton>
<bit-skeleton width="16rem" height="1rem" animated="false"></bit-skeleton>
```

</ComponentPreview>

## Striped

Add `striped` to replace the shimmer with a diagonal stripe pattern. Useful for designers building page layouts — the high-contrast stripes make it immediately obvious where content placeholders are, without relying on animation.

<ComponentPreview center>

```html
<bit-card padding="md" style="width: 280px;">
  <!-- Hero image area -->
  <bit-skeleton striped width="100%" height="160px" style="border-radius: 0; display: block;"></bit-skeleton>

  <bit-grid gap="md" style="margin-top: var(--size-4);">
    <!-- Avatar + author line -->
    <div style="display: flex; align-items: center; gap: var(--size-2);">
      <bit-skeleton striped variant="circle" width="2rem" height="2rem"></bit-skeleton>
      <bit-skeleton striped variant="text" width="6rem"></bit-skeleton>
    </div>

    <!-- Title -->
    <bit-skeleton striped width="90%" height="1.125rem"></bit-skeleton>

    <!-- Body text lines -->
    <bit-skeleton striped variant="text" lines="3" width="98%"></bit-skeleton>

    <!-- Action button -->
    <bit-skeleton striped width="7rem" height="2rem" style="border-radius: var(--rounded-md);"></bit-skeleton>
  </bit-grid>
</bit-card>
```

</ComponentPreview>

The spacing between lines is adjustable via the `--skeleton-stripe-size` CSS custom property:

```html
<bit-skeleton striped width="100%" height="2rem" style="--skeleton-stripe-size: 16px"></bit-skeleton>
```

## Guideline Recipe: Delight with Purposeful Loading States

**Guideline: delight** — a skeleton that mirrors the real content’s shape tells users exactly what’s coming and makes the perceived wait feel shorter.

```html
<!-- Show while team member data loads -->
<div style="display:flex;flex-direction:column;gap:var(--size-3)">
  <div style="display:flex;align-items:center;gap:var(--size-3)">
    <bit-skeleton variant="circle" size="lg"></bit-skeleton>
    <div style="flex:1;display:flex;flex-direction:column;gap:var(--size-1)">
      <bit-skeleton variant="text" style="width:120px"></bit-skeleton>
      <bit-skeleton variant="text" style="width:80px"></bit-skeleton>
    </div>
  </div>
  <bit-skeleton variant="rectangle" style="height:80px;border-radius:var(--radius-2)"></bit-skeleton>
</div>
```

**Tip:** Match the skeleton structure to the actual component layout (avatar + 2 text lines + content box) so there’s no jarring jump when real data arrives.

## API Reference

### Attributes

| Attribute  | Type                           | Default  | Description                                       |
| ---------- | ------------------------------ | -------- | ------------------------------------------------- |
| `variant`  | `'rect' \| 'circle' \| 'text'` | `'rect'` | Visual shape preset                               |
| `size`     | `'sm' \| 'md' \| 'lg'`         | -        | Height preset (`text`) and circle size (`circle`) |
| `width`    | `string`                       | -        | Width override (e.g. `12rem`, `70%`)              |
| `height`   | `string`                       | -        | Height override                                   |
| `radius`   | `string`                       | -        | Border-radius override                            |
| `animated` | `boolean`                      | `true`   | Set `animated="false"` to disable shimmer         |
| `lines`    | `number`                       | `1`      | Number of text lines (`variant="text"`)           |
| `striped`  | `boolean`                      | `false`  | Diagonal stripe pattern instead of shimmer        |

### Events

This component does not emit custom events.

### CSS Custom Properties

| Property                     | Description                                               | Default                     |
| ---------------------------- | --------------------------------------------------------- | --------------------------- |
| `--skeleton-bg`              | Base color                                                | `var(--color-contrast-200)` |
| `--skeleton-highlight`       | Shimmer highlight color                                   | `var(--color-contrast-100)` |
| `--skeleton-radius`          | Border radius                                             | `var(--rounded-md)`         |
| `--skeleton-size`            | Circle fallback size                                      | `var(--size-10)`            |
| `--skeleton-width`           | Component width                                           | `100%`                      |
| `--skeleton-height`          | Component height                                          | `var(--size-4)`             |
| `--skeleton-line-gap`        | Gap between text lines                                    | `var(--size-2)`             |
| `--skeleton-last-line-width` | Width of the final text line                              | `60%`                       |
| `--skeleton-duration`        | Shimmer animation duration                                | `1.6s`                      |
| `--skeleton-stripe-size`     | Spacing between the 1px diagonal lines (`striped`)        | `8px`                       |
| `--skeleton-stripe-color`    | Color of the diagonal lines and dashed border (`striped`) | `var(--color-contrast-400)` |

## Accessibility

The skeleton component follows WAI-ARIA best practices.

### `bit-skeleton`

✅ **Screen Readers**

- Skeleton placeholders are decorative and non-interactive.
- The internal visual element is marked with `aria-hidden="true"`.
- No focusable roles or tab stops are exposed.
- Animation is disabled for users with `prefers-reduced-motion: reduce`.

## Related Components

- [Progress](./progress.md) for explicit operation progress states
- [Card](./card.md) for content containers commonly paired with placeholders
- [Text](./text.md) for loaded content replacing text skeleton lines
