/** @vielzeug/craftit
 * Monolithic, functional, signals-based web component utility.
 */

/* ==================== Signals Core ==================== */

export type CleanupFn = () => void;
// Note: Effect functions can either return a cleanup function or nothing (void)
// This is intentional - either return a cleanup function or don't return anything
// biome-ignore lint/suspicious/noConfusingVoidType: void is appropriate here for functions that may or may not return cleanup
export type EffectFn = () => CleanupFn | void;

let currentEffect: EffectFn | null = null;
let isBatching = false;
const pendingEffects = new Set<EffectFn>();

export class Signal<T> {
  #value: T;
  #subscribers = new Set<EffectFn>();

  constructor(initial: T) {
    this.#value = initial;
  }

  get value(): T {
    if (currentEffect) {
      this.#subscribers.add(currentEffect);
    }
    return this.#value;
  }

  set value(next: T) {
    if (Object.is(this.#value, next)) return;
    this.#value = next;
    for (const fn of this.#subscribers) {
      if (isBatching) pendingEffects.add(fn);
      else fn();
    }
  }

  peek(): T {
    return this.#value;
  }

  update(fn: (current: T) => T): void {
    this.value = fn(this.#value);
  }
}

export const signal = <T>(initial: T): Signal<T> => new Signal(initial);

export type ComputedSignal<T> = Signal<T>;

export const readonly = <T>(s: Signal<T>): { readonly value: T } =>
  new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'value') return s.value;
        return undefined;
      },
      set(_, prop) {
        if (prop === 'value') {
          throw new Error('[craftit] Cannot set value on readonly signal');
        }
        return false;
      },
    },
  ) as { readonly value: T };

export const effect = (fn: EffectFn): CleanupFn => {
  let cleanup: CleanupFn | undefined;
  const runner: EffectFn = () => {
    // Clean up previous run
    if (typeof cleanup === 'function') cleanup();

    try {
      currentEffect = runner;
      const result = fn();
      // Only assign if result is a function, otherwise leave as undefined
      cleanup = typeof result === 'function' ? result : undefined;
    } finally {
      currentEffect = null;
    }
    return cleanup;
  };
  runner();

  // Return dispose function that calls cleanup
  return () => {
    if (typeof cleanup === 'function') cleanup();
  };
};

export const computed = <T>(compute: () => T): Signal<T> => {
  const s = signal<T>(undefined as unknown as T);
  effect(() => {
    s.value = compute();
  });
  return s;
};

export const batch = (fn: () => void): void => {
  const prev = isBatching;
  isBatching = true;
  try {
    fn();
  } finally {
    isBatching = prev;
    if (!isBatching) {
      const run = Array.from(pendingEffects);
      pendingEffects.clear();
      for (const f of run) f();
    }
  }
};

export type WatchOptions = {
  immediate?: boolean;
};

export function watch<T>(source: Signal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn;
export function watch<T extends readonly Signal<unknown>[]>(
  sources: [...T],
  cb: (values: { [K in keyof T]: T[K] extends Signal<infer V> ? V : never }) => void,
  options?: WatchOptions,
): CleanupFn;
export function watch<T>(
  source: Signal<T> | Signal<unknown>[],
  cb: ((value: T, prev: T) => void) | ((values: unknown[]) => void),
  options?: WatchOptions,
): CleanupFn {
  // Handle array of signals
  if (Array.isArray(source)) {
    const sources = source as Signal<unknown>[];
    let prevValues = sources.map((s) => s.peek());

    if (options?.immediate) {
      (cb as (values: unknown[]) => void)(prevValues);
    }

    const stop = effect(() => {
      const nextValues = sources.map((s) => s.value);
      if (!nextValues.every((v, i) => Object.is(v, prevValues[i]))) {
        (cb as (values: unknown[]) => void)(nextValues);
        prevValues = nextValues;
      }
    });
    return stop;
  }

  // Handle single signal
  let prev = source.peek();

  if (options?.immediate) {
    (cb as (value: T, prev: T) => void)(prev, prev);
  }

  const stop = effect(() => {
    const next = source.value;
    if (!Object.is(prev, next)) {
      (cb as (value: T, prev: T) => void)(next, prev);
      prev = next;
    }
  });
  return stop;
}

/* ==================== Utilities ==================== */

const kebabCache = new Map<string, string>();

const toKebab = (str: string): string => {
  if (kebabCache.has(str)) return kebabCache.get(str)!;
  const result = str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  kebabCache.set(str, result);
  return result;
};

const parseHTML = (html: string): DocumentFragment => {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  return tpl.content;
};

/* ==================== Template & Bindings ==================== */

type TextBinding = { type: 'text'; marker: string; signal: Signal<unknown> };
type AttrBinding = {
  type: 'attr';
  marker: string;
  name: string;
  mode: 'bool' | 'attr';
  signal?: Signal<unknown>;
  value?: unknown;
};
type PropBinding = {
  type: 'prop';
  marker: string;
  name: string;
  signal?: Signal<unknown>;
  value?: unknown;
};
type EventBinding = {
  type: 'event';
  marker: string;
  name: string;
  handler: (e: Event) => void;
  modifiers?: string[];
};
type RefBinding = {
  type: 'ref';
  marker: string;
  ref: Ref<Element>;
};
type HtmlBinding = {
  type: 'html';
  marker: string;
  signal: Signal<{ html: string; bindings: Binding[] }>;
};
type PortalBinding = {
  type: 'portal';
  marker: string;
  signal: Signal<string>;
  target: string | HTMLElement;
};

export type Binding = TextBinding | AttrBinding | PropBinding | EventBinding | RefBinding | HtmlBinding | PortalBinding;

// Directive types for when, each, show, etc.
export type WhenDirective = {
  type: 'when';
  condition: unknown;
  then: () => string | HTMLResult;
  else?: () => string | HTMLResult;
};

export type EachDirective<T = unknown> = {
  type: 'each';
  items: T[];
  keyFn: (item: T) => string | number;
  template: (item: T, index: number) => string | HTMLResult;
  empty?: () => string | HTMLResult;
};

export type ShowDirective = {
  type: 'show';
  condition: unknown;
  template: string | HTMLResult;
};

export type Directive = WhenDirective | EachDirective | ShowDirective;

export type HTMLResult = {
  __html: string;
  __bindings: Binding[];
  toString(): string;
};

/* ========== ref() for element references ========== */

export interface Ref<T extends Element | null> {
  value: T | null;
}

export const ref = <T extends Element>(): Ref<T> => ({ value: null });

/* ========== html tagged template ========== */

export const html = Object.assign(
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTML template parsing requires complex branching logic
  (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult | string => {
    let result = '';
    const bindings: Binding[] = [];
    let markerIndex = 0;

    // Helper function to resolve a value to string
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Directive resolution requires checking multiple types and conditions
    const resolveValue = (value: unknown, depth = 0): string => {
      if (typeof value === 'string') return value;
      if (value == null) return '';

      if (typeof value === 'object' && 'type' in value) {
        const directive = value as Directive;

        if (directive.type === 'each') {
          const eachDir = directive as EachDirective;

          if (!eachDir.items || !eachDir.items.length) {
            return eachDir.empty ? resolveValue(eachDir.empty(), depth + 1) : '';
          }

          // Collect bindings from each item's template
          const htmlParts: string[] = [];
          for (let i = 0; i < eachDir.items.length; i++) {
            const result = eachDir.template(eachDir.items[i], i);
            if (typeof result === 'string') {
              htmlParts.push(result);
            } else {
              htmlParts.push(result.__html);
              bindings.push(...result.__bindings);
            }
          }
          return htmlParts.join('');
        }

        if (directive.type === 'when') {
          const whenDir = directive as WhenDirective;
          const condition = whenDir.condition instanceof Signal ? whenDir.condition.value : whenDir.condition;

          const result = condition ? whenDir.then() : whenDir.else ? whenDir.else() : '';
          if (typeof result === 'string') {
            return result;
          }
          if (result && typeof result === 'object' && '__html' in result) {
            bindings.push(...result.__bindings);
            return result.__html;
          }
          return '';
        }
      }

      if (typeof value === 'object' && '__html' in value) {
        return (value as HTMLResult).__html;
      }

      return String(value);
    };

    for (let i = 0; i < strings.length; i++) {
      const str = strings[i];
      if (i >= values.length) {
        result += str;
        break;
      }
      const value = values[i];

      // Attribute context detections
      const boolMatch = str.match(/\s+\?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);
      const attrMatch = str.match(/\s+:([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);
      const propMatch = str.match(/\s+\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);
      const eventMatch = str.match(/\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/);
      const refMatch = str.match(/\s+ref\s*=\s*["']?$/);
      // Regular attribute without prefix (for common attrs like class, id, disabled, etc.)
      const plainAttrMatch = str.match(/\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);

      if (boolMatch) {
        const name = boolMatch[1];
        const markerAttr = `data-b${markerIndex++}`;
        result += `${str.slice(0, -boolMatch[0].length)} ${markerAttr}=""`;
        if (value instanceof Signal) {
          bindings.push({ marker: markerAttr, mode: 'bool', name, signal: value as Signal<unknown>, type: 'attr' });
        } else {
          bindings.push({ marker: markerAttr, mode: 'bool', name, type: 'attr', value });
        }
        continue;
      }

      if (attrMatch) {
        const name = attrMatch[1];
        const markerAttr = `data-a${markerIndex++}`;
        result += `${str.slice(0, -attrMatch[0].length)} ${markerAttr}=""`;
        if (value instanceof Signal) {
          bindings.push({ marker: markerAttr, mode: 'attr', name, signal: value as Signal<unknown>, type: 'attr' });
        } else {
          bindings.push({ marker: markerAttr, mode: 'attr', name, type: 'attr', value });
        }
        continue;
      }

      if (propMatch) {
        const name = propMatch[1];
        const markerAttr = `data-p${markerIndex++}`;
        result += `${str.slice(0, -propMatch[0].length)} ${markerAttr}=""`;
        if (value instanceof Signal) {
          bindings.push({ marker: markerAttr, name, signal: value as Signal<unknown>, type: 'prop' });
        } else {
          bindings.push({ marker: markerAttr, name, type: 'prop', value });
        }
        continue;
      }

      if (eventMatch) {
        const fullName = eventMatch[1];
        const parts = fullName.split('.');
        const name = parts[0];
        const modifiers = parts.slice(1);

        const markerAttr = `data-e${markerIndex++}`;
        result += `${str.slice(0, -eventMatch[0].length)} ${markerAttr}=""`;
        if (typeof value !== 'function') {
          console.warn(`[craftit] @${fullName} expects a function, got`, value);
        } else {
          bindings.push({
            handler: value as (e: Event) => void,
            marker: markerAttr,
            modifiers,
            name,
            type: 'event',
          });
        }
        continue;
      }

      if (refMatch) {
        const markerAttr = `data-r${markerIndex++}`;
        result += `${str.slice(0, -refMatch[0].length)} ${markerAttr}=""`;
        if (!value || typeof value !== 'object' || !('value' in value)) {
          console.warn('[craftit] ref= expects a ref() object');
        } else {
          bindings.push({ marker: markerAttr, ref: value as Ref<Element>, type: 'ref' });
        }
        continue;
      }

      // Handle plain attribute bindings (class, disabled, etc.)
      if (plainAttrMatch) {
        const name = plainAttrMatch[1];
        const markerAttr = `data-a${markerIndex++}`;
        result += `${str.slice(0, -plainAttrMatch[0].length)} ${markerAttr}=""`;

        // Determine if it's a boolean attribute
        const booleanAttrs = [
          'disabled',
          'readonly',
          'required',
          'checked',
          'selected',
          'hidden',
          'open',
          'autofocus',
          'autoplay',
          'controls',
          'loop',
          'muted',
        ];
        const isBoolAttr = booleanAttrs.includes(name);

        if (value instanceof Signal) {
          bindings.push({
            marker: markerAttr,
            mode: isBoolAttr ? 'bool' : 'attr',
            name,
            signal: value as Signal<unknown>,
            type: 'attr',
          });
        } else {
          bindings.push({
            marker: markerAttr,
            mode: isBoolAttr ? 'bool' : 'attr',
            name,
            type: 'attr',
            value,
          });
        }
        continue;
      }

      // Check for reactive html.each result
      if (value && typeof value === 'object' && '__eachSignal' in value) {
        const marker = `__h_${markerIndex++}`;
        result += `${str}<!--${marker}-->`;
        bindings.push({
          marker,
          signal: (value as { __eachSignal: Signal<{ html: string; bindings: Binding[] }> }).__eachSignal,
          type: 'html',
        });
        continue;
      }

      // Check for reactive html.show result
      if (value && typeof value === 'object' && '__showSignal' in value) {
        const marker = `__h_${markerIndex++}`;
        result += `${str}<!--${marker}-->`;
        bindings.push({
          marker,
          signal: (value as { __showSignal: Signal<{ html: string; bindings: Binding[] }> }).__showSignal,
          type: 'html',
        });
        continue;
      }

      // Check for reactive html.portal result
      if (value && typeof value === 'object' && '__portalSignal' in value) {
        const portalValue = value as { __portalSignal: Signal<string>; __portalTarget: string | HTMLElement };
        bindings.push({
          marker: `__portal_${markerIndex++}`,
          signal: portalValue.__portalSignal,
          target: portalValue.__portalTarget,
          type: 'portal',
        });
        result += str; // Portal doesn't render inline, so no marker in HTML
        continue;
      }

      // Check for reactive html.when result
      if (value && typeof value === 'object' && 'type' in value && (value as Directive).type === 'when') {
        const whenDir = value as WhenDirective;
        if (whenDir.condition instanceof Signal) {
          const marker = `__h_${markerIndex++}`;
          result += `${str}<!--${marker}-->`;
          const whenSignal = computed(() => {
            const condition = whenDir.condition instanceof Signal ? whenDir.condition.value : whenDir.condition;
            const result = condition ? whenDir.then() : whenDir.else ? whenDir.else() : '';
            if (typeof result === 'string') {
              return { bindings: [], html: result };
            }
            return { bindings: result.__bindings, html: result.__html };
          });
          bindings.push({
            marker,
            signal: whenSignal,
            type: 'html',
          });
          continue;
        }
      }

      // Text / normal interpolation
      if (value instanceof Signal) {
        const marker = `__s_${markerIndex++}`;
        result += `${str}<!--${marker}-->`;
        bindings.push({ marker, signal: value as Signal<unknown>, type: 'text' });
      } else {
        // Use helper to resolve any value (string, HTMLResult, Directive, etc.)
        result += str + resolveValue(value);
      }
    }

    const trimmed = result.trim();
    if (!bindings.length) return trimmed;

    return {
      __bindings: bindings,
      __html: trimmed,
      toString() {
        return (this as HTMLResult).__html;
      },
    };
  },
  {
    classes: (
      classes:
        | Record<string, boolean | undefined>
        | (string | false | undefined | null | Record<string, boolean | undefined>)[],
    ): string => {
      if (Array.isArray(classes)) {
        return classes
          .map((item) => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (typeof item === 'object') {
              return Object.entries(item)
                .filter(([, v]) => v)
                .map(([k]) => k)
                .join(' ');
            }
            return '';
          })
          .filter(Boolean)
          .join(' ');
      }
      return Object.entries(classes)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(' ');
    },

    each: <T>(
      source: T[] | Signal<T[]>,
      keyFn: (item: T) => string | number,
      template: (item: T, index: number) => string | HTMLResult,
      empty?: () => string | HTMLResult,
    ): EachDirective<T> | { __eachSignal: Signal<{ html: string; bindings: Binding[] }> } => {
      // If source is a signal, return a special object that will be detected
      if (source instanceof Signal) {
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Signal-based list rendering requires complex logic for bindings
        const htmlSignal = computed(() => {
          const items = source.value;
          console.log('[craftit:each] Rendering items:', items);
          if (!items || !items.length) {
            if (!empty) return { bindings: [], html: '' };
            const emptyResult = empty();
            if (typeof emptyResult === 'string') {
              return { bindings: [], html: emptyResult };
            }
            return { bindings: emptyResult.__bindings, html: emptyResult.__html };
          }

          const allHtml: string[] = [];
          const allBindings: Binding[] = [];
          let globalBindingCounter = 0;

          for (let i = 0; i < items.length; i++) {
            const res = template(items[i], i);
            if (typeof res === 'string') {
              allHtml.push(res);
            } else {
              // Need to renumber markers to make them unique across all items
              // Collect all replacements first to avoid cascading replacements
              const replacements = new Map<string, string>();
              const renumberedBindings: Binding[] = [];

              for (const binding of res.__bindings) {
                const oldMarker = binding.marker;
                const newMarker = oldMarker.replace(/(\d+)$/, () => String(globalBindingCounter++));
                replacements.set(oldMarker, newMarker);

                // Create new binding with updated marker
                renumberedBindings.push({
                  ...binding,
                  marker: newMarker,
                });
              }

              // Now apply all replacements in a single pass using temporary placeholders
              let itemHtml = res.__html;
              const tempMarkers = new Map<string, string>();

              // First pass: replace with temporary unique placeholders
              for (const [oldMarker, newMarker] of replacements) {
                const tempMarker = `__TEMP_${Math.random().toString(36).slice(2)}__`;
                tempMarkers.set(tempMarker, newMarker);
                itemHtml = itemHtml.replace(
                  new RegExp(oldMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                  tempMarker,
                );
              }

              // Second pass: replace temp markers with final markers
              for (const [tempMarker, newMarker] of tempMarkers) {
                itemHtml = itemHtml.replace(new RegExp(tempMarker, 'g'), newMarker);
              }

              allHtml.push(itemHtml);
              allBindings.push(...renumberedBindings);
            }
          }

          console.log('[craftit:each] Collected bindings:', allBindings.length, allBindings);
          return { bindings: allBindings, html: allHtml.join('') };
        });
        return { __eachSignal: htmlSignal };
      }

      // If source is an array, return a directive object
      return {
        empty,
        items: source,
        keyFn,
        template,
        type: 'each',
      };
    },

    log: (...args: unknown[]): string => {
      console.log('[craftit]', ...args);
      return '';
    },

    portal: (
      template: string | HTMLResult | Signal<string>,
      target?: string | HTMLElement,
    ): string | { __portalSignal: Signal<string>; __portalTarget: string | HTMLElement } => {
      // If template is a Signal, return a special marker for reactive portal
      if (template instanceof Signal) {
        return { __portalSignal: template, __portalTarget: target || 'body' };
      }

      // Portal needs to append, not replace content, and apply bindings
      if (target) {
        const targetEl = typeof target === 'string' ? document.querySelector(target) : target;
        if (targetEl) {
          const content = typeof template === 'string' ? template : template.__html;
          const bindings = typeof template === 'string' ? [] : template.__bindings;

          // Clean up any previous portal content
          const existing = targetEl.querySelector('[data-portal]');
          if (existing) {
            existing.remove();
          }

          // If content is empty, just remove existing portal and return
          if (!content || content.trim() === '') {
            return '';
          }

          // Create a container for this portal content
          const container = document.createElement('div');
          container.setAttribute('data-portal', 'true');
          container.innerHTML = content;

          // Append the portal content
          targetEl.appendChild(container);

          // Apply bindings (simplified version for portal - no reactive cleanup)
          for (const binding of bindings) {
            if (binding.type === 'event') {
              const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);
              if (el) {
                el.removeAttribute(binding.marker);
                el.addEventListener(binding.name, binding.handler);
              }
            } else if (binding.type === 'attr') {
              const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);
              if (el) {
                el.removeAttribute(binding.marker);
                if (binding.signal) {
                  const value = binding.signal.value;
                  if (binding.mode === 'bool') {
                    if (value) el.setAttribute(binding.name, '');
                    else el.removeAttribute(binding.name);
                  } else {
                    el.setAttribute(binding.name, String(value));
                  }
                } else {
                  if (binding.mode === 'bool') {
                    if (binding.value) el.setAttribute(binding.name, '');
                  } else {
                    el.setAttribute(binding.name, String(binding.value));
                  }
                }
              }
            }
          }
        }
      }
      return '';
    },

    show: (
      condition: unknown,
      template: string | HTMLResult,
    ): string | { __showSignal: Signal<{ html: string; bindings: Binding[] }> } => {
      // If condition is a signal, return reactive wrapper
      if (condition instanceof Signal) {
        const showSignal = computed(() => {
          const isShown = condition.value;
          const content = typeof template === 'string' ? template : template.__html;
          const bindings = typeof template === 'string' ? [] : template.__bindings;

          // Inject display style into content
          const tagMatch = content.match(/^<([a-z][-a-z0-9]*)([\s>])/i);
          let styledContent = content;

          if (tagMatch) {
            const tagName = tagMatch[1];
            const styleAttrMatch = content.match(/^<[a-z][-a-z0-9]*[^>]*\s*style\s*=\s*["']([^"']*)["']/i);
            if (styleAttrMatch) {
              const existingStyle = styleAttrMatch[1];
              const newStyle = `display: ${isShown ? '' : 'none'}; ${existingStyle}`;
              styledContent = content.replace(/style\s*=\s*["'][^"']*["']/i, `style="${newStyle}"`);
            } else {
              styledContent = content.replace(
                new RegExp(`^<${tagName}([\\s>])`, 'i'),
                `<${tagName} style="display: ${isShown ? '' : 'none'}"$1`,
              );
            }
          } else {
            styledContent = `<span style="display: ${isShown ? '' : 'none'}">${content}</span>`;
          }

          return { bindings, html: styledContent };
        });
        return { __showSignal: showSignal };
      }

      // Static evaluation
      const isShown = condition;
      const content = typeof template === 'string' ? template : template.__html;

      // Try to inject style attribute into the first tag
      const tagMatch = content.match(/^<([a-z][-a-z0-9]*)([\s>])/i);
      if (tagMatch) {
        const tagName = tagMatch[1];

        // Check if there's already a style attribute
        const styleAttrMatch = content.match(/^<[a-z][-a-z0-9]*[^>]*\s*style\s*=\s*["']([^"']*)["']/i);
        if (styleAttrMatch) {
          // Append to existing style
          const existingStyle = styleAttrMatch[1];
          const newStyle = `display: ${isShown ? '' : 'none'}; ${existingStyle}`;
          return content.replace(/style\s*=\s*["'][^"']*["']/i, `style="${newStyle}"`);
        }
        // Add style attribute after tag name
        return content.replace(
          new RegExp(`^<${tagName}([\\s>])`, 'i'),
          `<${tagName} style="display: ${isShown ? '' : 'none'}"$1`,
        );
      }

      // Fallback: wrap in span
      return `<span style="display: ${isShown ? '' : 'none'}">${content}</span>`;
    },

    style: (styles: Partial<CSSStyleDeclaration> | Record<string, string | number | undefined | null>): string => {
      return Object.entries(styles)
        .filter(([, v]) => v != null)
        .map(([key, value]) => {
          const cssKey = toKebab(key);
          if (
            typeof value === 'number' &&
            !/opacity|z-index|flex|grow|shrink|order|font-weight|line-height/i.test(cssKey)
          ) {
            return `${cssKey}: ${value}px`;
          }
          return `${cssKey}: ${value}`;
        })
        .join('; ');
    },

    when: (
      condition: unknown,
      arg:
        | string
        | HTMLResult
        | (() => string | HTMLResult)
        | { then: () => string | HTMLResult; else?: () => string | HTMLResult },
      fallback?: string | HTMLResult | (() => string | HTMLResult),
    ): WhenDirective | string | HTMLResult => {
      const resolve = (v: string | HTMLResult | (() => string | HTMLResult)) => (typeof v === 'function' ? v() : v);

      // If arg is an object with then/else
      if (typeof arg === 'object' && arg !== null && 'then' in arg && !('__html' in arg)) {
        const { then, else: elseFn } = arg as {
          then: () => string | HTMLResult;
          else?: () => string | HTMLResult;
        };

        // If condition is a signal, return directive for reactive handling
        if (condition instanceof Signal) {
          return {
            condition,
            else: elseFn,
            then,
            type: 'when',
          };
        }

        // Otherwise, resolve immediately
        return condition ? resolve(then) : elseFn ? resolve(elseFn) : '';
      }

      // Simple case: resolve immediately
      if (condition) return resolve(arg as string | HTMLResult | (() => string | HTMLResult));
      if (fallback != null) return resolve(fallback);
      return '';
    },
  },
);

/* ==================== CSS Helper ==================== */

export type CSSResult = {
  content: string;
  toString(): string;
};

type ThemeVars<T extends Record<string, string | number>> = {
  [K in keyof T]: string;
};

export const css = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): CSSResult => {
    const content = strings.reduce((out, str, i) => out + str + (values[i] ?? ''), '').trim();
    return {
      content,
      toString() {
        return this.content;
      },
    };
  },
  {
    theme: <T extends Record<string, string | number>>(
      light: T,
      dark?: T,
      options?: { selector?: string; attribute?: string },
    ): ThemeVars<T> => {
      const selector = options?.selector ?? ':host';
      const attr = options?.attribute ?? 'data-theme';

      const toVars = (obj: T) =>
        Object.entries(obj)
          .map(([key, val]) => {
            const cssVar = key.startsWith('--') ? key : `--${toKebab(key)}`;
            return `${cssVar}: ${val};`;
          })
          .join(' ');

      const cssRule = dark
        ? [
            `${selector} { ${toVars(light)} }`,
            '@media (prefers-color-scheme: dark) {',
            `  ${selector}:not([${attr}="light"]) { ${toVars(dark)} }`,
            '}',
            `${selector}[${attr}="dark"] { ${toVars(dark)} }`,
            `${selector}[${attr}="light"] { ${toVars(light)} }`,
          ].join('\n')
        : `${selector} { ${toVars(light)} }`;

      return new Proxy({} as ThemeVars<T>, {
        get(_, prop) {
          if (prop === 'toString' || prop === Symbol.toPrimitive) return () => cssRule;
          if (typeof prop === 'string' && prop in light) {
            const cssVar = prop.startsWith('--') ? prop : `--${toKebab(prop)}`;
            return `var(${cssVar})`;
          }
          return undefined;
        },
      });
    },
  },
);

export const createStyleElement = (cssContent: string): HTMLStyleElement => {
  const el = document.createElement('style');
  el.textContent = cssContent;
  return el;
};

/* ==================== Component Runtime & Lifecycle ==================== */

type ComponentRuntime = {
  el: HTMLElement;
  // biome-ignore lint/suspicious/noConfusingVoidType: void is appropriate here for functions that may or may not return cleanup
  onMount: (() => CleanupFn | void)[];
  onUnmount: CleanupFn[];
  onUpdated: (() => void)[];
  cleanups: CleanupFn[];
};

const runtimeStack: ComponentRuntime[] = [];

const currentRuntime = (): ComponentRuntime => {
  const rt = runtimeStack[runtimeStack.length - 1];
  if (!rt) throw new Error('[craftit] lifecycle/prop/ref called outside of define()');
  return rt;
};

// biome-ignore lint/suspicious/noConfusingVoidType: void is appropriate here for functions that may or may not return cleanup
export const onMount = (fn: () => CleanupFn | void): void => {
  currentRuntime().onMount.push(fn);
};

export const onUnmount = (fn: CleanupFn): void => {
  currentRuntime().onUnmount.push(fn);
};

export const onUpdated = (fn: () => void): void => {
  currentRuntime().onUpdated.push(fn);
};

export const onCleanup = (fn: CleanupFn): void => {
  currentRuntime().cleanups.push(fn);
};

/* ==================== Context (provide/inject) ==================== */

const contextKey = Symbol('craftit.context');

export type InjectionKey<T> = symbol & {
  readonly __craftit_injection_key?: T;
};

interface ContextHost extends HTMLElement {
  [contextKey]?: Map<InjectionKey<unknown> | string | symbol, unknown>;
}

export const provide = <T>(key: InjectionKey<T> | string | symbol, value: T): void => {
  const rt = currentRuntime();
  const el = rt.el as ContextHost;
  if (!el[contextKey]) el[contextKey] = new Map();
  el[contextKey]!.set(key, value);
};

export function inject<T>(key: InjectionKey<T> | string | symbol): T | undefined;
export function inject<T>(key: InjectionKey<T> | string | symbol, fallback: T): T;
export function inject<T>(key: InjectionKey<T> | string | symbol, fallback?: T): T | undefined {
  const rt = currentRuntime();
  let node: Node | null = rt.el;

  while (node) {
    if (node instanceof HTMLElement) {
      const host = node as ContextHost;
      if (host[contextKey]?.has(key)) {
        return host[contextKey]!.get(key) as T | undefined;
      }
    }
    const rootNode: Node = node.getRootNode() as Node;
    const parentElement: HTMLElement | null = (node as HTMLElement).parentElement;
    const hostElement: Element | null = rootNode instanceof ShadowRoot ? rootNode.host : null;
    node = parentElement ?? hostElement ?? null;
  }

  return fallback;
}

/* ==================== Props / Attributes ==================== */

const propsKey = Symbol('craftit.props');

type PropOptions<T> = {
  parse?: (value: string | null) => T;
  reflect?: boolean;
};

type PropMeta<T = unknown> = {
  name: string;
  signal: Signal<T>;
  parse?: (value: string | null) => T;
  reflect: boolean;
};

interface PropHost extends HTMLElement {
  [propsKey]?: Map<string, PropMeta>;
}

export const prop = <T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const rt = currentRuntime();
  const el = rt.el as PropHost;
  if (!el[propsKey]) el[propsKey] = new Map();

  const parse = options?.parse ?? ((v: string | null): T => (v == null ? defaultValue : (v as unknown as T)));

  // Initialize with default value. The actual attribute value will be read in connectedCallback.
  const s = signal<T>(defaultValue);

  el[propsKey]!.set(name, {
    name,
    parse: parse as (value: string | null) => unknown,
    reflect: options?.reflect ?? false,
    signal: s as Signal<unknown>,
  });

  // Define property setter/getter to intercept property assignments
  Object.defineProperty(el, name, {
    configurable: true,
    enumerable: true,
    get() {
      return s.value;
    },
    set(value: T) {
      console.log(`[craftit:prop] Setting property "${name}" to:`, value);
      s.value = value;
    },
  });

  if (options?.reflect) {
    const stop = effect(() => {
      const v = s.value;
      if (v == null || v === false) el.removeAttribute(name);
      else el.setAttribute(name, v === true ? '' : String(v));
    });
    rt.cleanups.push(stop);
  }

  return s;
};

/* ==================== define(tag, setup) ==================== */

export type SetupResult =
  | string
  | HTMLResult
  | {
      template: string | HTMLResult;
      styles?: (string | CSSStyleSheet)[];
    };

const loadStylesheet = async (style: string | CSSStyleSheet): Promise<CSSStyleSheet> => {
  if (style instanceof CSSStyleSheet) return style;
  const sheet = new CSSStyleSheet();
  await sheet.replace(style);
  return sheet;
};

export const define = (name: string, setup: () => SetupResult): void => {
  if (customElements.get(name)) {
    console.warn(`[craftit] Element "${name}" already defined`);
    return;
  }

  class CraftitElement extends HTMLElement implements PropHost, ContextHost {
    shadow: ShadowRoot;
    [propsKey]?: Map<string, PropMeta>;
    [contextKey]?: Map<InjectionKey<unknown> | string | symbol, unknown>;

    private runtime: ComponentRuntime;
    private _template: string | HTMLResult | null = null;
    private _styles: (string | CSSStyleSheet)[] | undefined;
    private _attrObserver: MutationObserver | null = null;

    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: 'open' });
      this.runtime = {
        cleanups: [],
        el: this,
        onMount: [],
        onUnmount: [],
        onUpdated: [],
      };

      runtimeStack.push(this.runtime);
      let res: SetupResult;
      try {
        res = setup();
      } finally {
        runtimeStack.pop();
      }

      if (typeof res === 'string') {
        this._template = res;
      } else if ('__html' in res) {
        this._template = res;
      } else {
        this._template = res.template;
        this._styles = res.styles;
      }
    }

    connectedCallback(): void {
      // Setup mutation observer for attribute changes
      this._attrObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName) {
            const oldValue = mutation.oldValue;
            const newValue = this.getAttribute(mutation.attributeName);
            this.handleAttributeChange(mutation.attributeName, oldValue, newValue);
          }
        }
      });

      this._attrObserver.observe(this, {
        attributeOldValue: true,
        attributes: true,
      });

      // Initialize props with current attribute values
      if (this[propsKey]) {
        for (const [attrName, meta] of this[propsKey]) {
          // Only update from attribute if it exists (don't overwrite property-set values)
          if (this.hasAttribute(attrName)) {
            const attrValue = this.getAttribute(attrName);
            const parser = meta.parse ?? ((v: string | null) => v);
            meta.signal.value = parser(attrValue);
          }
        }
      }

      this.init();
    }

    private handleAttributeChange(name: string, oldValue: string | null, newValue: string | null): void {
      if (oldValue === newValue) return;
      const props = this[propsKey];
      if (!props) return;
      const meta = props.get(name);
      if (!meta) return;
      const parser = meta.parse ?? ((v: string | null) => v);
      meta.signal.value = parser(newValue);
    }

    private async init() {
      if (this._styles?.length) {
        const sheets = await Promise.all(this._styles.map(loadStylesheet));
        this.shadow.adoptedStyleSheets = sheets;
      }
      if (this._template) this.render(this._template);

      // run onMount hooks (with runtime context)
      runtimeStack.push(this.runtime);
      try {
        for (const fn of this.runtime.onMount) {
          const cleanup = fn();
          if (typeof cleanup === 'function') this.runtime.cleanups.push(cleanup);
        }
      } finally {
        runtimeStack.pop();
      }
      this.runtime.onMount = [];

      // Run onUpdated after mount to catch any signal changes from onMount
      for (const fn of this.runtime.onUpdated) fn();
    }

    private render(tpl: string | HTMLResult) {
      const htmlResult: HTMLResult =
        typeof tpl === 'string'
          ? {
              __bindings: [],
              __html: tpl,
              toString() {
                return this.__html;
              },
            }
          : tpl;

      this.shadow.innerHTML = '';
      const frag = parseHTML(htmlResult.__html);
      this.shadow.appendChild(frag);

      this.applyBindings(htmlResult.__bindings);

      for (const fn of this.runtime.onUpdated) fn();
    }

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Binding application requires iterating through multiple binding types
    private applyBindings(bindings: Binding[]) {
      if (!bindings.length) return;
      const root = this.shadow;

      for (const b of bindings) {
        if (b.type === 'text') {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
          let found: Comment | null = null;
          while (walker.nextNode()) {
            const c = walker.currentNode as Comment;
            if (c.nodeValue === b.marker) {
              found = c;
              break;
            }
          }
          if (!found) continue;
          const textNode = document.createTextNode('');
          found.replaceWith(textNode);
          const stop = effect(() => {
            textNode.textContent = String(b.signal.value);
          });
          this.runtime.cleanups.push(stop);
        } else if (b.type === 'html') {
          const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
          let found: Comment | null = null;
          while (walker.nextNode()) {
            const c = walker.currentNode as Comment;
            if (c.nodeValue === b.marker) {
              found = c;
              break;
            }
          }
          if (!found) continue;

          // Create a marker comment to track position
          const marker = document.createComment('html-binding');
          found.replaceWith(marker);

          let currentCleanups: CleanupFn[] = [];

          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTML binding requires handling all binding types (text, prop, event, attr, ref)
          const stop = effect(() => {
            // Clean up previous bindings
            for (const cleanup of currentCleanups) cleanup();
            currentCleanups = [];

            const { html, bindings } = b.signal.value;
            console.log('[craftit:html-binding] Applying HTML with bindings:', bindings.length, bindings);
            const frag = parseHTML(html);

            // Remove all nodes between marker and next sibling
            let node = marker.nextSibling;
            while (node) {
              const next = node.nextSibling;
              if (node.nodeType === Node.COMMENT_NODE && (node as Comment).nodeValue === 'html-binding-end') {
                break;
              }
              node.remove();
              node = next;
            }

            // Insert new content after marker
            marker.after(frag);

            // Apply bindings to the newly inserted content
            // We need to search within the fragment we just inserted
            const container = marker.parentElement || root;
            console.log('[craftit:html-binding] Applying bindings to container:', container);
            for (const binding of bindings) {
              if (binding.type === 'text') {
                const textWalker = document.createTreeWalker(container, NodeFilter.SHOW_COMMENT);
                let textFound: Comment | null = null;
                while (textWalker.nextNode()) {
                  const c = textWalker.currentNode as Comment;
                  if (c.nodeValue === binding.marker) {
                    textFound = c;
                    break;
                  }
                }
                if (!textFound) continue;
                const textNode = document.createTextNode('');
                textFound.replaceWith(textNode);
                const textStop = effect(() => {
                  textNode.textContent = String(binding.signal.value);
                });
                currentCleanups.push(textStop);
              } else if (binding.type === 'prop') {
                const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);
                console.log('[craftit:html-binding] Prop binding:', binding.marker, binding.name, 'element:', el);
                if (!el) continue;
                el.removeAttribute(binding.marker);
                if (binding.signal) {
                  const propStop = effect(() => {
                    const val = binding.signal!.value;
                    console.log('[craftit:html-binding] Setting prop', binding.name, 'to:', val, 'on:', el);
                    (el as unknown as Record<string, unknown>)[binding.name] = val;
                  });
                  currentCleanups.push(propStop);
                } else {
                  console.log(
                    '[craftit:html-binding] Setting static prop',
                    binding.name,
                    'to:',
                    binding.value,
                    'on:',
                    el,
                  );
                  (el as unknown as Record<string, unknown>)[binding.name] = binding.value;
                }
              } else if (binding.type === 'event') {
                const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);
                console.log('[craftit:html-binding] Event binding:', binding.marker, binding.name, 'element:', el);
                if (!el) continue;
                el.removeAttribute(binding.marker);
                el.addEventListener(binding.name, binding.handler);
                currentCleanups.push(() => el.removeEventListener(binding.name, binding.handler));
              } else if (binding.type === 'attr') {
                const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);
                if (!el) continue;
                el.removeAttribute(binding.marker);
                if (binding.signal) {
                  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Attribute binding requires checking mode and value type
                  const attrStop = effect(() => {
                    const v = binding.signal!.value;
                    if (binding.mode === 'bool') {
                      if (v) el.setAttribute(binding.name, '');
                      else el.removeAttribute(binding.name);
                    } else {
                      if (v == null || v === false) el.removeAttribute(binding.name);
                      else el.setAttribute(binding.name, String(v));
                    }
                  });
                  currentCleanups.push(attrStop);
                } else {
                  const v = binding.value;
                  if (binding.mode === 'bool') {
                    if (v) el.setAttribute(binding.name, '');
                    else el.removeAttribute(binding.name);
                  } else {
                    if (v == null || v === false) el.removeAttribute(binding.name);
                    else el.setAttribute(binding.name, String(v));
                  }
                }
              } else if (binding.type === 'ref') {
                const el = container.querySelector<Element>(`[${binding.marker}]`);
                if (!el) continue;
                el.removeAttribute(binding.marker);
                binding.ref.value = el as never;
              }
            }
          });
          this.runtime.cleanups.push(stop);
          this.runtime.cleanups.push(() => {
            for (const cleanup of currentCleanups) cleanup();
          });
        } else if (b.type === 'portal') {
          // Portal binding - renders content to a different target element
          const targetEl = typeof b.target === 'string' ? document.querySelector(b.target) : (b.target as HTMLElement);
          if (!targetEl) continue;

          const stop = effect(() => {
            const content = b.signal.value;

            // Clean up any previous portal content
            const existing = targetEl.querySelector('[data-portal]');
            if (existing) {
              existing.remove();
            }

            // If content is empty, just remove existing portal
            if (!content || content.trim() === '') {
              return;
            }

            // Create a container for this portal content
            const container = document.createElement('div');
            container.setAttribute('data-portal', 'true');
            container.innerHTML = content;

            // Append the portal content
            targetEl.appendChild(container);
          });

          this.runtime.cleanups.push(stop);
          // Also clean up portal content when component unmounts
          this.runtime.cleanups.push(() => {
            const existing = targetEl.querySelector('[data-portal]');
            if (existing) {
              existing.remove();
            }
          });
        } else if (b.type === 'attr') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);
          if (!el) continue;
          el.removeAttribute(b.marker);
          if (b.signal) {
            // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Attribute binding requires conditional logic for bool vs attr mode
            const stop = effect(() => {
              const v = b.signal!.value;
              if (b.mode === 'bool') {
                if (v) el.setAttribute(b.name, '');
                else el.removeAttribute(b.name);
              } else {
                if (v == null || v === false) el.removeAttribute(b.name);
                else el.setAttribute(b.name, String(v));
              }
            });
            this.runtime.cleanups.push(stop);
          } else {
            const v = b.value;
            if (b.mode === 'bool') {
              if (v) el.setAttribute(b.name, '');
              else el.removeAttribute(b.name);
            } else {
              if (v == null || v === false) el.removeAttribute(b.name);
              else el.setAttribute(b.name, String(v));
            }
          }
        } else if (b.type === 'prop') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);
          if (!el) continue;
          el.removeAttribute(b.marker);
          if (b.signal) {
            const stop = effect(() => {
              (el as unknown as Record<string, unknown>)[b.name] = b.signal!.value;
            });
            this.runtime.cleanups.push(stop);
          } else {
            (el as unknown as Record<string, unknown>)[b.name] = b.value;
          }
        } else if (b.type === 'event') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);
          if (!el) continue;
          el.removeAttribute(b.marker);

          const modifiers = b.modifiers || [];
          const options: AddEventListenerOptions = {
            capture: modifiers.includes('capture'),
            once: modifiers.includes('once'),
            passive: modifiers.includes('passive'),
          };

          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Event handler needs to check multiple modifiers
          const handler = (e: Event) => {
            // Handle event modifiers
            if (modifiers.includes('prevent')) e.preventDefault();
            if (modifiers.includes('stop')) e.stopPropagation();
            if (modifiers.includes('self') && e.target !== el) return;

            // Keyboard modifiers
            if (
              modifiers.some((m) =>
                ['enter', 'tab', 'delete', 'esc', 'space', 'up', 'down', 'left', 'right'].includes(m),
              )
            ) {
              const keyEvent = e as KeyboardEvent;
              const keyMap: Record<string, string> = {
                delete: 'Delete',
                down: 'ArrowDown',
                enter: 'Enter',
                esc: 'Escape',
                left: 'ArrowLeft',
                right: 'ArrowRight',
                space: ' ',
                tab: 'Tab',
                up: 'ArrowUp',
              };
              const expectedKey = modifiers.find((m) => keyMap[m]);
              if (expectedKey && keyEvent.key !== keyMap[expectedKey]) return;
            }

            b.handler(e);
          };

          el.addEventListener(b.name, handler, options);
          this.runtime.cleanups.push(() => el.removeEventListener(b.name, handler, options));
        } else if (b.type === 'ref') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);
          if (!el) continue;
          el.removeAttribute(b.marker);
          b.ref.value = el;
          this.runtime.cleanups.push(() => {
            b.ref.value = null;
          });
        }
      }
    }

    disconnectedCallback(): void {
      if (this._attrObserver) {
        this._attrObserver.disconnect();
        this._attrObserver = null;
      }
      for (const fn of this.runtime.cleanups) fn();
      for (const fn of this.runtime.onUnmount) fn();
      this.runtime.cleanups = [];
      this.runtime.onUnmount = [];
    }
  }

  customElements.define(name, CraftitElement);
};

/* ==================== Error Boundary / Lazy ==================== */

type ErrorBoundaryOptions = {
  fallback: (error: Error) => string | HTMLResult;
  onError?: (error: Error) => void;
};

export const errorBoundary = (
  component: () => string | HTMLResult,
  options: ErrorBoundaryOptions,
): string | HTMLResult => {
  try {
    return component();
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    options.onError?.(error);
    return options.fallback(error);
  }
};

let globalErrorHandler: ((error: Error) => void) | null = null;

export const setGlobalErrorHandler = (handler: (error: Error) => void): void => {
  globalErrorHandler = handler;
};

export const createErrorBoundary = (
  component: () => string | HTMLResult,
  options: ErrorBoundaryOptions,
): (() => string | HTMLResult) => {
  return () => {
    try {
      return component();
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      options.onError?.(error);
      globalErrorHandler?.(error);
      return options.fallback(error);
    }
  };
};

type LazyOptions = {
  fallback?: () => string | HTMLResult;
};

export const lazy = <T extends { default: () => string | HTMLResult }>(
  factory: () => Promise<T>,
  options?: LazyOptions,
): (() => string | HTMLResult) => {
  let loaded: (() => string | HTMLResult) | null = null;
  let loading = false;

  return () => {
    if (loaded) return loaded();
    if (!loading) {
      loading = true;
      factory()
        .then((mod) => {
          loaded = mod.default;
        })
        .catch((err) => {
          console.error('[craftit] lazy component load failed', err);
        });
    }
    return options?.fallback ? options.fallback() : '';
  };
};

/* ==================== Testing Utilities ==================== */

export const mount = async <T extends HTMLElement>(
  tag: string,
): Promise<{
  element: T;
  query: <E extends Element = Element>(selector: string) => E | null;
}> => {
  const el = document.createElement(tag) as T;
  document.body.appendChild(el);
  await Promise.resolve(); // allow microtasks / initial render
  return {
    element: el,
    query<E extends Element = Element>(selector: string): E | null {
      const shadow = (el as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot;
      return (shadow?.querySelector(selector) ?? document.querySelector(selector)) as E | null;
    },
  };
};

export const fireEvent = {
  click: (el: Element) => (el as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true })),
  input: (el: Element, value?: string) => {
    const input = el as HTMLInputElement;
    if (value != null) input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },
};

export const waitFor = async (fn: () => void, timeout = 1000, interval = 16): Promise<void> => {
  const start = performance.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      fn();
      return;
    } catch {
      if (performance.now() - start > timeout) throw new Error('waitFor timeout');
      await new Promise((r) => setTimeout(r, interval));
    }
  }
};
