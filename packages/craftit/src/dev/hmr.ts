/**
 * Hot Module Replacement (HMR)
 * Development-time hot reloading for components
 */

import type { SetupFunction } from '../core/define';

interface HMRState {
  components: Map<string, {
    setup: SetupFunction;
    instances: Set<HTMLElement>;
  }>;
}

const hmrState: HMRState = {
  components: new Map(),
};

/**
 * Register component for HMR
 */
export function registerHMR(tagName: string, setup: SetupFunction, element: HTMLElement): void {
  if (!hmrState.components.has(tagName)) {
    hmrState.components.set(tagName, {
      setup,
      instances: new Set(),
    });
  }

  hmrState.components.get(tagName)!.instances.add(element);
}

/**
 * Unregister component instance from HMR
 */
export function unregisterHMR(tagName: string, element: HTMLElement): void {
  const component = hmrState.components.get(tagName);
  if (component) {
    component.instances.delete(element);
  }
}

/**
 * Extract state from component for preservation during HMR
 */
function extractState(element: HTMLElement): Record<string, any> {
  const state: Record<string, any> = {};

  // Try to extract data attributes
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-')) {
      state[attr.name] = attr.value;
    }
  }

  // Try to extract from custom properties
  const customElement = element as any;
  if (customElement.__craftit_state) {
    Object.assign(state, customElement.__craftit_state);
  }

  return state;
}

/**
 * Restore state to component after HMR
 */
function restoreState(element: HTMLElement, state: Record<string, any>): void {
  // Restore data attributes
  for (const [key, value] of Object.entries(state)) {
    if (key.startsWith('data-')) {
      element.setAttribute(key, String(value));
    }
  }

  // Restore custom properties
  const customElement = element as any;
  if (customElement.__craftit_state) {
    Object.assign(customElement.__craftit_state, state);
  }
}

/**
 * Reload a component with new setup function
 */
export function reloadComponent(tagName: string, newSetup: SetupFunction): void {
  const component = hmrState.components.get(tagName);
  if (!component) {
    console.warn(`[HMR] Component ${tagName} not registered`);
    return;
  }

  console.log(`[HMR] Reloading component: ${tagName}`);

  // Update setup function
  component.setup = newSetup;

  // Reload all instances
  const instances = Array.from(component.instances);
  for (const element of instances) {
    try {
      // Extract state
      const state = extractState(element);

      // Re-render component
      // This is a simplified version - actual implementation would depend on how components are structured
      const parent = element.parentElement;
      const next = element.nextSibling;

      // Create new element
      const newElement = document.createElement(tagName);

      // Restore state
      restoreState(newElement, state);

      // Replace in DOM
      if (parent) {
        parent.insertBefore(newElement, next);
        element.remove();
      }

      // Update tracking
      component.instances.delete(element);
      component.instances.add(newElement);

    } catch (error) {
      console.error(`[HMR] Error reloading instance of ${tagName}:`, error);
    }
  }
}

/**
 * Enable HMR for Vite
 */
export function enableHMR(): void {
  if (typeof import.meta === 'undefined' || !(import.meta as any).hot) {
    return;
  }

  const hot = (import.meta as any).hot;

  console.log('[HMR] Hot Module Replacement enabled');

  // Accept HMR updates
  hot.accept((newModule: any) => {
    if (!newModule) return;

    console.log('[HMR] Module updated, reloading components...');

    // Reload all registered components
    for (const [tagName] of hmrState.components) {
      if (newModule[tagName]) {
        reloadComponent(tagName, newModule[tagName]);
      }
    }
  });

  // Handle errors
  hot.on('vite:error', (error: Error) => {
    console.error('[HMR] Error:', error);
  });

  // Cleanup on dispose
  hot.dispose(() => {
    console.log('[HMR] Disposing...');
    hmrState.components.clear();
  });

  // Invalidate on certain changes
  hot.on('vite:beforeUpdate', () => {
    console.log('[HMR] Preparing to update...');
  });
}

/**
 * Create HMR-friendly component wrapper
 */
export function withHMR<T extends SetupFunction>(
  tagName: string,
  setup: T
): T {
  if (typeof import.meta === 'undefined' || !(import.meta as any).hot) {
    return setup;
  }

  // Wrap setup to track instances
  const wrappedSetup = ((...args: Parameters<T>) => {
    const result = (setup as any)(...args);

    // Store reference for HMR
    const context = (globalThis as any).__craftit_current_context;
    if (context?.element) {
      registerHMR(tagName, setup, context.element);
    }

    return result;
  }) as T;

  return wrappedSetup;
}

/**
 * Preserve data during HMR
 * Useful for preserving form state, scroll position, etc.
 */
export function preserveData<T>(key: string, defaultValue: T): T {
  if (typeof import.meta === 'undefined' || !(import.meta as any).hot) {
    return defaultValue;
  }

  const hot = (import.meta as any).hot;
  const hotData = hot.data as any;

  if (hotData && hotData[key] !== undefined) {
    console.log(`[HMR] Restored data for key: ${key}`);
    return hotData[key];
  }

  // Store for next reload
  hot.dispose((data: any) => {
    data[key] = defaultValue;
  });

  return defaultValue;
}



