---
title: 'Sigil Examples — Common Patterns'
description: 'Common Patterns examples for block.'
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
  <bit-input type="text" name="username" placeholder="Username" required></bit-input>
  <bit-input type="email" name="email" placeholder="Email" required></bit-input>

  <div class="form-actions" style="display: flex; gap: 0.75rem; margin-top: 1rem;">
    <bit-button type="submit" variant="solid" color="success"> Save </bit-button>

    <bit-button type="reset" variant="outline" color="secondary"> Reset </bit-button>

    <bit-button type="button" variant="ghost" color="error"> Delete </bit-button>
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
    <bit-button variant="ghost" color="secondary"> Cancel </bit-button>

    <bit-button variant="solid" color="error"> Delete </bit-button>
  </div>
</div>
```

</ComponentPreview>

#### Pagination

<ComponentPreview>

```html
<div style="display: flex; align-items: center; gap: 0.5rem;">
  <bit-button variant="ghost" size="sm" disabled> Previous </bit-button>

  <bit-button variant="text" size="sm">1</bit-button>
  <bit-button variant="solid" size="sm">2</bit-button>
  <bit-button variant="text" size="sm">3</bit-button>
  <bit-button variant="text" size="sm">...</bit-button>
  <bit-button variant="text" size="sm">10</bit-button>

  <bit-button variant="ghost" size="sm"> Next </bit-button>
</div>
```

</ComponentPreview>

#### Toolbar

<ComponentPreview>

```html
<div
  style="display: flex; gap: 0.25rem; padding: 0.5rem; background: var(--color-contrast-100); border-radius: 0.375rem;">
  <bit-button variant="ghost" size="sm" icon-only aria-label="Bold">
    <strong>B</strong>
  </bit-button>

  <bit-button variant="ghost" size="sm" icon-only aria-label="Italic">
    <em>I</em>
  </bit-button>

  <bit-button variant="ghost" size="sm" icon-only aria-label="Underline">
    <u>U</u>
  </bit-button>

  <div style="width: 1px; background: var(--color-contrast-300); margin: 0 0.25rem;"></div>

  <bit-button variant="ghost" size="sm" icon-only aria-label="Link"> 🔗 </bit-button>
</div>
```

</ComponentPreview>

#### Loading States

<ComponentPreview>

```html
<div style="display: flex; gap: 0.75rem;">
  <bit-button variant="solid" color="primary"> Normal </bit-button>

  <bit-button variant="solid" color="primary" loading> Loading... </bit-button>

  <bit-button variant="solid" color="primary" disabled> Disabled </bit-button>
</div>
```

</ComponentPreview>

#### Button Group

<ComponentPreview>

```html
<bit-button-group attached>
  <bit-button variant="bordered">Day</bit-button>
  <bit-button variant="solid">Week</bit-button>
  <bit-button variant="bordered">Month</bit-button>
</bit-button-group>
```

</ComponentPreview>

### Related

- [Guideline-Oriented Recipes](./guideline-oriented-recipes.md)
- [Settings Panel with Switches](./settings-panel-with-switches.md)
