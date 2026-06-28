/**
 * Test utilities for code that integrates with @vielzeug/sandbox.
 *
 * Import from '@vielzeug/sandbox/testing' — not the main entry point.
 * These helpers encapsulate the postMessage protocol so tests don't
 * need to know internal message shapes.
 */

/** Helpers for simulating sandbox→host messages in tests. */
export interface SandboxTestHelpers {
  /** Fire a 'ready' signal as if the bridge script executed. */
  fireReady(): void;
  /** Fire a 'custom' event as if sandbox code called window.__sandbox__.emit(). */
  fireCustom(event: string, detail?: unknown): void;
  /** Fire a 'resize' message as if the bridge ResizeObserver fired. */
  fireResize(height: number): void;
  /** Fire an 'error' message as if the sandbox caught an uncaught error. */
  fireError(message: string, stack?: string): void;
}

/**
 * Create test helpers bound to a specific sandbox container's iframe.
 *
 * @example
 * ```ts
 * const container = document.createElement('div');
 * document.body.appendChild(container);
 * const sandbox = createSandbox(container);
 * const helpers = createSandboxTestHelpers(container);
 *
 * sandbox.render('<p>test</p>');
 * helpers.fireReady();
 * await sandbox.ready;
 * ```
 */
export function createSandboxTestHelpers(container: HTMLElement): SandboxTestHelpers {
  function getSource(): Window | null {
    return (container.querySelector('iframe') as HTMLIFrameElement | null)?.contentWindow ?? null;
  }

  function fire(data: unknown): void {
    window.dispatchEvent(new MessageEvent('message', { data, source: getSource() }));
  }

  return {
    fireCustom: (event, detail = null) => fire({ detail, event, type: 'custom' }),
    fireError: (message, stack) => fire({ message, type: 'error', ...(stack !== undefined ? { stack } : {}) }),
    fireReady: () => fire({ type: 'ready' }),
    fireResize: (height) => fire({ height, type: 'resize' }),
  };
}
