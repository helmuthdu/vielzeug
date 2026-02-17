<PackageBadges package="wireit" />

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

| Feature          | Wireit                                               | InversifyJS    | TSyringe    |
| ---------------- | ---------------------------------------------------- | -------------- | ----------- |
| Bundle Size      | **<PackageInfo package="wireit" type="size" />**     | ~17 KB         | ~6 KB       |
| Dependencies     | <PackageInfo package="wireit" type="dependencies" /> | 1              | 2           |
| TypeScript       | ✅ First-class                                       | ✅ First-class | ✅ Good     |
| Async Support    | ✅ Yes                                               | ✅ Yes         | ❌          |
| Decorators       | ❌                                                   | ✅ Required    | ✅ Required |
| No Reflect-meta  | ✅ Yes                                               | ❌             | ❌          |
| Scoped Lifetimes | ✅ Yes                                               | ✅ Yes         | ✅ Yes      |
| Testing Helpers  | ✅ Built-in                                          | ❌             | ❌          |

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

- **Async Support**: Handle [async initialization](./usage.md#advanced-features) seamlessly.
- **Container Hierarchies**: Create [parent/child container relationships](./usage.md#container-management) for scoped dependency management.
- **Lifecycle Management**: Support for [Singleton, Transient, and Request lifetimes](./usage.md#lifetimes).
- **Scoped Execution**: Perfect for request-scoped dependencies. See [Lifetimes](./usage.md#lifetimes).
- **Testing First**: Built-in support for [mocking dependencies and test containers](./usage.md#testing).
- **Testing Utilities**: Built-in [helpers for easy testing](./api.md#testing-utilities).
- **Type-Safe Resolution**: Full [TypeScript inference](./usage.md#tokens) from tokens to resolved instances.

## 🏁 Quick Start

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// 1. Define tokens
const Database = createToken<DatabaseService>('Database');
const UserService = createToken<UserService>('UserService');

// 2. Create container and register providers
const container = createContainer();
container.registerValue(Database, new PrismaDatabase()).register(UserService, {
  useClass: UserServiceImpl,
  deps: [Database],
});

// 3. Resolve and use
const userService = container.get(UserService);
await userService.createUser({ name: 'Alice' });
```

::: tip Next Steps

- See [Usage Guide](./usage.md) for lifetimes, async support, and testing
- Check [Examples](./examples.md) for real-world patterns
  :::

## 🎓 Core Concepts

### 🏷️ Tokens

Tokens are typed symbols that uniquely identify dependencies:

```ts
const Logger = createToken<ILogger>('Logger');
const Config = createToken<AppConfig>('Config');
```

### 📦 Providers

Three provider types for different scenarios:

- **Value** – Register existing instances or plain values
- **Class** – Register classes to be instantiated
- **Factory** – Register factory functions for custom creation logic

### ⏱️ Lifetimes

Control instance creation and reuse:

- **Singleton** – One instance shared across the entire container
- **Transient** – New instance created for every resolution
- **Scoped** – One instance per scope (e.g., per HTTP request)

### 🌳 Container Hierarchy

Create parent/child containers for isolation and inheritance:

- Children inherit parent registrations
- Children can override parent providers
- Scoped execution with automatic cleanup

## ❓ FAQ

### How does Wireit differ from InversifyJS?

Wireit is smaller (<PackageInfo package="wireit" type="size" /> vs ~17KB), doesn't require decorators, and provides testing utilities out of the box. InversifyJS offers more advanced features like multi-injection and contextual bindings.

### Can I use Wireit without TypeScript?

Yes, but you'll lose type safety. Wireit is designed for TypeScript-first projects to maximize type inference and developer experience.

### How do I handle circular dependencies?

Refactor your code to break the cycle. Use a shared dependency or create an interface both services depend on instead of depending on each other.

### Can I use Wireit with Express/NestJS/Fastify?

Yes! Wireit is framework-agnostic. See the [Examples](./examples) page for integration patterns with Express, NestJS, and Fastify.

### What's the difference between singleton and scoped?

- **Singleton**: One instance across the entire application
- **Scoped**: One instance per scope (e.g., per HTTP request)
- **Transient**: New instance every time

### How do I test code that uses Wireit?

Use `createTestContainer()` for isolated tests and `withMock()` to temporarily replace dependencies:

```ts
const { container, dispose } = createTestContainer();
await withMock(container, Database, mockDb, async () => {
  // Test code here
});
```

## 🐛 Troubleshooting

### No provider registered for token

::: danger Problem
Getting "No provider registered for token" error.
:::

::: tip Solution
Register the token before resolving:

```ts
// ❌ Token not registered
const service = container.get(UnknownToken);

// ✅ Register before resolving
container.register(Token, { useClass: Implementation });
const service = container.get(Token);
```

:::

### Circular dependency detected

::: danger Problem
Circular dependency error when resolving services.
:::

::: tip Solution
Refactor to break the cycle:

```ts
// ❌ Service1 depends on Service2, Service2 depends on Service1
container.register(Service1, { useClass: S1, deps: [Service2] });
container.register(Service2, { useClass: S2, deps: [Service1] });

// ✅ Refactor to break the cycle
container.register(Service1, { useClass: S1, deps: [Shared] });
container.register(Service2, { useClass: S2, deps: [Shared] });
```

:::

### Provider is async, use getAsync()

::: danger Problem
Error: "Provider is async, use getAsync()".
:::

::: tip Solution
Use `getAsync()` for async providers:

```ts
// ❌ Async provider with sync get
container.registerFactory(DB, async () => db, [], { async: true });
const db = container.get(DB); // Error!

// ✅ Use getAsync
const db = await container.getAsync(DB);
```

:::

## 🤝 Contributing

Contributions are welcome! Check out our [Contributing Guide](../../.github/contributing.md) to get started.

## 📄 License

MIT © [Helmuth Saatkamp](https://github.com/helmuthdu)

## 🔗 Useful Links

- [GitHub Repository](https://github.com/helmuthdu/vielzeug)
- [NPM Package](https://www.npmjs.com/package/@vielzeug/wireit)
- [Issue Tracker](https://github.com/helmuthdu/vielzeug/issues)
- [Changelog](https://github.com/helmuthdu/vielzeug/blob/main/packages/wireit/CHANGELOG.md)
