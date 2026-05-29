export const wiredTypes = `
declare module '/wired' {
  export type Token<T = unknown> = symbol & { __type?: T };
  export type Lifetime = 'singleton' | 'transient' | 'scoped';

  export type ValueOptions<T> = {
    dispose?: (instance: T) => void | Promise<void>;
    multi?: boolean;
  };

  export type FactoryOptions<T, Deps extends unknown[] = any[]> = {
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    dispose?: (instance: T) => void | Promise<void>;
    lifetime?: Lifetime;
    multi?: boolean;
  };

  export class Container {
    has<T>(token: Token<T>): boolean;

    value<T>(token: Token<T>, val: T, opts?: ValueOptions<T>): this;
    factory<T, Deps extends unknown[] = any[]>(
      token: Token<T>,
      fn: (...deps: Deps) => T | Promise<T>,
      opts?: FactoryOptions<T, Deps>
    ): this;

    resolve<T>(token: Token<T>): Promise<T>;
    resolveSync<T>(token: Token<T>): T;
    resolveMany<T>(token: Token<T>): Promise<T[]>;
    resolveOptional<T>(token: Token<T>): Promise<T | undefined>;

    createChild(): Container;

    dispose(): Promise<void>;
    readonly disposed: boolean;
    [Symbol.asyncDispose](): Promise<void>;
  }

  export function createToken<T>(description: string): Token<T>;
  export function createContainer(): Container;

  export class CircularDependencyError extends Error {}
  export class ProviderNotFoundError extends Error {}
  export class MultipleProvidersError extends Error {}
  export class SyncResolutionError extends Error {}
  export class ScopedResolutionError extends Error {}
  export class ContainerDisposedError extends Error {}
}
`;
