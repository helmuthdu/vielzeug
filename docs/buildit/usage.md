# Installation & Usage

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

### Importing Components

Buildit uses modular imports for optimal tree-shaking. Import only the components you need:

```typescript
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
<bit-button
  variant="outline"
  color="secondary"
  size="lg"
  disabled>
  Large Outline Button
</bit-button>
```

### Event Handling

Components emit custom events. You can listen to them using standard `addEventListener`.

```javascript
const button = document.querySelector('bit-button');

button.addEventListener('click', (event) => {
  console.log('Button clicked!', event.detail);
});
```

---

Check the **[Framework Integration](./frameworks.md)** guide for specific instructions on using Buildit with React, Vue, Svelte, or Angular.
