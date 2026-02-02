# <img src="/logo-logger.svg" alt="Logit" width="32" style="display: inline-block; vertical-align: middle; margin-right: 10px; margin-bottom: 10px;"> Logit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.1-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-7.1_KB-success" alt="Size">
</div>

**Logit** is a flexible, zero-dependency logging utility designed for both browser and Node.js environments. It provides a powerful set of features including log levels, custom themes, remote logging, and scoped loggers, all while maintaining a tiny footprint.

## 🚀 Key Features

- **Log Levels**: Standard levels (debug, info, warn, error) to manage verbosity.
- **Isomorphic**: Seamlessly works in both Browser (with CSS colors) and Node.js (with ANSI colors).
- **Scoped Loggers**: Create namespaced loggers to easily identify the source of log messages.
- **Custom Handlers**: Redirect logs to remote servers, files, or any custom destination.
- **Themes & Variants**: Fully customizable visual output to match your preferences or brand.
- **Advanced Utilities**: Built-in support for timing, grouping, and formatted tables.
- **Zero Dependencies**: Lightweight, fast, and secure.

## 🏁 Quick Start

```sh
pnpm add @vielzeug/logit
```

### Basic Usage

```ts
import { log } from '@vielzeug/logit';

log.info('System initialized');
log.warn('Memory usage high', { usage: '85%' });
log.error(new Error('Failed to fetch data'));

// Create a scoped logger
const apiLog = log.scope('API');
apiLog.info('Request started', { url: '/users' });
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Installation, global configuration, and scoped loggers.
- **[API Reference](./api.md)**: Complete list of methods, levels, and handler options.
- **[Examples](./examples.md)**: Patterns for remote logging, custom themes, and more.

## 💡 Why Logit?

While `console.log` is great for simple debugging, production applications require more structure. Logit provides the necessary features to manage application logs effectively across different environments without adding significant weight to your bundle.

---

> **Tip:** Logit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

