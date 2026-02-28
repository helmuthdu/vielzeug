/**
 * Craftit - Component Context
 * Manages component lifecycle and state
 */

import type { Cleanup } from '../core/signal';

/**
 * Injection key type
 */
export type InjectionKey<T> = symbol & { __type?: T };

/**
 * Component context interface
 */
export interface ComponentContext {
  /** Host element */
  element: HTMLElement;
  /** Shadow root */
  shadow: ShadowRoot;
  /** Cleanup functions */
  cleanups: Set<Cleanup>;
  /** Mount callbacks */
  mountCallbacks: Array<() => void | Cleanup | Promise<void | Cleanup>>;
  /** Unmount callbacks */
  unmountCallbacks: Array<() => void>;
  /** Update callbacks */
  updateCallbacks: Array<() => void>;
  /** Whether component is mounted */
  mounted: boolean;
  /** Component name for debugging */
  name: string;
  /** Provided values for dependency injection */
  provides: Map<symbol | string, unknown>;
  /** Parent context for injection lookup */
  parent: ComponentContext | null;
}

/**
 * Current active component context
 */
let currentContext: ComponentContext | null = null;

/**
 * Set the current component context
 */
export function setContext(context: ComponentContext | null): void {
  currentContext = context;
}

/**
 * Get the current component context
 * @throws Error if called outside component setup
 */
export function getContext(): ComponentContext {
  if (!currentContext) {
    throw new Error(
      "[craftit] No component context available. Make sure you're calling this inside a component setup function.",
    );
  }
  return currentContext;
}

/**
 * Get the current component context without throwing
 */
export function maybeGetContext(): ComponentContext | null {
  return currentContext;
}

/**
 * Register a cleanup function
 */
export function onCleanup(cleanup: Cleanup): void {
  const context = getContext();
  context.cleanups.add(cleanup);
}

/**
 * Run all cleanups for a context
 */
export function runCleanups(context: ComponentContext): void {
  for (const cleanup of context.cleanups) {
    try {
      cleanup();
    } catch (error) {
      console.error(`[craftit] Error in cleanup for ${context.name}:`, error);
    }
  }
  context.cleanups.clear();
}

/**
 * Provide a value for dependency injection
 * @param key - Unique key for the value
 * @param value - Value to provide
 */
export function provide<T>(key: InjectionKey<T> | string, value: T): void {
  const context = getContext();
  context.provides.set(key, value);
}

/**
 * Inject a provided value
 * @param key - Key to look up
 * @param defaultValue - Optional default value if not found
 * @returns The injected value or default
 */
export function inject<T>(key: InjectionKey<T> | string): T | undefined;
export function inject<T>(key: InjectionKey<T> | string, defaultValue: T): T;
export function inject<T>(key: InjectionKey<T> | string, defaultValue?: T): T | undefined {
  let context = maybeGetContext();

  // Walk up the component tree to find the value
  while (context) {
    if (context.provides.has(key)) {
      return context.provides.get(key) as T;
    }
    context = context.parent;
  }

  return defaultValue;
}

/**
 * Create a typed injection key
 * @param description - Description for debugging
 */
export function createInjectionKey<T>(description: string): InjectionKey<T> {
  return Symbol(description) as InjectionKey<T>;
}

/**
 * Check if a key has been provided
 * @param key - Key to check
 */
export function hasInjection(key: InjectionKey<unknown> | string): boolean {
  let context = maybeGetContext();

  while (context) {
    if (context.provides.has(key)) {
      return true;
    }
    context = context.parent;
  }

  return false;
}
