declare const tokenBrand: unique symbol;

export type Token<T = unknown> = symbol & { readonly [tokenBrand]: T };

export function token<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

export const disposalSignalToken = token<AbortSignal>('Conduit disposal signal');

/** Singleton results are cached on the registering container; transient results belong to the requesting container. */
export type Lifetime = 'singleton' | 'transient';

export type InferTokens<T extends readonly Token<unknown>[]> = {
  [K in keyof T]: T[K] extends Token<infer Value> ? Value : never;
};

export type ValueOptions<T> = Readonly<{
  dispose?: (value: T) => Promise<void> | void;
}>;

export type FactoryOptions<T> = Readonly<{
  dispose?: (value: T) => Promise<void> | void;
  lifetime?: Lifetime;
}>;

export interface ValueProvider<T> {
  readonly dispose?: (value: T) => Promise<void> | void;
  readonly token: Token<T>;
  readonly value: T;
}

export interface FactoryProvider<T, Dependencies extends readonly Token<unknown>[] = readonly Token<unknown>[]> {
  readonly dependencies: Dependencies;
  readonly dispose?: (value: T) => Promise<void> | void;
  readonly factory: (...values: InferTokens<Dependencies>) => Promise<T> | T;
  readonly lifetime?: Lifetime;
  readonly token: Token<T>;
}

export type Provider<T = unknown, Dependencies extends readonly Token<unknown>[] = readonly Token<unknown>[]> =
  | ValueProvider<T>
  | FactoryProvider<T, Dependencies>;

/**
 * Type-erased provider for the heterogeneous lists accepted by
 * `createContainer()` and `createScope()`. Providers are invariant in their
 * value type, so erasure needs `any` at this one boundary; registration
 * re-validates every provider at runtime.
 */
export type AnyProvider = Provider<any, any>;

export function valueProvider<T>(token: Token<T>, value: NoInfer<T>, options: ValueOptions<T> = {}): ValueProvider<T> {
  return Object.freeze({ ...options, token, value });
}

export function factoryProvider<T, const Dependencies extends readonly Token<unknown>[]>(
  token: Token<T>,
  dependencies: Dependencies,
  factory: (...values: InferTokens<Dependencies>) => Promise<T> | T,
  options: FactoryOptions<T> = {},
): FactoryProvider<T, Dependencies> {
  return Object.freeze({
    ...options,
    dependencies: Object.freeze([...dependencies]) as unknown as Dependencies,
    factory,
    token,
  });
}

/** Map of service name to dependency token, passed to `container.resolve()` at a composition root. */
export type ServiceMap = { readonly [key: string]: Token<unknown> };

export type InferServices<M extends ServiceMap> = {
  readonly [K in keyof M]: M[K] extends Token<infer Value> ? Value : never;
};

export type CreateScopeOptions = Readonly<{
  name?: string;
  providers?: readonly AnyProvider[];
}>;

export interface Container {
  /**
   * Create a child container that inherits parent registrations. Providers
   * registered on the child are local to it, which is how request-scoped
   * values are spelled: one child per request.
   */
  createScope(options?: CreateScopeOptions): Container;
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;
  has<T>(token: Token<T>): boolean;
  readonly name: string;
  resolve<T>(token: Token<T>): Promise<T>;
  resolve<M extends ServiceMap>(map: M): Promise<InferServices<M>>;
  [Symbol.asyncDispose](): Promise<void>;
}
