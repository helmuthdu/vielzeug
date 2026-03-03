---
title: Buildit — Usage Guide
description: Theming, customization, and accessibility patterns for Buildit.
---

# Buildit Usage Guide

::: tip New to Buildit?
Start with the [Overview](./index.md) for a quick introduction and installation, then come back here for in-depth usage patterns.
:::

[[toc]]

## Why Buildit?

Every project needs UI primitives. Buildit provides accessible web components that work natively anywhere HTML is rendered—no framework required.

```html
<!-- Before — roll your own button with ARIA -->
<button class="btn btn-primary" role="button" aria-pressed="false" tabindex="0">
  <span class="btn-spinner" aria-hidden="true"></span>
  Save
</button>

<!-- After — Buildit -->
<bdt-button variant="primary" loading>Save</bdt-button>
```

| Feature | Buildit | Shoelace | Material Web |
|---|---|---|---|
| Bundle size | <PackageInfo package="buildit" type="size" /> | ~145 kB | ~200 kB |
| Built with | Craftit | Lit | Lit |
| Accessible | WCAG AA | WCAG AA | WCAG AA |
| Framework agnostic | ✅ | ✅ | ✅ |

**Use Buildit when** you want accessible web components that match the Vielzeug design system without a heavy framework dependency.


Buildit is a collection of modular web components. You can install it via package manager or use it directly via CDN.

## Installation

### Package Manager

Install Buildit using your preferred package manager:

::: code-group

```bash [pnpm]
pnpm add @vielzeug/buildit
```

```bash [npm]
npm install @vielzeug/buildit
```

```bash [yarn]
yarn add @vielzeug/buildit
```

:::

### CDN

For quick prototyping or static sites, you can use a CDN:

```html
<script type="module">
  import 'https://esm.sh/@vielzeug/buildit@latest/button';
</script>
```

::: warning
CDN imports are not recommended for production as they bypass your build process and tree-shaking.
:::

## Basic Usage

### Import Global Styles [REQUIRED]

**Critical:** Before using any components, import the global styles in the correct order:

```typescript
import '@vielzeug/buildit/styles';
```

### Importing Components

Buildit uses modular imports for optimal tree-shaking. Import only the components you need:

```typescript
// Import everything
import '@vielzeug/buildit';

// Import specific components
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/checkbox';
```

### Using Components

Once imported, components are available as custom elements:

```html
<bit-button>Click me</bit-button>
```

### Setting Attributes

Set attributes directly on the custom element:

```html
<bit-button variant="outline" color="secondary" size="lg" disabled> Large Outline Button </bit-button>
```

### Event Handling

Components emit custom events. You can listen to them using standard `addEventListener`.

```javascript
const button = document.querySelector('bit-button');

button.addEventListener('click', (event) => {
  console.log('Button clicked!', event.detail);
});
```
Check the **[Framework Integration](./frameworks.md)** guide for specific instructions on using Buildit with React, Vue, Svelte, or Angular.
