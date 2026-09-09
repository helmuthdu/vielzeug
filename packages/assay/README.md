# @vielzeug/assay

> Framework-agnostic DOM testing primitives — scoped queries, event dispatch, async waiting

## Installation

```sh
pnpm add -D @vielzeug/assay
npm install -D @vielzeug/assay
yarn add -D @vielzeug/assay
```

## Quick Start

```ts
import { dispatch, eventually, within } from '@vielzeug/assay';

const panel = document.querySelector('.panel')!;
const view = within(panel);

dispatch(view.get('button.submit'), new MouseEvent('click', { bubbles: true, cancelable: true }));

await eventually(() => expect(view.get('.status').textContent).toBe('Saved'), {
  message: 'save status did not settle',
});
```

## Documentation

- [Overview](https://vielzeug.dev/assay/)
- [Usage Guide](https://vielzeug.dev/assay/usage)
- [API Reference](https://vielzeug.dev/assay/api)
- [Examples](https://vielzeug.dev/assay/examples)
- [Migration Guide](https://vielzeug.dev/assay/migration)

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
