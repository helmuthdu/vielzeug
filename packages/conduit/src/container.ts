import type { Container, FactoryOptions, InferTokens, Lifetime, ScopeToken, Token, ValueOptions } from './types.js';

import {
  ConduitCircularDependencyError,
  ConduitDisposeError,
  ConduitDisposedError,
  ConduitDuplicateRegistrationError,
  ConduitProviderNotFoundError,
  ConduitScopedResolutionError,
} from './errors.js';

type Disposer = (value: never) => Promise<void> | void;

type ValueRegistration<T> = Readonly<{
  dispose?: Disposer;
  kind: 'value';
  value: T;
}>;

type FactoryRegistration<T = unknown> = Readonly<{
  create: (...values: unknown[]) => Promise<T> | T;
  dependencies: readonly Token<unknown>[];
  dispose?: Disposer;
  kind: 'factory';
  lifetime: Lifetime;
}>;

type Registration<T = unknown> = FactoryRegistration<T> | ValueRegistration<T>;
type OwnedResource = Readonly<{ dispose?: Disposer; value: unknown }>;
type CacheEntry = { promise?: Promise<unknown>; value?: unknown };
type Lifecycle = 'active' | 'disposed' | 'disposing';

class ContainerImpl implements Container {
  #cache = new Map<FactoryRegistration<any>, CacheEntry>();
  #children = new Set<ContainerImpl>();
  #cleanupFailures: unknown[] = [];
  #disposalController = new AbortController();
  #inFlight = new Set<Promise<unknown>>();
  #lifecycle: Lifecycle = 'active';
  #disposePromise?: Promise<void>;
  #owned: OwnedResource[] = [];
  #parent?: ContainerImpl;
  #registry = new Map<Token<any>, Registration<any>>();
  #scope?: ScopeToken;
  readonly name: string;

  constructor(parent?: ContainerImpl, options: { name?: string; scope?: ScopeToken } = {}) {
    this.#parent = parent;
    this.#scope = options.scope;

    if (parent) parent.#children.add(this);

    this.name = options.name ?? (parent ? `${parent.name}:${options.scope?.description ?? 'child'}` : 'root');
  }

  get disposalSignal(): AbortSignal {
    return this.#disposalController.signal;
  }

  get disposed(): boolean {
    return this.#lifecycle === 'disposed';
  }

  value<T>(token: Token<T>, value: T, options: ValueOptions<T> = {}): this {
    this.#assertActive();
    this.#assertUnregistered(token);

    const registration: ValueRegistration<T> = {
      dispose: options.dispose as Disposer | undefined,
      kind: 'value',
      value,
    };

    this.#registry.set(token, registration);

    if (options.dispose) this.#owned.push({ dispose: options.dispose, value });

    return this;
  }

  factory<T, Dependencies extends readonly Token<unknown>[]>(
    token: Token<T>,
    dependencies: Dependencies,
    create: (...values: InferTokens<Dependencies>) => Promise<T> | T,
    options: FactoryOptions<T> = {},
  ): this {
    this.#assertActive();
    this.#assertUnregistered(token);

    const registration: FactoryRegistration<T> = {
      create: create as (...values: unknown[]) => Promise<T> | T,
      dependencies: Object.freeze([...dependencies]),
      dispose: options.dispose as Disposer | undefined,
      kind: 'factory',
      lifetime: options.lifetime ?? 'singleton',
    };

    this.#registry.set(token, registration);

    return this;
  }

  has<T>(token: Token<T>): boolean {
    this.#assertActive();

    return this.#lookup(token) !== undefined;
  }

  async resolve<T>(token: Token<T>): Promise<T> {
    this.#assertActive();

    return this.#resolve(token, []);
  }

  validate(): this {
    this.#assertActive();

    for (const { owner, registration, token } of this.#factories()) {
      owner.#validatePath(token, registration, new Set(), []);
    }

    return this;
  }

  createScope(scope?: ScopeToken, options?: { name?: string }): Container {
    this.#assertActive();

    return new ContainerImpl(this, { name: options?.name, scope });
  }

  dispose(): Promise<void> {
    if (this.#lifecycle === 'disposed') return Promise.resolve();

    if (this.#disposePromise) return this.#disposePromise;

    this.#lifecycle = 'disposing';
    this.#disposalController.abort();
    this.#disposePromise = this.#finishDisposal();

    return this.#disposePromise;
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
        await resource.dispose(resource.value as never);
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

  async [Symbol.asyncDispose](): Promise<void> {
    await this.dispose();
  }

  #assertActive(): void {
    if (this.#lifecycle !== 'active') throw new ConduitDisposedError(this.name);
  }

  #assertUnregistered(token: Token<unknown>): void {
    if (this.#registry.has(token)) throw new ConduitDuplicateRegistrationError(token);
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
        found.owner.#validatePath(dependency, found.registration, visiting, [...path, token]);
      }
    }

    visiting.delete(token);
  }

  async #resolve<T>(token: Token<T>, path: Token<unknown>[]): Promise<T> {
    if (path.includes(token)) throw new ConduitCircularDependencyError([...path, token]);

    const found = this.#lookup(token);

    if (!found) throw new ConduitProviderNotFoundError(token, this.name);

    if (found.registration.kind === 'value') return found.registration.value as T;

    const owner = this.#ownerFor(found.owner, found.registration, token);

    if (found.registration.lifetime === 'transient') {
      return this.#create(found.registration, owner, [...path, token]) as Promise<T>;
    }

    const existing = owner.#cache.get(found.registration);

    if (existing?.value !== undefined) return existing.value as T;

    if (existing?.promise) return existing.promise as Promise<T>;

    const entry: CacheEntry = {};
    const promise = owner.#create(found.registration, owner, [...path, token]).then((value) => {
      entry.value = value;

      return value;
    });

    entry.promise = promise;
    owner.#cache.set(found.registration, entry);

    return promise as Promise<T>;
  }

  #ownerFor(owner: ContainerImpl, registration: FactoryRegistration, token: Token<unknown>): ContainerImpl {
    if (registration.lifetime === 'singleton') return owner;

    if (registration.lifetime === 'transient') return this;

    const scope = this.#scopeOwner(registration.lifetime);

    if (!scope) throw new ConduitScopedResolutionError(token, registration.lifetime);

    return scope;
  }

  #scopeOwner(scope: ScopeToken): ContainerImpl | undefined {
    if (this.#scope === scope) return this;

    return this.#parent ? this.#parent.#scopeOwner(scope) : undefined;
  }

  async #create(registration: FactoryRegistration, owner: ContainerImpl, path: Token<unknown>[]): Promise<unknown> {
    const promise = Promise.all(registration.dependencies.map((dependency) => owner.#resolve(dependency, path))).then(
      (dependencies) => registration.create(...dependencies),
    );

    owner.#inFlight.add(promise);

    try {
      const value = await promise;

      if (owner.#lifecycle !== 'active') {
        if (registration.dispose) {
          try {
            await registration.dispose(value as never);
          } catch (error) {
            owner.#cleanupFailures.push(error);
          }
        }

        throw new ConduitDisposedError(owner.name);
      }

      if (registration.dispose) owner.#owned.push({ dispose: registration.dispose, value });

      return value;
    } finally {
      owner.#inFlight.delete(promise);
    }
  }
}

export function createContainer(options?: { name?: string }): Container {
  return new ContainerImpl(undefined, options);
}
