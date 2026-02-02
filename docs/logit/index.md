<img src="/logo-logger.svg" alt="Logit Logo" width="156" style="padding: 1rem; margin: 0 auto;"/>

# Logit

<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.1-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-7.1_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Zero Dependencies">
</div>

**Logit** is a flexible, zero-dependency logging utility designed for both browser and Node.js environments. It provides a powerful set of features including log levels, custom themes, remote logging, and scoped loggers, all while maintaining a tiny footprint.

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

// Manual remote logging
fetch('/api/logs', {
  method: 'POST',
  body: JSON.stringify({ level: 'error', message: error.message })
});
```

**With Logit**:
```ts
// Structured, filterable, auto-remote logging
const apiLog = log.scope('API');
apiLog.info('User login:', user);
apiLog.warn('High memory usage:', usage);

// Automatically respects log level
log.setLevel('warn'); // Debug/info logs now silent

// Automatic remote logging
log.addHandler(async (entry) => {
  if (entry.level === 'error') {
    await sendToServer(entry);
  }
});
```

### Comparison with Alternatives

| Feature | Logit | Winston | Pino | Console |
|---------|-------|---------|------|---------|
| TypeScript Support | ✅ First-class | ✅ Good | ✅ Good | ⚠️ Basic |
| Browser Support | ✅ Native | ❌ | ❌ | ✅ |
| Scoped Loggers | ✅ Built-in | ⚠️ Manual | ⚠️ Child | ❌ |
| Custom Handlers | ✅ Simple | ✅ Complex | ✅ Streams | ❌ |
| Bundle Size (gzip) | ~7.1KB | ~50KB+ | ~12KB | 0KB |
| Node.js Support | ✅ | ✅ | ✅ | ✅ |
| Dependencies | 0 | 15+ | 5+ | N/A |
| Colored Output | ✅ Auto | ✅ | ✅ | ⚠️ Manual |

## When to Use Logit

**✅ Use Logit when you:**
- Need isomorphic logging (browser + Node.js)
- Want scoped/namespaced loggers for different modules
- Require remote logging without external services
- Need log level filtering for production vs development
- Want zero dependencies for security and minimal bundle size
- Build full-stack TypeScript applications

**❌ Consider alternatives when you:**
- Only need Node.js logging (use Winston/Pino)
- Need advanced log rotation and file management
- Require high-throughput server logging (use Pino)
- Simple console.log is sufficient for your use case

## 🚀 Key Features

- **Log Levels**: Standard levels (debug, info, warn, error) to manage verbosity
- **Isomorphic**: Seamlessly works in both Browser (with CSS colors) and Node.js (with ANSI colors)
- **Scoped Loggers**: Create namespaced loggers to easily identify the source of log messages
- **Custom Handlers**: Redirect logs to remote servers, files, or any custom destination
- **Themes & Variants**: Fully customizable visual output to match your preferences or brand
- **Advanced Utilities**: Built-in support for timing, grouping, and formatted tables
- **Zero Dependencies**: Lightweight, fast, and secure
- **Type-safe**: Full TypeScript support with proper type inference

## 🏁 Quick Start

### Installation

```sh
# pnpm (recommended)
pnpm add @vielzeug/logit

# npm
npm install @vielzeug/logit

# yarn
yarn add @vielzeug/logit
```

### Basic Usage

```ts
import { log } from '@vielzeug/logit';

// Standard log levels
log.debug('Debugging information', { userId: '123' });
log.info('System initialized');
log.warn('Memory usage high', { usage: '85%' });
log.error(new Error('Failed to fetch data'));

// Create scoped loggers for different modules
const apiLog = log.scope('API');
const dbLog = log.scope('Database');

apiLog.info('Request started', { url: '/users' });
dbLog.info('Connection established');

// Control log level globally
log.setLevel('warn'); // Only warn and error will show
```

### Real-World Example: Full-Stack App

```ts
import { log } from '@vielzeug/logit';

// Configure for production
if (process.env.NODE_ENV === 'production') {
  log.setLevel('warn');
  
  // Send errors to remote logging service
  log.addHandler(async (entry) => {
    if (entry.level === 'error') {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: entry.timestamp,
          level: entry.level,
          scope: entry.scope,
          message: entry.message,
          data: entry.data
        })
      });
    }
  });
}

// Create scoped loggers for different parts of app
const authLog = log.scope('Auth');
const apiLog = log.scope('API');
const cacheLog = log.scope('Cache');

// Use throughout your application
authLog.info('User logged in', { userId: user.id });
apiLog.warn('Rate limit approaching', { remaining: 10 });
cacheLog.error(new Error('Cache connection failed'));
```

### Framework Integration: React

```tsx
import { log } from '@vielzeug/logit';
import { useEffect } from 'react';

const componentLog = log.scope('UserProfile');

function UserProfile({ userId }: { userId: string }) {
  useEffect(() => {
    componentLog.debug('Component mounted', { userId });
    
    return () => {
      componentLog.debug('Component unmounted', { userId });
    };
  }, [userId]);
  
  const handleClick = () => {
    try {
      // ... do something
      componentLog.info('Button clicked', { userId });
    } catch (error) {
      componentLog.error('Action failed', error);
    }
  };
  
  return <button onClick={handleClick}>Click me</button>;
}
```

### Framework Integration: Express

```ts
import express from 'express';
import { log } from '@vielzeug/logit';

const app = express();
const serverLog = log.scope('Server');

// Request logging middleware
app.use((req, res, next) => {
  const requestLog = log.scope(`${req.method} ${req.path}`);
  requestLog.info('Request started', { 
    method: req.method, 
    path: req.path,
    ip: req.ip 
  });
  
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'error' : 'info';
    
    requestLog[level]('Request completed', {
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  
  next();
});

app.listen(3000, () => {
  serverLog.info('Server started', { port: 3000 });
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
if (process.env.NODE_ENV === 'production') {
  log.setLevel('error'); // Only show errors
  // or
  log.setLevel('silent'); // Disable all logs
}
```

### Can I send logs to multiple destinations?

Yes! Add multiple handlers:
```ts
log.addHandler(sendToSentry);
log.addHandler(sendToCloudWatch);
log.addHandler(writeToFile);
```

### How do I format log output?

Logit automatically formats output based on environment (browser CSS vs Node.js ANSI). You can customize themes in the configuration.

### Does Logit affect performance?

Minimal impact. Logit adds ~0.1-0.5ms per log call. For high-performance scenarios, set level to 'warn' or 'error' to skip debug/info logs.

### Can I use structured logging?

Yes! Pass objects as additional arguments:
```ts
log.info('User action', { userId: '123', action: 'login', duration: 250 });
```

## 🐛 Troubleshooting

### Logs not showing in browser

**Problem**: Console is empty.

**Solution**: Check log level:
```ts
// Make sure level allows your logs through
log.setLevel('debug'); // Show all logs

// Or check current level
console.log(log.getLevel());
```

### Colors not showing in Node.js

**Problem**: Output is plain text.

**Solution**: Ensure terminal supports ANSI colors:
```ts
// Most modern terminals support colors by default
// If not, check TERM environment variable
console.log(process.env.TERM);
```

### Remote handler not being called

**Problem**: Custom handler doesn't execute.

**Solution**: Ensure handler is async and handles errors:
```ts
log.addHandler(async (entry) => {
  try {
    await sendToServer(entry);
  } catch (error) {
    console.error('Failed to send log:', error);
  }
});
```

### TypeScript types not working

**Problem**: Entry type not inferred.

**Solution**: Import types explicitly:
```ts
import { log, type LogEntry } from '@vielzeug/logit';

log.addHandler(async (entry: LogEntry) => {
  // entry is now properly typed
});
```

## 🤝 Contributing

Found a bug or want to contribute? Check our [GitHub repository](https://github.com/helmuthdu/vielzeug).

## 📄 License

MIT © [Helmuth Duarte](https://github.com/helmuthdu)

---

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/logit)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/logit/CHANGELOG.md)

---

> **Tip:** Logit is part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem, which includes utilities for storage, HTTP clients, permissions, and more.

<style>
.badges {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
</style>

