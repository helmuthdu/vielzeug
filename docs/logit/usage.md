# Logit Usage

How to install, import, and use the logger package in your project.

## Installation

```sh
pnpm add @vielzeug/logit
```

## Import

```ts
import { Logit } from '@vielzeug/logit';
```

## Basic Usage

```ts
Logit.info('Hello world!');
Logit.warn('This is a warning');
Logit.error('Something went wrong');
```

## Advanced Usage

- Set log level: `Logit.setLogLevel('warn')`
- Set namespace: `Logit.setPrefix('MyApp')`
- Use remote logging: `Logit.setRemote({ handler: (type, ...args) => {/* ... */}, logLevel: 'error' })`
- Change variant: `Logit.setVariant('icon')`
- Show/hide timestamp: `Logit.showTimestamp(false)`

See the [API Reference](./api.md) and [Examples](./examples.md) for more details.
