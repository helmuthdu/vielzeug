# @vielzeug/necromancer

> Lifecycle-owned Web Animations API primitives with native access, per-handle groups, and additive FLIP

## Installation

```sh
pnpm add @vielzeug/necromancer
npm install @vielzeug/necromancer
yarn add @vielzeug/necromancer
```

## Quick Start

```ts
import { animate } from '@vielzeug/necromancer';

const button = document.createElement('button');
button.textContent = 'Save';
document.body.append(button);

const handle = animate(
  button,
  [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }],
  { duration: 180, easing: 'ease-out' },
);

handle.animation.pause();
await handle.result;
handle.dispose();
```

## Documentation

- [Overview](https://vielzeug.dev/necromancer/)
- [Usage Guide](https://vielzeug.dev/necromancer/usage)
- [API Reference](https://vielzeug.dev/necromancer/api)
- [Examples](https://vielzeug.dev/necromancer/examples)
- [Migration Guide](https://vielzeug.dev/necromancer/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
