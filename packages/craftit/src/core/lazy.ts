/**
 * Lazy Loading & Code Splitting
 * Support for lazy-loaded components with suspense
 */

import { signal } from './signal';
import type { TemplateResult } from '../template/html';

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
  options: LazyOptions = {}
): () => TemplateResult | string {
  const loading = signal(true);
  const error = signal<Error | null>(null);
  const component = signal<(() => TemplateResult) | null>(null);

  let loadStarted = false;

  return () => {
    // Start loading on first access
    if (!loadStarted) {
      loadStarted = true;

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
    }

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

/**
 * Preload a lazy component
 * Useful for preloading components before they're needed
 *
 * @example
 * const HeavyComponent = lazy(() => import('./Heavy'));
 * preload(HeavyComponent); // Start loading immediately
 */
export function preload(lazyComponent: () => TemplateResult | string): void {
  // Trigger the lazy component to start loading
  lazyComponent();
}

