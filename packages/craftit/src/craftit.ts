/** @vielzeug/craftit
 * Monolithic, functional, signals-based web component utility.
 */

/* ==================== Signals Core ==================== */

export type CleanupFn = () => void;
// biome-ignore lint/suspicious/noConfusingVoidType: void is appropriate here for functions that may or may not return cleanup
export type EffectFn = () => CleanupFn | void;

let currentEffect: EffectFn | null = null;
let isBatching = false;
const pendingEffects = new Set<EffectFn>();

export class Signal<T> {
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

  #subscribers = new Set<EffectFn>();

  #value: T;

  constructor(initial: T) {
    this.#value = initial;
  }

  // Helper method for arrays - returns a computed signal with mapped values
  map<U>(fn: T extends readonly unknown[] ? (item: T[number], index: number) => U : never): Signal<U[]> {
    return computed(() => {
      const arr = this.value as unknown as unknown[];

      return arr.map(fn as (item: unknown, index: number) => U);
    });
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
    if (typeof cleanup === 'function') cleanup();

    try {
      currentEffect = runner;

      const result = fn();

      cleanup = typeof result === 'function' ? result : undefined;
    } finally {
      currentEffect = null;
    }

    return cleanup;
  };

  runner();

  return () => {
    if (typeof cleanup === 'function') cleanup();
  };
};

export const untrack = <T>(fn: () => T): T => {
  const prev = currentEffect;

  currentEffect = null;

  try {
    return fn();
  } finally {
    currentEffect = prev;
  }
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
  cb: (
    values: {
      [K in keyof T]: T[K] extends Signal<infer V> ? V : never;
    },
  ) => void,
  options?: WatchOptions,
): CleanupFn;
export function watch<T>(
  source: Signal<T> | Signal<unknown>[],
  cb: ((value: T, prev: T) => void) | ((values: unknown[]) => void),
  options?: WatchOptions,
): CleanupFn {
  if (Array.isArray(source)) {
    const sources = source as Signal<unknown>[];
    let prevValues = sources.map((s) => s.peek());

    if (options?.immediate) {
      (cb as (values: unknown[]) => void)(prevValues);
    }

    return effect(() => {
      const nextValues = sources.map((s) => s.value);

      if (!nextValues.every((v, i) => Object.is(v, prevValues[i]))) {
        (cb as (values: unknown[]) => void)(nextValues);
        prevValues = nextValues;
      }
    });
  }

  let prev = source.peek();

  if (options?.immediate) {
    (cb as (value: T, prev: T) => void)(prev, prev);
  }

  return effect(() => {
    const next = source.value;

    if (!Object.is(prev, next)) {
      (cb as (value: T, prev: T) => void)(next, prev);
      prev = next;
    }
  });
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

/* === Binding helpers (new) === */

const findCommentMarker = (root: Node, marker: string): Comment | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

  while (walker.nextNode()) {
    const c = walker.currentNode as Comment;

    if (c.nodeValue === marker) return c;
  }

  return null;
};

/* ==================== Template & Bindings ==================== */

type TextBinding = { marker: string; signal: Signal<unknown>; type: 'text' };
type AttrBinding = {
  marker: string;
  mode: 'bool' | 'attr';
  name: string;
  signal?: Signal<unknown>;
  type: 'attr';
  value?: unknown;
};
type PropBinding = {
  marker: string;
  name: string;
  signal?: Signal<unknown>;
  type: 'prop';
  value?: unknown;
};
type EventBinding = {
  handler: (e: Event) => void;
  marker: string;
  modifiers?: string[];
  name: string;
  type: 'event';
};
type RefBinding = {
  marker: string;
  ref: Ref<Element>;
  type: 'ref';
};
type HtmlBinding = {
  marker: string;
  signal: Signal<{ bindings: Binding[]; html: string }>;
  type: 'html';
};
type PortalBinding = {
  marker: string;
  signal: Signal<string>;
  target: string | HTMLElement;
  type: 'portal';
};

export type Binding = TextBinding | AttrBinding | PropBinding | EventBinding | RefBinding | HtmlBinding | PortalBinding;

// Directive types for when, each, show, etc.
export type WhenDirective = {
  condition: unknown;
  else?: () => string | HTMLResult;
  then: () => string | HTMLResult;
  type: 'when';
};

export type EachDirective<T = unknown> = {
  empty?: () => string | HTMLResult;
  items: T[];
  keyFn: (item: T) => string | number;
  template: (item: T, index: number) => string | HTMLResult;
  type: 'each';
};

export type ShowDirective = {
  condition: unknown;
  template: string | HTMLResult;
  type: 'show';
};

export type Directive = WhenDirective | EachDirective | ShowDirective;

export type HTMLResult = {
  __bindings: Binding[];
  __html: string;
  toString(): string;
};

/* ========== ref() for element references ========== */

export interface Ref<T extends Element | null> {
  value: T | null;
}

export const ref = <T extends Element>(): Ref<T> => ({ value: null });

/* ========== Binding helpers for DOM (new) ========== */

const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: (fn: CleanupFn) => void) => {
  el.removeAttribute(binding.marker);

  const update = (v: unknown) => {
    if (binding.mode === 'bool') {
      if (v) el.setAttribute(binding.name, '');
      else el.removeAttribute(binding.name);
    } else {
      if (v == null || v === false) el.removeAttribute(binding.name);
      else el.setAttribute(binding.name, String(v));
    }
  };

  if (binding.signal) {
    const stop = effect(() => update(binding.signal!.value));

    registerCleanup(stop);
  } else {
    update(binding.value);
  }
};

const applyPropBinding = (el: HTMLElement, binding: PropBinding, registerCleanup: (fn: CleanupFn) => void) => {
  el.removeAttribute(binding.marker);

  const setVal = (v: unknown) => {
    // Small form-friendly special-cases
    if (binding.name === 'value') {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = v as string;
        return;
      }
    }
    if (binding.name === 'checked' && el instanceof HTMLInputElement) {
      el.checked = Boolean(v);
      return;
    }

    (el as unknown as Record<string, unknown>)[binding.name] = v;
  };

  if (binding.signal) {
    const stop = effect(() => setVal(binding.signal!.value));

    registerCleanup(stop);
  } else {
    setVal(binding.value);
  }
};

const applyEventBinding = (
  el: HTMLElement,
  binding: EventBinding,
  registerCleanup: (fn: CleanupFn) => void,
  withModifiers = true,
) => {
  el.removeAttribute(binding.marker);

  if (!withModifiers || !binding.modifiers?.length) {
    el.addEventListener(binding.name, binding.handler);
    registerCleanup(() => el.removeEventListener(binding.name, binding.handler));

    return;
  }

  const modifiers = binding.modifiers || [];
  const options: AddEventListenerOptions = {
    capture: modifiers.includes('capture'),
    once: modifiers.includes('once'),
    passive: modifiers.includes('passive'),
  };

  const handler = (e: Event) => {
    if (modifiers.includes('prevent')) e.preventDefault();

    if (modifiers.includes('stop')) e.stopPropagation();

    if (modifiers.includes('self') && e.target !== el) return;

    if (modifiers.some((m) => ['enter', 'tab', 'delete', 'esc', 'space', 'up', 'down', 'left', 'right'].includes(m))) {
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

    binding.handler(e);
  };

  el.addEventListener(binding.name, handler, options);
  registerCleanup(() => el.removeEventListener(binding.name, handler, options));
};

/* ========== html tagged template ========== */

type HtmlSignalWrapper = {
  __htmlSignal: Signal<{ bindings: Binding[]; html: string }>;
};

const isHtmlResult = (value: unknown): value is HTMLResult =>
  !!value && typeof value === 'object' && '__html' in value && '__bindings' in value;

const toHtmlSignalFromSignalArray = (valueSignal: Signal<unknown[]>): Signal<{ bindings: Binding[]; html: string }> => {
  const out = signal<{ bindings: Binding[]; html: string }>({
    bindings: [],
    html: '',
  });

  effect(() => {
    const arr = valueSignal.value;
    let html = '';
    const bs: Binding[] = [];

    for (const item of arr) {
      if (isHtmlResult(item)) {
        html += item.__html;
        bs.push(...item.__bindings);
      } else {
        html += String(item ?? '');
      }
    }

    if (html !== out.value.html || bs.length !== out.value.bindings.length) {
      out.value = { bindings: bs, html };
    }
  });

  return out;
};

const applyDisplayWrapper = (condition: boolean, tpl: string | HTMLResult) => {
  const content = typeof tpl === 'string' ? tpl : tpl.__html;

  const tagMatch = content.match(/^<([a-z][-a-z0-9]*)([\s>])/i);

  if (tagMatch) {
    const tagName = tagMatch[1];
    const styleAttrMatch = content.match(/^<[a-z][-a-z0-9]*[^>]*\s*style\s*=\s*["']([^"']*)["']/i);

    if (styleAttrMatch) {
      const existingStyle = styleAttrMatch[1];
      const newStyle = `display: ${condition ? '' : 'none'}; ${existingStyle}`;

      return content.replace(/style\s*=\s*["'][^"']*["']/i, `style="${newStyle}"`);
    }

    return content.replace(
      new RegExp(`^<${tagName}([\\s>])`, 'i'),
      `<${tagName} style="display: ${condition ? '' : 'none'}"$1`,
    );
  }

  return `<span style="display: ${condition ? '' : 'none'}">${content}</span>`;
};

export const html = Object.assign(
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: HTML template parsing requires complex branching logic
  (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult | string => {
    let result = '';
    const bindings: Binding[] = [];
    let markerIndex = 0;

    const resolveDirectiveValue = (value: unknown, depth = 0): string => {
      if (typeof value === 'string') return value;

      if (value == null) return '';

      if (typeof value === 'object' && 'type' in value) {
        const directive = value as Directive;

        if (directive.type === 'each') {
          const eachDir = directive as EachDirective;

          if (!eachDir.items || !eachDir.items.length) {
            return eachDir.empty ? resolveDirectiveValue(eachDir.empty(), depth + 1) : '';
          }

          const htmlParts: string[] = [];

          for (let i = 0; i < eachDir.items.length; i++) {
            const res = eachDir.template(eachDir.items[i], i);

            if (typeof res === 'string') {
              htmlParts.push(res);
            } else {
              htmlParts.push(res.__html);
              bindings.push(...res.__bindings);
            }
          }

          return htmlParts.join('');
        }

        if (directive.type === 'when') {
          const whenDir = directive as WhenDirective;
          const condition = whenDir.condition instanceof Signal ? whenDir.condition.value : whenDir.condition;

          const res = condition ? whenDir.then() : whenDir.else ? whenDir.else() : '';

          if (typeof res === 'string') {
            return res;
          }

          if (isHtmlResult(res)) {
            bindings.push(...res.__bindings);

            return res.__html;
          }

          return '';
        }
      }

      if (isHtmlResult(value)) return value.__html;

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
      const plainAttrMatch = str.match(/\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);

      if (boolMatch) {
        const name = boolMatch[1];
        const markerAttr = `data-b${markerIndex++}`;

        result += `${str.slice(0, -boolMatch[0].length)} ${markerAttr}=""`;

        if (value instanceof Signal) {
          bindings.push({
            marker: markerAttr,
            mode: 'bool',
            name,
            signal: value as Signal<unknown>,
            type: 'attr',
          });
        } else if (typeof value === 'function') {
          // Support functions for reactive boolean attributes
          const fnSignal = computed(() => (value as () => unknown)());
          bindings.push({
            marker: markerAttr,
            mode: 'bool',
            name,
            signal: fnSignal,
            type: 'attr',
          });
        } else {
          bindings.push({
            marker: markerAttr,
            mode: 'bool',
            name,
            type: 'attr',
            value,
          });
        }

        continue;
      }

      if (attrMatch) {
        const name = attrMatch[1];
        const markerAttr = `data-a${markerIndex++}`;

        result += `${str.slice(0, -attrMatch[0].length)} ${markerAttr}=""`;

        if (value instanceof Signal) {
          bindings.push({
            marker: markerAttr,
            mode: 'attr',
            name,
            signal: value as Signal<unknown>,
            type: 'attr',
          });
        } else if (typeof value === 'function') {
          // Support functions for reactive attributes
          const fnSignal = computed(() => (value as () => unknown)());
          bindings.push({
            marker: markerAttr,
            mode: 'attr',
            name,
            signal: fnSignal,
            type: 'attr',
          });
        } else {
          bindings.push({
            marker: markerAttr,
            mode: 'attr',
            name,
            type: 'attr',
            value,
          });
        }

        continue;
      }

      if (propMatch) {
        const name = propMatch[1];
        const markerAttr = `data-p${markerIndex++}`;

        result += `${str.slice(0, -propMatch[0].length)} ${markerAttr}=""`;

        if (value instanceof Signal) {
          bindings.push({
            marker: markerAttr,
            name,
            signal: value as Signal<unknown>,
            type: 'prop',
          });
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
          bindings.push({
            marker: markerAttr,
            ref: value as Ref<Element>,
            type: 'ref',
          });
        }

        continue;
      }

      if (plainAttrMatch) {
        const name = plainAttrMatch[1];
        const markerAttr = `data-a${markerIndex++}`;

        result += `${str.slice(0, -plainAttrMatch[0].length)} ${markerAttr}=""`;

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
        } else if (typeof value === 'function') {
          // Support functions for reactive attributes
          const fnSignal = computed(() => (value as () => unknown)());
          bindings.push({
            marker: markerAttr,
            mode: isBoolAttr ? 'bool' : 'attr',
            name,
            signal: fnSignal,
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

      // Normalize "reactive HTML" variants into __htmlSignal wrapper
      let htmlWrapper: HtmlSignalWrapper | null = null;

      // html.each / html.show wrappers
      if (value && typeof value === 'object' && '__eachSignal' in value) {
        htmlWrapper = {
          __htmlSignal: (
            value as {
              __eachSignal: Signal<{ bindings: Binding[]; html: string }>;
            }
          ).__eachSignal,
        };
      } else if (value && typeof value === 'object' && '__showSignal' in value) {
        htmlWrapper = {
          __htmlSignal: (
            value as {
              __showSignal: Signal<{ bindings: Binding[]; html: string }>;
            }
          ).__showSignal,
        };
      } else if (value && typeof value === 'object' && '__portalSignal' in value) {
        const portalValue = value as {
          __portalSignal: Signal<string>;
          __portalTarget: string | HTMLElement;
        };

        bindings.push({
          marker: `__portal_${markerIndex++}`,
          signal: portalValue.__portalSignal,
          target: portalValue.__portalTarget,
          type: 'portal',
        });
        result += str; // Portal doesn't render inline
        continue;
      } else if (value && typeof value === 'object' && 'type' in value && (value as Directive).type === 'when') {
        const whenDir = value as WhenDirective;

        if (whenDir.condition instanceof Signal) {
          const whenSignal = computed(() => {
            const cond = whenDir.condition instanceof Signal ? whenDir.condition.value : whenDir.condition;
            const res = cond ? whenDir.then() : whenDir.else ? whenDir.else() : '';

            if (typeof res === 'string') {
              return { bindings: [], html: res };
            }

            return { bindings: res.__bindings, html: res.__html };
          });

          htmlWrapper = { __htmlSignal: whenSignal };
        }
      }

      // reactive function (() => ...)
      if (!htmlWrapper && typeof value === 'function') {
        // Always use HTML binding for reactive functions to handle dynamic content types
        let cached: { bindings: Binding[]; html: string } = {
          bindings: [],
          html: '',
        };
        const fnSignal = signal(cached);

        effect(() => {
          const res = (value as () => unknown)();
          let htmlStr = '';
          const resBindings: Binding[] = [];

          if (Array.isArray(res)) {
            for (const item of res) {
              if (isHtmlResult(item)) {
                htmlStr += item.__html;
                resBindings.push(...item.__bindings);
              } else {
                htmlStr += resolveDirectiveValue(item);
              }
            }
          } else if (isHtmlResult(res)) {
            htmlStr = res.__html;
            resBindings.push(...res.__bindings);
          } else {
            htmlStr = resolveDirectiveValue(res);
          }

          // Check if bindings or HTML changed before updating
          const bindingsChanged =
            resBindings.length !== cached.bindings.length || resBindings.some((b, i) => b !== cached.bindings[i]);

          if (htmlStr !== cached.html || bindingsChanged) {
            cached = { bindings: resBindings, html: htmlStr };
            fnSignal.value = cached;
          }
        });
        htmlWrapper = { __htmlSignal: fnSignal };
      }

      // Signal interpolation (possibly array => reactive html)
      if (!htmlWrapper && value instanceof Signal) {
        const signalValue = value.value;

        if (Array.isArray(signalValue)) {
          const arraySignal = toHtmlSignalFromSignalArray(value as Signal<unknown[]>);

          htmlWrapper = { __htmlSignal: arraySignal };
        }
      }

      if (htmlWrapper) {
        const marker = `__h_${markerIndex++}`;

        result += `${str}<!--${marker}-->`;
        bindings.push({
          marker,
          signal: htmlWrapper.__htmlSignal,
          type: 'html',
        });
        continue;
      }

      // Array of HTMLResults or values
      if (Array.isArray(value)) {
        let combinedHtml = '';

        for (const item of value) {
          if (isHtmlResult(item)) {
            combinedHtml += item.__html;
            bindings.push(...item.__bindings);
          } else {
            combinedHtml += resolveDirectiveValue(item);
          }
        }
        result += str + combinedHtml;
        continue;
      }

      // Regular signal -> text comment binding
      if (value instanceof Signal) {
        const marker = `__s_${markerIndex++}`;

        result += `${str}<!--${marker}-->`;
        bindings.push({
          marker,
          signal: value as Signal<unknown>,
          type: 'text',
        });
      } else {
        result += str + resolveDirectiveValue(value);
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
    choose: <T, V extends string | HTMLResult>(
      value: T | Signal<T>,
      cases: Array<[T, () => V]>,
      defaultCase?: () => V,
    ): V | (() => V) => {
      const resolveCase = (val: T): V => {
        const found = cases.find(([caseValue]) => Object.is(caseValue, val));

        if (found) {
          return found[1]();
        }

        return defaultCase ? defaultCase() : ('' as V);
      };

      // Reactive form: value is a Signal<T>
      if (value instanceof Signal) {
        return () => resolveCase(value.value);
      }

      // Static form: plain value
      return resolveCase(value as T);
    },

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
    ): EachDirective<T> | { __eachSignal: Signal<{ bindings: Binding[]; html: string }> } => {
      if (source instanceof Signal) {
        // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Signal-based list rendering requires complex logic for bindings
        const htmlSignal = computed(() => {
          const items = source.value;

          if (!items || !items.length) {
            if (!empty) return { bindings: [], html: '' };

            const emptyResult = empty();

            if (typeof emptyResult === 'string') {
              return { bindings: [], html: emptyResult };
            }

            return {
              bindings: emptyResult.__bindings,
              html: emptyResult.__html,
            };
          }

          const allHtml: string[] = [];
          const allBindings: Binding[] = [];
          let globalBindingCounter = 0;

          for (let i = 0; i < items.length; i++) {
            const res = template(items[i], i);

            if (typeof res === 'string') {
              allHtml.push(res);
            } else {
              const replacements = new Map<string, string>();
              const renumberedBindings: Binding[] = [];

              for (const binding of res.__bindings) {
                const oldMarker = binding.marker;
                const newMarker = oldMarker.replace(/(\d+)$/, () => String(globalBindingCounter++));

                replacements.set(oldMarker, newMarker);

                renumberedBindings.push({
                  ...binding,
                  marker: newMarker,
                });
              }

              let itemHtml = res.__html;
              const tempMarkers = new Map<string, string>();

              for (const [oldMarker, newMarker] of replacements) {
                const tempMarker = `__TEMP_${Math.random().toString(36).slice(2)}__`;

                tempMarkers.set(tempMarker, newMarker);
                itemHtml = itemHtml.replace(
                  new RegExp(oldMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                  tempMarker,
                );
              }

              for (const [tempMarker, newMarker] of tempMarkers) {
                itemHtml = itemHtml.replace(new RegExp(tempMarker, 'g'), newMarker);
              }

              allHtml.push(itemHtml);
              allBindings.push(...renumberedBindings);
            }
          }

          return { bindings: allBindings, html: allHtml.join('') };
        });

        return { __eachSignal: htmlSignal };
      }

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
    ):
      | string
      | {
          __portalSignal: Signal<string>;
          __portalTarget: string | HTMLElement;
        } => {
      if (template instanceof Signal) {
        return { __portalSignal: template, __portalTarget: target || 'body' };
      }

      if (target) {
        const targetEl = typeof target === 'string' ? document.querySelector(target) : target;

        if (targetEl) {
          const content = typeof template === 'string' ? template : template.__html;
          const bindings = typeof template === 'string' ? [] : template.__bindings;

          const existing = targetEl.querySelector('[data-portal]');

          if (existing) {
            existing.remove();
          }

          if (!content || content.trim() === '') {
            return '';
          }

          const container = document.createElement('div');

          container.setAttribute('data-portal', 'true');
          container.innerHTML = content;

          targetEl.appendChild(container);

          for (const binding of bindings) {
            if (binding.type === 'event') {
              const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);

              if (el) {
                applyEventBinding(el, binding, () => {}, false);
              }
            } else if (binding.type === 'attr') {
              const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);

              if (el) {
                applyAttrBinding(el, binding, () => {});
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
    ): string | { __showSignal: Signal<{ bindings: Binding[]; html: string }> } => {
      if (condition instanceof Signal) {
        const showSignal = computed(() => {
          const isShown = condition.value;
          const styledContent = applyDisplayWrapper(!!isShown, template);
          const bindings = typeof template === 'string' ? [] : template.__bindings;

          return { bindings, html: styledContent };
        });

        return { __showSignal: showSignal };
      }

      return applyDisplayWrapper(!!condition, template);
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

    until: (...values: unknown[]): (() => string | HTMLResult) => {
      // Internal signal of "current best value"
      const current = signal<unknown>(undefined);

      type Wrapped = {
        index: number;
        isPromise: boolean;
        resolved: boolean;
        value: unknown;
      };

      const wrapped: Wrapped[] = values.map((v, index) => ({
        index,
        isPromise: v instanceof Promise,
        resolved: !(v instanceof Promise),
        value: v,
      }));

      // Helper: select highest-priority (lowest index) resolved value
      const pickBestResolved = (): unknown => {
        const candidates = wrapped.filter((w) => w.resolved);

        if (!candidates.length) return undefined;

        candidates.sort((a, b) => a.index - b.index);

        return candidates[0]!.value;
      };

      // Kick off promises
      for (const w of wrapped) {
        if (!w.isPromise) continue;

        (w.value as Promise<unknown>)
          .then((res) => {
            w.value = res;
            w.resolved = true;

            const best = pickBestResolved();

            current.value = best;
          })
          .catch((err) => {
            console.error('[craftit] until() promise rejected', err);
          });
      }

      // Initialize with the best currently resolved value (usually the last non-promise fallback)
      current.value = pickBestResolved();

      // Return a reactive function, so html`` will treat it as dynamic
      return () => {
        const v = current.value;

        if (v == null) return '';

        // If it's already an HTMLResult, just return it
        if (v && typeof v === 'object' && '__html' in v && '__bindings' in v) {
          return v as HTMLResult;
        }

        // If it's a function returning string | HTMLResult, call it
        if (typeof v === 'function') {
          return (v as () => string | HTMLResult)();
        }

        // Anything else: coerce to string
        return String(v);
      };
    },

    when: (
      condition: unknown,
      arg:
        | string
        | HTMLResult
        | (() => string | HTMLResult)
        | { else?: () => string | HTMLResult; then: () => string | HTMLResult },
      fallback?: string | HTMLResult | (() => string | HTMLResult),
    ): WhenDirective | string | HTMLResult => {
      const resolve = (v: string | HTMLResult | (() => string | HTMLResult)) => (typeof v === 'function' ? v() : v);

      if (typeof arg === 'object' && arg !== null && 'then' in arg && !('__html' in arg)) {
        const { else: elseFn, then } = arg as {
          else?: () => string | HTMLResult;
          then: () => string | HTMLResult;
        };

        if (condition instanceof Signal) {
          return {
            condition,
            else: elseFn,
            then,
            type: 'when',
          };
        }

        return condition ? resolve(then) : elseFn ? resolve(elseFn) : '';
      }

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
      options?: { attribute?: string; selector?: string },
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
  cleanups: CleanupFn[];
  el: HTMLElement;
  // biome-ignore lint/suspicious/noConfusingVoidType: void is appropriate here for functions that may or may not return cleanup
  onMount: (() => CleanupFn | void)[];
  onUnmount: CleanupFn[];
  onUpdated: (() => void)[];
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

/* ==================== Form-associated custom elements ==================== */

type FormAssociatedCallbacks = {
  formAssociated?: (form: HTMLFormElement | null) => void;
  formDisabled?: (disabled: boolean) => void;
  formReset?: () => void;
  formStateRestore?: (state: unknown, mode: 'autocomplete' | 'restore') => void;
};

const formCallbacksKey = Symbol('craftit.formCallbacks');

interface FormHost extends HTMLElement {
  [formCallbacksKey]?: FormAssociatedCallbacks;
}

export const onFormAssociated = (fn: (form: HTMLFormElement | null) => void): void => {
  const rt = currentRuntime();
  const el = rt.el as FormHost;
  if (!el[formCallbacksKey]) el[formCallbacksKey] = {};
  el[formCallbacksKey]!.formAssociated = fn;
};

export const onFormDisabled = (fn: (disabled: boolean) => void): void => {
  const rt = currentRuntime();
  const el = rt.el as FormHost;
  if (!el[formCallbacksKey]) el[formCallbacksKey] = {};
  el[formCallbacksKey]!.formDisabled = fn;
};

export const onFormReset = (fn: () => void): void => {
  const rt = currentRuntime();
  const el = rt.el as FormHost;
  if (!el[formCallbacksKey]) el[formCallbacksKey] = {};
  el[formCallbacksKey]!.formReset = fn;
};

export const onFormStateRestore = (fn: (state: unknown, mode: 'autocomplete' | 'restore') => void): void => {
  const rt = currentRuntime();
  const el = rt.el as FormHost;
  if (!el[formCallbacksKey]) el[formCallbacksKey] = {};
  el[formCallbacksKey]!.formStateRestore = fn;
};

export type FormFieldOptions<T = unknown> = {
  /** Signal for the element's form value; will be reflected via internals.setFormValue */
  value: Signal<T>;
  /** Optional disabled signal; if present, will be mirrored to internals.states / form */
  disabled?: Signal<boolean>;
  /**
   * Optional function to produce the value sent to the form.
   * If not provided, `String(value)` is used.
   */
  toFormValue?: (value: T) => File | FormData | string | null;
};

export type FormFieldHandle = {
  readonly internals: ElementInternals | null;
  setValidity: ElementInternals['setValidity'];
  reportValidity: () => boolean;
};

export const field = <T = unknown>(options: FormFieldOptions<T>): FormFieldHandle => {
  const rt = currentRuntime();
  const host = rt.el as HTMLElement & {
    _internals?: ElementInternals;
    attachInternals?: () => ElementInternals;
  };

  if (!('attachInternals' in host) || typeof host.attachInternals !== 'function') {
    const noop = () => true;
    const noopSetValidity: ElementInternals['setValidity'] = () => {};
    return {
      internals: null,
      reportValidity: noop,
      setValidity: noopSetValidity,
    };
  }

  const internals = host._internals ?? host.attachInternals();
  host._internals = internals;

  const toFormValue = options.toFormValue ?? ((v: T) => (v == null ? '' : String(v)));

  const stopValue = effect(() => {
    const v = options.value.value;
    internals.setFormValue(toFormValue(v));
  });
  rt.cleanups.push(stopValue);

  if (options.disabled) {
    const stopDisabled = effect(() => {
      const isDisabled = Boolean(options.disabled!.value);
      if (isDisabled) {
        internals.states.add('disabled');
      } else {
        internals.states.delete('disabled');
      }
    });
    rt.cleanups.push(stopDisabled);
  }

  const setValidity: ElementInternals['setValidity'] = (...args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (internals.setValidity as any)(...args);
  };

  const reportValidity = () => internals.reportValidity();

  return {
    internals,
    reportValidity,
    setValidity,
  };
};

/* ==================== Props / Attributes ==================== */

const propsKey = Symbol('craftit.props');

type PropOptions<T> = {
  parse?: (value: string | null) => T;
  reflect?: boolean;
};

type PropMeta<T = unknown> = {
  name: string;
  parse?: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};

interface PropHost extends HTMLElement {
  [propsKey]?: Map<string, PropMeta>;
}

export const prop = <T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const rt = currentRuntime();
  const el = rt.el as PropHost;

  if (!el[propsKey]) el[propsKey] = new Map();

  const parse = options?.parse ?? ((v: string | null): T => (v == null ? defaultValue : (v as unknown as T)));

  const s = signal<T>(defaultValue);

  el[propsKey]!.set(name, {
    name,
    parse: parse as (value: string | null) => unknown,
    reflect: options?.reflect ?? false,
    signal: s as Signal<unknown>,
  });

  Object.defineProperty(el, name, {
    configurable: true,
    enumerable: true,
    get() {
      return s.value;
    },
    set(value: T) {
      s.value = value;
    },
  });

  // Delay reflect effect until after connectedCallback reads the initial attribute
  if (options?.reflect) {
    rt.onMount.push(() => {
      const stop = effect(() => {
        const v = s.value;

        if (v == null || v === false) el.removeAttribute(name);
        else el.setAttribute(name, v === true ? '' : String(v));
      });

      rt.cleanups.push(stop);
    });
  }

  return s;
};

/* ==================== define(tag, setup) ==================== */

export type SetupResult =
  | string
  | HTMLResult
  | {
      styles?: (string | CSSStyleSheet)[];
      template: string | HTMLResult;
    };

export type DefineOptions = {
  formAssociated?: boolean;
};

const loadStylesheet = async (style: string | CSSStyleSheet): Promise<CSSStyleSheet> => {
  if (style instanceof CSSStyleSheet) return style;

  const sheet = new CSSStyleSheet();

  await sheet.replace(style);

  return sheet;
};

export const define = (name: string, setup: () => SetupResult, options?: DefineOptions): void => {
  if (customElements.get(name)) {
    console.warn(`[craftit] Element "${name}" already defined`);

    return;
  }

  class CraftitElement extends HTMLElement implements PropHost, ContextHost, FormHost {
    static formAssociated = !!options?.formAssociated;

    [contextKey]?: Map<InjectionKey<unknown> | string | symbol, unknown>;
    [propsKey]?: Map<string, PropMeta>;
    [formCallbacksKey]?: FormAssociatedCallbacks;
    shadow: ShadowRoot;

    private _attrObserver: MutationObserver | null = null;
    private _styles: (string | CSSStyleSheet)[] | undefined;
    private _template: string | HTMLResult | null = null;
    private runtime: ComponentRuntime;

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

    // Form-associated callbacks (if formAssociated = true)
    formAssociatedCallback(form: HTMLFormElement | null): void {
      const callbacks = this[formCallbacksKey];
      callbacks?.formAssociated?.(form);
    }

    formDisabledCallback(disabled: boolean): void {
      const callbacks = this[formCallbacksKey];
      callbacks?.formDisabled?.(disabled);
    }

    formResetCallback(): void {
      const callbacks = this[formCallbacksKey];
      callbacks?.formReset?.();
    }

    formStateRestoreCallback(state: unknown, mode: 'autocomplete' | 'restore'): void {
      const callbacks = this[formCallbacksKey];
      callbacks?.formStateRestore?.(state, mode);
    }

    connectedCallback(): void {
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

      if (this[propsKey]) {
        for (const [attrName, meta] of this[propsKey]) {
          if (this.hasAttribute(attrName)) {
            const attrValue = this.getAttribute(attrName);
            const parser = meta.parse ?? ((v: string | null) => v);

            meta.signal.value = parser(attrValue);
          }
        }
      }

      this.init();
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

    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Binding application requires iterating through multiple binding types
    private applyBindings(bindings: Binding[]) {
      if (!bindings.length) return;

      const root = this.shadow;
      const registerCleanup = (fn: CleanupFn) => this.runtime.cleanups.push(fn);

      for (const b of bindings) {
        if (b.type === 'text') {
          const found = findCommentMarker(root, b.marker);

          if (!found) continue;

          const textNode = document.createTextNode('');

          found.replaceWith(textNode);

          const stop = effect(() => {
            textNode.textContent = String(b.signal.value);
          });

          registerCleanup(stop);
        } else if (b.type === 'html') {
          this.applyHtmlBinding(root, b);
        } else if (b.type === 'portal') {
          this.applyPortalBinding(b);
        } else if (b.type === 'attr') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);

          if (!el) continue;

          applyAttrBinding(el, b, registerCleanup);
        } else if (b.type === 'prop') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);

          if (!el) continue;

          applyPropBinding(el, b, registerCleanup);
        } else if (b.type === 'event') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);

          if (!el) continue;

          applyEventBinding(el, b, registerCleanup, true);
        } else if (b.type === 'ref') {
          const el = root.querySelector<HTMLElement>(`[${b.marker}]`);

          if (!el) continue;

          el.removeAttribute(b.marker);
          b.ref.value = el;
          registerCleanup(() => {
            b.ref.value = null;
          });
        }
      }
    }

    private applyHtmlBinding(root: Node, b: HtmlBinding, registerCleanup?: (fn: CleanupFn) => void) {
      const found = findCommentMarker(root, b.marker);

      if (!found) return;

      const marker = document.createComment('html-binding');

      found.replaceWith(marker);

      let currentCleanups: CleanupFn[] = [];
      const registerInnerCleanup = (fn: CleanupFn) => currentCleanups.push(fn);

      const stop = effect(() => {
        for (const cleanup of currentCleanups) cleanup();
        currentCleanups = [];

        const { bindings, html } = b.signal.value;

        untrack(() => {
          batch(() => {
            const frag = parseHTML(html);

            let node = marker.nextSibling;

            while (node) {
              const next = node.nextSibling;

              node.remove();
              node = next;
            }

            marker.after(frag);
          });

          const container = marker.parentElement || root;

          for (const binding of bindings) {
            if (binding.type === 'text') {
              const textFound = findCommentMarker(container, binding.marker);

              if (!textFound) continue;

              const textNode = document.createTextNode('');

              textFound.replaceWith(textNode);

              const textStop = effect(() => {
                textNode.textContent = String(binding.signal.value);
              });

              registerInnerCleanup(textStop);
            } else if (binding.type === 'html') {
              // Handle nested HTML bindings (e.g., reactive functions inside html.when)
              this.applyHtmlBinding(container, binding as HtmlBinding, registerInnerCleanup);
            } else if (binding.type === 'prop') {
              const el = (container as ParentNode).querySelector<HTMLElement>(`[${binding.marker}]`);

              if (!el) continue;

              applyPropBinding(el, binding, registerInnerCleanup);
            } else if (binding.type === 'event') {
              const el = (container as ParentNode).querySelector<HTMLElement>(`[${binding.marker}]`);

              if (!el) continue;

              applyEventBinding(el, binding, registerInnerCleanup, false);
            } else if (binding.type === 'attr') {
              const el = (container as ParentNode).querySelector<HTMLElement>(`[${binding.marker}]`);

              if (!el) continue;

              applyAttrBinding(el, binding, registerInnerCleanup);
            } else if (binding.type === 'ref') {
              const el = (container as ParentNode).querySelector<Element>(`[${binding.marker}]`);

              if (!el) continue;

              el.removeAttribute(binding.marker);
              binding.ref.value = el as never;
            }
          }
        });
      });

      if (registerCleanup) {
        // Nested HTML binding - register with parent
        registerCleanup(stop);
        registerCleanup(() => {
          for (const cleanup of currentCleanups) cleanup();
        });
      } else {
        // Top-level HTML binding - register with component
        this.runtime.cleanups.push(stop);
        this.runtime.cleanups.push(() => {
          for (const cleanup of currentCleanups) cleanup();
        });
      }
    }

    private applyPortalBinding(b: PortalBinding) {
      const targetEl = typeof b.target === 'string' ? document.querySelector(b.target) : (b.target as HTMLElement);

      if (!targetEl) return;

      const stop = effect(() => {
        const content = b.signal.value;

        const existing = targetEl.querySelector('[data-portal]');

        if (existing) {
          existing.remove();
        }

        if (!content || content.trim() === '') {
          return;
        }

        const container = document.createElement('div');

        container.setAttribute('data-portal', 'true');
        container.innerHTML = content;

        targetEl.appendChild(container);
      });

      this.runtime.cleanups.push(stop);
      this.runtime.cleanups.push(() => {
        const existing = targetEl.querySelector('[data-portal]');

        if (existing) {
          existing.remove();
        }
      });
    }

    private handleAttributeChange(name: string, oldValue: string | null, newValue: string | null): void {
      if (oldValue === newValue) return;

      const props = this[propsKey];

      if (!props) return;

      const meta = props.get(name);

      if (!meta) return;

      const parser = meta.parse ?? ((v: string | null) => v);
      const parsedValue = parser(newValue);

      if (!Object.is(meta.signal.peek(), parsedValue)) {
        meta.signal.value = parsedValue;
      }
    }

    private async init() {
      if (this._styles?.length) {
        const sheets = await Promise.all(this._styles.map(loadStylesheet));

        this.shadow.adoptedStyleSheets = sheets;
      }

      if (this._template) this.render(this._template);

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
