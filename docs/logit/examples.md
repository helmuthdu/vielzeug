# Logit Examples

Practical examples showing common use cases and patterns.

::: tip 💡 Complete Applications
These are complete application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Basic Logging Operations

::: details 🔍 Browser Console Tips

- Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows) to open DevTools
- Filter logs by level using the console filter
- Use `console.clear()` or `Cmd+K` / `Ctrl+L` to clear console
- Group logs are collapsible for better organization
  :::

### Standard Log Levels

```ts
import { Logit } from '@vielzeug/logit';

// Debug – detailed debugging information
Logit.debug('Variable state:', { count: 42, active: true });

// Info – general informational messages
Logit.info('Application started', { version: '1.0.0', port: 3000 });

// Success – successful operation completion
Logit.success('File uploaded', { filename: 'data.csv', size: '2.3MB' });

// Warning – potentially problematic situations
Logit.warn('Deprecated method called', { method: 'oldAPI', replacement: 'newAPI' });

// Error – error events and exceptions
Logit.error('Database connection failed', new Error('ECONNREFUSED'));

// Trace – very detailed trace information
Logit.trace('Function execution trace', {
  function: 'processData',
  args: [1, 2, 3],
  caller: 'main',
});
```

### Using Tables

```ts
// Display array of objects
const users = [
  { id: 1, name: 'Alice', role: 'Admin', active: true },
  { id: 2, name: 'Bob', role: 'User', active: true },
  { id: 3, name: 'Charlie', role: 'User', active: false },
];
Logit.table(users);

// Display with custom properties
const metrics = [
  { endpoint: '/api/users', requests: 1234, avgTime: '45ms' },
  { endpoint: '/api/posts', requests: 567, avgTime: '23ms' },
];
Logit.table(metrics);
```

### Timing Operations

```ts
// Single operation timing
Logit.time('database-query');
const users = await db.query('SELECT * FROM users WHERE active = true');
Logit.timeEnd('database-query'); // Logs: "database-query: 45ms"

// Multiple operations
Logit.time('total-processing');
Logit.time('data-fetch');
const data = await fetchData();
Logit.timeEnd('data-fetch');

Logit.time('data-transform');
const transformed = transform(data);
Logit.timeEnd('data-transform');

Logit.timeEnd('total-processing');
```

### Grouping Logs

```ts
// Simple group
Logit.groupCollapsed('User Details');
Logit.info('Name:', user.name);
Logit.info('Email:', user.email);
Logit.info('Roles:', user.roles);
Logit.groupEnd();

// Group with custom label and timing
const startTime = Date.now();
Logit.groupCollapsed('API Response', 'HTTP', startTime);
Logit.debug('Status:', response.status);
Logit.debug('Headers:', response.headers);
Logit.debug('Body:', response.body);
Logit.groupEnd();

// Nested groups
Logit.groupCollapsed('Request Processing');
Logit.info('Request received');

Logit.groupCollapsed('Validation');
Logit.debug('Validating input');
Logit.success('Validation passed');
Logit.groupEnd();

Logit.groupCollapsed('Database');
Logit.debug('Query executed');
Logit.success('Data retrieved');
Logit.groupEnd();

Logit.info('Response sent');
Logit.groupEnd();
```

## Scoped Loggers

::: tip 💡 Best Practice
Use scoped loggers instead of `setPrefix()` to avoid global state mutation. Scoped loggers are safer for concurrent operations and easier to pass to modules.
:::

### Module-Specific Logging

```ts
import { Logit } from '@vielzeug/logit';

// Create scoped loggers for different modules
const authLogger = Logit.scope('auth');
const dbLogger = Logit.scope('database');
const apiLogger = Logit.scope('api');
const cacheLogger = Logit.scope('cache');

// Use them independently (no global state mutation)
authLogger.info('Login attempt', { username: 'alice' });
authLogger.success('Authentication successful', { userId: '123' });

dbLogger.info('Connection pool created', { size: 10 });
dbLogger.debug('Query executed', { sql: 'SELECT * FROM users' });

apiLogger.info('Request received', { method: 'GET', path: '/users' });
apiLogger.warn('Rate limit approaching', { remaining: 10, limit: 100 });

cacheLogger.debug('Cache hit', { key: 'user:123' });
cacheLogger.info('Cache miss', { key: 'user:456' });
```

### Nested Scopes

```ts
// Global namespace
Logit.setPrefix('App');

// Create nested scopes
const apiLogger = Logit.scope('api');
apiLogger.info('Request received'); // [APP.API] Request received

// Further nesting
Logit.setPrefix('App.api');
const v1Logger = Logit.scope('v1');
const v2Logger = Logit.scope('v2');

v1Logger.info('GET /users'); // [APP.API.V1] GET /users
v2Logger.info('GET /users'); // [APP.API.V2] GET /users
```

### Creating Reusable Logger Wrappers

```ts
// Type-safe logger wrapper
import type { ScopedLogger } from '@vielzeug/logit';

class ServiceLogger {
  private logger: ScopedLogger;

  constructor(serviceName: string) {
    this.logger = Logit.scope(serviceName);
  }

  logRequest(method: string, path: string, duration: number) {
    this.logger.info(`${method} ${path}`, { duration: `${duration}ms` });
  }

  logError(operation: string, error: Error) {
    this.logger.error(`${operation} failed`, {
      message: error.message,
      stack: error.stack,
    });
  }

  logSuccess(operation: string, data?: any) {
    this.logger.success(`${operation} completed`, data);
  }
}

// Usage
const authService = new ServiceLogger('auth');
const paymentService = new ServiceLogger('payment');

authService.logRequest('POST', '/login', 45);
paymentService.logSuccess('charge', { amount: 99.99, currency: 'USD' });
```

### Comparison: Scoped vs Global Prefix

```ts
// ❌ Avoid – Global prefix mutation
Logit.setPrefix('auth');
Logit.info('Login');
Logit.setPrefix('api');
Logit.info('Request');
Logit.setPrefix(''); // Need to clean up

// ✅ Recommended – Scoped loggers
const authLogger = Logit.scope('auth');
const apiLogger = Logit.scope('api');

authLogger.info('Login'); // [AUTH] Login
apiLogger.info('Request'); // [API] Request
// No cleanup needed, no global mutation
```

## Display Variants

### Comparing Variants

```ts
// Symbol variant (emoji-like)
Logit.setVariant('symbol');
Logit.debug('Debug'); // 🅳 Debug
Logit.info('Info'); // 🅸 Info
Logit.success('Success'); // 🅂 Success
Logit.warn('Warning'); // 🆆 Warning
Logit.error('Error'); // 🅴 Error

// Icon variant (unicode icons)
Logit.setVariant('icon');
Logit.debug('Debug'); // ☕ Debug
Logit.info('Info'); // ℹ Info
Logit.success('Success'); // ✔ Success
Logit.warn('Warning'); // ⚠ Warning
Logit.error('Error'); // ✘ Error

// Text variant (plain text)
Logit.setVariant('text');
Logit.debug('Debug'); // [DEBUG] Debug
Logit.info('Info'); // [INFO] Info
Logit.success('Success'); // [SUCCESS] Success
Logit.warn('Warning'); // [WARN] Warning
Logit.error('Error'); // [ERROR] Error
```

## Log Level Management

::: danger ⚠️ Production Logging
Be careful with log levels in production:

- Disable `trace` and `debug` in production
- Consider remote logging for error tracking
- Avoid logging sensitive data (passwords, tokens, PII)
- Monitor log volume to avoid performance issues
  :::

### Development vs Production

```ts
// Development configuration
if (process.env.NODE_ENV === 'development') {
  Logit.setup({
    logLevel: 'debug', // Show all logs
    variant: 'symbol', // Use symbols
    timestamp: true,
    environment: true,
  });

  Logit.debug('App in development mode');
}

// Production configuration
if (process.env.NODE_ENV === 'production') {
  Logit.setup({
    logLevel: 'warn', // Only warnings and errors
    variant: 'text', // Plain text for log aggregators
    timestamp: true,
    environment: false,
    remote: {
      handler: sendToLoggingService,
      logLevel: 'error',
    },
  });
}
```

### Dynamic Log Level Changes

```ts
// Change log level based on user action
function enableDebugMode() {
  Logit.setLogLevel('debug');
  Logit.debug('Debug mode enabled');
}

function disableDebugMode() {
  Logit.setLogLevel('info');
  Logit.info('Debug mode disabled');
}

// Check current level
const currentLevel = Logit.getLevel();
if (currentLevel === 'debug') {
  // Perform debug-only actions
}
```

## Remote Logging

::: tip Non-Blocking Async
Remote logging uses `Promise.resolve().then()` for async execution, ensuring logs are sent without blocking the main thread. This is more performant than `setTimeout`.
:::

### Basic Remote Handler with Metadata

```ts
Logit.setRemote({
  handler: async (type, metadata) => {
    // metadata contains:
    // – args: any[]
    // – timestamp?: string
    // – namespace?: string
    // – environment: 'production' | 'development'

    // Only send errors and warnings
    if (type === 'error' || type === 'warn') {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: type,
          timestamp: metadata.timestamp,
          namespace: metadata.namespace,
          environment: metadata.environment,
          args: metadata.args,
        }),
      });
    }
  },
  logLevel: 'warn',
});

// These will be sent remotely
Logit.warn('High memory usage', { usage: '85%' });
Logit.error('API call failed', new Error('Timeout'));

// These won't be sent (below logLevel)
Logit.info('Normal operation'); // Not sent
Logit.debug('Debug info'); // Not sent
```

### Advanced Remote Handler with Error Serialization

```ts
Logit.setRemote({
  handler: async (type, metadata) => {
    // Serialize errors properly
    const serialized = metadata.args.map((arg) => {
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: arg.message,
          stack: arg.stack,
          ...arg, // Include any custom properties
        };
      }
      return arg;
    });

    const logEntry = {
      level: type,
      timestamp: metadata.timestamp || new Date().toISOString(),
      namespace: metadata.namespace,
      environment: metadata.environment,
      args: serialized,
    };
      timestamp: new Date().toISOString(),
      level: type,
      prefix: Logit.getPrefix(),
      environment: process.env.NODE_ENV,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      args: serialized,
    };

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      // Fallback: log to console if remote logging fails
      console.error('Remote logging failed:', error);
    }
  },
  logLevel: 'error',
});
```

### Multiple Destinations

```ts
Logit.setRemote({
  handler: async (type, ...args) => {
    const logData = { type, args, timestamp: Date.now() };

    // Send to multiple services in parallel
    await Promise.all(
      [
        // Send to your backend
        fetch('/api/logs', {
          method: 'POST',
          body: JSON.stringify(logData),
        }),

        // Send to third-party service (e.g., Sentry)
        type === 'error' && sendToSentry(args[0]),

        // Write to local storage for offline support
        saveToLocalStorage(logData),
      ].filter(Boolean),
    );
  },
  logLevel: 'warn',
});
```

## Error Handling

### Logging Exceptions

```ts
try {
  await riskyOperation();
} catch (error) {
  Logit.error('Operation failed', {
    operation: 'riskyOperation',
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    context: { userId: user.id, timestamp: Date.now() },
  });

  // Re-throw if needed
  throw error;
}
```

### Assertion Logging

```ts
// Check preconditions
const user = getCurrentUser();
Logit.assert(user !== null, 'User must be logged in', {
  route: '/protected',
  timestamp: Date.now(),
});

// Validate data
const isValidEmail = validateEmail(email);
Logit.assert(isValidEmail, 'Invalid email format', {
  email,
  validator: 'validateEmail',
});
```

## Framework Integration

### React Hook

```tsx
import { Logit } from '@vielzeug/logit';
import { useEffect, useRef } from 'react';

function useLogger(componentName: string) {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    Logit.setPrefix(componentName);
    Logit.debug('Component mounted', {
      mountTime: new Date().toISOString(),
    });

    return () => {
      const duration = Date.now() – mountTime.current;
      Logit.debug('Component unmounted', {
        duration: `${duration}ms`,
      });
    };
  }, [componentName]);

  return {
    debug: (...args: any[]) => {
      Logit.setPrefix(componentName);
      Logit.debug(...args);
    },
    info: (...args: any[]) => {
      Logit.setPrefix(componentName);
      Logit.info(...args);
    },
    error: (...args: any[]) => {
      Logit.setPrefix(componentName);
      Logit.error(...args);
    },
  };
}

// Usage
function UserProfile({ userId }: { userId: string }) {
  const log = useLogger('UserProfile');

  useEffect(() => {
    log.info('Fetching user data', { userId });
  }, [userId]);

  const handleClick = () => {
    log.debug('Button clicked', { userId });
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

### Express Middleware

```ts
import express from 'express';
import { Logit } from '@vielzeug/logit';

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2);

  Logit.setPrefix(`Request-${requestId}`);
  Logit.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() – startTime;
    const level = res.statusCode >= 400 ? 'error' : 'info';

    Logit.setPrefix(`Request-${requestId}`);
    Logit[level]('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  Logit.setPrefix('ErrorHandler');
  Logit.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({ error: 'Internal server error' });
});
```

### Vue Composable

```ts
import { Logit } from '@vielzeug/logit';
import { onMounted, onUnmounted } from 'vue';

export function useComponentLogger(componentName: string) {
  onMounted(() => {
    Logit.setPrefix(componentName);
    Logit.debug('Component mounted');
  });

  onUnmounted(() => {
    Logit.setPrefix(componentName);
    Logit.debug('Component unmounted');
  });

  return {
    debug: (...args: any[]) => {
      Logit.setPrefix(componentName);
      Logit.debug(...args);
    },
    info: (...args: any[]) => {
      Logit.setPrefix(componentName);
      Logit.info(...args);
    },
    warn: (...args: any[]) => {
      Logit.setPrefix(componentName);
      Logit.warn(...args);
    },
    error: (...args: any[]) => {
      Logit.setPrefix(componentName);
      Logit.error(...args);
    },
  };
}
```

## Advanced Patterns

### Structured Logging

```ts
// Create a structured logger utility
class StructuredLogger {
  log(level: 'info' | 'warn' | 'error', event: string, data: Record<string, any>) {
    const structuredLog = {
      event,
      timestamp: new Date().toISOString(),
      ...data,
    };

    Logit[level](event, structuredLog);
  }
}

const logger = new StructuredLogger();

// Usage
logger.log('info', 'user.login', {
  userId: '123',
  method: 'email',
  source: 'web',
});

logger.log('error', 'payment.failed', {
  orderId: 'ord_123',
  amount: 99.99,
  currency: 'USD',
  errorCode: 'CARD_DECLINED',
});
```

### Performance Monitoring

```ts
class PerformanceMonitor {
  private timers = new Map<string, number>();

  start(label: string) {
    this.timers.set(label, Date.now());
    Logit.time(label);
  }

  end(label: string, metadata?: Record<string, any>) {
    const startTime = this.timers.get(label);
    if (!startTime) {
      Logit.warn('Timer not found', { label });
      return;
    }

    const duration = Date.now() – startTime;
    Logit.timeEnd(label);

    // Log slow operations
    if (duration > 1000) {
      Logit.warn('Slow operation detected', {
        operation: label,
        duration: `${duration}ms`,
        ...metadata,
      });
    }

    this.timers.delete(label);
  }
}

// Usage
const monitor = new PerformanceMonitor();

monitor.start('api-call');
await fetch('/api/users');
monitor.end('api-call', { endpoint: '/api/users' });
```

### Conditional Logging

```ts
// Only log in development
function devLog(message: string, data?: any) {
  if (process.env.NODE_ENV === 'development') {
    Logit.debug(message, data);
  }
}

// Only log errors in production
function prodError(message: string, error: Error) {
  if (process.env.NODE_ENV === 'production') {
    Logit.error(message, {
      error: error.message,
      stack: error.stack,
    });
  }
}

// Feature flag logging
function featureLog(feature: string, message: string, data?: any) {
  if (isFeatureEnabled(feature)) {
    Logit.setPrefix(`Feature:${feature}`);
    Logit.info(message, data);
  }
}
```

### Batch Logging

```ts
// Collect logs and send in batches
class BatchLogger {
  private batch: any[] = [];
  private batchSize = 10;
  private flushInterval = 5000;

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  log(type: string, ...args: any[]) {
    this.batch.push({
      type,
      args,
      timestamp: Date.now(),
    });

    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.batch.length === 0) return;

    const logsToSend = [...this.batch];
    this.batch = [];

    try {
      await fetch('/api/logs/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      Logit.error('Failed to send batch logs', error);
      // Optionally: add failed logs back to batch
    }
  }
}
```
