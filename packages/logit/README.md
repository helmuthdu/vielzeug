# @vielzeug/logit

Powerful, type-safe console logging utility for TypeScript with styled output, log levels, scoped loggers, and remote logging support.

## Features

- ✅ **Styled Console Output** - Beautiful colored logs with symbols, icons, or text
- ✅ **Log Level Filtering** - Control verbosity (debug, info, warn, error, off)
- ✅ **Scoped Loggers** - Create isolated loggers with namespaced prefixes
- ✅ **Remote Logging** - Send logs to external services (Sentry, Datadog, etc.)
- ✅ **Environment Detection** - Automatic production/development indicators
- ✅ **Timestamps** - Optional timestamp display
- ✅ **Type-Safe** - Full TypeScript support
- ✅ **Framework Agnostic** - Works in browser and Node.js
- ✅ **Zero Dependencies** - Lightweight with no external dependencies
- ✅ **Multiple Variants** - Symbol, icon, or text-based display modes

## Installation

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

## Quick Start

```typescript
import { Logit } from '@vielzeug/logit';

// Basic logging
Logit.info('Application started');
Logit.success('User authenticated');
Logit.warn('API rate limit approaching');
Logit.error('Failed to connect to database');

// With multiple arguments
Logit.debug('User data:', { id: 123, name: 'Alice' });

// Configure log level
Logit.setLogLevel('warn'); // Only warn and error messages will show

// Set namespace
Logit.setPrefix('MyApp');
Logit.info('This message has a namespace'); // [MYAPP] This message has a namespace
```

## Core Concepts

### Log Levels

Control which logs are displayed based on severity:

```typescript
// Set minimum log level
Logit.setLogLevel('warn');

Logit.debug('Not shown');   // ❌ Below threshold
Logit.info('Not shown');    // ❌ Below threshold
Logit.warn('Shown');        // ✅ At threshold
Logit.error('Shown');       // ✅ Above threshold

// Disable all logs
Logit.setLogLevel('off');

// Enable all logs
Logit.setLogLevel('debug');
```

**Log Level Hierarchy (most to least verbose):**
```
debug → trace → time → table → info → success → warn → error → off
```

### Display Variants

Choose how log messages are displayed:

```typescript
// Symbol variant (default) - Unicode symbols
Logit.setVariant('symbol');
Logit.info('Message'); // 🅸 Message

// Icon variant - Icon characters
Logit.setVariant('icon');
Logit.info('Message'); // ℹ Message

// Text variant - Plain text labels
Logit.setVariant('text');
Logit.info('Message'); // INFO Message
```

### Namespaces

Add context to your logs with namespaces:

```typescript
Logit.setPrefix('Auth');
Logit.info('Login attempt');     // [AUTH] Login attempt
Logit.error('Invalid credentials'); // [AUTH] Invalid credentials

// Clear namespace
Logit.setPrefix('');
```

### Scoped Loggers

Create isolated loggers without mutating global state:

```typescript
// Global namespace
Logit.setPrefix('App');

// Create scoped loggers
const apiLogger = Logit.scope('api');
const dbLogger = Logit.scope('database');
const cacheLogger = Logit.scope('cache');

apiLogger.info('GET /users');          // [APP.API] GET /users
dbLogger.error('Connection timeout');  // [APP.DATABASE] Connection timeout
cacheLogger.debug('Cache hit');        // [APP.CACHE] Cache hit

// Global namespace unchanged
Logit.getPrefix(); // 'App'

// Nested scopes
Logit.setPrefix('App.api');
const v1Logger = Logit.scope('v1');
v1Logger.info('Request');              // [APP.API.V1] Request
```

**Benefits:**
- No global state mutation
- Safe for concurrent operations
- Clean separation of concerns
- Easy to pass to modules/components

## Advanced Features

### Remote Logging

Send logs to external services for monitoring and error tracking:

```typescript
// Configure remote handler
Logit.setRemote({
  handler: (type, metadata) => {
    // Send to your logging service
    fetch('https://logs.example.com', {
      method: 'POST',
      body: JSON.stringify({
        level: type,
        message: metadata.args,
        timestamp: metadata.timestamp,
        namespace: metadata.namespace,
        environment: metadata.environment,
      }),
    });
  },
  logLevel: 'warn', // Only send warn and error to remote
});

// Remote logging works independently
Logit.setLogLevel('debug'); // Console shows all logs
// But remote only receives warn/error

Logit.info('Local only');  // ✅ Console, ❌ Remote
Logit.warn('Both');        // ✅ Console, ✅ Remote
Logit.error('Both');       // ✅ Console, ✅ Remote
```

**Metadata sent to handler:**
```typescript
{
  args: any[],           // Log arguments
  timestamp?: string,    // ISO timestamp (if enabled)
  namespace?: string,    // Current namespace
  environment: 'production' | 'development'
}
```

**Integration examples:**

```typescript
// Sentry
Logit.setRemote({
  handler: (type, metadata) => {
    if (type === 'error') {
      Sentry.captureMessage(metadata.args.join(' '), {
        level: 'error',
        tags: { namespace: metadata.namespace },
      });
    }
  },
  logLevel: 'error',
});

// Datadog
Logit.setRemote({
  handler: (type, metadata) => {
    window.DD_LOGS?.logger.log(
      type,
      metadata.args.join(' '),
      { namespace: metadata.namespace }
    );
  },
  logLevel: 'info',
});

// Custom webhook
Logit.setRemote({
  handler: async (type, metadata) => {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...metadata }),
    });
  },
  logLevel: 'warn',
});
```

### Environment Indicators

Automatically shows production/development indicators:

```typescript
// Enable environment indicator (default)
Logit.showEnvironment(true);
Logit.info('Message'); // 🅸 🅳 Message (in development)
                       // 🅸 🅿 Message (in production)

// Disable environment indicator
Logit.showEnvironment(false);
Logit.info('Message'); // 🅸 Message
```

### Timestamps

Add timestamps to your logs:

```typescript
// Enable timestamps (default)
Logit.showTimestamp(true);
Logit.info('Message'); // 🅸 🅳 14:23:45.123 Message

// Disable timestamps
Logit.showTimestamp(false);
Logit.info('Message'); // 🅸 🅳 Message
```

### Utility Methods

```typescript
// Table display
const users = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
];
Logit.table(users);
// Displays formatted table in console

// Timers
Logit.time('database-query');
await db.query('SELECT * FROM users');
Logit.timeEnd('database-query'); // database-query: 234ms

// Groups
Logit.groupCollapsed('API Request', 'GET', startTime);
Logit.info('URL:', '/api/users');
Logit.info('Status:', 200);
Logit.groupEnd();

// Assertions
Logit.assert(user !== null, 'User should exist', { userId: 123 });
```

## Configuration

### Initialize with Options

```typescript
Logit.setup({
  logLevel: 'info',        // Minimum log level
  namespace: 'MyApp',      // Global namespace
  variant: 'symbol',       // Display variant
  timestamp: true,         // Show timestamps
  environment: true,       // Show environment indicator
  remote: {                // Remote logging config
    handler: remoteHandler,
    logLevel: 'warn',
  },
});
```

### Getters

```typescript
Logit.getLevel();         // Current log level
Logit.getPrefix();        // Current namespace
Logit.getTimestamp();     // Timestamp enabled?
Logit.getEnvironment();   // Environment indicator enabled?
Logit.getVariant();       // Current variant
```

### Setters

```typescript
Logit.setLogLevel('warn');
Logit.setPrefix('App');
Logit.toggleTimestamp(false);
Logit.toggleEnvironment(true);
Logit.setVariant('icon');
Logit.setRemote({ handler, logLevel: 'error' });
Logit.setRemoteLogLevel('warn');
```

## API Reference

### Logging Methods

```typescript
Logit.debug(...args: any[]): void
Logit.trace(...args: any[]): void
Logit.info(...args: any[]): void
Logit.success(...args: any[]): void
Logit.warn(...args: any[]): void
Logit.error(...args: any[]): void
```

### Scoped Logger

```typescript
Logit.scope(namespace: string): ScopedLogger

// ScopedLogger has all logging methods:
{
  debug: (...args: any[]) => void;
  trace: (...args: any[]) => void;
  info: (...args: any[]) => void;
  success: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}
```

### Utility Methods

```typescript
Logit.table(...args: any[]): void
Logit.time(label: string): void
Logit.timeEnd(label: string): void
Logit.groupCollapsed(text: string, label?: string, time?: number): void
Logit.groupEnd(): void
Logit.assert(valid: boolean, message: string, context: Record<string, any>): void
```

## Use Cases

### Module-Specific Logging

```typescript
// api.ts
const logger = Logit.scope('api');

export async function fetchUsers() {
  logger.debug('Fetching users');
  const response = await fetch('/api/users');
  logger.info('Users fetched:', response.status);
  return response.json();
}

// database.ts
const logger = Logit.scope('database');

export async function connect() {
  logger.info('Connecting to database');
  try {
    await db.connect();
    logger.success('Connected to database');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
}
```

### Debug vs Production

```typescript
// During development
Logit.setLogLevel('debug');
Logit.showTimestamp(true);

// In production
if (process.env.NODE_ENV === 'production') {
  Logit.setLogLevel('warn');
  Logit.showTimestamp(false);
  Logit.setRemote({
    handler: sendToSentry,
    logLevel: 'error',
  });
}
```

### Error Tracking

```typescript
Logit.setRemote({
  handler: (type, metadata) => {
    if (type === 'error') {
      // Send to error tracking service
      errorTracker.captureException({
        message: metadata.args.join(' '),
        timestamp: metadata.timestamp,
        namespace: metadata.namespace,
        environment: metadata.environment,
      });
    }
  },
  logLevel: 'error',
});

try {
  await riskyOperation();
} catch (error) {
  Logit.error('Operation failed:', error); // Logged locally + sent to tracker
}
```

### Performance Monitoring

```typescript
Logit.time('page-load');

// Load application
await loadApp();

Logit.timeEnd('page-load'); // page-load: 1234ms

// With groups for detailed timing
Logit.groupCollapsed('Application Initialization');
Logit.time('load-config');
await loadConfig();
Logit.timeEnd('load-config');

Logit.time('init-modules');
await initModules();
Logit.timeEnd('init-modules');
Logit.groupEnd();
```

## Browser vs Node.js

### Browser
- Styled console output with colors and symbols
- CSS-based formatting
- Environment detection via `import.meta.env` or `process.env`

### Node.js
- Plain text output with labels
- No CSS styling
- Environment detection via `process.env.NODE_ENV`

**Example output:**

**Browser:**
```
🅸 🅳 14:23:45.123 User authenticated
```

**Node.js:**
```
INFO | 🅳 | User authenticated
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import { 
  Logit,
  type LogitType,
  type LogitLevel,
  type LogitOptions,
  type LogitRemoteOptions,
  type ScopedLogger,
} from '@vielzeug/logit';

const options: LogitOptions = {
  logLevel: 'info',
  namespace: 'App',
  variant: 'symbol',
};

Logit.setup(options);

const logger: ScopedLogger = Logit.scope('module');
```

## Best Practices

### 1. Use Scoped Loggers for Modules

```typescript
// ✅ Good - Each module has its own logger
const apiLogger = Logit.scope('api');
const dbLogger = Logit.scope('db');

// ❌ Avoid - Mutating global namespace
Logit.setPrefix('api');
Logit.info('Request');
Logit.setPrefix('db');
Logit.info('Query');
```

### 2. Set Appropriate Log Levels

```typescript
// Development
Logit.setLogLevel('debug');

// Staging
Logit.setLogLevel('info');

// Production
Logit.setLogLevel('warn');
```

### 3. Use Remote Logging for Production Errors

```typescript
if (process.env.NODE_ENV === 'production') {
  Logit.setRemote({
    handler: sendToErrorTracker,
    logLevel: 'error',
  });
}
```

### 4. Leverage Log Levels Appropriately

```typescript
Logit.debug('Detailed debugging info');      // Development only
Logit.info('User logged in');                // General information
Logit.success('Payment processed');          // Success states
Logit.warn('API rate limit: 90%');           // Warnings
Logit.error('Payment failed:', error);       // Errors
```

## Performance

- Minimal overhead when logs are filtered by level
- Lazy evaluation of timestamp and environment
- Async remote logging (Promise-based, non-blocking)
- Zero dependencies
- ~3KB gzipped

## Browser Support

- Chrome/Edge 63+ (for styled console output)
- Firefox 58+
- Safari 13+
- Node.js 10+

## License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [Documentation](https://vielzeug.dev)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/logit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)

---

Part of the [Vielzeug](https://github.com/helmuthdu/vielzeug) ecosystem - A collection of type-safe utilities for modern web development.

