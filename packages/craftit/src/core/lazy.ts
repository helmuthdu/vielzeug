/**
 * Lazy Loading & Code Splitting
 * Support for lazy-loaded components with suspense
 */

import type { TemplateResult } from '../template/html';
import { signal } from './signal';

export interface LazyComponentModule {
  default: () => TemplateResult;
}

export interface LazyOptions {
  /** Fallback to show while loading */
  fallback?: () => TemplateResult;
  /** Timeout in milliseconds before showing fallback */
  timeout?: number;
  /** Error handler */
  onError?: (error: Error) => void;
}

/**
 * Lazy load a component
 *
 * @example
 * const HeavyComponent = lazy(
 *   () => import('./HeavyComponent'),
 *   { fallback: () => html`<div>Loading...</div>` }
 * );
 *
 * define('my-app', () => {
 *   return html`<div>${HeavyComponent}</div>`;
 * });
 */
export function lazy(
  factory: () => Promise<LazyComponentModule>,
  options: LazyOptions = {},
): () => TemplateResult | string {
  const loading = signal(true);
  const error = signal<Error | null>(null);
  const component = signal<(() => TemplateResult) | null>(null);

  // Start loading immediately
  factory()
    .then((module) => {
      component.value = module.default;
      loading.value = false;
    })
    .catch((err) => {
      error.value = err;
      loading.value = false;
      options.onError?.(err);
      console.error('[craftit] Lazy loading error:', err);
    });

  return () => {
    // Show error if loading failed
    if (error.value) {
      return `<div class="lazy-error">Failed to load component: ${error.value.message}</div>`;
    }

    // Show fallback while loading
    if (loading.value) {
      if (options.fallback) {
        return options.fallback();
      }
      return '<div class="lazy-loading">Loading...</div>';
    }

    // Render loaded component
    if (component.value) {
      return component.value();
    }

    return '';
  };
}
