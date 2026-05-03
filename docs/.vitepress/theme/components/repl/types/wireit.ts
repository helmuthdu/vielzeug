export const wireitTypes = `
declare module '@vielzeug/wireit' {
  export type Token<T = unknown> = symbol & { __type?: T };
  export type Lifetime = 'singleton' | 'transient' | 'scoped';

  export type ValueProvider<T> = { useValue: T };
  export type ClassProvider<T, Deps extends unknown[] = any[]> = {
    useClass: new (...args: Deps) => T;
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
  };
  export type FactoryProvider<T, Deps extends unknown[] = any[]> = {
    useFactory: (...deps: Deps) => T | Promise<T>;
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
  };
  export type Provider<T> = ValueProvider<T> | ClassProvider<T> | FactoryProvider<T>;

  export type ProviderOptions<T, Deps extends unknown[] = any[]> = {
    deps?: { [K in keyof Deps]: Token<Deps[K]> };
    lifetime?: Lifetime;
    dispose?: (instance: T) => void | Promise<void>;
    overwrite?: boolean;
  };

  export type TokenValues<T extends readonly Token<any>[]> = {
    [K in keyof T]: T[K] extends Token<infer V> ? V : never;
  };

  export class Container {
    register<T>(token: Token<T>, provider: Provider<T>, opts?: { overwrite?: boolean }): this;
    value<T>(token: Token<T>, val: T, opts?: { overwrite?: boolean }): this;
    factory<T, Deps extends unknown[] = any[]>(token: Token<T>, fn: (...deps: Deps) => T | Promise<T>, opts?: ProviderOptions<T, Deps>): this;
    bind<T, Deps extends unknown[] = any[]>(token: Token<T>, cls: new (...args: Deps) => T, opts?: ProviderOptions<T, Deps>): this;
    alias<T>(token: Token<T>, source: Token<T>): this;
    unregister<T>(token: Token<T>): this;
    clear(): this;

    resolve<T>(token: Token<T>): Promise<T>;
    resolveAll<T extends readonly Token<any>[]>(tokens: [...T]): Promise<TokenValues<T>>;
    resolveOptional<T>(token: Token<T>): Promise<T | undefined>;
    has(token: Token<any>): boolean;

    createChild(): Container;
    runInScope<T>(fn: (scope: Container) => Promise<T> | T): Promise<Awaited<T>>;

    dispose(): Promise<void>;
    readonly disposed: boolean;
    [Symbol.asyncDispose](): Promise<void>;

    mock<T, R>(token: Token<T>, mock: T | Provider<T>, fn: () => Promise<R> | R): Promise<R>;
    snapshot(): { readonly registry: ReadonlyMap<Token<any>, unknown>; readonly aliases: ReadonlyMap<Token<any>, Token<any>> };
    restore(snap: { readonly registry: ReadonlyMap<Token<any>, unknown>; readonly aliases: ReadonlyMap<Token<any>, Token<any>> }): this;
    debug(): { aliases: Array<[string, string]>; tokens: string[] };
  }

  export function createToken<T>(description: string): Token<T>;
  export function createContainer(): Container;
  export function createTestContainer(base?: Container): { container: Container; dispose: () => Promise<void> };

  export class CircularDependencyError extends Error {}
  export class ProviderNotFoundError extends Error {}
  export class AliasCycleError extends Error {}
  export class ContainerDisposedError extends Error {}
}
`;
