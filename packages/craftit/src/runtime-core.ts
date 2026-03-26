import { type CleanupFn } from '@vielzeug/stateit';

import { type CSSResult } from './internal';

export type ComponentRuntime = {
  /** Cleanup functions to run when the component is disconnected. */
  cleanups: CleanupFn[];
  /** The host element instance. */
  el: HTMLElement;
  /** Custom error handlers registered via `onError`. */
  errorHandlers: ((err: unknown) => void)[];
  /** Callbacks to run when the component is connected for the first time or re-connected. */
  onMount: (() => CleanupFn | undefined | void)[];
  /** Stylesheets to apply to the shadow root. */
  styles?: (string | CSSStyleSheet | CSSResult)[];
};

export const runtimeStack: ComponentRuntime[] = [];

/**
 * Returns the current component runtime.
 * Throws if called outside of a component's setup or lifecycle.
 */
export const currentRuntime = (): ComponentRuntime => {
  const rt = runtimeStack[runtimeStack.length - 1];

  if (!rt) throw new Error('[craftit:E1] lifecycle outside setup');

  return rt;
};
