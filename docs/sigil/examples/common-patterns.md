---
title: 'Sigil Examples — Common Patterns'
description: 'Common Patterns examples for @vielzeug/sigil.'
---

## Common Patterns

### Problem

You need ready-to-use Sigil component patterns for common UI scenarios: form actions, confirmation dialogs, pagination, toolbars, loading states, and button groups.

### Solution

Compose Sigil components with standard HTML layout. Each snippet below is a self-contained, copy-paste runnable example.

#### Form Actions

<ComponentPreview>

```html
<form id="userForm">
  <sg-input type="text" name="username" placeholder="Username" required></sg-input>
  <sg-input type="email" name="email" placeholder="Email" required></sg-input>

  <div class="form-actions" style="display: flex; gap: 0.75rem; margin-top: 1rem;">
    <sg-button type="submit" variant="solid" color="success"> Save </sg-button>

    <sg-button type="reset" variant="outline" color="secondary"> Reset </sg-button>

    <sg-button type="button" variant="ghost" color="error"> Delete </sg-button>
  </div>
</form>
```

</ComponentPreview>

#### Confirmation Dialog

<ComponentPreview>

```html
<div style="padding: 1.5rem; border: 1px solid var(--color-contrast-300); border-radius: 0.5rem; max-width: 400px;">
  <h2 style="margin: 0 0 0.5rem 0; font-size: var(--text-lg);">Confirm Delete</h2>
  <p style="margin: 0 0 1.5rem 0; color: var(--text-color-secondary);">Are you sure you want to delete this item?</p>

  <div style="display: flex; gap: 0.75rem; justify-content: flex-end;">
    <sg-button variant="ghost" color="secondary"> Cancel </sg-button>

    <sg-button variant="solid" color="error"> Delete </sg-button>
  </div>
</div>
```

</ComponentPreview>

#### Pagination

<ComponentPreview>

```html
<div style="display: flex; align-items: center; gap: 0.5rem;">
  <sg-button variant="ghost" size="sm" disabled> Previous </sg-button>

  <sg-button variant="text" size="sm">1</sg-button>
  <sg-button variant="solid" size="sm">2</sg-button>
  <sg-button variant="text" size="sm">3</sg-button>
  <sg-button variant="text" size="sm">...</sg-button>
  <sg-button variant="text" size="sm">10</sg-button>

  <sg-button variant="ghost" size="sm"> Next </sg-button>
</div>
```

</ComponentPreview>

#### Toolbar

<ComponentPreview>

```html
<div
  style="display: flex; gap: 0.25rem; padding: 0.5rem; background: var(--color-contrast-100); border-radius: 0.375rem;">
  <sg-button variant="ghost" size="sm" icon-only aria-label="Bold">
    <strong>B</strong>
  </sg-button>

  <sg-button variant="ghost" size="sm" icon-only aria-label="Italic">
    <em>I</em>
  </sg-button>

  <sg-button variant="ghost" size="sm" icon-only aria-label="Underline">
    <u>U</u>
  </sg-button>

  <div style="width: 1px; background: var(--color-contrast-300); margin: 0 0.25rem;"></div>

  <sg-button variant="ghost" size="sm" icon-only aria-label="Link"> <sg-icon name="link" size="16"></sg-icon> </sg-button>
</div>
```

</ComponentPreview>

#### Loading States

<ComponentPreview>

```html
<div style="display: flex; gap: 0.75rem;">
  <sg-button variant="solid" color="primary"> Normal </sg-button>

  <sg-button variant="solid" color="primary" loading> Loading... </sg-button>

  <sg-button variant="solid" color="primary" disabled> Disabled </sg-button>
</div>
```

</ComponentPreview>

#### Button Group

<ComponentPreview>

```html
<sg-button-group attached>
  <sg-button variant="bordered">Day</sg-button>
  <sg-button variant="solid">Week</sg-button>
  <sg-button variant="bordered">Month</sg-button>
</sg-button-group>
```

</ComponentPreview>

### Pitfalls

- Import `@vielzeug/sigil/styles` before any component import or buttons and inputs render without design tokens.
- `<sg-button-group>` requires the `attached` attribute to merge borders visually; omitting it renders buttons with gaps.
- Use `type="submit"` and `type="reset"` on `<sg-button>` inside a `<form>` — the default type is `'button'`, which does not submit or reset.

### Related

- [Guideline-Oriented Recipes](./guideline-oriented-recipes.md)
- [Settings Panel with Switches](./settings-panel-with-switches.md)
