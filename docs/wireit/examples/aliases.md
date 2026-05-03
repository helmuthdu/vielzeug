---
title: Wireit Examples - Aliases
description: Alias patterns in wireit.
---

## Interface to implementation

```ts
const ILoggerToken = createToken<ILogger>('ILogger');
const ConsoleLoggerToken = createToken<ConsoleLogger>('ConsoleLogger');

container.bind(ConsoleLoggerToken, ConsoleLogger);
container.alias(ILoggerToken, ConsoleLoggerToken);

const logger = await container.resolve(ILoggerToken);
```

## Alias chain

```ts
container.value(BaseConfigToken, { timeout: 5000 });
container.alias(AppConfigToken, BaseConfigToken);
container.alias(ServiceConfigToken, AppConfigToken);

const config = await container.resolve(ServiceConfigToken);
```
