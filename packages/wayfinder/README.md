# @vielzeug/wayfinder

> Client-side router with middleware and guards

## Installation

```sh
pnpm add @vielzeug/wayfinder
npm install @vielzeug/wayfinder
yarn add @vielzeug/wayfinder
```

## Quick Start

```ts
import { createRouter } from '@vielzeug/wayfinder';

const router = createRouter({
  routes: {
    home: { path: '/' },
    dashboard: {
      path: '/dashboard',
      children: {
        index: { index: true },
        settings: {
          path: 'settings',
          data: async () => fetchSettings(),
        },
      },
    },
  },
  notFound: {
    data: () => ({ message: 'Not found' }),
  },
});

await router.ready;

// React to state changes:
router.subscribe((state) => {
  const leaf = state.matches.at(-1);
  render(leaf?.name, leaf?.data);
});

await router.navigate({ name: 'dashboard.settings' });
```

## Documentation

- [Overview](https://vielzeug.dev/wayfinder/)
- [Usage Guide](https://vielzeug.dev/wayfinder/usage)
- [API Reference](https://vielzeug.dev/wayfinder/api)
- [Examples](https://vielzeug.dev/wayfinder/examples)
- [Migration Guide](https://vielzeug.dev/wayfinder/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
