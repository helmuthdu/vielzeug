export const wireitTypes = `
declare module '@vielzeug/wireit' {
  export type Token<T = unknown> = symbol & { __type?: T };
  export type Lifetime = 'singleton' | 'transient' | 'scoped';

  export type ValueProvider<T> = { useValue: T };
  export type FactoryProvider<T, Deps extends unknown[] = any[]> = {
    useFactory: (...deps: Deps) => T | Promise<T>;
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
  };
  export type Provider<T> = ValueProvider<T> | FactoryProvider<T>;

  export type ProviderOptions<T, Deps extends unknown[] = any[]> = {
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
    multi?: boolean;
  };

  export class Container {
    value<T>(token: Token<T>, val: T, opts?: { multi?: boolean }): this;
    factory<T, Deps extends unknown[] = any[]>(
      token: Token<T>,
      fn: (...deps: Deps) => T | Promise<T>,
      opts?: ProviderOptions<T, Deps>
    ): this;

    resolve<T>(token: Token<T>): Promise<T>;
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
  export class ContainerDisposedError extends Error {}
}
`;
