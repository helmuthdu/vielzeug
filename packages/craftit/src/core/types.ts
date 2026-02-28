/**
 * TypeScript Type Utilities
 * Better type inference and helpers
 */

import { Signal, ComputedSignal } from './signal';
import type { TemplateResult } from '../template/html';

/**
 * Unwrap Signal type to get inner value type
 */
export type UnwrapSignal<T> = T extends Signal<infer U> ? U : T;

/**
 * Unwrap ComputedSignal type to get inner value type
 */
export type UnwrapComputed<T> = T extends ComputedSignal<infer U> ? U : T;

/**
 * Unwrap any reactive type (Signal or ComputedSignal)
 */
export type UnwrapReactive<T> = T extends Signal<infer U>
  ? U
  : T extends ComputedSignal<infer U>
  ? U
  : T;

/**
 * Deep unwrap object with reactive properties
 */
export type UnwrapNestedRefs<T> = T extends Signal<any> | ComputedSignal<any>
  ? UnwrapReactive<T>
  : T extends object
  ? { [K in keyof T]: UnwrapNestedRefs<T[K]> }
  : T;

/**
 * Extract value types from a record of signals
 */
export type UnwrapSignals<T extends Record<string, Signal<any>>> = {
  [K in keyof T]: UnwrapSignal<T[K]>;
};

/**
 * Make properties reactive (wrap in Signal)
 */
export type Reactive<T> = {
  [K in keyof T]: Signal<T[K]>;
};

/**
 * Component props with automatic type inference
 */
export type ComponentProps<T extends Record<string, any>> = {
  [K in keyof T]?: T[K];
};

/**
 * Template value type - can be primitives, signals, or template results
 */
export type TemplateValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Signal<any>
  | ComputedSignal<any>
  | TemplateResult
  | (() => TemplateValue);

/**
 * Ensure type is a signal
 */
export type EnsureSignal<T> = T extends Signal<any> ? T : Signal<T>;

/**
 * Get the return type of a setup function
 */
export type SetupReturnType<T> = T extends () => infer R ? R : never;

/**
 * Merge multiple types
 */
export type Merge<T extends readonly unknown[]> = T extends readonly [infer F, ...infer R]
  ? F & Merge<R>
  : unknown;

/**
 * Make specific keys required
 */
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Make specific keys optional
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Extract keys of a specific type
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Readonly deep
 */
export type DeepReadonly<T> = T extends (infer R)[]
  ? DeepReadonlyArray<R>
  : T extends Function
  ? T
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

type DeepReadonlyArray<T> = ReadonlyArray<DeepReadonly<T>>;
type DeepReadonlyObject<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

/**
 * Mutable (opposite of Readonly)
 */
export type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

/**
 * Deep mutable
 */
export type DeepMutable<T> = T extends (infer R)[]
  ? DeepMutableArray<R>
  : T extends Function
  ? T
  : T extends object
  ? DeepMutableObject<T>
  : T;

type DeepMutableArray<T> = Array<DeepMutable<T>>;
type DeepMutableObject<T> = {
  -readonly [K in keyof T]: DeepMutable<T[K]>;
};

/**
 * Type guard for Signal
 */
export function isSignal<T>(value: unknown): value is Signal<T> {
  return value instanceof Signal || (typeof value === 'object' && value !== null && 'value' in value && 'peek' in value);
}

/**
 * Type guard for ComputedSignal
 */
export function isComputedSignal<T>(value: unknown): value is ComputedSignal<T> {
  return value instanceof ComputedSignal || (typeof value === 'object' && value !== null && 'value' in value && !('update' in value));
}

/**
 * Type guard for reactive value (Signal or ComputedSignal)
 */
export function isReactive(value: unknown): value is Signal<any> | ComputedSignal<any> {
  return isSignal(value) || isComputedSignal(value);
}

