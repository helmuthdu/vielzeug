# @vielzeug/refine

> Accessible, themeable web components built on ore

## Installation

```sh
pnpm add @vielzeug/refine
npm install @vielzeug/refine
yarn add @vielzeug/refine
```

## Quick Start

```ts
// Required once: design tokens and cascade layers
import '@vielzeug/refine/tokens.css';

// Optional browser-default reset
import '@vielzeug/refine/styles/preflight.css';

// Optional typed DOM tag map
import type {} from '@vielzeug/refine/frameworks/elements';

// Register only the components you use
import '@vielzeug/refine/button';
import '@vielzeug/refine/card';
import '@vielzeug/refine/input';
import '@vielzeug/refine/avatar';
import '@vielzeug/refine/avatar-group';
import '@vielzeug/refine/carousel';
import '@vielzeug/refine/datagrid';
import '@vielzeug/refine/marquee';
import '@vielzeug/refine/time-picker';
```

```html
<ore-button variant="solid" color="primary">Save</ore-button>

<ore-input label="Email" type="email" required></ore-input>

<ore-card padding="lg">
  <span slot="header">Account</span>
  <p>Build forms, layouts, overlays, and feedback UI with native custom elements.</p>
</ore-card>

<ore-avatar src="/alice.jpg" name="Alice"></ore-avatar>
<ore-avatar-group max="3">
  <ore-avatar name="Alice"></ore-avatar>
  <ore-avatar name="Bob"></ore-avatar>
  <ore-avatar name="Carol"></ore-avatar>
</ore-avatar-group>

<ore-carousel>
  <ore-carousel-slide>Slide 1</ore-carousel-slide>
  <ore-carousel-slide>Slide 2</ore-carousel-slide>
</ore-carousel>
```

## Documentation

- [Overview](https://vielzeug.dev/refine/)
- [Usage Guide](https://vielzeug.dev/refine/usage)
- [API Reference](https://vielzeug.dev/refine/api)
- [Migration Guide](https://vielzeug.dev/refine/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
