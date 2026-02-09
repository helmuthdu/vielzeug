<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.1-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-7.1_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Zero Dependencies">
</div>

<img src="/logo-logger.svg" alt="Logit Logo" width="156" class="logo-highlight"/>

# Logit

**Logit** is a flexible, zero-dependency logging utility designed for both browser and Node.js environments. It provides a powerful set of features including log levels, custom themes, remote logging, and scoped loggers, all while maintaining a tiny footprint.

## Screenshot

![Logit Screenshot](/logit_ss.png)

## What Problem Does Logit Solve?

Console logging is great for development but lacks structure for production apps. You need log levels, namespacing, remote logging, and environment-specific filtering—all without adding complexity or dependencies.

**Without Logit**:

```ts
// Unstructured, hard to filter, no remote logging
console.log('[API] User login:', user);
console.warn('[API] High memory usage:', usage);

// No way to disable logs in production
if (process.env.NODE_ENV !== 'production') {
  console.log('Debug info');
}

// Manual remote logging setup
fetch('/api/logs', {
  method: 'POST',
  body: JSON.stringify({ level: 'error', message: error.message }),
});
```

**With Logit**:

```ts
// Structured, filterable, styled output
import { Logit } from '@vielzeug/logit';

Logit.setPrefix('API');
Logit.info('User login:', user);
Logit.warn('High memory usage:', usage);

// Automatically respects log level
Logit.setLogLevel('warn'); // Debug/info logs now silent

// Automatic remote logging
Logit.setRemote({
  handler: (type, ...args) => {
    if (type === 'error') {
      fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ type, args }),
      });
    }
  },
  logLevel: 'error',
});
```

### Comparison with Alternatives

| Feature            | Logit          | Winston       | Pino       | Console   |
| ------------------ | -------------- | ------------- | ---------- | --------- |
| TypeScript Support | ✅ First-class | ✅ Good       | ✅ Good    | ⚠️ Basic  |
| Browser Support    | ✅ Native      | ❌            | ❌         | ✅        |
| Namespacing        | ✅ Built-in    | ⚠️ Manual     | ⚠️ Child   | ❌        |
| Remote Logging     | ✅ Built-in    | ✅ Transports | ✅ Streams | ❌        |
| Bundle Size (gzip) | ~7.1KB         | ~50KB+        | ~12KB      | 0KB       |
| Node.js Support    | ✅             | ✅            | ✅         | ✅        |
| Dependencies       | 0              | 15+           | 5+         | N/A       |
| Colored Output     | ✅ Auto        | ✅            | ✅         | ⚠️ Manual |

## When to Use Logit

**✅ Use Logit when you:**

- Need isomorphic logging (browser + Node.js) with styled output
- Want namespace/prefix support for different modules
- Require remote logging capabilities
- Need log level filtering for production vs development
- Want zero dependencies for security and minimal bundle size
- Build full-stack TypeScript applications
- Need visual themes and customizable output formats

**❌ Consider alternatives when you:**

- Only need Node.js logging with file rotation (use Winston/Pino)
- Need advanced log rotation and file management
- Require high-throughput server logging (use Pino)
- Simple console.log is sufficient for your use case

## 🚀 Key Features

- **Log Levels**: Standard levels (debug, info, success, warn, error, trace, table) with filtering
- **Isomorphic**: Seamlessly works in both Browser (with CSS styling) and Node.js
- **Namespacing**: Add prefixes to logs to identify the source
- **Remote Logging**: Built-in support for sending logs to remote endpoints
- **Themes & Variants**: Customizable visual output (text, icon, symbol variants)
- **Advanced Utilities**: Built-in support for timing, grouping, tables, and assertions
- **Environment Detection**: Automatic production/development indicators
- **Zero Dependencies**: Lightweight, fast, and secure
- **Type-safe**: Full TypeScript support with proper type definitions

## 🏁 Quick Start

### Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/logit
```

```sh [npm]
npm install @vielzeug/logit
```

```sh [yarn]
yarn add @vielzeug/logit
```

:::

### Basic Usage

```ts
import { Logit } from '@vielzeug/logit';

// Standard log levels
Logit.debug('Debugging information', { userId: '123' });
Logit.info('System initialized');
Logit.success('Operation completed successfully');
Logit.warn('Memory usage high', { usage: '85%' });
Logit.error('Failed to fetch data', new Error('Network error'));

// Add namespace for different modules
Logit.setPrefix('API');
Logit.info('Request started', { url: '/users' });

// Change to database context
Logit.setPrefix('Database');
Logit.info('Connection established');

// Control log level globally
Logit.setLogLevel('warn'); // Only warn and error will show

// Advanced features
Logit.table([
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
]);
Logit.time('operation');
// ... do work ...
Logit.timeEnd('operation');
```

### Real-World Example: Full-Stack App

```ts
import { Logit } from '@vielzeug/logit';

// Configure for production
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
  Logit.setLogLevel('warn');

  // Send errors to remote logging service
  Logit.setRemote({
    handler: async (type, ...args) => {
      if (type === 'error') {
        await fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            level: type,
            prefix: Logit.getPrefix(),
            args: args.map((arg) => (arg instanceof Error ? { message: arg.message, stack: arg.stack } : arg)),
          }),
        });
      }
    },
    logLevel: 'error',
  });
}

// Configure display options
Logit.initialise({
  variant: 'symbol',
  timestamp: true,
  environment: true,
  namespace: 'MyApp',
});

// Use throughout your application
Logit.setPrefix('Auth');
Logit.info('User logged in', { userId: user.id });

Logit.setPrefix('API');
Logit.warn('Rate limit approaching', { remaining: 10 });

Logit.setPrefix('Cache');
Logit.error('Cache connection failed', new Error('Redis timeout'));
```

### Framework Integration: React

```tsx
import { Logit } from '@vielzeug/logit';
import { useEffect } from 'react';

function UserProfile({ userId }: { userId: string }) {
  useEffect(() => {
    Logit.setPrefix('UserProfile');
    Logit.debug('Component mounted', { userId });

    return () => {
      Logit.debug('Component unmounted', { userId });
    };
  }, [userId]);

  const handleClick = () => {
    try {
      // ... do something
      Logit.setPrefix('UserProfile');
      Logit.info('Button clicked', { userId });
    } catch (error) {
      Logit.setPrefix('UserProfile');
      Logit.error('Action failed', error);
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Framework Integration: Express

```ts
import express from 'express';
import { Logit } from '@vielzeug/logit';

const app = express();

Logit.setPrefix('Server');

// Request logging middleware
app.use((req, res, next) => {
  Logit.setPrefix(`${req.method} ${req.path}`);
  Logit.info('Request started', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    Logit.setPrefix(`${req.method} ${req.path}`);

    if (res.statusCode >= 400) {
      Logit.error('Request failed', {
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    } else {
      Logit.info('Request completed', {
        status: res.statusCode,
        duration: `${duration}ms`,
      });
    }
  });

  next();
});

app.listen(3000, () => {
  Logit.setPrefix('Server');
  Logit.info('Server started', { port: 3000 });
});
```

## 📚 Documentation

- **[Usage Guide](./usage.md)**: Installation, global configuration, and scoped loggers
- **[API Reference](./api.md)**: Complete list of methods, levels, and handler options
- **[Examples](./examples.md)**: Patterns for remote logging, custom themes, and more

## ❓ FAQ

### Is Logit production-ready?

Yes! Logit is used in production applications and has comprehensive test coverage.

### How do I disable logs in production?

```ts
if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
  Logit.setLogLevel('error'); // Only show errors
  // or
  Logit.setLogLevel('off'); // Disable all logs
}
```

### Can I send logs to multiple destinations?

The `setRemote` handler can call multiple services:

```ts
Logit.setRemote({
  handler: async (type, ...args) => {
    // Send to multiple destinations
    await Promise.all([sendToSentry(type, args), sendToCloudWatch(type, args), writeToFile(type, args)]);
  },
  logLevel: 'error',
});
```

### How do I format log output?

Logit automatically formats output based on environment (browser CSS vs Node.js). Customize with variants:

::: code-group

```ts [Symbol Variant]
Logit.setVariant('symbol');
// Output: 🅳, 🅸, 🅂, 🆆, 🅴
```

```ts [Icon Variant]
Logit.setVariant('icon');
// Output: ☕, ℹ, ✔, ⚠, ✘
```

```ts [Text Variant]
Logit.setVariant('text');
// Output: DEBUG, INFO, SUCCESS, WARN, ERROR
```

:::

### Does Logit affect performance?

Minimal impact. When log level filters out messages, they're skipped before processing. For production, use `setLogLevel('warn')` or `'error'`.

### Can I use structured logging?

Yes! Pass objects as additional arguments:

```ts
Logit.info('User action', { userId: '123', action: 'login', duration: 250 });
```

## 🐛 Troubleshooting

### Logs not showing in browser

::: danger Problem
Console is empty.
:::

::: tip Solution
Check log level:

```ts
// Make sure level allows your logs through
Logit.setLogLevel('debug'); // Show all logs

// Or check current level
console.log(Logit.getLevel());
```

:::

### Colors not showing in browser

::: danger Problem
Logs appear plain in browser console.
:::

::: tip Solution
Ensure you're using a modern browser. Most browsers support CSS styling in console.log. Check browser compatibility.
:::

### Remote handler not being called

::: danger Problem
Remote handler doesn't execute.
:::

::: tip Solution
Ensure handler is set correctly and log level matches:

```ts
Logit.setRemote({
  handler: async (type, ...args) => {
    try {
      console.log('Handler called:', type, args);
      await sendToServer(type, args);
    } catch (error) {
      console.error('Failed to send log:', error);
    }
  },
  logLevel: 'error', // Must match or be lower than the log type
});
```

:::
logLevel: 'error' // Must match or be lower than the log type
});

### TypeScript types not working

**Problem**: Types not properly inferred.

**Solution**: Import types explicitly:

```ts
import { Logit, type LogitOptions, type LogitType } from '@vielzeug/logit';

const options: LogitOptions = {
  logLevel: 'info',
  variant: 'symbol',
};
Logit.initialise(options);
```

### Namespace/prefix not showing

**Problem**: Logs don't show the namespace.

**Solution**: Ensure you've set a prefix:

```ts
Logit.setPrefix('MyModule');
Logit.info('This will show with [MyModule] prefix');
```

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Duarte](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/logit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/logit/CHANGELOG.md)

---

> **Tip:** Logit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, HTTP clients, permissions, and more.
