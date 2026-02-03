# Logit API Reference

Complete API documentation for `@vielzeug/logit`.

## Core Logging Methods

All logging methods accept multiple arguments of any type and return `void`.

### `Logit.debug(...args)`

Logs debug-level messages. Useful for detailed debugging information.

**Level**: `debug` (lowest)

**Example:**

```ts
Logit.debug('Variable value:', myVar);
Logit.debug('Debug info', { state: appState, config: settings });
```

---

### `Logit.info(...args)`

Logs informational messages about application flow and state.

**Level**: `info`

**Example:**

```ts
Logit.info('Application started');
Logit.info('User action', { userId: '123', action: 'login' });
```

---

### `Logit.success(...args)`

Logs success messages, typically for completed operations.

**Level**: `success`

**Example:**

```ts
Logit.success('Data saved successfully');
Logit.success('Upload complete', { files: 5, size: '2.3MB' });
```

---

### `Logit.warn(...args)`

Logs warning messages for potentially problematic situations.

**Level**: `warn`

**Example:**

```ts
Logit.warn('Deprecated API used');
Logit.warn('High memory usage', { usage: '85%', threshold: '80%' });
```

---

### `Logit.error(...args)`

Logs error messages for failures and exceptions.

**Level**: `error`

**Example:**

```ts
Logit.error('Failed to fetch data', new Error('Network timeout'));
Logit.error('Validation failed', { errors: validationErrors });
```

---

### `Logit.trace(...args)`

Logs trace-level messages with detailed execution information.

**Level**: `trace`

**Example:**

```ts
Logit.trace('Function called', { args: arguments, caller: functionName });
```

---

## Utility Methods

### `Logit.table(...args)`

Displays data in a table format in the console.

**Level**: `table`

**Parameters:**

- `...args: any[]` - Data to display (typically arrays of objects)

**Example:**

```ts
const users = [
  { id: 1, name: 'Alice', role: 'Admin' },
  { id: 2, name: 'Bob', role: 'User' },
];
Logit.table(users);

// Can also pass multiple tables
Logit.table(users, permissions);
```

---

### `Logit.time(label)`

Starts a timer with the specified label.

**Level**: `time`

**Parameters:**

- `label: string` - Unique identifier for the timer

**Example:**

```ts
Logit.time('database-query');
await db.query('SELECT * FROM users');
Logit.timeEnd('database-query'); // Logs elapsed time
```

---

### `Logit.timeEnd(label)`

Stops a timer and logs the elapsed time.

**Level**: `time`

**Parameters:**

- `label: string` - Timer label (must match the `time()` call)

**Example:**

```ts
Logit.time('operation');
performExpensiveOperation();
Logit.timeEnd('operation'); // Output: "operation: 142ms"
```

---

### `Logit.groupCollapsed(text, label?, time?)`

Creates a collapsed group in the console for organizing related logs.

**Level**: Uses `success` level for filtering

**Parameters:**

- `text: string` - Main group label text
- `label?: string` - Optional prefix label (default: `'GROUP'`)
- `time?: number` - Optional start time for elapsed time display (default: `Date.now()`)

**Example:**

```ts
Logit.groupCollapsed('User Details', 'INFO');
Logit.info('Name:', user.name);
Logit.info('Email:', user.email);
Logit.info('Roles:', user.roles);
Logit.groupEnd();

// With timing
const startTime = Date.now();
Logit.groupCollapsed('API Response', 'DEBUG', startTime);
Logit.debug('Status:', response.status);
Logit.debug('Data:', response.data);
Logit.groupEnd();
```

---

### `Logit.groupEnd()`

Ends the current console group.

**Level**: Uses `success` level for filtering

**Example:**

```ts
Logit.groupCollapsed('Processing');
Logit.info('Step 1 complete');
Logit.info('Step 2 complete');
Logit.groupEnd(); // Ends the group
```

---

### `Logit.assert(valid, message, context)`

Logs an assertion error if the condition is false.

**Parameters:**

- `valid: boolean` - Condition to check
- `message: string` - Error message if condition fails
- `context: Record<string, any>` - Additional context data

**Example:**

```ts
const isAuthenticated = checkAuth();
Logit.assert(isAuthenticated, 'User must be authenticated', {
  userId: user?.id,
  endpoint: '/protected-route',
});

// If isAuthenticated is false, logs to console:
// Assertion failed: User must be authenticated
// { userId: undefined, endpoint: '/protected-route' }
```

---

## Configuration Methods

### `Logit.initialise(options)`

Initializes or updates Logit configuration with multiple options at once.

**Parameters:**

- `options: LogitOptions` - Configuration object

**Example:**

```ts
Logit.initialise({
  logLevel: 'info',
  namespace: 'MyApp',
  variant: 'symbol',
  timestamp: true,
  environment: true,
  remote: {
    handler: async (type, ...args) => {
      await sendToServer(type, args);
    },
    logLevel: 'error',
  },
});
```

---

### `Logit.setLogLevel(level)`

Sets the minimum log level to display.

**Parameters:**

- `level: LogitLevel` - Minimum level to show

**Example:**

```ts
Logit.setLogLevel('warn'); // Only show warn and error
Logit.setLogLevel('debug'); // Show all logs
Logit.setLogLevel('off'); // Disable all logs
```

---

### `Logit.setPrefix(namespace)`

Sets a namespace prefix for all subsequent logs.

**Parameters:**

- `namespace: string` - Prefix text

**Example:**

```ts
Logit.setPrefix('API');
Logit.info('Request started'); // Shows [API] in output

Logit.setPrefix('Database');
Logit.info('Connected'); // Shows [Database] in output
```

---

### `Logit.setRemote(remote)`

Configures remote logging handler.

**Parameters:**

- `remote: LogitRemoteOptions` - Remote logging configuration

**Example:**

```ts
Logit.setRemote({
  handler: async (type, ...args) => {
    if (type === 'error') {
      await fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ type, args }),
      });
    }
  },
  logLevel: 'error', // Only send errors remotely
});
```

---

### `Logit.setRemoteLogLevel(level)`

Updates the remote logging level without changing the handler.

**Parameters:**

- `level: LogitLevel` - Minimum level for remote logging

**Example:**

```ts
// Initially send errors only
Logit.setRemote({
  handler: sendToServer,
  logLevel: 'error',
});

// Later, also send warnings
Logit.setRemoteLogLevel('warn');
```

---

### `Logit.setVariant(variant)`

Sets the display variant for log messages.

**Parameters:**

- `variant: 'text' | 'icon' | 'symbol'` - Display style

**Options:**

- `'symbol'` - Emoji-like symbols (🅳, 🅸, etc.)
- `'icon'` - Unicode icons (☕, ℹ, ✔, etc.)
- `'text'` - Plain text (DEBUG, INFO, etc.)

**Example:**

```ts
Logit.setVariant('symbol'); // [🅸] Message
Logit.setVariant('icon'); // [ℹ] Message
Logit.setVariant('text'); // [INFO] Message
```

---

### `Logit.showEnvironment(value)`

Shows or hides the environment indicator (🅿 for production, 🅳 for development).

**Parameters:**

- `value: boolean` - Show environment indicator

**Example:**

```ts
Logit.showEnvironment(true); // Show indicator
Logit.showEnvironment(false); // Hide indicator
```

---

### `Logit.showTimestamp(value)`

Shows or hides timestamps in log output.

**Parameters:**

- `value: boolean` - Show timestamps

**Example:**

```ts
Logit.showTimestamp(true); // Show timestamps
Logit.showTimestamp(false); // Hide timestamps
```

---

## Getter Methods

### `Logit.getLevel()`

Returns the current minimum log level.

**Returns:** `LogitLevel`

**Example:**

```ts
const currentLevel = Logit.getLevel();
console.log(currentLevel); // 'info'
```

---

### `Logit.getPrefix()`

Returns the current namespace prefix.

**Returns:** `string`

**Example:**

```ts
Logit.setPrefix('MyModule');
const prefix = Logit.getPrefix();
console.log(prefix); // 'MyModule'
```

---

### `Logit.getTimestamp()`

Returns whether timestamps are currently enabled.

**Returns:** `boolean`

**Example:**

```ts
const timestampsEnabled = Logit.getTimestamp();
console.log(timestampsEnabled); // true or false
```

---

## Types

### `LogitOptions`

Configuration options for initializing Logit.

```ts
interface LogitOptions {
  environment?: boolean; // Show environment indicator (default: true)
  variant?: 'text' | 'symbol' | 'icon'; // Display variant (default: 'symbol')
  logLevel?: LogitLevel; // Minimum log level (default: 'debug')
  namespace?: string; // Prefix for logs (default: '')
  remote?: LogitRemoteOptions; // Remote logging configuration
  timestamp?: boolean; // Show timestamps (default: true)
}
```

---

### `LogitRemoteOptions`

Remote logging handler configuration.

```ts
interface LogitRemoteOptions {
  handler?: (type: LogitType, ...args: any[]) => void;
  logLevel: LogitLevel;
}
```

**Properties:**

- `handler` - Function called for remote logging
  - `type: LogitType` - The log level/type
  - `...args: any[]` - Original log arguments
- `logLevel` - Minimum level to trigger remote logging

---

### `LogitLevel`

Available log levels (ordered by severity).

```ts
type LogitLevel =
  | 'debug' // Lowest - most verbose
  | 'trace'
  | 'time'
  | 'table'
  | 'info'
  | 'success'
  | 'warn'
  | 'error' // Highest - least verbose
  | 'off'; // Disables all logging
```

---

### `LogitType`

Available log methods.

```ts
type LogitType = 'debug' | 'trace' | 'time' | 'table' | 'info' | 'success' | 'warn' | 'error';
```

---

### `LogitColors`

Colors used in themes (internal type).

```ts
type LogitColors = Exclude<LogitType, 'table'> | 'group' | 'ns';
```

---

### `LogitTheme`

Theme definition for log styling.

```ts
interface LogitTheme {
  color: string; // Text color
  bg: string; // Background color
  border: string; // Border color
  icon?: string; // Icon character
  symbol?: string; // Symbol character
}
```

---

### `LogitInstance`

Type representing the Logit object.

```ts
type LogitInstance = typeof Logit;
```

---

## Advanced Usage

### Custom Remote Handler

```ts
Logit.setRemote({
  handler: async (type, ...args) => {
    // Format the log entry
    const entry = {
      timestamp: new Date().toISOString(),
      level: type,
      prefix: Logit.getPrefix(),
      messages: args.map((arg) => {
        if (arg instanceof Error) {
          return {
            message: arg.message,
            stack: arg.stack,
            name: arg.name,
          };
        }
        return arg;
      }),
    };

    // Send to multiple destinations
    try {
      await Promise.all([
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(entry),
        }),
        sendToSentry(entry),
        writeToLocalStorage(entry),
      ]);
    } catch (error) {
      console.error('Remote logging failed:', error);
    }
  },
  logLevel: 'warn',
});
```

### Conditional Configuration

```ts
// Development
if (process.env.NODE_ENV === 'development') {
  Logit.initialise({
    logLevel: 'debug',
    variant: 'symbol',
    timestamp: true,
    environment: true,
  });
}

// Production
if (process.env.NODE_ENV === 'production') {
  Logit.initialise({
    logLevel: 'error',
    variant: 'text',
    timestamp: true,
    environment: false,
    remote: {
      handler: sendToAnalytics,
      logLevel: 'error',
    },
  });
}

// Testing
if (process.env.NODE_ENV === 'test') {
  Logit.setLogLevel('off'); // Silent during tests
}
```

### Browser vs Node.js

Logit automatically adapts to the environment:

**Browser:**

- Uses CSS styling for colored output
- Supports all visual variants (symbol, icon, text)
- Respects log levels for filtering

**Node.js:**

- Uses plain text output
- Shows variant symbols/icons/text in output
- Respects log levels for filtering

Both environments support all features including remote logging, timing, grouping, and tables.
