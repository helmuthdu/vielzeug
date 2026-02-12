<div class="badges">
  <img src="https://img.shields.io/badge/version-1.0.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/size-2.1_KB-success" alt="Size">
  <img src="https://img.shields.io/badge/TypeScript-100%25-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/dependencies-0-success" alt="Dependencies">
</div>

<img src="/logo-wireit.svg" alt="Wireit Logo" width="156" class="logo-highlight"/>

# Wireit

**Wireit** is a lightweight, type-safe dependency injection container for TypeScript. Wire up your application dependencies with clean IoC principles, zero dependencies, and full type inference.

## What Problem Does Wireit Solve?

Managing dependencies in modern applications leads to tightly coupled code, difficult testing, and poor maintainability. Wireit provides a simple, type-safe dependency injection container that follows IoC (Inversion of Control) principles.

**Traditional Approach**:

```ts
// Tightly coupled dependencies
class UserService {
  private db = new PrismaClient();
  private logger = new ConsoleLogger();
  private emailService = new SendGridService();

  async createUser(data: UserData) {
    this.logger.info('Creating user');
    const user = await this.db.user.create({ data });
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}

// Hard to test, hard to swap implementations
const service = new UserService();
```

**With Wireit**:

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

const Database = createToken<IDatabase>('Database');
const Logger = createToken<ILogger>('Logger');
const EmailService = createToken<IEmailService>('EmailService');
const UserService = createToken<IUserService>('UserService');

class UserServiceImpl {
  constructor(
    private db: IDatabase,
    private logger: ILogger,
    private emailService: IEmailService,
  ) {}

  async createUser(data: UserData) {
    this.logger.info('Creating user');
    const user = await this.db.user.create({ data });
    await this.emailService.sendWelcome(user.email);
    return user;
  }
}

const container = createContainer();
container
  .register(Database, { useClass: PrismaDatabase })
  .register(Logger, { useClass: ConsoleLogger })
  .register(EmailService, { useClass: SendGridService })
  .register(UserService, {
    useClass: UserServiceImpl,
    deps: [Database, Logger, EmailService],
  });

// Easy to test, easy to swap implementations
const service = container.get(UserService);
```

### Comparison with Alternatives

| Feature          | Wireit    | InversifyJS | TSyringe |
| ---------------- | --------- | ----------- | -------- |
| Bundle Size      | **~2 KB** | ~14KB       | ~7KB     |
| Dependencies     | 0         | 1           | 2        |
| Decorators       | ❌        | ✅          | ✅       |
| Async Support    | ✅        | ✅          | ❌       |
| Scoped Lifetimes | ✅        | ✅          | ✅       |
| Testing Helpers  | ✅        | ❌          | ❌       |
| TypeScript First | ✅        | ✅          | ✅       |
| No Reflect-meta  | ✅        | ❌          | ❌       |

## When to Use Wireit

✅ **Use Wireit when you need:**

- Type-safe dependency injection
- Loose coupling between components
- Easy testing with mocked dependencies
- Support for async initialization
- Parent/child container hierarchies
- Request-scoped dependencies
- Zero dependencies and minimal bundle size

❌ **Don't use Wireit when:**

- You prefer decorator-based DI (use InversifyJS)
- You need framework-specific integrations (though Wireit works everywhere)

## 🚀 Key Features

### Type-Safe Resolution

Full TypeScript inference from tokens to resolved instances:

```ts
const Logger = createToken<ILogger>('Logger');
container.register(Logger, { useClass: ConsoleLogger });

const logger = container.get(Logger); // Type: ILogger ✅
```

### Async Support

Handle async initialization seamlessly:

```ts
container.registerFactory(
  Database,
  async (config) => {
    const db = new PrismaClient();
    await db.$connect();
    return db;
  },
  [Config],
  { async: true, lifetime: 'singleton' },
);

const db = await container.getAsync(Database);
```

### Scoped Execution

Perfect for request-scoped dependencies:

```ts
app.use(async (req, res) => {
  await container.runInScope(
    async (scope) => {
      const handler = scope.get(RequestHandler);
      await handler.process(req, res);
    },
    [[RequestId, { useValue: req.id }]],
  );
});
```

### Testing Utilities

Built-in helpers for easy testing:

```ts
import { createTestContainer, withMock } from '@vielzeug/wireit';

const { container, dispose } = createTestContainer(baseContainer);

await withMock(container, Database, mockDb, async () => {
  const service = container.get(UserService);
  // service uses mockDb
});
```

## 🏁 Quick Start

### Installation

::: code-group

```sh [pnpm]
pnpm add @vielzeug/wireit
```

```sh [npm]
npm install @vielzeug/wireit
```

```sh [yarn]
yarn add @vielzeug/wireit
```

:::

### Basic Example

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// 1. Define tokens
const Database = createToken<DatabaseService>('Database');
const UserService = createToken<UserService>('UserService');

// 2. Create container
const container = createContainer();

// 3. Register providers
container.registerValue(Database, new PrismaDatabase()).register(UserService, {
  useClass: UserServiceImpl,
  deps: [Database],
});

// 4. Resolve and use
const userService = container.get(UserService);
await userService.createUser({ name: 'Alice' });
```

## 🎓 Core Concepts

### 🏷️ Tokens

Tokens are typed symbols that uniquely identify dependencies:

```ts
const Logger = createToken<ILogger>('Logger');
const Config = createToken<AppConfig>('Config');
```

### 📦 Providers

Three provider types for different scenarios:

- **Value** - Register existing instances or plain values
- **Class** - Register classes to be instantiated
- **Factory** - Register factory functions for custom creation logic

### ⏱️ Lifetimes

Control instance creation and reuse:

- **Singleton** - One instance shared across the entire container
- **Transient** - New instance created for every resolution
- **Scoped** - One instance per scope (e.g., per HTTP request)

### 🌳 Container Hierarchy

Create parent/child containers for isolation and inheritance:

- Children inherit parent registrations
- Children can override parent providers
- Scoped execution with automatic cleanup

## 📚 Documentation

Explore comprehensive guides and references:

- **[Usage Guide](./usage)** - Complete guide to dependency injection with Wireit
- **[API Reference](./api)** - Detailed API documentation with all methods
- **[Examples](./examples)** - Real-world examples and framework integrations

## ❓ FAQ

### **Q: How does Wireit differ from InversifyJS?**

Wireit is smaller (~3KB vs ~14KB), doesn't require decorators, and provides testing utilities out of the box. InversifyJS offers more advanced features like multi-injection and contextual bindings.

### **Q: Can I use Wireit without TypeScript?**

Yes, but you'll lose type safety. Wireit is designed for TypeScript-first projects to maximize type inference and developer experience.

### **Q: How do I handle circular dependencies?**

Refactor your code to break the cycle. Use a shared dependency or create an interface both services depend on instead of depending on each other.

### **Q: Can I use Wireit with Express/NestJS/Fastify?**

Yes! Wireit is framework-agnostic. See the [Examples](./examples) page for integration patterns with Express, NestJS, and Fastify.

### **Q: What's the difference between singleton and scoped?**

- **Singleton**: One instance across the entire application
- **Scoped**: One instance per scope (e.g., per HTTP request)
- **Transient**: New instance every time

### **Q: How do I test code that uses Wireit?**

Use `createTestContainer()` for isolated tests and `withMock()` to temporarily replace dependencies:

```ts
const { container, dispose } = createTestContainer();
await withMock(container, Database, mockDb, async () => {
  // Test code here
});
```

## 🐛 Troubleshooting

### Common Issues

**"No provider registered for token"**

```ts
// ❌ Token not registered
const service = container.get(UnknownToken);

// ✅ Register before resolving
container.register(Token, { useClass: Implementation });
const service = container.get(Token);
```

**"Circular dependency detected"**

```ts
// ❌ Service1 depends on Service2, Service2 depends on Service1
container.register(Service1, { useClass: S1, deps: [Service2] });
container.register(Service2, { useClass: S2, deps: [Service1] });

// ✅ Refactor to break the cycle
container.register(Service1, { useClass: S1, deps: [Shared] });
container.register(Service2, { useClass: S2, deps: [Shared] });
```

**"Provider is async, use getAsync()"**

```ts
// ❌ Async provider with sync get
container.registerFactory(DB, async () => db, [], { async: true });
const db = container.get(DB); // Error!

// ✅ Use getAsync
const db = await container.getAsync(DB);
```

## 🤝 Contributing

Contributions are welcome! Check out our [Contributing Guide](../../.github/contributing.md) to get started.

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/wireit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/wireit/CHANGELOG.md)
