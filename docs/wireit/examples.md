# Wireit Examples

Real-world examples demonstrating common use cases and patterns with Wireit.

::: tip 💡 Complete Applications
These are complete, production-ready application examples. For API reference and basic usage, see [Usage Guide](./usage.md).
:::

## Table of Contents

[[toc]]

## Framework Integration

::: details 🎯 Why Two Patterns?
We provide both **inline** and **composition** patterns because:

- **Inline**: Quick setup, prototyping, simple applications
- **Composition**: Reusable modules, better separation of concerns, easier testing

Choose based on your project structure and team preferences.
:::

Complete examples showing how to integrate Wireit with Express, NestJS, and other frameworks.

### Express.js Integration (Inline)

Direct container usage in Express middleware and routes.

```ts
import express from 'express';
import { createContainer, createToken } from '@vielzeug/wireit';

// Tokens
const Database = createToken<PrismaClient>('Database');
const Logger = createToken<ILogger>('Logger');
const UserService = createToken<UserService>('UserService');

// Setup container
const container = createContainer();

container
  .registerValue(Database, new PrismaClient())
  .registerValue(Logger, new ConsoleLogger())
  .register(UserService, {
    useClass: UserService,
    deps: [Database, Logger],
  });

// Express app
const app = express();
app.use(express.json());

// Routes
app.post('/users', async (req, res) => {
  const service = container.get(UserService);
  const user = await service.createUser(req.body);
  res.json(user);
});

app.get('/users/:id', async (req, res) => {
  const service = container.get(UserService);
  const user = await service.getUser(req.params.id);
  res.json(user);
});

app.listen(3000);
```

### Express.js with Request Scoping

Use scoped containers for request-specific dependencies.

```ts
import express from 'express';
import { createContainer, createToken } from '@vielzeug/wireit';

// Tokens
const RequestId = createToken<string>('RequestId');
const User = createToken<User>('User');
const RequestContext = createToken<RequestContext>('RequestContext');
const RequestHandler = createToken<RequestHandler>('RequestHandler');

// Setup root container
const container = createContainer();

container
  .registerValue(Database, db)
  .registerValue(Logger, logger)
  .register(RequestHandler, {
    useClass: RequestHandler,
    deps: [Database, Logger, RequestContext],
  })
  .register(RequestContext, {
    useClass: RequestContext,
    deps: [RequestId, User],
    lifetime: 'scoped',
  });

// Middleware
app.use(async (req, res, next) => {
  await container.runInScope(
    async (scope) => {
      // Store request-specific data in scope
      req.container = scope;
      next();
    },
    [
      [RequestId, { useValue: req.id }],
      [User, { useValue: req.user }],
    ],
  );
});

// Route using scoped container
app.post('/users', async (req, res) => {
  const handler = req.container.get(RequestHandler);
  const result = await handler.createUser(req.body);
  res.json(result);
});
```

### NestJS Integration

Use Wireit as an alternative to NestJS's built-in DI.

```ts
// container.module.ts
import { Global, Module } from '@nestjs/common';
import { createContainer } from '@vielzeug/wireit';
import * as Tokens from './tokens';

const container = createContainer();

// Register all providers
container
  .registerValue(Tokens.Config, config)
  .register(Tokens.Database, { useClass: PrismaService })
  .register(Tokens.UserService, {
    useClass: UserService,
    deps: [Tokens.Database, Tokens.Logger],
  });

@Global()
@Module({
  providers: [
    {
      provide: 'WIREIT_CONTAINER',
      useValue: container,
    },
  ],
  exports: ['WIREIT_CONTAINER'],
})
export class ContainerModule {}

// user.controller.ts
@Controller('users')
export class UserController {
  constructor(@Inject('WIREIT_CONTAINER') private container: Container) {}

  @Post()
  async createUser(@Body() data: CreateUserDto) {
    const service = this.container.get(Tokens.UserService);
    return service.createUser(data);
  }
}
```

### Fastify Integration

```ts
import Fastify from 'fastify';
import { createContainer, createToken } from '@vielzeug/wireit';

const fastify = Fastify();

// Setup container
const container = createContainer();
container.registerValue(Database, db).register(UserService, {
  useClass: UserService,
  deps: [Database],
});

// Add container to request
fastify.decorateRequest('container', null);

fastify.addHook('onRequest', async (request) => {
  request.container = container.createChild([[RequestId, { useValue: request.id }]]);
});

fastify.post('/users', async (request, reply) => {
  const service = request.container.get(UserService);
  const user = await service.createUser(request.body);
  return user;
});

await fastify.listen({ port: 3000 });
```

## Application Examples

### Full-Stack Application

Complete example with database, services, and API.

```ts
import { createContainer, createToken } from '@vielzeug/wireit';
import { PrismaClient } from '@prisma/client';
import express from 'express';

// -------------------- Tokens --------------------

const Config = createToken<AppConfig>('Config');
const Logger = createToken<ILogger>('Logger');
const Database = createToken<PrismaClient>('Database');
const UserRepository = createToken<IUserRepository>('UserRepository');
const UserService = createToken<IUserService>('UserService');
const EmailService = createToken<IEmailService>('EmailService');
const AuthService = createToken<IAuthService>('AuthService');

// -------------------- Interfaces --------------------

interface AppConfig {
  port: number;
  dbUrl: string;
  jwtSecret: string;
  emailApiKey: string;
}

interface ILogger {
  info(message: string, meta?: any): void;
  error(message: string, error?: Error): void;
}

interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

interface IUserService {
  createUser(data: CreateUserData): Promise<User>;
  getUser(id: string): Promise<User>;
}

interface IEmailService {
  sendWelcomeEmail(email: string, name: string): Promise<void>;
}

interface IAuthService {
  generateToken(userId: string): string;
  verifyToken(token: string): string | null;
}

// -------------------- Implementations --------------------

class ConsoleLogger implements ILogger {
  info(message: string, meta?: any) {
    console.log(`[INFO] ${message}`, meta || '');
  }
  error(message: string, error?: Error) {
    console.error(`[ERROR] ${message}`, error || '');
  }
}

class UserRepository implements IUserRepository {
  constructor(
    private db: PrismaClient,
    private logger: ILogger,
  ) {}

  async create(data: CreateUserData): Promise<User> {
    this.logger.info('Creating user in database', { email: data.email });
    return this.db.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({ where: { email } });
  }
}

class UserService implements IUserService {
  constructor(
    private userRepo: IUserRepository,
    private emailService: IEmailService,
    private logger: ILogger,
  ) {}

  async createUser(data: CreateUserData): Promise<User> {
    this.logger.info('Creating user', { email: data.email });

    // Check if user exists
    const existing = await this.userRepo.findByEmail(data.email);
    if (existing) {
      throw new Error('User already exists');
    }

    // Create user
    const user = await this.userRepo.create(data);

    // Send welcome email
    await this.emailService.sendWelcomeEmail(user.email, user.name);

    this.logger.info('User created successfully', { userId: user.id });
    return user;
  }

  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

class SendGridEmailService implements IEmailService {
  constructor(
    private config: AppConfig,
    private logger: ILogger,
  ) {}

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    this.logger.info('Sending welcome email', { email });
    // SendGrid implementation
    // await sendgrid.send({ ... });
  }
}

class JwtAuthService implements IAuthService {
  constructor(private config: AppConfig) {}

  generateToken(userId: string): string {
    // JWT implementation
    return `token_${userId}`;
  }

  verifyToken(token: string): string | null {
    // JWT verification
    return token.replace('token_', '');
  }
}

// -------------------- Container Setup --------------------

const container = createContainer();

// Configuration
container.registerValue(Config, {
  port: 3000,
  dbUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  emailApiKey: process.env.EMAIL_API_KEY!,
});

// Infrastructure
container.register(Logger, { useClass: ConsoleLogger, lifetime: 'singleton' });

container.registerFactory(
  Database,
  async (config) => {
    const db = new PrismaClient({ datasourceUrl: config.dbUrl });
    await db.$connect();
    return db;
  },
  [Config],
  { async: true, lifetime: 'singleton' },
);

// Repositories
container.register(UserRepository, {
  useClass: UserRepository,
  deps: [Database, Logger],
  lifetime: 'singleton',
});

// Services
container.register(UserService, {
  useClass: UserService,
  deps: [UserRepository, EmailService, Logger],
  lifetime: 'singleton',
});

container.register(EmailService, {
  useClass: SendGridEmailService,
  deps: [Config, Logger],
  lifetime: 'singleton',
});

container.register(AuthService, {
  useClass: JwtAuthService,
  deps: [Config],
  lifetime: 'singleton',
});

// -------------------- Express App --------------------

async function bootstrap() {
  // Initialize async dependencies
  await container.getAsync(Database);

  const app = express();
  app.use(express.json());

  // Routes
  app.post('/auth/register', async (req, res) => {
    try {
      const userService = container.get(UserService);
      const authService = container.get(AuthService);

      const user = await userService.createUser(req.body);
      const token = authService.generateToken(user.id);

      res.json({ user, token });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/users/:id', async (req, res) => {
    try {
      const userService = container.get(UserService);
      const user = await userService.getUser(req.params.id);
      res.json(user);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });

  const config = container.get(Config);
  app.listen(config.port, () => {
    const logger = container.get(Logger);
    logger.info(`Server running on port ${config.port}`);
  });
}

bootstrap().catch(console.error);
```

## Testing Examples

### Unit Testing with Mocks

```ts
import { describe, it, expect, vi } from 'vitest';
import { createTestContainer, withMock } from '@vielzeug/wireit';

describe('UserService', () => {
  const { container, dispose } = createTestContainer();

  // Setup container with mocks
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
  };

  const mockEmailService = {
    sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  };

  container
    .registerValue(Logger, mockLogger)
    .registerValue(EmailService, mockEmailService)
    .register(UserRepository, {
      useClass: UserRepository,
      deps: [Database, Logger],
    })
    .register(UserService, {
      useClass: UserService,
      deps: [UserRepository, EmailService, Logger],
    });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    dispose();
  });

  it('should create user and send welcome email', async () => {
    const mockDb = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };

    await withMock(container, Database, mockDb, async () => {
      const service = container.get(UserService);
      const user = await service.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      expect(user.id).toBe('1');
      expect(mockLogger.info).toHaveBeenCalledWith('Creating user', {
        email: 'test@example.com',
      });
      expect(mockEmailService.sendWelcomeEmail).toHaveBeenCalledWith('test@example.com', 'Test User');
    });
  });

  it('should throw error if user exists', async () => {
    const mockDb = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: '1',
          email: 'existing@example.com',
        }),
      },
    };

    await withMock(container, Database, mockDb, async () => {
      const service = container.get(UserService);

      await expect(
        service.createUser({
          email: 'existing@example.com',
          name: 'Test',
        }),
      ).rejects.toThrow('User already exists');
    });
  });
});
```

### Integration Testing

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createContainer } from '@vielzeug/wireit';

describe('UserService Integration', () => {
  let container: Container;
  let db: PrismaClient;

  beforeAll(async () => {
    // Setup test database
    db = new PrismaClient({
      datasourceUrl: process.env.TEST_DATABASE_URL,
    });
    await db.$connect();

    // Setup container with real dependencies
    container = createContainer();
    container
      .registerValue(Config, testConfig)
      .registerValue(Database, db)
      .register(Logger, { useClass: ConsoleLogger })
      .register(EmailService, { useClass: MockEmailService })
      .register(UserRepository, {
        useClass: UserRepository,
        deps: [Database, Logger],
      })
      .register(UserService, {
        useClass: UserService,
        deps: [UserRepository, EmailService, Logger],
      });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('should create user end-to-end', async () => {
    const service = container.get(UserService);

    const user = await service.createUser({
      email: 'integration@test.com',
      name: 'Integration Test',
    });

    expect(user.id).toBeDefined();
    expect(user.email).toBe('integration@test.com');

    // Verify in database
    const dbUser = await db.user.findUnique({
      where: { email: 'integration@test.com' },
    });
    expect(dbUser).toBeDefined();
  });
});
```

## Advanced Patterns

### Plugin System

Build extensible applications with dynamic provider registration.

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// Plugin interface
interface Plugin {
  name: string;
  register(container: Container): void;
}

// Core tokens
const PluginManager = createToken<IPluginManager>('PluginManager');
const EventBus = createToken<IEventBus>('EventBus');

// Plugin manager
class PluginManagerImpl {
  private plugins: Plugin[] = [];

  constructor(private container: Container) {}

  registerPlugin(plugin: Plugin) {
    console.log(`Registering plugin: ${plugin.name}`);
    plugin.register(this.container);
    this.plugins.push(plugin);
  }

  getPlugins() {
    return this.plugins;
  }
}

// Example plugins
const AuthPlugin: Plugin = {
  name: 'auth',
  register(container) {
    const AuthService = createToken('AuthService');
    container.register(AuthService, { useClass: JwtAuthService });
  },
};

const LoggingPlugin: Plugin = {
  name: 'logging',
  register(container) {
    const Logger = createToken('Logger');
    container.register(Logger, { useClass: WinstonLogger });
  },
};

// Setup
const container = createContainer();
container.register(PluginManager, {
  useClass: PluginManagerImpl,
  deps: [createToken('Container')],
});
container.registerValue(createToken('Container'), container);

// Register plugins
const pluginManager = container.get(PluginManager);
pluginManager.registerPlugin(AuthPlugin);
pluginManager.registerPlugin(LoggingPlugin);
```

### Multi-Tenant Applications

Different container instances per tenant.

```ts
import { createContainer, createToken } from '@vielzeug/wireit';

// Tenant-specific tokens
const TenantId = createToken<string>('TenantId');
const TenantConfig = createToken<TenantConfig>('TenantConfig');
const TenantDatabase = createToken<PrismaClient>('TenantDatabase');

// Tenant manager
class TenantManager {
  private containers = new Map<string, Container>();

  constructor(private baseContainer: Container) {}

  getTenantContainer(tenantId: string): Container {
    if (!this.containers.has(tenantId)) {
      const container = this.baseContainer.createChild();

      // Load tenant-specific config
      const config = this.loadTenantConfig(tenantId);

      // Register tenant-specific providers
      container.registerValue(TenantId, tenantId);
      container.registerValue(TenantConfig, config);
      container.registerFactory(
        TenantDatabase,
        (config) => new PrismaClient({ datasourceUrl: config.dbUrl }),
        [TenantConfig],
        { lifetime: 'singleton' },
      );

      this.containers.set(tenantId, container);
    }

    return this.containers.get(tenantId)!;
  }

  private loadTenantConfig(tenantId: string): TenantConfig {
    // Load from database or config service
    return { tenantId, dbUrl: `postgres://tenant-${tenantId}` };
  }
}

// Express middleware
app.use((req, res, next) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  req.container = tenantManager.getTenantContainer(tenantId);
  next();
});

app.get('/users', async (req, res) => {
  const service = req.container.get(UserService);
  const users = await service.getUsers();
  res.json(users);
});
```

### Conditional Registration

Register different implementations based on environment.

```ts
const container = createContainer();

// Register based on environment
if (process.env.NODE_ENV === 'production') {
  container.register(Logger, { useClass: CloudWatchLogger });
  container.register(EmailService, { useClass: SendGridService });
  container.register(Cache, { useClass: RedisCache });
} else {
  container.register(Logger, { useClass: ConsoleLogger });
  container.register(EmailService, { useClass: MockEmailService });
  container.register(Cache, { useClass: MemoryCache });
}

// Register based on feature flags
if (config.features.newAuth) {
  container.register(AuthService, { useClass: OAuth2Service });
} else {
  container.register(AuthService, { useClass: JwtAuthService });
}
```

## Next Steps

<div class="vp-doc">
  <div class="custom-block tip">
    <p class="custom-block-title">💡 Continue Learning</p>
    <ul>
      <li><a href="./usage">Usage Guide</a> – Complete API and patterns</li>
      <li><a href="./api">API Reference</a> – Detailed API documentation</li>
    </ul>
  </div>
</div>
