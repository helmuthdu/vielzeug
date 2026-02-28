/**
 * Directive Types
 * Internal types for directive processing
 */

import type { ComputedSignal, Signal } from '../core/signal';
import type { TemplateResult } from './html';

/**
 * Directive types supported by the template engine
 */
export type DirectiveType = 'when' | 'show' | 'each' | 'log' | 'portal';

/**
 * Base directive interface
 */
export interface BaseDirective {
  type: DirectiveType;
}

/**
 * When directive - unified conditional rendering
 * Supports if, unless (inverse), and else branches
 */
export interface WhenDirective extends BaseDirective {
  type: 'when';
  condition: boolean | Signal<boolean> | ComputedSignal<boolean>;
  template: TemplateResult | string | (() => TemplateResult | string);
  elseTemplate?: TemplateResult | string | (() => TemplateResult | string);
  inverse?: boolean; // If true, renders when condition is falsy (unless behavior)
}

/**
 * Show directive - CSS display toggle
 */
export interface ShowDirective extends BaseDirective {
  type: 'show';
  condition: boolean | Signal<boolean> | ComputedSignal<boolean>;
  template: TemplateResult | string;
}

/**
 * Each directive - keyed list rendering with optional fallback
 */
export interface EachDirective<T = unknown> extends BaseDirective {
  type: 'each';
  items: T[] | Signal<T[]> | ComputedSignal<T[]>;
  keyFn: (item: T, index: number) => string | number;
  template: (item: T, index: number) => TemplateResult | string;
  fallback?: TemplateResult | string | (() => TemplateResult | string);
}

/**
 * Log directive - debug logging in templates
 */
export interface LogDirective extends BaseDirective {
  type: 'log';
  value: unknown;
  label?: string;
}

/**
 * Portal directive - render content elsewhere in DOM
 */
export interface PortalDirective extends BaseDirective {
  type: 'portal';
  template: TemplateResult | string;
  target: string | Element; // CSS selector or DOM element
}

/**
 * Union of all directive types
 */
export type Directive = WhenDirective | ShowDirective | EachDirective<any> | LogDirective | PortalDirective;

/**
 * Check if value is a directive
 */
export function isDirective(value: unknown): value is Directive {
  return (
    value !== null &&
    typeof value === 'object' &&
    'type' in value &&
    ['when', 'show', 'each', 'log', 'portal'].includes((value as any).type)
  );
}

/**
 * Global state for keyed lists
 */
export const listStates = new WeakMap<Comment, any>();
