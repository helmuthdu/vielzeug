# Logit Examples

Here are some practical examples of using the logger package.

## Basic Logging

```ts
import { Logit } from '@vielzeug/logit';

Logit.debug('Debug message');
Logit.info('Info message');
Logit.success('Success!');
Logit.warn('Warning!');
Logit.error('Error!');
Logit.trace('Trace details');
```

## Table, Timing, and Groups

```ts
Logit.table([
  { name: 'Alice', age: 30 },
  { name: 'Bob', age: 25 },
]);
Logit.time('load');
// ... some code ...
Logit.timeEnd('load');
Logit.groupCollapsed('Details', 'MyGroup');
Logit.info('Inside group');
Logit.groupEnd();
```

## Namespaces and Variants

```ts
Logit.setPrefix('MyApp');
Logit.setVariant('icon');
Logit.info('Namespaced log with icon variant');
```

## Remote Logging

```ts
Logit.setRemote({
  handler: (type, ...args) => {
    // Send logs to a server or external service
    fetch('/log', { method: 'POST', body: JSON.stringify({ type, args }) });
  },
  logLevel: 'error',
});
Logit.error('This will be sent remotely');
```

## Custom Configuration

```ts
Logit.initialise({
  logLevel: 'info',
  namespace: 'CustomApp',
  variant: 'symbol',
  timestamp: true,
});
Logit.info('Custom config in action');
```
