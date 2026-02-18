# Components

Production-ready, accessible web components built with [@vielzeug/craftit](../craftit/index.md).

## Philosophy

- **Framework Agnostic** - Works with React, Vue, Svelte, or vanilla JS
- **TypeScript First** - Full type safety and IntelliSense support
- **Accessible** - ARIA compliant with keyboard navigation
- **Customizable** - CSS custom properties for theming
- **Lightweight** - Minimal dependencies, small bundle sizes
- **Modern** - Built with Web Components and Shadow DOM

## Available Components

### Base Components

<div class="component-grid">

<div class="component-card">

#### [Button](./button.md)

Versatile button with variants, colors, sizes, and states

- 6 variants
- 5 semantic colors
- Loading & disabled states
- Icon support

[View Docs →](./button.md)

</div>

<div class="component-card coming-soon">

#### Input

Text input with validation

Coming soon

</div>

<div class="component-card coming-soon">

#### Select

Dropdown selection

Coming soon

</div>

<div class="component-card coming-soon">

#### Checkbox

Checkbox input

Coming soon

</div>

</div>

## Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/components
```

```sh [npm]
npm install @vielzeug/components
```

```sh [yarn]
yarn add @vielzeug/components
```

:::

## Quick Start

```html
<!DOCTYPE html>
<html>
  <body>
    <bit-button variant="outline" color="primary">
      Click me
    </bit-button>

    <script type="module">
      import '@vielzeug/components/button';
    </script>
  </body>
</html>
```

## Browser Support

All components require modern browsers with Web Components support:

- Chrome 77+
- Firefox 93+
- Safari 16.4+
- Edge 79+

## Contributing

Components are part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo. Contributions are welcome!

<style scoped>
.component-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  margin: 2rem 0;
}

.component-card {
  padding: 1.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.component-card:hover:not(.coming-soon) {
  border-color: var(--vp-c-brand);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.component-card.coming-soon {
  opacity: 0.6;
}

.component-card h4 {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.component-card p {
  margin: 0.5rem 0;
  font-size: 0.9em;
  color: var(--vp-c-text-2);
}

.component-card ul {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
  font-size: 0.9em;
}

.component-card a {
  text-decoration: none;
  color: var(--vp-c-brand);
  font-weight: 500;
}
</style>

