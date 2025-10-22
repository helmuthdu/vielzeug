# Toolkit Usage

How to install, import, and use the utils package in your project.

## Installation

```sh
pnpm add @vielzeug/toolkit
```

## Import

```ts
import { map, group, isString } from '@vielzeug/toolkit';
```

## Basic Usage

```ts
import { map } from '@vielzeug/toolkit';

const arr = [1, 2, 3];
const doubled = map(arr, (x) => x * 2); // [2, 4, 6]
```

## Advanced Usage

- Tree-shakeable: Only import what you need
- Type guards: e.g. `isString`, `isArray`, `isObject`
- Works in browser and Node.js

See the [API Reference](./api.md) and the sidebar for more details and examples.
