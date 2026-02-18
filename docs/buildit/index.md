<PackageBadges package="buildit" />

<img src="/logo-buildit.svg" alt="Buildit Logo" width="156" class="logo-highlight"/>

# Buildit

**Production-ready, accessible web components for modern applications.**

Buildit is a comprehensive UI component library built with [@vielzeug/craftit](../craftit/), offering a collection of beautifully designed, fully accessible components that work seamlessly across all modern frameworks.

## 🚀 Key Features

- **🎨 Beautiful Design** – Thoughtfully designed components with multiple variants and colors
- **♿ Accessible** – WCAG 2.1 Level AA compliant with full keyboard and screen reader support
- **🎭 Customizable** – CSS custom properties for complete styling control
- **🌙 Theme Support** – Built-in light/dark mode support
- **📦 Tree-shakeable** – Import only what you need for optimal bundle size
- **🔧 Framework Agnostic** – Works with React, Vue, Svelte, Angular, or vanilla JS
- **⚡ Lightweight** – Minimal footprint with zero runtime dependencies
- **💪 TypeScript** – Full type safety with comprehensive type definitions
- **🧪 Well Tested** – Comprehensive unit and accessibility tests

## 🏁 Quick Start

### Installation

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

### Basic Usage

Import individual components for optimal tree-shaking:

```typescript
import '@vielzeug/buildit/button';
```

```html
<bit-button variant="solid" color="primary">
  Click me
</bit-button>
```

### With Different Frameworks

::: code-group

```tsx [React]
import '@vielzeug/buildit/button';

function App() {
  return (
    <bit-button variant="outline" color="secondary">
      React Button
    </bit-button>
  );
}
```

```vue [Vue]
<template>
  <bit-button variant="ghost" color="success">
    Vue Button
  </bit-button>
</template>

<script setup>
import '@vielzeug/buildit/button';
</script>
```

```svelte [Svelte]
<script>
  import '@vielzeug/buildit/button';
</script>

<bit-button variant="text" color="primary">
  Svelte Button
</bit-button>
```

```html [Vanilla]
<!DOCTYPE html>
<html>
  <body>
    <bit-button>Vanilla Button</bit-button>

    <script type="module">
      import '@vielzeug/buildit/button';
    </script>
  </body>
</html>
```

:::

## 📖 Core Concepts

### Web Components

Buildit components are built using native Web Components standards, ensuring:

- **Encapsulation** – Styles don't leak, preventing conflicts
- **Reusability** – Use the same components across different projects and frameworks
- **Standards-based** – Built on web platform APIs, future-proof
- **No Virtual DOM** – Direct DOM manipulation for optimal performance

### Design System

All components follow a consistent design system with:

- **Variants** – Different visual styles (solid, outline, ghost, etc.)
- **Colors** – Semantic color palette (primary, secondary, success, warning, error)
- **Sizes** – Multiple size options (sm, md, lg)
- **States** – Interactive states (hover, active, disabled, loading)

### Accessibility First

Every component is built with accessibility in mind:

- **Keyboard Navigation** – Full keyboard support
- **Screen Readers** – Proper ARIA labels and roles
- **Focus Management** – Visible focus indicators
- **Color Contrast** – WCAG AA compliant contrast ratios
- **Touch Targets** – Minimum 44x44px touch areas

### Customization

Customize components using CSS custom properties:

```html
<bit-button
  style="
    --btn-bg: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --btn-color: white;
    --btn-radius: 20px;
  ">
  Custom Button
</bit-button>
```

## 🎯 Available Components

### Base Components

- **[Button](./button.md)** – Versatile button with multiple variants and states
- **Input** – Text input with validation (coming soon)
- **Select** – Dropdown selection (coming soon)
- **Checkbox** – Checkbox input (coming soon)
- **Radio** – Radio button input (coming soon)
- **Switch** – Toggle switch (coming soon)

### Form Components

- **Form** – Form wrapper with validation (coming soon)
- **Field** – Form field with label and error handling (coming soon)
- **Textarea** – Multi-line text input (coming soon)

### Feedback Components

- **Alert** – Notification messages (coming soon)
- **Toast** – Temporary notifications (coming soon)
- **Modal** – Dialog overlay (coming soon)
- **Spinner** – Loading indicator (coming soon)

### Navigation Components

- **Tabs** – Tabbed navigation (coming soon)
- **Breadcrumbs** – Navigation breadcrumbs (coming soon)
- **Menu** – Dropdown menu (coming soon)

### Layout Components

- **Card** – Content container (coming soon)
- **Grid** – Responsive grid layout (coming soon)
- **Stack** – Vertical/horizontal stacking (coming soon)

## 🎨 Theming

Buildit supports automatic light/dark mode detection and manual theme control:

```html
<!-- Auto-detect system preference -->
<html>
  <body>
    <bit-button>Auto Theme</bit-button>
  </body>
</html>

<!-- Manual theme control -->
<html class="dark-theme">
  <body>
    <bit-button>Dark Theme</bit-button>
  </body>
</html>
```

Theme CSS variables can be customized globally:

```css
:root {
  --color-primary: #3b82f6;
  --color-success: #10b981;
  --color-error: #ef4444;
  /* ... more theme variables */
}

.dark-theme {
  --color-primary: #60a5fa;
  --color-success: #34d399;
  --color-error: #f87171;
  /* ... dark theme overrides */
}
```

## 📦 Bundle Size

Buildit is designed to be lightweight with tree-shaking support:

| Component | Size (gzipped) |
|-----------|----------------|
| Button    | ~6.8 KB        |
| Input     | Coming soon    |
| Select    | Coming soon    |

Import only what you need to keep your bundle small!

## 🧪 Testing

Buildit components are thoroughly tested:

- **Unit Tests** – Comprehensive component behavior tests
- **Accessibility Tests** – WCAG 2.1 Level AA compliance validation
- **Visual Tests** – Cross-browser visual regression tests
- **Integration Tests** – Real-world usage scenarios

All components maintain high test coverage to ensure reliability.

## 🌐 Browser Support

Buildit supports all modern browsers with Web Components support:

- Chrome 77+
- Firefox 93+
- Safari 16.4+
- Edge 79+

For older browsers, consider using [web components polyfills](https://github.com/webcomponents/polyfills).

## 🔗 Related Packages

Buildit works great with other Vielzeug packages:

- **[@vielzeug/craftit](../craftit/)** – Web components framework (used to build Buildit)
- **[@vielzeug/formit](../formit/)** – Form state management
- **[@vielzeug/validit](../validit/)** – Schema validation
- **[@vielzeug/i18nit](../i18nit/)** – Internationalization

## 📚 Documentation

- **[Button Component](./button.md)** – Complete button documentation with examples
- **[Usage Guide](./usage.md)** – Installation and basic usage
- **[API Reference](./api.md)** – Component API documentation
- **[Examples](./examples.md)** – Real-world examples and patterns

## ❓ FAQ

### Why Web Components?

Web Components are a set of web platform APIs that allow you to create reusable custom elements. They work across all modern frameworks without any additional wrapper code, making them truly universal and future-proof.

### How is this different from other component libraries?

Buildit is built on native Web Components standards, meaning:
- No framework lock-in
- No virtual DOM overhead
- Works everywhere (React, Vue, Svelte, vanilla JS)
- Smaller bundle sizes
- Future-proof with web standards

### Can I use this with my existing component library?

Yes! Buildit components are designed to coexist with other libraries. The web component custom elements don't conflict with framework components.

### How do I customize the look and feel?

Use CSS custom properties (CSS variables) to customize any component. Every component exposes a comprehensive set of custom properties for complete styling control.

### Is TypeScript supported?

Yes! Buildit is written in TypeScript and provides full type definitions for all components and their properties.

## 🐛 Troubleshooting

### Components not rendering

Make sure you've imported the component before using it:

```typescript
import '@vielzeug/buildit/button';
```

### Styles not applying

Web components use Shadow DOM, which encapsulates styles. Use CSS custom properties to customize:

```html
<bit-button style="--btn-bg: blue;">Button</bit-button>
```

### TypeScript errors

Ensure you have the latest version installed and that your tsconfig includes DOM types:

```json
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

## 🤝 Contributing

Contributions are welcome! Please see the [Contributing Guide](https://github.com/helmuthdu/vielzeug/blob/main/CONTRIBUTING.md) for details.

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [npm Package](https://www.npmjs.com/package/@vielzeug/buildit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/buildit/CHANGELOG.md)

