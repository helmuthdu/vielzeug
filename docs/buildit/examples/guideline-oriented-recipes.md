---
title: 'Buildit Examples — Guideline-Oriented Recipes'
description: 'Guideline-Oriented Recipes examples for buildit.'
---

## Guideline-Oriented Recipes

## Problem

Implement guideline-oriented recipes in a production-friendly way with `@vielzeug/buildit` while keeping setup and cleanup explicit.

## Runnable Example

The snippet below is copy-paste runnable in a TypeScript project with `@vielzeug/buildit` installed.

### Onboard: First-Run Empty State

<ComponentPreview vertical>

```html
<section
  style="
    max-width: 34rem;
    border: 1px solid var(--color-contrast-300);
    border-radius: 0.75rem;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--color-primary-backdrop) 35%, var(--color-canvas)) 0%,
      var(--color-canvas) 100%
    );
    padding: 1rem;
  ">
  <bit-badge color="info" variant="flat">New Workspace</bit-badge>
  <h3 style="margin: 0.75rem 0 0.25rem 0; font-size: var(--text-xl);">Start your first project</h3>
  <p style="margin: 0 0 1rem 0; color: var(--text-color-secondary);">
    Create a starter layout, then add your first form field.
  </p>

  <ol style="margin: 0; padding-left: 1.25rem; display: grid; gap: 0.5rem;">
    <li>Choose a template</li>
    <li>Set branding colors</li>
    <li>Invite teammates</li>
  </ol>

  <div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
    <bit-button variant="solid" color="primary">Create Project</bit-button>
    <bit-button variant="ghost" color="secondary">See Walkthrough</bit-button>
  </div>
</section>
```

</ComponentPreview>

### Bolder: High-Impact Primary Action

<ComponentPreview>

```html
<div
  style="
    border-radius: 1rem;
    padding: 1rem;
    display: grid;
    gap: 0.875rem;
    background:
      radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--color-warning) 16%, transparent), transparent 45%),
      radial-gradient(circle at 85% 0%, color-mix(in srgb, var(--color-success) 14%, transparent), transparent 48%),
      var(--color-canvas);
    border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-contrast-300));
  ">
  <div>
    <bit-badge color="warning" variant="solid">Launch Week</bit-badge>
    <h3 style="margin: 0.625rem 0 0.25rem 0; font-size: var(--text-2xl); line-height: var(--leading-tight);">
      Ship your campaign page today
    </h3>
    <p style="margin: 0; color: var(--text-color-secondary);">
      Use a strong primary action and one low-emphasis fallback action.
    </p>
  </div>

  <div style="display: flex; gap: 0.625rem; flex-wrap: wrap;">
    <bit-button
      variant="solid"
      color="primary"
      style="
        --button-padding: 0.75rem 1.25rem;
        --button-font-size: var(--text-base);
        --button-shadow: var(--shadow-lg);
      ">
      Publish Campaign
    </bit-button>
    <bit-button variant="outline" color="primary">Preview</bit-button>
  </div>
</div>
```

</ComponentPreview>

### Delight: Friendly Completion Moment

<ComponentPreview vertical>

```html
<section style="max-width: 28rem; display: grid; gap: 0.75rem;">
  <bit-input id="projectName" label="Project Name" placeholder="Acme Launch" clearable></bit-input>
  <bit-button id="completeSetup" color="success">Finish Setup</bit-button>

  <bit-alert id="setupDone" color="success" variant="flat" hidden>
    <strong>Nice work.</strong> Your workspace is ready.
  </bit-alert>
</section>

<script>
  const button = document.getElementById('completeSetup');
  const alert = document.getElementById('setupDone');

  button?.addEventListener('click', () => {
    button.setAttribute('loading', '');

    setTimeout(() => {
      button.removeAttribute('loading');
      alert.removeAttribute('hidden');

      // Small delight moment with a safe motion fallback.
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        alert.animate(
          [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 220, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)' },
        );
      }
    }, 700);
  });
</script>
```

</ComponentPreview>

## Expected Output

- The example runs without type errors in a standard TypeScript setup.
- The main flow produces the behavior described in the recipe title.

## Common Pitfalls

- Forgetting cleanup/dispose calls can leak listeners or stale state.
- Skipping explicit typing can hide integration issues until runtime.
- Not handling error branches makes examples harder to adapt safely.

## Related Recipes

- [Common Patterns](./common-patterns.md)
- [Settings Panel with Switches](./settings-panel-with-switches.md)
