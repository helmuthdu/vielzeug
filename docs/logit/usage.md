# Logit Usage Guide

Complete guide to installing and using Logit in your projects.

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

## Import

```ts
import { Logit } from '@vielzeug/logit';

// Optional: Import types
import type { 
  LogitOptions, 
  LogitLevel, 
  LogitType,
  ScopedLogger,
  LogitRemoteOptions 
} from '@vielzeug/logit';
```

::: tip 💡 API Reference
This guide covers API usage and basic patterns. For complete application examples, see [Examples](./examples.md).
:::

## Table of Contents

- [Basic Usage](#basic-usage)
- [Scoped Loggers](#scoped-loggers)
- [Log Levels](#log-levels)
- [Display Variants](#display-variants)
- [Remote Logging](#remote-logging)
- [Configuration](#configuration)
- [Utility Methods](#utility-methods)

## Basic Usage

### Standard Logging

```ts
// Different log levels
Logit.debug('Debugging information', { userId: '123' });
Logit.info('Application started');
Logit.success('Operation completed successfully!');
Logit.warn('Memory usage high', { usage: '85%' });
Logit.error('Failed to connect', new Error('Connection timeout'));
Logit.trace('Detailed trace information');
```

### Using Tables

```ts
// Display data in table format
const users = [
  { name: 'Alice', age: 30, role: 'Admin' },
  { name: 'Bob', age: 25, role: 'User' },
];
Logit.table(users);
```

### Timing Operations

```ts
// Measure execution time
Logit.time('database-query');
await database.query('SELECT * FROM users');
Logit.timeEnd('database-query'); // Logs: "database-query: 45ms"
```

### Grouping Logs

```ts
// Create collapsible groups
Logit.groupCollapsed('User Details', 'INFO');
Logit.info('Name:', user.name);
Logit.info('Email:', user.email);
Logit.info('Role:', user.role);
Logit.groupEnd();
```

## Scoped Loggers

Create isolated loggers with namespaced prefixes without mutating global state:

```ts
// Create scoped loggers for different modules
const apiLogger = Logit.scope('api');
const dbLogger = Logit.scope('database');
const cacheLogger = Logit.scope('cache');

// Use them independently
apiLogger.info('GET /users');          // [API] GET /users
dbLogger.error('Connection timeout');  // [DATABASE] Connection timeout
cacheLogger.debug('Cache hit');        // [CACHE] Cache hit

// Global namespace is unchanged
Logit.getPrefix(); // '' (empty)

// Scoped loggers support all log methods
apiLogger.debug('Debug message');
apiLogger.trace('Trace message');
apiLogger.info('Info message');
apiLogger.success('Success message');
apiLogger.warn('Warning message');
apiLogger.error('Error message');
```

### Nested Scopes

```ts
// Set global namespace
Logit.setPrefix('App');

// Create nested scopes
const apiLogger = Logit.scope('api');
apiLogger.info('Request');  // [APP.API] Request

Logit.setPrefix('App.api');
const v1Logger = Logit.scope('v1');
v1Logger.info('GET /users');  // [APP.API.V1] GET /users
```

### Benefits of Scoped Loggers

```ts
// ✅ Good - No global state mutation
const logger = Logit.scope('module');
logger.info('Message');

// ❌ Avoid - Mutates global state
Logit.setPrefix('module');
Logit.info('Message');
Logit.setPrefix(''); // Need to clean up
```

**Advantages:**
- No global state mutation
- Safe for concurrent operations
- Easy to pass to modules/functions
- Clean separation of concerns
- Type-safe

---

## Log Levels

Control verbosity with log levels:

```ts
// Set minimum log level
Logit.setLogLevel('warn'); // Only warn and error will show
Logit.debug('Not shown'); // Hidden
Logit.info('Not shown'); // Hidden
Logit.warn('Visible'); // Shown
Logit.error('Visible'); // Shown

// Available levels (in order)
// 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error' | 'off'

// Disable all logs
Logit.setLogLevel('off');

// Get current level
const level = Logit.getLevel(); // 'warn'
```

### Display Variants

Customize log appearance:

```ts
// Symbol variant (default) - Shows emoji-like symbols
Logit.setVariant('symbol');
Logit.info('Message'); // [🅸] Message

// Icon variant - Shows unicode icons
Logit.setVariant('icon');
Logit.info('Message'); // [ℹ] Message

// Text variant - Shows plain text labels
Logit.setVariant('text');
Logit.info('Message'); // [INFO] Message
```

### Timestamps and Environment

```ts
// Toggle timestamps (without arguments)
Logit.toggleTimestamp(); // Toggles current state

// Explicitly set timestamps
Logit.toggleTimestamp(false); // Hide timestamps
Logit.toggleTimestamp(true);  // Show timestamps

// Toggle environment indicator (without arguments)
Logit.toggleEnvironment(); // Toggles current state

// Explicitly set environment
Logit.toggleEnvironment(false); // Hide environment indicator (🅿/🅳)
Logit.toggleEnvironment(true);  // Show environment indicator

// Check current state
const hasTimestamps = Logit.getTimestamp();    // boolean
const hasEnvironment = Logit.getEnvironment(); // boolean
```

## Remote Logging

Send logs to remote servers or services with rich metadata:

```ts
// Configure remote logging with metadata
Logit.setRemote({
  handler: async (type, metadata) => {
    // type: 'debug' | 'trace' | 'info' | 'success' | 'warn' | 'error'
    // metadata: {
    //   args: any[],           // Log arguments
    //   timestamp?: string,    // ISO timestamp (if enabled)
    //   namespace?: string,    // Current namespace
    //   environment: 'production' | 'development'
    // }

    if (type === 'error' || type === 'warn') {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: type,
          timestamp: metadata.timestamp,
          namespace: metadata.namespace,
          environment: metadata.environment,
          args: metadata.args.map((arg) => 
            arg instanceof Error 
              ? { message: arg.message, stack: arg.stack } 
              : arg
          ),
        }),
      });
    }
  },
  logLevel: 'warn', // Only send warn and error to remote
});

// Change remote log level independently
Logit.setRemoteLogLevel('error'); // Only send errors remotely

// Local logging works independently
Logit.setLogLevel('debug'); // Console shows all logs
// Remote only receives error level and above
```

### Remote Logging with External Services

```ts
// Sentry integration
Logit.setRemote({
  handler: (type, metadata) => {
    if (type === 'error') {
      Sentry.captureMessage(metadata.args.join(' '), {
        level: 'error',
        tags: { 
          namespace: metadata.namespace,
          environment: metadata.environment,
        },
        extra: { timestamp: metadata.timestamp },
      });
    }
  },
  logLevel: 'error',
});

// Datadog integration
Logit.setRemote({
  handler: (type, metadata) => {
    window.DD_LOGS?.logger.log(
      type,
      metadata.args.join(' '),
      { 
        namespace: metadata.namespace,
        environment: metadata.environment,
      }
    );
  },
  logLevel: 'info',
});
```

::: tip Non-Blocking
Remote logging uses `Promise.resolve().then()` for async execution, ensuring logs are sent without blocking the main thread.
:::

### Bulk Configuration

Initialize multiple settings at once:

```ts
Logit.setup({
  logLevel: 'info',
  namespace: 'MyApp',
  variant: 'symbol',
  timestamp: true,
  environment: true,
  remote: {
    handler: async (type, ...args) => {
      await sendToLoggingService(type, args);
    },
    logLevel: 'error',
  },
});
```

### Assertions

Log errors when conditions fail:

```ts
const isValid = checkUserPermissions(user);
Logit.assert(isValid, 'User lacks required permissions', {
  userId: user.id,
  required: ['admin'],
  actual: user.roles,
});
// If isValid is false, logs an error to console
```

## Configuration Options

### LogitOptions

Complete configuration interface:

```ts
interface LogitOptions {
  environment?: boolean; // Show environment indicator (default: true)
  variant?: 'text' | 'symbol' | 'icon'; // Display variant (default: 'symbol')
  logLevel?: LogitLevel; // Minimum log level (default: 'debug')
  namespace?: string; // Prefix/namespace (default: '')
  remote?: LogitRemoteOptions; // Remote logging config
  timestamp?: boolean; // Show timestamps (default: true)
}
```

### LogitRemoteOptions

Remote logging configuration:

```ts
interface LogitRemoteOptions {
  handler?: (type: LogitType, ...args: any[]) => void;
  logLevel: LogitLevel;
}
```

### LogitLevel

Available log levels:

```ts
type LogitLevel =
  | 'debug' // Lowest - shows everything
  | 'trace'
  | 'time'
  | 'table'
  | 'info'
  | 'success'
  | 'warn'
  | 'error'
  | 'off'; // Highest - shows nothing
```

### LogitType

Available log methods:

```ts
type LogitType = 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error';
```

## Environment-Specific Configuration

### Development

```ts
if (process.env.NODE_ENV === 'development') {
  Logit.setup({
    logLevel: 'debug', // Show all logs
    variant: 'symbol', // Use symbols
    timestamp: true, // Show timestamps
    environment: true, // Show dev/prod indicator
  });
}
```

### Production

```ts
if (process.env.NODE_ENV === 'production') {
  Logit.setup({
    logLevel: 'warn', // Only warnings and errors
    variant: 'text', // Plain text (better for log aggregators)
    timestamp: true, // Keep timestamps
    environment: false, // Hide dev/prod indicator
    remote: {
      handler: async (type, ...args) => {
        // Send to error tracking service
        if (type === 'error') {
          await Sentry.captureException(args[0]);
        }
      },
      logLevel: 'error',
    },
  });
}
```

### Testing

```ts
if (process.env.NODE_ENV === 'test') {
  Logit.setLogLevel('off'); // Silence logs during tests

  // Or only show errors
  Logit.setLogLevel('error');
}
```

## Best Practices

1. **Use appropriate log levels**: Debug for development, info for general flow, warn for issues, error for failures
2. **Add context with prefixes**: Set namespace per module/feature for easier debugging
3. **Structure your data**: Pass objects with meaningful keys for better log readability
4. **Configure per environment**: Show all logs in dev, only errors in production
5. **Use remote logging wisely**: Only send critical logs to avoid overwhelming your logging service
6. **Clean up timers**: Always call `timeEnd()` for every `time()` call
7. **Use TypeScript**: Import types for better IDE support and type safety
8. **Avoid logging sensitive data**: Never log passwords, tokens, or PII in production

## Common Patterns

### Module-Specific Loggers

```ts
// auth.service.ts
Logit.setPrefix('Auth');
export const authLog = {
  login: (userId: string) => Logit.info('User logged in', { userId }),
  logout: (userId: string) => Logit.info('User logged out', { userId }),
  error: (error: Error) => Logit.error('Auth error', error),
};

// database.service.ts
Logit.setPrefix('Database');
export const dbLog = {
  query: (sql: string) => Logit.debug('Query executed', { sql }),
  error: (error: Error) => Logit.error('Database error', error),
};
```

### Structured Logging

```ts
// Good - structured with context
Logit.info('User action', {
  action: 'purchase',
  userId: user.id,
  amount: 99.99,
  currency: 'USD',
  timestamp: Date.now(),
});

// Bad - unstructured string
Logit.info(`User ${user.id} purchased for $99.99 USD`);
```

### Error Logging

```ts
try {
  await riskyOperation();
} catch (error) {
  Logit.error('Operation failed', {
    operation: 'riskyOperation',
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context: { userId: user.id },
  });
  throw error; // Re-throw after logging
}
```

## See Also

- [API Reference](./api.md) - Complete API documentation
- [Examples](./examples.md) - Practical code examples
