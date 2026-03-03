# @vielzeug/logit

> Structured, colourful logging with log levels, namespaces, scopes, and remote transport

[![npm version](https://img.shields.io/npm/v/@vielzeug/logit)](https://www.npmjs.com/package/@vielzeug/logit) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Logit** is a developer-friendly logger that adds colour, log-level filtering, timestamps, and scoped contexts on top of the browser/Node console — with optional remote transport for production error reporting.

## Installation

```sh
pnpm add @vielzeug/logit
# npm install @vielzeug/logit
# yarn add @vielzeug/logit
```

## Quick Start

```typescript
import { Logit } from '@vielzeug/logit';

// Global configuration
Logit.config({
  logLevel: 'debug',
  variant: 'compact',   // 'pretty' | 'compact' | 'json'
  namespace: 'myapp',
  timestamp: true,
});

const log = Logit('auth');

log.info('User logged in', { userId: 42 });
log.warn('Token expiring soon');
log.error('Login failed', new Error('Invalid credentials'));
```

## Features

- ✅ **Log levels** — `debug`, `trace`, `info`, `success`, `warn`, `error`
- ✅ **Namespaces** — create named loggers with `Logit(name)` or `Logit.scope(name)`
- ✅ **Variants** — `pretty` (coloured), `compact`, or `json` output
- ✅ **Timestamps** — opt-in ISO timestamps on every log line
- ✅ **Remote transport** — send logs to a remote URL for production observability
- ✅ **Assertions** — `Logit.assert(condition, ...args)` — logs if condition is falsy
- ✅ **Timers** — `Logit.time(label)` / `Logit.timeEnd(label)` for profiling
- ✅ **Tables** — `Logit.table(data)` for structured tabular output

## Usage

### Named Loggers

```typescript
import { Logit } from '@vielzeug/logit';

const log = Logit('network');

log.debug('Fetching', url);
log.info('Response', { status: 200, url });
log.success('Loaded', data);
log.warn('Slow response', { ms: 1200 });
log.error('Request failed', error);
```

### Global Configuration

```typescript
Logit.config({
  logLevel: 'warn',           // suppress debug/trace/info below this level
  variant: 'json',            // structured JSON output
  namespace: '[myapp]',       // prefix for all logs
  timestamp: true,            // include ISO timestamp
  remote: {
    url: 'https://logs.example.com/ingest',
    level: 'error',           // only send errors remotely
  },
});

// Read current config
const cfg = Logit.getConfig();
```

### Scoped Loggers

```typescript
const baseLog = Logit('app');
const authLog = Logit.scope('auth');  // inherits parent config

authLog.info('Session started');
```

### Timers and Tables

```typescript
Logit.time('render');
await render();
Logit.timeEnd('render');

Logit.table([{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]);
```

### Assertions and Groups

```typescript
Logit.assert(condition, 'Condition failed', { context });

Logit.groupCollapsed('Details');
log.debug('Detail 1');
log.debug('Detail 2');
Logit.groupEnd();
```

## API

| Export | Description |
|---|---|
| `Logit(name?)` | Create a named logger |
| `Logit.config(options)` | Set global log configuration |
| `Logit.getConfig()` | Read current global config |
| `Logit.scope(name)` | Create a scoped child logger |
| `Logit.assert(cond, ...args)` | Log if condition is falsy |
| `Logit.time(label)` | Start a named timer |
| `Logit.timeEnd(label)` | End and print a timer |
| `Logit.table(data)` | Print tabular data |
| `Logit.groupCollapsed(label)` | Start a collapsed group |
| `Logit.groupEnd()` | End a group |
| `Logit.toggleEnvironment()` | Toggle dev/prod environment filter |
| `Logit.toggleTimestamp()` | Toggle timestamps on/off |

### Config Options

| Option | Type | Description |
|---|---|---|
| `logLevel` | `'debug' \| 'trace' \| 'info' \| 'warn' \| 'error'` | Minimum level to output |
| `variant` | `'pretty' \| 'compact' \| 'json'` | Output format |
| `namespace` | `string` | Global prefix applied to all loggers |
| `timestamp` | `boolean` | Include ISO timestamp |
| `remote` | `{ url, level, headers? }` | Remote transport config |

## Documentation

Full docs at **[vielzeug.dev/logit](https://vielzeug.dev/logit)**

| | |
|---|---|
| [Usage Guide](https://vielzeug.dev/logit/usage) | Log levels, namespaces, configuration |
| [API Reference](https://vielzeug.dev/logit/api) | Complete type signatures |
| [Examples](https://vielzeug.dev/logit/examples) | Real-world logging patterns |

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu) — Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) monorepo.
