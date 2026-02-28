/**
 * Craftit - Lifecycle Hooks
 * Component lifecycle management
 */

import type { ComponentContext } from '../composables/context';
import { getContext } from '../composables/context';
import type { Cleanup } from './signal';

/**
 * Register a callback to run when a component is mounted
 * Can return a cleanup function
 */
export function onMount(callback: () => unknown | Promise<unknown>): void {
  const context = getContext();
  context.mountCallbacks.push(callback);
}

/**
 * Register a callback to run when the component is unmounted
 */
export function onUnmount(callback: () => void): void {
  const context = getContext();
  context.unmountCallbacks.push(callback);
}

/**
 * Register a callback to run after each update
 */
export function onUpdated(callback: () => void): void {
  const context = getContext();
  context.updateCallbacks.push(callback);
}

/**
 * Run mount callbacks for a context
 */
export function runMountCallbacks(context: ComponentContext): void {
  for (const callback of context.mountCallbacks) {
    try {
      const cleanup = callback();
      // Handle both sync and async cleanups uniformly
      Promise.resolve(cleanup)
        .then((result) => {
          if (typeof result === 'function') {
            context.cleanups.add(result as Cleanup);
          }
        })
        .catch((error) => {
          console.error(`[craftit] Error in onMount callback for ${context.name}:`, error);
        });
    } catch (error) {
      console.error(`[craftit] Error in onMount callback for ${context.name}:`, error);
    }
  }
}

/**
 * Run unmount callbacks for a context
 */
export function runUnmountCallbacks(context: ComponentContext): void {
  for (const callback of context.unmountCallbacks) {
    try {
      callback();
    } catch (error) {
      console.error(`[craftit] Error in onUnmount callback for ${context.name}:`, error);
    }
  }
}

/**
 * Run update callbacks for a context
 */
export function runUpdateCallbacks(context: ComponentContext): void {
  // Only run if mounted
  if (!context.mounted) return;

  for (const callback of context.updateCallbacks) {
    try {
      callback();
    } catch (error) {
      console.error(`[craftit] Error in onUpdated callback for ${context.name}:`, error);
    }
  }
}
