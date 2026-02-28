/**
 * Craftit - Props
 * Reactive component attributes/properties
 */

import { type Signal, signal, watch } from '../core/signal';
import { toKebab } from '../utils/string';
import { getContext, onCleanup } from './context';

/**
 * Prop options
 */
export interface PropOptions<T> {
  /** Reflect prop changes back to the attribute */
  reflect?: boolean;
  /** Parse attribute value */
  parse?: (value: string) => T;
  /** Serialize value to attribute (ignored for boolean props) */
  serialize?: (value: T) => string;
  /** Prop is readonly (attribute → prop only) */
  readonly?: boolean;
}

/**
 * Create a reactive boolean prop that syncs with an attribute
 * Uses HTML boolean attribute semantics (presence = true, absence = false)
 *
 * @example
 * const disabled = prop('disabled', false, { reflect: true });
 */
export function prop(name: string, defaultValue: boolean, options?: Omit<PropOptions<boolean>, 'parse' | 'serialize'>): Signal<boolean>;

/**
 * Create a reactive number prop that syncs with an attribute
 *
 * @example
 * const count = prop('count', 0, { reflect: true });
 */
export function prop(name: string, defaultValue: number, options?: Omit<PropOptions<number>, 'parse' | 'serialize'>): Signal<number>;

/**
 * Create a reactive string prop that syncs with an attribute
 *
 * @example
 * const name = prop('name', 'default', { reflect: true });
 */
export function prop(name: string, defaultValue: string, options?: Omit<PropOptions<string>, 'parse' | 'serialize'>): Signal<string>;

/**
 * Create a reactive prop that syncs with an attribute
 * For complex types, provide parse/serialize functions
 *
 * @example Custom type
 * const data = prop('data', { x: 0 }, {
 *   parse: (v) => JSON.parse(v),
 *   serialize: (v) => JSON.stringify(v),
 *   reflect: true
 * });
 */
export function prop<T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T>;

/**
 * Create a reactive prop that syncs with an attribute
 *
 * Provides automatic parse/serialize for primitive types:
 * - Boolean: HTML boolean attributes (presence/absence)
 * - Number: Number(value) / String(value)
 * - String: Direct value
 * - Other: Requires parse/serialize options
 *
 * @example Boolean prop
 * const disabled = prop('disabled', false, { reflect: true });
 *
 * @example Number prop
 * const count = prop('count', 0, { reflect: true });
 *
 * @example String prop
 * const name = prop('name', '', { reflect: true });
 *
 * @example Complex type
 * const config = prop('config', defaultConfig, {
 *   parse: (v) => JSON.parse(v),
 *   serialize: (v) => JSON.stringify(v),
 *   reflect: true
 * });
 *
 * @example Readonly prop (attribute → signal only)
 * const id = prop('id', '', { readonly: true });
 *
 * ⚠️ Important Notes:
 * - Boolean props ignore the serialize option (platform semantics)
 * - For non-primitive types, you MUST provide parse/serialize
 * - Parse errors are logged and the value is kept unchanged
 */
export function prop<T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> {
  const context = getContext();
  const attrName = toKebab(name);

  // Provide default parse/serialize for primitive types if not provided
  const effectiveOptions = { ...options };

  if (!effectiveOptions.parse && !effectiveOptions.serialize) {
    if (typeof defaultValue === 'number') {
      effectiveOptions.parse = (v: string) => Number(v) as T;
      effectiveOptions.serialize = (v: T) => String(v);
    } else if (typeof defaultValue === 'boolean') {
      // Boolean attributes use presence/absence semantics
      // parse/serialize are handled specially in the code below
    }
    // String types work naturally without parse/serialize
  }

  // Create signal
  const sig = signal<T>(defaultValue);

  // Deterministic flags to prevent infinite loops
  // More reliable than time-based checks
  let isSyncingFromSignal = false;
  let isSyncingFromAttr = false;

  // Get initial value from attribute
  const initialAttr = context.element.getAttribute(attrName);
  if (initialAttr !== null) {
    try {
      if (effectiveOptions?.parse) {
        sig.value = effectiveOptions.parse(initialAttr);
      } else if (typeof defaultValue === 'boolean') {
        // Boolean attribute present = true
        sig.value = true as T;
      } else {
        sig.value = initialAttr as unknown as T;
      }
    } catch (error) {
      console.error(`[craftit] Failed to parse prop "${name}" with value "${initialAttr}"`, error);
      // Keep defaultValue on parse error
    }
  }

  // Watch attribute changes
  const observer = new MutationObserver((mutations) => {
    // Skip if we're syncing from signal → attribute
    if (isSyncingFromSignal) return;

    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === attrName) {
        const newValue = context.element.getAttribute(attrName);

        isSyncingFromAttr = true;
        try {
          if (newValue !== null) {
            try {
              if (effectiveOptions?.parse) {
                sig.value = effectiveOptions.parse(newValue);
              } else if (typeof defaultValue === 'boolean') {
                sig.value = true as T;
              } else {
                sig.value = newValue as unknown as T;
              }
            } catch (error) {
              console.error(`[craftit] Failed to parse prop "${name}" with value "${newValue}"`, error);
              // Keep current value on parse error
            }
          } else if (typeof defaultValue === 'boolean') {
            // Boolean attribute removed = false
            sig.value = false as unknown as T;
          }
        } finally {
          isSyncingFromAttr = false;
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
  // Note: For boolean props, uses HTML boolean attribute semantics (presence/absence)
  // The serialize option is ignored for booleans to match platform behavior
  if (effectiveOptions?.reflect && !effectiveOptions.readonly) {
    watch(sig, (newValue) => {
      // Skip if we're syncing from attribute → signal
      if (isSyncingFromAttr) return;

      isSyncingFromSignal = true;
      try {
        // Handle boolean attributes with platform semantics
        if (typeof newValue === 'boolean') {
          if (newValue) {
            context.element.setAttribute(attrName, '');
          } else {
            context.element.removeAttribute(attrName);
          }
        } else {
          // Non-boolean: use serialize or String()
          const serialized = effectiveOptions.serialize ? effectiveOptions.serialize(newValue) : String(newValue);
          const currentAttr = context.element.getAttribute(attrName);

          // Only update if actually different to avoid unnecessary mutations
          if (currentAttr !== serialized) {
            context.element.setAttribute(attrName, serialized);
          }
        }
      } finally {
        isSyncingFromSignal = false;
      }
    });
  }

  return sig;
}
