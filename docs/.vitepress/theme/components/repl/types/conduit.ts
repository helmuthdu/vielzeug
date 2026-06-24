export const conduitTypes = `
declare module '/conduit' {
  export type Token<T = unknown> = symbol & { __type?: T };
  export type ScopeToken = symbol & { __scopeToken?: never };
  export type Lifetime = 'singleton' | 'transient' | ScopeToken;

  export type ValueOptions<T> = {
    dispose?: (instance: T) => void | Promise<void>;
  };

  export type FactoryOptions<T> = {
    deps?: readonly Token<any>[];
    dispose?: (instance: T) => void | Promise<void>;
    lifetime?: Lifetime;
  };

  export type InferTokenTypes<T extends readonly Token<any>[]> = {
    [K in keyof T]: T[K] extends Token<infer U> ? U : never;
  };

  export type ResolveInterceptor = <T>(tok: Token<T>, value: T) => void;

  export interface FactoryResolver {
    resolve<T>(tok: Token<T>): Promise<T>;
    resolveSync<T>(tok: Token<T>): T;
  }

  export type ContainerModule = (container: Container) => Promise<void> | void;

  export type ContainerEvent =
    | { description: string; kind: 'factory' | 'value'; source: string; type: 'register' }
    | { description: string; source: string; type: 'resolve' }
    | { source: string; type: 'dispose' };

  export type ResolveResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

  export type ContainerNode = {
    deps?: string[];
    description: string;
    kind: 'value' | 'factory';
    lifetime?: 'singleton' | 'transient' | string;
  };

  export type ContainerGraph = { nodes: ContainerNode[] };

  export interface Container {
    readonly name: string;
    readonly disposed: boolean;
    readonly disposalSignal: AbortSignal;

    has<T>(tok: Token<T>): boolean;

    value<T>(tok: Token<T>, val: T, opts?: ValueOptions<T>): this;
    factory<T>(tok: Token<T>, fn: (resolver: FactoryResolver) => T | Promise<T>, opts?: FactoryOptions<T>): this;

    resolve<T>(tok: Token<T>): Promise<T>;
    resolveSync<T>(tok: Token<T>): T;
    resolveMany<D extends Token<any>[]>(toks: D): Promise<any[]>;
    resolveAll(opts?: { includeScoped?: boolean }): Promise<void>;

    inspect(opts?: { deep?: boolean }): ContainerGraph;
    validate(): this;
    freeze(): this;

    createScope(scopeToken?: ScopeToken, opts?: { name?: string }): Container;

    on(listener: (event: ContainerEvent) => void): () => void;
    onResolve(interceptor: ResolveInterceptor): () => void;

    dispose(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
  }

  export function token<T>(description: string): Token<T>;
  export function scope(name: string): ScopeToken;
  export function createContainer(opts?: { name?: string }): Container;
  export function loadModules(container: Container, ...modules: ContainerModule[]): Promise<Container>;
  export function resolveOptional<T>(container: Container, tok: Token<T>): Promise<T | undefined>;
  export function resolveOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): Promise<T>;
  export function tryResolve<T>(container: Container, tok: Token<T>): Promise<ResolveResult<T>>;
  export function resolveSyncOptional<T>(container: Container, tok: Token<T>): T | undefined;
  export function resolveSyncOrDefault<T>(container: Container, tok: Token<T>, defaultValue: T): T;
  export function trySyncResolve<T>(container: Container, tok: Token<T>): ResolveResult<T>;

  export class ContainerError extends Error {}
  export class CircularDependencyError extends ContainerError {}
  export class ProviderNotFoundError extends ContainerError {}
  export class DuplicateRegistrationError extends ContainerError {}
  export class SyncResolutionError extends ContainerError {}
  export class ScopedResolutionError extends ContainerError {}
  export class ContainerDisposedError extends ContainerError {}
  export class ContainerFrozenError extends ContainerError {}
}
`;
