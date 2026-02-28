/**
 * Craftit - Props
 * Reactive component attributes/properties
 */

import { getContext, onCleanup } from './context';
import { type Signal, signal, watch } from '../core/signal';

/**
 * Prop options
 */
export interface PropOptions<T> {
  /** Reflect prop changes back to attribute */
  reflect?: boolean;
  /** Emit change events */
  notify?: boolean;
  /** Parse attribute value */
  parse?: (value: string) => T;
  /** Serialize value to attribute */
  serialize?: (value: T) => string;
  /** Prop is readonly (attribute → prop only) */
  readonly?: boolean;
}

/**
 * Convert camelCase to kebab-case
 */
function toKebab(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * Create a reactive prop that syncs with an attribute
 */
export function prop<T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> {
  const context = getContext();
  const attrName = toKebab(name);

  // Create signal
  const sig = signal<T>(defaultValue);

  // Flag to prevent infinite loops between attribute and signal updates
  let isUpdatingFromAttr = false;
  let isUpdatingFromSignal = false;

  // Get initial value from attribute
  const initialAttr = context.element.getAttribute(attrName);
  if (initialAttr !== null) {
    if (options?.parse) {
      sig.value = options.parse(initialAttr);
    } else {
      sig.value = initialAttr as unknown as T;
    }
  }

  // Watch attribute changes
  const observer = new MutationObserver((mutations) => {
    if (isUpdatingFromSignal) return; // Skip if we're updating from signal

    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === attrName) {
        const newValue = context.element.getAttribute(attrName);
        if (newValue !== null) {
          isUpdatingFromAttr = true;
          sig.value = options?.parse ? options.parse(newValue) : (newValue as unknown as T);
          isUpdatingFromAttr = false;
        } else if (typeof defaultValue === 'boolean') {
          isUpdatingFromAttr = true;
          sig.value = false as unknown as T;
          isUpdatingFromAttr = false;
        }
      }
    }
  });

  observer.observe(context.element, {
    attributeFilter: [attrName],
    attributes: true,
  });

  onCleanup(() => observer.disconnect());

  // Reflect changes back to attribute
  if (options?.reflect && !options.readonly) {
    watch(
      sig,
      (newValue) => {
        if (isUpdatingFromAttr) return; // Skip if we're updating from attribute

        const serialized = options.serialize ? options.serialize(newValue) : String(newValue);

        const currentAttr = context.element.getAttribute(attrName);
        if (currentAttr !== serialized) {
          isUpdatingFromSignal = true;
          if (typeof newValue === 'boolean') {
            if (newValue) {
              context.element.setAttribute(attrName, '');
            } else {
              context.element.removeAttribute(attrName);
            }
          } else {
            context.element.setAttribute(attrName, serialized);
          }
          isUpdatingFromSignal = false;
        }
      },
      { flush: 'sync' },
    );
  }

  // Emit change events
  if (options?.notify) {
    watch(
      sig,
      (newValue) => {
        context.element.dispatchEvent(
          new CustomEvent(`${name}-changed`, {
            bubbles: true,
            composed: true,
            detail: newValue,
          }),
        );
      },
      { flush: 'sync' },
    );
  }

  return sig;
}

/**
 * Create a boolean prop
 */
export function propBoolean(name: string, defaultValue = false): Signal<boolean> {
  return prop(name, defaultValue, {
    parse: (val) => val === '' || val === 'true',
    reflect: true,
    serialize: (val) => (val ? '' : 'false'),
  });
}

/**
 * Create a number prop
 */
export function propNumber(name: string, defaultValue = 0): Signal<number> {
  return prop(name, defaultValue, {
    parse: (val) => {
      const num = Number(val);
      return Number.isNaN(num) ? 0 : num;
    },
    reflect: true,
    serialize: (val) => String(val),
  });
}

/**
 * Create a JSON prop
 */
export function propJSON<T>(name: string, defaultValue: T): Signal<T> {
  return prop(name, defaultValue, {
    parse: (val) => {
      try {
        return JSON.parse(val);
      } catch {
        return defaultValue;
      }
    },
    reflect: true,
    serialize: (val) => JSON.stringify(val),
  });
}
