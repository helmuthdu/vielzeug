/**
 * Error Boundaries
 * Graceful error handling for components
 */

import type { TemplateResult } from '../template/html';

export interface ErrorInfo {
  componentStack?: string;
  timestamp: number;
}

export interface ErrorBoundaryOptions {
  /** Fallback UI to show when error occurs */
  fallback: (error: Error, info: ErrorInfo) => TemplateResult | string;
  /** Error handler callback */
  onError?: (error: Error, info: ErrorInfo) => void;
  /** Retry callback */
  onRetry?: () => void;
  /** Whether to log errors to console */
  logErrors?: boolean;
}

/**
 * Wrap a component with error boundary
 * Catches errors during rendering and shows fallback UI
 *
 * @example
 * define('safe-component', () => {
 *   return errorBoundary(
 *     () => {
 *       // Component that might throw
 *       return html`<div>${riskyOperation()}</div>`;
 *     },
 *     {
 *       fallback: (error) => html`<div>Error: ${error.message}</div>`,
 *       onError: (error) => console.error('Caught:', error)
 *     }
 *   );
 * });
 */
export function errorBoundary(
  component: () => TemplateResult | string,
  options: ErrorBoundaryOptions,
): TemplateResult | string {
  try {
    return component();
  } catch (error) {
    const err = error as Error;
    const info: ErrorInfo = {
      componentStack: err.stack,
      timestamp: Date.now(),
    };

    // Log error if enabled
    if (options.logErrors !== false) {
      console.error('[craftit] Error boundary caught error:', err);
      if (info.componentStack) {
        console.error('Component stack:', info.componentStack);
      }
    }

    // Call error handler
    options.onError?.(err, info);

    // Return fallback UI
    return options.fallback(err, info);
  }
}

/**
 * Create an error boundary with retry capability
 *
 * @example
 * const { render, retry } = createErrorBoundary(
 *   () => html`<div>${data.value}</div>`,
 *   {
 *     fallback: (error, { retry }) => html`
 *       <div>
 *         <p>Error: ${error.message}</p>
 *         <button @click=${retry}>Retry</button>
 *       </div>
 *     `
 *   }
 * );
 */
export function createErrorBoundary(
  component: () => TemplateResult | string,
  options: Omit<ErrorBoundaryOptions, 'fallback'> & {
    fallback: (error: Error, info: ErrorInfo & { retry: () => void }) => TemplateResult | string;
  },
) {
  const retry = () => {
    options.onRetry?.();
    return render();
  };

  const render = (): TemplateResult | string => {
    return errorBoundary(component, {
      ...options,
      fallback: (error, info) => options.fallback(error, { ...info, retry }),
    });
  };

  return { render, retry };
}

/**
 * Global error handler for uncaught errors in components
 */
export function setGlobalErrorHandler(handler: (error: Error, info: ErrorInfo) => void): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      handler(event.error, {
        componentStack: event.error?.stack,
        timestamp: Date.now(),
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      handler(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        timestamp: Date.now(),
      });
    });
  }
}
