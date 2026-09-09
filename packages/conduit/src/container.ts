import {
  ConduitCircularDependencyError,
  ConduitDisposedError,
  ConduitDisposeError,
  ConduitDuplicateRegistrationError,
  ConduitError,
  ConduitProviderNotFoundError,
  ConduitScopedResolutionError,
} from './errors.js';
import type {
  Container,
  FactoryProvider,
  InferServices,
  Lifetime,
  Provider,
  ScopeToken,
  ServiceMap,
  Token,
  ValueProvider,
} from './types.js';
import { disposalSignalToken } from './types.js';

type Disposer = (value: unknown) => Promise<void> | void;

type ValueRegistration<T> = Readonly<{
  dispose?: Disposer;
  kind: 'value';
  value: T;
}>;

type FactoryRegistration<T = unknown> = Readonly<{
  factory: (...values: unknown[]) => Promise<T> | T;
  dependencies: readonly Token<unknown>[];
  dispose?: Disposer;
  kind: 'factory';
  lifetime: Lifetime;
}>;

type Registration<T = unknown> = FactoryRegistration<T> | ValueRegistration<T>;
type OwnedResource = Readonly<{ dispose?: Disposer; value: unknown }>;
type CacheEntry = { promise: Promise<unknown>; resolved: boolean; value?: unknown };
type Lifecycle = 'active' | 'disposed' | 'disposing';

class ContainerImpl implements Container {
  #cache = new Map<FactoryRegistration<unknown>, CacheEntry>();
  #children = new Set<ContainerImpl>();
  #cleanupFailures: unknown[] = [];
  #disposalController = new AbortController();
  #inFlight = new Set<Promise<unknown>>();
  #lifecycle: Lifecycle = 'active';
  #disposePromise?: Promise<void>;
  #owned: OwnedResource[] = [];
  #parent?: ContainerImpl;
  #registry = new Map<Token<unknown>, Registration<unknown>>();
  #scope?: ScopeToken;
  readonly name: string;

  constructor(
    parent: ContainerImpl | undefined,
    providers: readonly Provider<any, any>[],
    options: { name?: string; scope?: ScopeToken },
  ) {
    this.#parent = parent;
    this.#scope = options.scope;

    if (parent) parent.#children.add(this);

    this.name = options.name ?? (parent ? `${parent.name}:${options.scope?.description ?? 'child'}` : 'root');
    this.#registry.set(disposalSignalToken, { kind: 'value', value: this.disposalSignal });

    try {
      this.#registerProviders(providers);
      this.#validateGraph();
      this.#claimValues();
    } catch (error) {
      if (parent) parent.#children.delete(this);
      this.#registry.clear();
      throw error;
    }
  }

  get disposalSignal(): AbortSignal {
    return this.#disposalController.signal;
  }

  get disposed(): boolean {
    return this.#lifecycle === 'disposed';
  }

  has<T>(token: Token<T>): boolean {
    this.#assertActive();

    return this.#lookup(token) !== undefined;
  }

  resolve<T>(token: Token<T>): Promise<T>;
  resolve<M extends ServiceMap>(map: M): Promise<InferServices<M>>;
  async resolve<T, M extends ServiceMap>(input: Token<T> | M): Promise<InferServices<M> | T> {
    this.#assertActive();

    if (typeof input === 'symbol') return this.#resolve(input, []);
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new ConduitError('resolve() requires a token or service map');
    }

    const entries = Object.keys(input) as (keyof M & string)[];
    const values = await Promise.all(entries.map((key) => this.#resolve(input[key] as Token<unknown>, [])));
    const services = {} as InferServices<M>;

    entries.forEach((key, index) => {
      Object.defineProperty(services, key, {
        configurable: true,
        enumerable: true,
        value: values[index],
        writable: true,
      });
    });

    return services;
  }

  createScope(
    scope?: ScopeToken,
    options?: { readonly name?: string; readonly providers?: readonly Provider<any, any>[] },
  ): Container {
    this.#assertActive();

    return new ContainerImpl(this, options?.providers ?? [], { name: options?.name, scope });
  }

  dispose(): Promise<void> {
    if (this.#lifecycle === 'disposed') return Promise.resolve();

    if (this.#disposePromise) return this.#disposePromise;

    this.#lifecycle = 'disposing';
    this.#disposalController.abort();
    this.#disposePromise = this.#finishDisposal();

    return this.#disposePromise;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }

  async #finishDisposal(): Promise<void> {
    const childOutcomes = await Promise.allSettled([...this.#children].map((child) => child.dispose()));

    await Promise.allSettled([...this.#inFlight]);

    const failures = [
      ...this.#cleanupFailures,
      ...childOutcomes.flatMap((outcome) => {
        if (outcome.status !== 'rejected') return [];

        return outcome.reason instanceof ConduitDisposeError ? outcome.reason.errors : [outcome.reason];
      }),
    ];

    for (const resource of [...this.#owned].reverse()) {
      if (!resource.dispose) continue;

      try {
        await resource.dispose(resource.value);
      } catch (error) {
        failures.push(error);
      }
    }

    this.#cache.clear();
    this.#children.clear();
    this.#cleanupFailures = [];
    this.#owned = [];
    this.#registry.clear();

    if (this.#parent) this.#parent.#children.delete(this);

    this.#lifecycle = 'disposed';

    if (failures.length) throw new ConduitDisposeError(failures);
  }

  #assertActive(): void {
    if (this.#lifecycle !== 'active') throw new ConduitDisposedError(this.name);
  }

  #assertUnregistered(token: Token<unknown>): void {
    if (this.#registry.has(token)) throw new ConduitDuplicateRegistrationError(token);
  }

  #registerProviders(providers: readonly Provider<any, any>[]): void {
    if (!Array.isArray(providers)) throw new ConduitError('Container providers must be an array');

    for (const input of providers) {
      if (typeof input !== 'object' || input === null || Array.isArray(input)) {
        throw new ConduitError('Each provider must be an object');
      }

      const provider = input as Provider;
      const hasDependencies = Object.hasOwn(provider, 'dependencies');
      const hasFactory = Object.hasOwn(provider, 'factory');
      const hasValue = Object.hasOwn(provider, 'value');

      if (typeof provider.token !== 'symbol') throw new ConduitError('Each provider requires a token');
      if (provider.dispose !== undefined && typeof provider.dispose !== 'function') {
        throw new ConduitError(`Provider "${provider.token.description ?? 'anonymous'}" has an invalid disposer`);
      }
      if (
        hasValue === hasFactory ||
        hasValue === hasDependencies ||
        (hasValue && Object.hasOwn(provider, 'lifetime'))
      ) {
        throw new ConduitError(
          `Provider "${provider.token.description ?? 'anonymous'}" must define exactly one value or factory`,
        );
      }

      this.#assertUnregistered(provider.token);

      if (hasFactory) {
        const factory = provider as FactoryProvider<unknown>;

        if (
          !Array.isArray(factory.dependencies) ||
          factory.dependencies.some((dependency) => typeof dependency !== 'symbol')
        ) {
          throw new ConduitError(
            `Factory provider "${provider.token.description ?? 'anonymous'}" has invalid dependencies`,
          );
        }
        if (typeof factory.factory !== 'function') {
          throw new ConduitError(`Factory provider "${provider.token.description ?? 'anonymous'}" requires a factory`);
        }
        if (
          factory.lifetime !== undefined &&
          factory.lifetime !== 'singleton' &&
          factory.lifetime !== 'transient' &&
          typeof factory.lifetime !== 'symbol'
        ) {
          throw new ConduitError(
            `Factory provider "${provider.token.description ?? 'anonymous'}" has an invalid lifetime`,
          );
        }

        this.#registry.set(provider.token, {
          dependencies: Object.freeze([...factory.dependencies]),
          dispose: factory.dispose as Disposer | undefined,
          factory: factory.factory as (...values: unknown[]) => Promise<unknown> | unknown,
          kind: 'factory',
          lifetime: factory.lifetime ?? 'singleton',
        });
      } else {
        const valueProvider = provider as ValueProvider<unknown>;

        this.#registry.set(provider.token, {
          dispose: valueProvider.dispose as Disposer | undefined,
          kind: 'value',
          value: valueProvider.value,
        });
      }
    }
  }

  #claimValues(): void {
    for (const registration of this.#registry.values()) {
      if (registration.kind === 'value' && registration.dispose) {
        this.#owned.push({ dispose: registration.dispose, value: registration.value });
      }
    }
  }

  #lookup<T>(token: Token<T>): { owner: ContainerImpl; registration: Registration<T> } | undefined {
    const local = this.#registry.get(token) as Registration<T> | undefined;

    if (local) return { owner: this, registration: local };

    if (!this.#parent) return undefined;

    return this.#parent.#lookup(token);
  }

  #factories(): { owner: ContainerImpl; registration: FactoryRegistration; token: Token<unknown> }[] {
    const parentFactories = this.#parent ? this.#parent.#factories() : [];
    const localFactories = [...this.#registry].flatMap(([token, registration]) =>
      registration.kind === 'factory' ? [{ owner: this, registration, token }] : [],
    );

    return [...parentFactories, ...localFactories];
  }

  #validateGraph(): void {
    for (const { owner, registration, token } of this.#factories()) {
      owner.#validatePath(token, registration, new Set(), []);
    }
  }

  #validatePath(
    token: Token<unknown>,
    registration: FactoryRegistration,
    visiting: Set<Token<unknown>>,
    path: Token<unknown>[],
  ): void {
    if (visiting.has(token)) throw new ConduitCircularDependencyError([...path, token]);

    visiting.add(token);

    for (const dependency of registration.dependencies) {
      const found = this.#lookup(dependency);

      if (!found) throw new ConduitProviderNotFoundError(dependency, this.name);

      if (found.registration.kind === 'factory') {
        if (registration.lifetime === 'singleton' && found.registration.lifetime === 'transient') {
          throw new ConduitError(
            `Singleton "${token.description ?? 'anonymous'}" cannot depend on a transient factory`,
          );
        }
        if (registration.lifetime === 'singleton' && typeof found.registration.lifetime === 'symbol') {
          throw new ConduitScopedResolutionError(token, found.registration.lifetime);
        }
        if (
          typeof registration.lifetime === 'symbol' &&
          typeof found.registration.lifetime === 'symbol' &&
          registration.lifetime !== found.registration.lifetime
        ) {
          throw new ConduitScopedResolutionError(token, found.registration.lifetime);
        }

        found.owner.#validatePath(dependency, found.registration, visiting, [...path, token]);
      }
    }

    visiting.delete(token);
  }

  async #resolve<T>(token: Token<T>, path: Token<unknown>[]): Promise<T> {
    if (path.includes(token)) throw new ConduitCircularDependencyError([...path, token]);

    const found = this.#lookup(token);

    if (!found) throw new ConduitProviderNotFoundError(token, this.name);

    const registration = found.registration;

    if (registration.kind === 'value') return registration.value as T;

    const owner = this.#ownerFor(found.owner, registration, token);

    if (registration.lifetime === 'transient') {
      return owner.#track(owner.#create(registration, owner, [...path, token])) as Promise<T>;
    }

    const existing = owner.#cache.get(registration);

    if (existing?.resolved) return existing.value as T;
    if (existing) return existing.promise as Promise<T>;

    const entry = { promise: Promise.resolve(), resolved: false } as CacheEntry;
    const creation = owner.#create(registration, owner, [...path, token]).then(
      (value) => {
        entry.resolved = true;
        entry.value = value;
        return value;
      },
      (error) => {
        if (owner.#cache.get(registration) === entry) owner.#cache.delete(registration);
        throw error;
      },
    );

    entry.promise = owner.#track(creation);
    owner.#cache.set(registration, entry);

    return entry.promise as Promise<T>;
  }

  #ownerFor(owner: ContainerImpl, registration: FactoryRegistration, token: Token<unknown>): ContainerImpl {
    if (registration.lifetime === 'singleton') return owner;
    if (registration.lifetime === 'transient') return this;

    const scopeOwner = this.#scopeOwner(registration.lifetime as ScopeToken);

    if (!scopeOwner) throw new ConduitScopedResolutionError(token, registration.lifetime as ScopeToken);

    return scopeOwner;
  }

  #scopeOwner(scope: ScopeToken): ContainerImpl | undefined {
    if (this.#scope === scope) return this;

    return this.#parent ? this.#parent.#scopeOwner(scope) : undefined;
  }

  #track<T>(promise: Promise<T>): Promise<T> {
    this.#inFlight.add(promise);
    void promise.then(
      () => this.#inFlight.delete(promise),
      () => this.#inFlight.delete(promise),
    );
    return promise;
  }

  async #create(registration: FactoryRegistration, owner: ContainerImpl, path: Token<unknown>[]): Promise<unknown> {
    const value = await Promise.all(
      registration.dependencies.map((dependency) => owner.#resolve(dependency, path)),
    ).then((dependencies) => registration.factory(...dependencies));

    if (owner.#lifecycle !== 'active') {
      if (registration.dispose) {
        try {
          await registration.dispose(value);
        } catch (error) {
          owner.#cleanupFailures.push(error);
        }
      }

      throw new ConduitDisposedError(owner.name);
    }

    if (registration.dispose) owner.#owned.push({ dispose: registration.dispose, value });

    return value;
  }
}

export function createContainer(
  providers: readonly Provider<any, any>[],
  options?: { readonly name?: string },
): Container {
  return new ContainerImpl(undefined, providers, { name: options?.name });
}
