/**
 * Directive Types
 * Internal types for directive processing
 */

import type { ComputedSignal, Signal } from '../core/signal';
import type { TemplateResult } from './html';
import type { KeyedListState } from './reconciliation';

/**
 * Supported directive types
 * Centralized list to ensure type and runtime consistency
 */
const DIRECTIVE_TYPES = ['when', 'show', 'each', 'log', 'portal'] as const;

/**
 * Directive types supported by the template engine
 */
export type DirectiveType = (typeof DIRECTIVE_TYPES)[number];

/**
 * Base directive interface
 */
export interface BaseDirective {
  type: DirectiveType;
}

/**
 * When directive - unified conditional rendering
 * Supports conditional rendering with optional else branch
 *
 * Note: TemplateResult uses the reactive engine; string is treated as raw HTML.
 */
export interface WhenDirective extends BaseDirective {
  type: 'when';
  condition: boolean | Signal<boolean> | ComputedSignal<boolean>;
  template: TemplateResult | string | (() => TemplateResult | string);
  elseTemplate?: TemplateResult | string | (() => TemplateResult | string);
}

/**
 * Show directive - CSS display toggle
 *
 * Note: TemplateResult uses the reactive engine; string is treated as raw HTML.
 */
export interface ShowDirective extends BaseDirective {
  type: 'show';
  condition: boolean | Signal<boolean> | ComputedSignal<boolean>;
  template: TemplateResult | string;
}

/**
 * Each directive - keyed list rendering with optional fallback
 *
 * Note: TemplateResult uses the reactive engine; string is treated as raw HTML.
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
 *
 * Note: TemplateResult uses the reactive engine; string is treated as raw HTML.
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
 * Uses centralized directive type list for consistency
 */
export function isDirective(value: unknown): value is Directive {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const type = (value as { type?: unknown }).type;
  return typeof type === 'string' && DIRECTIVE_TYPES.includes(type as DirectiveType);
}

/**
 * Global state for keyed lists
 * Maps comment markers to their reconciliation state
 */
export const listStates = new WeakMap<Comment, KeyedListState>();
