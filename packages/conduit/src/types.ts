declare const tokenBrand: unique symbol;
declare const scopeBrand: unique symbol;

export type Token<T = unknown> = symbol & { readonly [tokenBrand]: T };
export type ScopeToken = symbol & { readonly [scopeBrand]: true };

export function token<T>(description: string): Token<T> {
  return Symbol(description) as Token<T>;
}

export function scope(name: string): ScopeToken {
  return Symbol(name) as ScopeToken;
}

export type Lifetime = 'singleton' | 'transient' | ScopeToken;

export type ValueOptions<T> = Readonly<{
  dispose?: (value: T) => Promise<void> | void;
}>;

export type FactoryOptions<T> = Readonly<{
  dispose?: (value: T) => Promise<void> | void;
  lifetime?: Lifetime;
}>;

export type InferTokens<T extends readonly Token<unknown>[]> = {
  [K in keyof T]: T[K] extends Token<infer Value> ? Value : never;
};

export interface Container {
  createScope(scope?: ScopeToken, options?: { name?: string }): Container;
  readonly disposalSignal: AbortSignal;
  dispose(): Promise<void>;
  readonly disposed: boolean;

  factory<T, Dependencies extends readonly Token<unknown>[]>(
    token: Token<T>,
    dependencies: Dependencies,
    create: (...values: InferTokens<Dependencies>) => Promise<T> | T,
    options?: FactoryOptions<T>,
  ): this;

  has<T>(token: Token<T>): boolean;
  readonly name: string;
  resolve<T>(token: Token<T>): Promise<T>;
  validate(): this;

  value<T>(token: Token<T>, value: T, options?: ValueOptions<T>): this;
  [Symbol.asyncDispose](): Promise<void>;
}
