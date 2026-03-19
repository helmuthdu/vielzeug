# @vielzeug/buildit

> Accessible, themeable web components built with Craftit for apps that want framework-agnostic UI primitives.

[![npm version](https://img.shields.io/npm/v/@vielzeug/buildit)](https://www.npmjs.com/package/@vielzeug/buildit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Buildit** is the Vielzeug component library. It ships accessible custom elements for actions, forms, content, overlays, layout, and feedback — all built on top of `@vielzeug/craftit`, styled with CSS custom properties, and published as side-effect entry points for explicit runtime registration.

## Installation

```sh
pnpm add @vielzeug/buildit
# npm install @vielzeug/buildit
# yarn add @vielzeug/buildit
```

## Quick Start

```ts
// Required once: design tokens + base component styles
import '@vielzeug/buildit/styles';

// Register only the components you use
import '@vielzeug/buildit/button';
import '@vielzeug/buildit/card';
import '@vielzeug/buildit/input';
```

```html
<bit-button variant="solid" color="primary">Save</bit-button>

<bit-input label="Email" type="email" required></bit-input>

<bit-card padding="lg">
  <span slot="header">Account</span>
  <p>Build forms, layouts, overlays, and feedback UI with native custom elements.</p>
</bit-card>
```

To register everything at once:

```ts
import '@vielzeug/buildit/styles';
import '@vielzeug/buildit';
```

## Features

- ✅ **Framework-agnostic custom elements** — works with vanilla DOM, React, Vue, Svelte, Angular, and SSR-friendly client hydration flows
- ✅ **Accessible by default** — keyboard navigation, ARIA wiring, focus management, and form-associated controls
- ✅ **Granular runtime imports** — register only the elements you need via subpath imports like `@vielzeug/buildit/button`
- ✅ **Design-token based styling** — global styles plus CSS custom properties for local overrides
- ✅ **Domain-organized package surface** — actions, content, disclosure, feedback, form, layout, and overlay primitives
- ✅ **Published subpaths** — components, `styles`, and shared `types` are exposed directly

## Package Structure

### Global entry points

| Import | Purpose |
|---|---|
| `@vielzeug/buildit` | Register all published components and re-export shared symbols/types |
| `@vielzeug/buildit/styles` | Global design tokens and shared component styles |
| `@vielzeug/buildit/types` | Shared TypeScript types |

### Component entry points

**Actions**

`button`, `button-group`

**Content**

`avatar`, `breadcrumb`, `card`, `pagination`, `separator`, `table`, `text`

**Disclosure**

`accordion`, `accordion-item`, `tabs`, `tab-item`, `tab-panel`

**Feedback**

`alert`, `badge`, `chip`, `progress`, `skeleton`, `toast`

**Form**

`checkbox`, `checkbox-group`, `combobox`, `file-input`, `form`, `input`, `number-input`, `otp-input`, `radio`, `radio-group`, `rating`, `select`, `slider`, `switch`, `textarea`

**Layout**

`box`, `grid`, `grid-item`, `sidebar`

**Overlay**

`dialog`, `drawer`, `menu`, `popover`, `tooltip`

## Usage Notes

- Import `@vielzeug/buildit/styles` before registering components.
- Component subpaths are **side-effect imports** that register one published custom element entry point.
- The root package both **registers all published components** and re-exports tags, types, and shared symbols.
- Prefer subpath imports for application code when you want tighter control over registration and bundle size.
- Prefer declarative attributes and slots over manual DOM mutation.

## API Summary

| Area | Notes |
|---|---|
| Components | Registered via subpath imports like `@vielzeug/buildit/button` |
| Styles | `@vielzeug/buildit/styles`, plus `styles/theme.css`, `styles/animation.css`, and `styles/layers.css` |
| Types | Shared types via `@vielzeug/buildit/types`; component prop types are re-exported from the package root |

## Documentation

Full docs at **[vielzeug.dev/buildit](https://vielzeug.dev/buildit)**

| | |
|---|---|
| [Overview](https://vielzeug.dev/buildit/) | Installation, import strategy, component domains |
| [Usage Guide](https://vielzeug.dev/buildit/usage) | Slots, events, accessibility, and best practices |
| [Framework Integration](https://vielzeug.dev/buildit/frameworks) | React, Vue, Svelte, Angular, and SSR notes |
| [Theming](https://vielzeug.dev/buildit/theming) | Tokens, dark mode, and customization |
| [API Reference](https://vielzeug.dev/buildit/api) | Import paths, component APIs, and styling hooks |
| [Examples](https://vielzeug.dev/buildit/examples) | Real-world usage patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.

