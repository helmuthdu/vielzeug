/** biome-ignore-all lint/suspicious/noExplicitAny: - */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AsyncProviderError,
  CircularDependencyError,
  Container,
  createContainer,
  createTestContainer,
  createToken,
  ProviderNotFoundError,
  withMock,
} from './wireit';

describe('createToken', () => {
  it('should create a unique symbol token', () => {
    const token1 = createToken<string>('test');
    const token2 = createToken<string>('test');

    expect(typeof token1).toBe('symbol');
    expect(token1).not.toBe(token2);
  });

  it('should create token with description', () => {
    const token = createToken<string>('MyService');

    expect(token.description).toBe('MyService');
  });

  it('should create token without description', () => {
    const token = createToken<string>();

    expect(typeof token).toBe('symbol');
  });
});

describe('Container - Basic Registration', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should register and resolve value provider', () => {
    const token = createToken<string>('config');
    container.registerValue(token, 'test-value');

    const value = container.get(token);

    expect(value).toBe('test-value');
  });

  it('should register value with custom lifetime', () => {
    const token = createToken<string>('config');
    container.registerValue(token, 'test-value', 'transient');

    expect(container.has(token)).toBe(true);
  });

  it('should register class provider', () => {
    class TestService {
      getValue() {
        return 'test';
      }
    }

    const token = createToken<TestService>('TestService');
    container.register(token, { useClass: TestService });

    const service = container.get(token);

    expect(service).toBeInstanceOf(TestService);
    expect(service.getValue()).toBe('test');
  });

  it('should register factory provider', () => {
    const token = createToken<string>('factory');
    container.registerFactory(token, () => 'factory-result');

    const value = container.get(token);

    expect(value).toBe('factory-result');
  });

  it('should support method chaining', () => {
    const token1 = createToken<string>('token1');
    const token2 = createToken<string>('token2');

    const result = container.registerValue(token1, 'value1').registerValue(token2, 'value2');

    expect(result).toBe(container);
    expect(container.get(token1)).toBe('value1');
    expect(container.get(token2)).toBe('value2');
  });

  it('should register multiple providers at once', () => {
    const token1 = createToken<string>('token1');
    const token2 = createToken<number>('token2');

    container.registerMany([
      [token1, { useValue: 'value1' }],
      [token2, { useValue: 42 }],
    ]);

    expect(container.get(token1)).toBe('value1');
    expect(container.get(token2)).toBe(42);
  });
});

describe('Container - Lifetimes', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should create singleton instances only once', () => {
    let instanceCount = 0;

    class TestService {
      constructor() {
        instanceCount++;
      }
    }

    const token = createToken<TestService>('TestService');
    container.register(token, { lifetime: 'singleton', useClass: TestService });

    const instance1 = container.get(token);
    const instance2 = container.get(token);

    expect(instanceCount).toBe(1);
    expect(instance1).toBe(instance2);
  });

  it('should create transient instances each time', () => {
    let instanceCount = 0;

    class TestService {
      constructor() {
        instanceCount++;
      }
    }

    const token = createToken<TestService>('TestService');
    container.register(token, { lifetime: 'transient', useClass: TestService });

    const instance1 = container.get(token);
    const instance2 = container.get(token);

    expect(instanceCount).toBe(2);
    expect(instance1).not.toBe(instance2);
  });

  it('should default to singleton for class providers', () => {
    let instanceCount = 0;

    class TestService {
      constructor() {
        instanceCount++;
      }
    }

    const token = createToken<TestService>('TestService');
    container.register(token, { useClass: TestService });

    container.get(token);
    container.get(token);

    expect(instanceCount).toBe(1);
  });

  it('should default to transient for factory providers', () => {
    let callCount = 0;

    const token = createToken<number>('factory');
    container.registerFactory(token, () => ++callCount);

    const value1 = container.get(token);
    const value2 = container.get(token);

    expect(value1).toBe(1);
    expect(value2).toBe(2);
  });

  it('should support singleton factory', () => {
    let callCount = 0;

    const token = createToken<number>('factory');
    container.registerFactory(token, () => ++callCount, [], { lifetime: 'singleton' });

    const value1 = container.get(token);
    const value2 = container.get(token);

    expect(value1).toBe(1);
    expect(value2).toBe(1);
  });

  it('should handle scoped lifetime in root container', () => {
    let instanceCount = 0;

    class ScopedService {
      constructor() {
        instanceCount++;
      }
    }

    const token = createToken<ScopedService>('ScopedService');
    container.register(token, { lifetime: 'scoped', useClass: ScopedService });

    const instance1 = container.get(token);
    const instance2 = container.get(token);

    expect(instanceCount).toBe(1);
    expect(instance1).toBe(instance2);
  });
});

describe('Container - Dependencies', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should resolve class with dependencies', () => {
    const ConfigToken = createToken<{ apiUrl: string }>('Config');
    const ServiceToken = createToken<any>('Service');

    class Service {
      config: { apiUrl: string };
      constructor(config: { apiUrl: string }) {
        this.config = config;
      }
    }

    container.registerValue(ConfigToken, { apiUrl: 'https://api.example.com' });
    container.register(ServiceToken, { deps: [ConfigToken], useClass: Service });

    const service = container.get(ServiceToken);

    expect(service.config.apiUrl).toBe('https://api.example.com');
  });

  it('should resolve factory with dependencies', () => {
    const ConfigToken = createToken<{ apiUrl: string }>('Config');
    const ServiceToken = createToken<string>('Service');

    container.registerValue(ConfigToken, { apiUrl: 'https://api.example.com' });
    container.registerFactory(ServiceToken, (config: { apiUrl: string }) => `Service: ${config.apiUrl}`, [ConfigToken]);

    const service = container.get(ServiceToken);

    expect(service).toBe('Service: https://api.example.com');
  });

  it('should resolve nested dependencies', () => {
    const DatabaseToken = createToken<any>('Database');
    const RepositoryToken = createToken<any>('Repository');
    const ServiceToken = createToken<any>('Service');

    class Database {
      name = 'db';
    }
    class Repository {
      db: Database;
      constructor(db: Database) {
        this.db = db;
      }
    }
    class Service {
      repo: Repository;
      constructor(repo: Repository) {
        this.repo = repo;
      }
    }

    container.register(DatabaseToken, { useClass: Database });
    container.register(RepositoryToken, { deps: [DatabaseToken], useClass: Repository });
    container.register(ServiceToken, { deps: [RepositoryToken], useClass: Service });

    const service = container.get(ServiceToken);

    expect(service.repo.db.name).toBe('db');
  });

  it('should detect circular dependencies', () => {
    const Token1 = createToken('Service1');
    const Token2 = createToken('Service2');

    class Service1 {
      s2: any;
      constructor(s2: any) {
        this.s2 = s2;
      }
    }
    class Service2 {
      s1: any;
      constructor(s1: any) {
        this.s1 = s1;
      }
    }

    container.register(Token1, { deps: [Token2], useClass: Service1 });
    container.register(Token2, { deps: [Token1], useClass: Service2 });

    expect(() => container.get(Token1)).toThrow(CircularDependencyError);
    expect(() => container.get(Token1)).toThrow(/Circular dependency detected.*Service1.*Service2/);
  });

  it('should detect self-referencing circular dependency', () => {
    const Token = createToken('Service');

    class Service {
      self: any;
      constructor(self: any) {
        this.self = self;
      }
    }

    container.register(Token, { deps: [Token], useClass: Service });

    expect(() => container.get(Token)).toThrow(CircularDependencyError);
  });
});

describe('Container - Aliasing', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should resolve alias to source token', () => {
    const SourceToken = createToken<string>('Source');
    const AliasToken = createToken<string>('Alias');

    container.registerValue(SourceToken, 'value');
    container.alias(SourceToken, AliasToken);

    expect(container.get(AliasToken)).toBe('value');
  });

  it('should support chained aliases', () => {
    const Token1 = createToken<string>('Token1');
    const Token2 = createToken<string>('Token2');
    const Token3 = createToken<string>('Token3');

    container.registerValue(Token1, 'value');
    container.alias(Token1, Token2);
    container.alias(Token2, Token3);

    expect(container.get(Token3)).toBe('value');
  });

  it('should detect alias cycles', () => {
    const Token1 = createToken('Token1');
    const Token2 = createToken('Token2');

    container.alias(Token1, Token2);
    container.alias(Token2, Token1);

    expect(() => container.get(Token1)).toThrow(/Alias cycle detected/);
  });
});

describe('Container - Error Handling', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should throw ProviderNotFoundError for unregistered token', () => {
    const token = createToken('Unknown');

    expect(() => container.get(token)).toThrow(ProviderNotFoundError);
    expect(() => container.get(token)).toThrow(/No provider registered for token/);
  });

  it('should throw AsyncProviderError for async factory in sync get', () => {
    const token = createToken<string>('AsyncService');

    container.registerFactory(token, async () => 'value', [], { async: true });

    expect(() => container.get(token)).toThrow(AsyncProviderError);
    expect(() => container.get(token)).toThrow(/is async.*Use getAsync/);
  });

  it('should include token description in errors', () => {
    const token = createToken('MyService');

    expect(() => container.get(token)).toThrow(/MyService/);
  });

  it('should handle anonymous tokens in errors', () => {
    const token = createToken();

    expect(() => container.get(token)).toThrow(/anonymous/);
  });
});

describe('Container - Async Resolution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should resolve async factory', async () => {
    const token = createToken<string>('AsyncService');

    container.registerFactory(token, async () => 'async-value', [], { async: true });

    const value = await container.getAsync(token);

    expect(value).toBe('async-value');
  });

  it('should cache async singleton factory', async () => {
    let callCount = 0;

    const token = createToken<number>('AsyncFactory');
    container.registerFactory(
      token,
      async () => {
        callCount++;
        return 42;
      },
      [],
      { async: true, lifetime: 'singleton' },
    );

    const value1 = await container.getAsync(token);
    const value2 = await container.getAsync(token);

    expect(callCount).toBe(1);
    expect(value1).toBe(42);
    expect(value2).toBe(42);
  });

  it('should handle concurrent async singleton requests', async () => {
    let callCount = 0;

    const token = createToken<number>('AsyncFactory');
    container.registerFactory(
      token,
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        callCount++;
        return 42;
      },
      [],
      { async: true, lifetime: 'singleton' },
    );

    const [value1, value2, value3] = await Promise.all([
      container.getAsync(token),
      container.getAsync(token),
      container.getAsync(token),
    ]);

    expect(callCount).toBe(1);
    expect(value1).toBe(42);
    expect(value2).toBe(42);
    expect(value3).toBe(42);
  });

  it('should resolve async dependencies', async () => {
    const ConfigToken = createToken<{ value: string }>('Config');
    const ServiceToken = createToken<string>('Service');

    container.registerFactory(ConfigToken, async () => ({ value: 'config' }), [], { async: true });
    container.registerFactory(ServiceToken, async (config: { value: string }) => config.value, [ConfigToken], {
      async: true,
    });

    const value = await container.getAsync(ServiceToken);

    expect(value).toBe('config');
  });

  it('should resolve class with async dependencies', async () => {
    const ConfigToken = createToken<{ value: string }>('Config');
    const ServiceToken = createToken<any>('Service');

    class Service {
      config: { value: string };
      constructor(config: { value: string }) {
        this.config = config;
      }
    }

    container.registerFactory(ConfigToken, async () => ({ value: 'config' }), [], { async: true });
    container.register(ServiceToken, { deps: [ConfigToken], useClass: Service });

    const service = await container.getAsync(ServiceToken);

    expect(service.config.value).toBe('config');
  });

  it('should detect circular dependencies in async resolution', async () => {
    const Token1 = createToken('Service1');
    const Token2 = createToken('Service2');

    container.registerFactory(Token1, async (s2: any) => s2, [Token2], { async: true });
    container.registerFactory(Token2, async (s1: any) => s1, [Token1], { async: true });

    await expect(container.getAsync(Token1)).rejects.toThrow(CircularDependencyError);
  });
});

describe('Container - Optional Resolution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should return undefined for missing token in getOptional', () => {
    const token = createToken<string>('Missing');

    const value = container.getOptional(token);

    expect(value).toBeUndefined();
  });

  it('should return value for existing token in getOptional', () => {
    const token = createToken<string>('Existing');
    container.registerValue(token, 'value');

    const value = container.getOptional(token);

    expect(value).toBe('value');
  });

  it('should throw non-ProviderNotFoundError in getOptional', () => {
    const token = createToken<string>('AsyncService');
    container.registerFactory(token, async () => 'value', [], { async: true });

    expect(() => container.getOptional(token)).toThrow(AsyncProviderError);
  });

  it('should return undefined for missing token in getOptionalAsync', async () => {
    const token = createToken<string>('Missing');

    const value = await container.getOptionalAsync(token);

    expect(value).toBeUndefined();
  });

  it('should return value for existing token in getOptionalAsync', async () => {
    const token = createToken<string>('Existing');
    container.registerValue(token, 'value');

    const value = await container.getOptionalAsync(token);

    expect(value).toBe('value');
  });

  it('should support allowOptional option', () => {
    const containerWithOptional = createContainer({ allowOptional: true });
    const token = createToken<string>('Missing');

    const value = containerWithOptional.get(token);

    expect(value).toBeUndefined();
  });
});

describe('Container - Parent/Child Containers', () => {
  let parent: Container;
  let child: Container;

  beforeEach(() => {
    parent = createContainer();
  });

  it('should create child container', () => {
    child = parent.createChild();

    expect(child).toBeInstanceOf(Container);
  });

  it('should resolve parent providers from child', () => {
    const token = createToken<string>('Parent');
    parent.registerValue(token, 'parent-value');

    child = parent.createChild();

    expect(child.get(token)).toBe('parent-value');
  });

  it('should override parent providers in child', () => {
    const token = createToken<string>('Service');
    parent.registerValue(token, 'parent-value');

    child = parent.createChild([[token, { useValue: 'child-value' }]]);

    expect(parent.get(token)).toBe('parent-value');
    expect(child.get(token)).toBe('child-value');
  });

  it('should not affect parent when child is modified', () => {
    const token = createToken<string>('Service');
    parent.registerValue(token, 'parent-value');

    child = parent.createChild();
    child.registerValue(token, 'child-value');

    expect(parent.get(token)).toBe('parent-value');
    expect(child.get(token)).toBe('child-value');
  });

  it('should clear child without affecting parent', () => {
    const token = createToken<string>('Service');
    parent.registerValue(token, 'parent-value');

    child = parent.createChild();
    child.clear();

    expect(parent.get(token)).toBe('parent-value');
    expect(child.get(token)).toBe('parent-value');
  });

  it('should inherit allowOptional from parent', () => {
    const parentWithOptional = createContainer({ allowOptional: true });
    const childContainer = parentWithOptional.createChild();
    const token = createToken<string>('Missing');

    expect(childContainer.get(token)).toBeUndefined();
  });
});

describe('Container - Scoped Execution', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should run function in scope', async () => {
    const token = createToken<string>('Scoped');

    const result = await container.runInScope(
      (scope) => {
        scope.registerValue(token, 'scoped-value');
        return scope.get(token);
      },
      [[token, { useValue: 'initial' }]],
    );

    expect(result).toBe('scoped-value');
  });

  it('should clean up scope after execution', async () => {
    const token = createToken<string>('Scoped');

    await container.runInScope((scope) => {
      scope.registerValue(token, 'scoped-value');
      return 'done';
    });

    expect(container.has(token)).toBe(false);
  });

  it('should handle async functions in scope', async () => {
    const token = createToken<string>('Async');

    const result = await container.runInScope(async (scope) => {
      scope.registerValue(token, 'async-value');
      await new Promise((resolve) => setTimeout(resolve, 10));
      return scope.get(token);
    });

    expect(result).toBe('async-value');
  });

  it('should clean up even if function throws', async () => {
    const token = createToken<string>('Scoped');

    await expect(
      container.runInScope((scope) => {
        scope.registerValue(token, 'value');
        throw new Error('Test error');
      }),
    ).rejects.toThrow('Test error');

    expect(container.has(token)).toBe(false);
  });
});

describe('Container - Management', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should check if token is registered', () => {
    const token = createToken<string>('Service');

    expect(container.has(token)).toBe(false);

    container.registerValue(token, 'value');

    expect(container.has(token)).toBe(true);
  });

  it('should unregister token', () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'value');

    container.unregister(token);

    expect(container.has(token)).toBe(false);
  });

  it('should support unregister chaining', () => {
    const token1 = createToken<string>('Token1');
    const token2 = createToken<string>('Token2');

    container.registerValue(token1, 'value1').registerValue(token2, 'value2');

    const result = container.unregister(token1).unregister(token2);

    expect(result).toBe(container);
    expect(container.has(token1)).toBe(false);
    expect(container.has(token2)).toBe(false);
  });

  it('should clear all registrations', () => {
    const token1 = createToken<string>('Token1');
    const token2 = createToken<string>('Token2');

    container.registerValue(token1, 'value1').registerValue(token2, 'value2');

    container.clear();

    expect(container.has(token1)).toBe(false);
    expect(container.has(token2)).toBe(false);
  });

  it('should clear aliases when clearing container', () => {
    const SourceToken = createToken<string>('Source');
    const AliasToken = createToken<string>('Alias');

    container.registerValue(SourceToken, 'value');
    container.alias(SourceToken, AliasToken);

    container.clear();

    expect(() => container.get(AliasToken)).toThrow(ProviderNotFoundError);
  });

  it('should provide debug information', () => {
    const token1 = createToken('Service1');
    const token2 = createToken('Service2');
    const aliasToken = createToken('ServiceAlias');

    container.registerValue(token1, 'value1').registerValue(token2, 'value2').alias(token1, aliasToken);

    const debug = container.debug();

    expect(debug.tokens).toContain('Service1');
    expect(debug.tokens).toContain('Service2');
    expect(debug.aliases).toContainEqual(['ServiceAlias', 'Service1']);
  });

  it('should handle anonymous tokens in debug', () => {
    const token = createToken();
    container.registerValue(token, 'value');

    const debug = container.debug();

    expect(debug.tokens).toContain('anonymous');
  });
});

describe('createTestContainer', () => {
  it('should create test container with dispose', () => {
    const { container, dispose } = createTestContainer();

    expect(container).toBeInstanceOf(Container);
    expect(typeof dispose).toBe('function');
  });

  it('should dispose test container', () => {
    const { container, dispose } = createTestContainer();
    const token = createToken<string>('Test');

    container.registerValue(token, 'test-value');
    dispose();

    expect(container.has(token)).toBe(false);
  });

  it('should create test container from base', () => {
    const base = createContainer();
    const token = createToken<string>('Base');
    base.registerValue(token, 'base-value');

    const { container } = createTestContainer(base);

    expect(container.get(token)).toBe('base-value');
  });
});

describe('withMock', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should temporarily mock a dependency', async () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'original');

    const result = await withMock(container, token, 'mocked', () => {
      return container.get(token);
    });

    expect(result).toBe('mocked');
    expect(container.get(token)).toBe('original');
  });

  it('should support async functions', async () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'original');

    const result = await withMock(container, token, 'mocked', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return container.get(token);
    });

    expect(result).toBe('mocked');
    expect(container.get(token)).toBe('original');
  });

  it('should restore original provider after error', async () => {
    const token = createToken<string>('Service');
    container.registerValue(token, 'original');

    await expect(
      withMock(container, token, 'mocked', () => {
        throw new Error('Test error');
      }),
    ).rejects.toThrow('Test error');

    expect(container.get(token)).toBe('original');
  });

  it('should handle mocking unregistered token', async () => {
    const token = createToken<string>('Service');

    await withMock(container, token, 'mocked', () => {
      expect(container.get(token)).toBe('mocked');
    });

    expect(container.has(token)).toBe(false);
  });

  it('should restore original value after mocking', async () => {
    let instanceCount = 0;

    class Service {
      constructor() {
        instanceCount++;
      }
      getValue() {
        return 'real';
      }
    }

    const token = createToken<Service>('Service');
    container.register(token, { lifetime: 'singleton', useClass: Service });

    // Get the original instance to increment instanceCount
    container.get(token);
    expect(instanceCount).toBe(1);

    await withMock(container, token, { getValue: () => 'mock' } as any, () => {
      const mockInstance = container.get(token);
      expect(mockInstance.getValue()).toBe('mock');
    });

    // After withMock, a new instance will be created since we lost the singleton
    // This is expected behavior - withMock is for testing, not production
    const afterMockInstance = container.get(token);
    expect(afterMockInstance.getValue()).toBe('real');
  });
});

describe('Edge Cases', () => {
  let container: Container;

  beforeEach(() => {
    container = createContainer();
  });

  it('should handle empty dependency array', () => {
    class Service {}

    const token = createToken<Service>('Service');
    container.register(token, { deps: [], useClass: Service });

    const service = container.get(token);

    expect(service).toBeInstanceOf(Service);
  });

  it('should handle undefined deps', () => {
    class Service {}

    const token = createToken<Service>('Service');
    container.register(token, { useClass: Service });

    const service = container.get(token);

    expect(service).toBeInstanceOf(Service);
  });

  it('should overwrite existing registration', () => {
    const token = createToken<string>('Service');

    container.registerValue(token, 'first');
    container.registerValue(token, 'second');

    expect(container.get(token)).toBe('second');
  });

  it('should handle complex object values', () => {
    const token = createToken<any>('ComplexConfig');
    const config = {
      array: [1, 2, 3],
      fn: () => 'test',
      nested: { deeply: { value: 42 } },
    };

    container.registerValue(token, config);

    const retrieved = container.get(token);

    expect(retrieved).toBe(config);
    expect(retrieved.nested.deeply.value).toBe(42);
    expect(retrieved.fn()).toBe('test');
  });

  it('should handle null and undefined values', () => {
    const nullToken = createToken<null>('Null');
    const undefinedToken = createToken<undefined>('Undefined');

    container.registerValue(nullToken, null);
    container.registerValue(undefinedToken, undefined);

    expect(container.get(nullToken)).toBeNull();
    expect(container.get(undefinedToken)).toBeUndefined();
  });

  it('should handle classes with complex constructors', () => {
    class ComplexService {
      a: string;
      b: number;
      c: { value: string };
      constructor(a: string, b: number, c: { value: string }) {
        this.a = a;
        this.b = b;
        this.c = c;
      }
    }

    const TokenA = createToken<string>('A');
    const TokenB = createToken<number>('B');
    const TokenC = createToken<{ value: string }>('C');
    const ServiceToken = createToken<ComplexService>('Service');

    container.registerValue(TokenA, 'test');
    container.registerValue(TokenB, 42);
    container.registerValue(TokenC, { value: 'complex' });
    container.register(ServiceToken, {
      deps: [TokenA, TokenB, TokenC],
      useClass: ComplexService,
    });

    const service = container.get(ServiceToken);

    expect(service.a).toBe('test');
    expect(service.b).toBe(42);
    expect(service.c.value).toBe('complex');
  });

  it('should handle factory returning different types', () => {
    const token = createToken<any>('Factory');

    container.registerFactory(token, () => ({ type: 'object' }));
    expect(container.get(token)).toEqual({ type: 'object' });

    container.registerFactory(token, () => 'string');
    expect(container.get(token)).toBe('string');

    container.registerFactory(token, () => 42);
    expect(container.get(token)).toBe(42);

    container.registerFactory(token, () => true);
    expect(container.get(token)).toBe(true);
  });
});
