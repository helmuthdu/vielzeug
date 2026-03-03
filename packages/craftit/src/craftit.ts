/** @vielzeug/craftit
 * Monolithic, functional, signals-based web component utility.
 */
/* ========== Signals Core ========== */
export type CleanupFn = () => void;
export type EffectFn = () => CleanupFn | void;

let currentEffect: EffectFn | null = null;
let isBatching = false;
const pendingEffects = new Set<EffectFn>();

export class Signal<T> {
  get value(): T {
    if (currentEffect) this.#subscribers.add(currentEffect);

    return this.#value;
  }
  set value(next: T) {
    if (Object.is(this.#value, next)) return;

    this.#value = next;

    if (isBatching) {
      this.#subscribers.forEach((fn) => pendingEffects.add(fn));
    } else {
      this.#subscribers.forEach((fn) => fn());
    }
  }
  #subscribers = new Set<EffectFn>();
  #value: T;
  constructor(initial: T) {
    this.#value = initial;
  }
  map<U>(fn: (item: T extends readonly (infer I)[] ? I : never, index: number) => U): Signal<U[]> {
    return computed(() => {
      const arr = this.value as unknown as readonly unknown[];

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
  ({
    get value() {
      return s.value;
    },
  }) as { readonly value: T };
export const effect = (fn: EffectFn): CleanupFn => {
  let cleanup: CleanupFn | undefined;
  const runner: EffectFn = () => {
    cleanup?.();

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

  return () => cleanup?.();
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
  const s = signal<T>(untrack(compute));

  effect(() => {
    s.value = compute();
  });

  return s;
};
export const batch = (fn: () => void): void => {
  const wasBatching = isBatching;

  isBatching = true;

  try {
    fn();
  } finally {
    isBatching = wasBatching;

    if (!wasBatching) {
      const run = Array.from(pendingEffects);

      pendingEffects.clear();
      run.forEach((f) => f());
    }
  }
};
export type WatchOptions = {
  immediate?: boolean;
};
export function watch<T>(source: Signal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn;
export function watch<T extends readonly Signal<unknown>[]>(
  sources: [...T],
  cb: (values: {
    [K in keyof T]: T[K] extends Signal<infer V> ? V : never;
  }) => void,
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

/* ========== Utilities ========== */
const kebabCache = new Map<string, string>();
const toKebab = (str: string): string => {
  const cached = kebabCache.get(str);

  if (cached) return cached;

  const result = str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

  kebabCache.set(str, result);

  return result;
};
const parseHTML = (html: string): DocumentFragment => {
  const tpl = document.createElement('template');

  tpl.innerHTML = html;

  return tpl.content;
};
const findCommentMarker = (root: Node, marker: string): Comment | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

  while (walker.nextNode()) {
    const c = walker.currentNode as Comment;

    if (c.nodeValue === marker) return c;
  }

  return null;
};

/* ========== Template & Bindings Types ========== */
type TextBinding = { marker: string; signal: Signal<unknown>; type: 'text' };
type AttrBindingBase = {
  marker: string;
  name: string;
  signal?: Signal<unknown>;
  value?: unknown;
};
type AttrBinding = AttrBindingBase & {
  mode: 'bool' | 'attr';
  type: 'attr';
};
type PropBinding = AttrBindingBase & { type: 'prop' };
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
  keyed?: boolean;
  marker: string;
  signal: Signal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
  type: 'html';
};
type PortalBinding = {
  marker: string;
  signal: Signal<string>;
  target: string | HTMLElement;
  type: 'portal';
};
export type Binding = TextBinding | AttrBinding | PropBinding | EventBinding | RefBinding | HtmlBinding | PortalBinding;
export type WhenDirective = {
  condition: unknown;
  else?: () => string | HTMLResult;
  then: () => string | HTMLResult;
  type: 'when';
};
export type EachDirective<T = unknown> = {
  empty?: () => string | HTMLResult;
  items: T[];
  keyFn: (item: T, index: number) => string | number;
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
/* ========== Binding helpers (DOM) ========== */
type RegisterCleanup = (fn: CleanupFn) => void;

const applyAttrBinding = (
  el: HTMLElement,
  binding: AttrBinding,
  registerCleanup: RegisterCleanup,
  keepMarker = false,
) => {
  if (!keepMarker) el.removeAttribute(binding.marker);

  const update = (v: unknown) => {
    if (binding.mode === 'bool') {
      if (v) el.setAttribute(binding.name, '');
      else el.removeAttribute(binding.name);

      return;
    }

    if (v == null || v === false) el.removeAttribute(binding.name);
    else el.setAttribute(binding.name, String(v));
  };

  if (binding.signal) {
    const stop = effect(() => update(binding.signal!.value));

    registerCleanup(stop);
  } else {
    update(binding.value);
  }
};
const applyPropBinding = (
  el: HTMLElement,
  binding: PropBinding,
  registerCleanup: RegisterCleanup,
  keepMarker = false,
) => {
  if (!keepMarker) el.removeAttribute(binding.marker);

  const setVal = (v: unknown) => {
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
const buildEventHandlerWithModifiers = (
  el: HTMLElement,
  binding: EventBinding,
): {
  handler: (e: Event) => void;
  options?: AddEventListenerOptions;
} => {
  const modifiers = binding.modifiers ?? [];

  if (!modifiers.length) return { handler: binding.handler };

  const options: AddEventListenerOptions = {
    capture: modifiers.includes('capture'),
    once: modifiers.includes('once'),
    passive: modifiers.includes('passive'),
  };
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
  const handler = (e: Event) => {
    if (modifiers.includes('prevent')) e.preventDefault();

    if (modifiers.includes('stop')) e.stopPropagation();

    if (modifiers.includes('self') && e.target !== el) return;

    const keyModifier = modifiers.find((m) => keyMap[m]);

    if (keyModifier) {
      const ke = e as KeyboardEvent;

      if (ke.key !== keyMap[keyModifier]) return;
    }

    binding.handler(e);
  };

  return { handler, options };
};
const applyEventBinding = (
  el: HTMLElement,
  binding: EventBinding,
  registerCleanup: RegisterCleanup,
  withModifiers = true,
  keepMarker = false,
) => {
  if (!keepMarker) el.removeAttribute(binding.marker);

  if (!withModifiers || !binding.modifiers?.length) {
    el.addEventListener(binding.name, binding.handler);
    registerCleanup(() => el.removeEventListener(binding.name, binding.handler));

    return;
  }

  const { handler, options } = buildEventHandlerWithModifiers(el, binding);

  el.addEventListener(binding.name, handler, options);
  registerCleanup(() => el.removeEventListener(binding.name, handler, options));
};

/* ========== html tagged template helpers ========== */
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
const resolveCondition = (cond: unknown): boolean => {
  if (cond instanceof Signal) return !!cond.value;

  return !!cond;
};
/* Global marker index to ensure unique markers across all components */
let globalMarkerIndex = 0;

/* ========== html tagged template ========== */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity
export const html = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult | string => {
    let result = '';
    const bindings: Binding[] = [];
    const resolveDirectiveValue = (value: unknown): string => {
      if (typeof value === 'string') return value;

      if (value == null) return '';

      if (value instanceof Signal) {
        return resolveDirectiveValue(value.value);
      }

      if (typeof value === 'object' && 'type' in value) {
        const directive = value as Directive;

        if (directive.type === 'each') {
          const eachDir = directive as EachDirective;

          if (!eachDir.items || !eachDir.items.length) {
            return eachDir.empty ? resolveDirectiveValue(eachDir.empty()) : '';
          }

          const htmlParts: string[] = [];

          for (let i = 0; i < eachDir.items.length; i++) {
            const res = eachDir.template(eachDir.items[i], i);

            if (typeof res === 'string') htmlParts.push(res);
            else {
              htmlParts.push(res.__html);
              bindings.push(...res.__bindings);
            }
          }

          return htmlParts.join('');
        }

        if (directive.type === 'when') {
          const whenDir = directive as WhenDirective;
          const condition = resolveCondition(whenDir.condition);
          const res = condition ? whenDir.then() : whenDir.else ? whenDir.else() : '';

          if (typeof res === 'string') return res;

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
    const booleanAttrs = new Set([
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
    ]);
    const createAttrBinding = (
      mode: 'bool' | 'attr',
      name: string,
      markerAttr: string,
      value: unknown,
    ): AttrBinding => {
      if (value instanceof Signal) {
        return {
          marker: markerAttr,
          mode,
          name,
          signal: value as Signal<unknown>,
          type: 'attr',
        };
      }

      if (typeof value === 'function') {
        const fnSignal = computed(() => (value as () => unknown)());

        return {
          marker: markerAttr,
          mode,
          name,
          signal: fnSignal,
          type: 'attr',
        };
      }

      return { marker: markerAttr, mode, name, type: 'attr', value };
    };

    for (let i = 0; i < strings.length; i++) {
      const str = strings[i];

      if (i >= values.length) {
        result += str;
        break;
      }

      const value = values[i];
      const boolMatch = str.match(/\s+\?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);
      const attrMatch = str.match(/\s+:([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);
      const propMatch = str.match(/\s+\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);
      const eventMatch = str.match(/\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/);
      const refMatch = str.match(/\s+ref\s*=\s*["']?$/);
      const plainAttrMatch = str.match(/\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/);

      if (boolMatch) {
        const name = boolMatch[1];
        const markerAttr = `data-b${globalMarkerIndex++}`;

        result += `${str.slice(0, -boolMatch[0].length)} ${markerAttr}=""`;
        bindings.push(createAttrBinding('bool', name, markerAttr, value));
        continue;
      }

      if (attrMatch) {
        const name = attrMatch[1];
        const markerAttr = `data-a${globalMarkerIndex++}`;

        result += `${str.slice(0, -attrMatch[0].length)} ${markerAttr}=""`;
        bindings.push(createAttrBinding('attr', name, markerAttr, value));
        continue;
      }

      if (propMatch) {
        const name = propMatch[1];
        const markerAttr = `data-p${globalMarkerIndex++}`;

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
        const markerAttr = `data-e${globalMarkerIndex++}`;

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
        const markerAttr = `data-r${globalMarkerIndex++}`;

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
        const markerAttr = `data-a${globalMarkerIndex++}`;

        result += `${str.slice(0, -plainAttrMatch[0].length)} ${markerAttr}=""`;

        const mode: 'bool' | 'attr' = booleanAttrs.has(name) ? 'bool' : 'attr';

        bindings.push(createAttrBinding(mode, name, markerAttr, value));
        continue;
      }

      /*  Reactive HTML wrappers  */
      let htmlWrapper: HtmlSignalWrapper | null = null;
      let isKeyed = false;

      if (value && typeof value === 'object' && '__eachSignal' in value) {
        htmlWrapper = {
          __htmlSignal: (
            value as {
              __eachSignal: Signal<{
                bindings: Binding[];
                html: string;
                items?: Array<{ bindings: Binding[]; html: string }>;
                keys?: (string | number)[];
              }>;
            }
          ).__eachSignal,
        };
        isKeyed = true;
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
          marker: `__portal_${globalMarkerIndex++}`,
          signal: portalValue.__portalSignal,
          target: portalValue.__portalTarget,
          type: 'portal',
        });
        result += str; // no inline rendering
        continue;
      } else if (value && typeof value === 'object' && 'type' in value && (value as Directive).type === 'when') {
        const whenDir = value as WhenDirective;

        if (whenDir.condition instanceof Signal) {
          const whenSignal = computed(() => {
            const cond = resolveCondition(whenDir.condition);
            const res = cond ? whenDir.then() : whenDir.else ? whenDir.else() : '';

            if (typeof res === 'string') return { bindings: [], html: res };

            return { bindings: res.__bindings, html: res.__html };
          });

          htmlWrapper = { __htmlSignal: whenSignal };
        }
      }

      // Reactive function (() => ...)
      if (!htmlWrapper && typeof value === 'function') {
        let cached: { bindings: Binding[]; html: string } = {
          bindings: [],
          html: '',
        };
        const fnSignal = signal(cached);

        effect(() => {
          const res = (value as () => unknown)();
          let htmlStr = '';
          const resBindings: Binding[] = [];
          const pushItem = (item: unknown) => {
            if (isHtmlResult(item)) {
              htmlStr += item.__html;
              resBindings.push(...item.__bindings);
            } else {
              htmlStr += resolveDirectiveValue(item);
            }
          };

          if (Array.isArray(res)) {
            for (const item of res) pushItem(item);
          } else {
            pushItem(res);
          }

          const bindingsChanged =
            resBindings.length !== cached.bindings.length || resBindings.some((b, i) => b !== cached.bindings[i]);

          if (htmlStr !== cached.html || bindingsChanged) {
            cached = { bindings: resBindings, html: htmlStr };
            fnSignal.value = cached;
          }
        });
        htmlWrapper = { __htmlSignal: fnSignal };
      }

      // Signal interpolation with array => reactive html
      if (!htmlWrapper && value instanceof Signal) {
        const signalValue = value.value;

        if (Array.isArray(signalValue)) {
          const arraySignal = toHtmlSignalFromSignalArray(value as Signal<unknown[]>);

          htmlWrapper = { __htmlSignal: arraySignal };
        }
      }

      if (htmlWrapper) {
        const marker = `__h_${globalMarkerIndex++}`;

        result += `${str}<!--${marker}-->`;
        bindings.push({
          keyed: isKeyed,
          marker,
          signal: htmlWrapper.__htmlSignal,
          type: 'html',
        });
        continue;
      }

      // Array of values or HTMLResults
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
        const marker = `__s_${globalMarkerIndex++}`;

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
    /* --- helpers: choose, classes, each, log, portal, show, style, until, when --- */
    choose: <T, V extends string | HTMLResult>(
      value: T | Signal<T>,
      cases: Array<[T, () => V]>,
      defaultCase?: () => V,
    ): V | (() => V) => {
      const resolveCase = (val: T): V => {
        const found = cases.find(([caseValue]) => Object.is(caseValue, val));

        if (found) return found[1]();

        return defaultCase ? defaultCase() : ('' as V);
      };

      if (value instanceof Signal) {
        return () => resolveCase(value.value);
      }

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
      keyFn: (item: T, index: number) => string | number,
      template: (item: T, index: number) => string | HTMLResult,
      empty?: () => string | HTMLResult,
    ):
      | EachDirective<T>
      | {
          __eachSignal: Signal<{
            bindings: Binding[];
            html: string;
            items: Array<{ bindings: Binding[]; html: string }>;
            keys: (string | number)[];
          }>;
        } => {
      if (source instanceof Signal) {
        const htmlSignal = computed(() => {
          const items = source.value;

          if (!items || !items.length) {
            if (!empty) return { bindings: [], html: '', items: [], keys: [] };

            const emptyResult = empty();

            if (typeof emptyResult === 'string') {
              return { bindings: [], html: emptyResult, items: [], keys: [] };
            }

            return {
              bindings: emptyResult.__bindings,
              html: emptyResult.__html,
              items: [],
              keys: [],
            };
          }

          const allHtml: string[] = [];
          const allBindings: Binding[] = [];
          const allKeys: (string | number)[] = [];
          const itemsData: Array<{ bindings: Binding[]; html: string }> = [];
          let globalBindingCounter = 0;
          const renumberBindingsForItem = (res: HTMLResult): { bindings: Binding[]; html: string } => {
            const replacements = new Map<string, string>();
            const renumberedBindings: Binding[] = [];

            for (const binding of res.__bindings) {
              const oldMarker = binding.marker;
              const newMarker = oldMarker.replace(/(\d+)$/, () => String(globalBindingCounter++));

              replacements.set(oldMarker, newMarker);
              renumberedBindings.push({ ...binding, marker: newMarker });
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

            return { bindings: renumberedBindings, html: itemHtml };
          };

          for (let i = 0; i < items.length; i++) {
            const key = keyFn(items[i], i);

            allKeys.push(key);

            const res = template(items[i], i);

            if (typeof res === 'string') {
              allHtml.push(res);
              itemsData.push({ bindings: [], html: res });
            } else {
              const { bindings: itemBindings, html: itemHtml } = renumberBindingsForItem(res);

              allHtml.push(itemHtml);
              allBindings.push(...itemBindings);
              itemsData.push({ bindings: itemBindings, html: itemHtml });
            }
          }

          return {
            bindings: allBindings,
            html: allHtml.join(''),
            items: itemsData,
            keys: allKeys,
          };
        });

        return { __eachSignal: htmlSignal };
      }

      return { empty, items: source, keyFn, template, type: 'each' };
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

      if (!target) return '';

      const targetEl = typeof target === 'string' ? document.querySelector(target) : target;

      if (!targetEl) return '';

      const content = typeof template === 'string' ? template : template.__html;
      const bindings = typeof template === 'string' ? [] : template.__bindings;
      const existing = targetEl.querySelector('[data-portal]');

      if (existing) existing.remove();

      if (!content || content.trim() === '') return '';

      const container = document.createElement('div');

      container.setAttribute('data-portal', 'true');
      container.innerHTML = content;
      targetEl.appendChild(container);

      const registerCleanup: RegisterCleanup = () => {};

      for (const binding of bindings) {
        const el = container.querySelector<HTMLElement>(`[${binding.marker}]`);

        if (!el) continue;

        if (binding.type === 'event') {
          applyEventBinding(el, binding, registerCleanup, true);
        } else if (binding.type === 'attr') {
          applyAttrBinding(el, binding, registerCleanup);
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
          const isShown = resolveCondition(condition);
          const styledContent = applyDisplayWrapper(!!isShown, template);
          const bindings = typeof template === 'string' ? [] : template.__bindings;

          return { bindings, html: styledContent };
        });

        return { __showSignal: showSignal };
      }

      return applyDisplayWrapper(!!condition, template);
    },
    style: (styles: Partial<CSSStyleDeclaration> | Record<string, string | number | null | undefined>): string =>
      Object.entries(styles)
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
        .join('; '),
    until: (...values: unknown[]): (() => string | HTMLResult) => {
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
      const pickBestResolved = (): unknown => {
        const candidates = wrapped.filter((w) => w.resolved);

        if (!candidates.length) return undefined;

        candidates.sort((a, b) => a.index - b.index);

        return candidates[0]!.value;
      };

      for (const w of wrapped) {
        if (!w.isPromise) continue;

        (w.value as Promise<unknown>)
          .then((res) => {
            w.value = res;
            w.resolved = true;
            current.value = pickBestResolved();
          })
          .catch((err) => {
            console.error('[craftit] until() promise rejected', err);
          });
      }
      current.value = pickBestResolved();

      return () => {
        const v = current.value;

        if (v == null) return '';

        if (v && typeof v === 'object' && '__html' in v && '__bindings' in v) {
          return v as HTMLResult;
        }

        if (typeof v === 'function') {
          return (v as () => string | HTMLResult)();
        }

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
          return { condition, else: elseFn, then, type: 'when' };
        }

        return resolveCondition(condition) ? resolve(then) : elseFn ? resolve(elseFn) : '';
      }

      if (resolveCondition(condition)) return resolve(arg as string | HTMLResult | (() => string | HTMLResult));

      if (fallback != null) return resolve(fallback);

      return '';
    },
  },
);
/* ========== CSS Helper ========== */
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
/* ========== Component Runtime & Lifecycle ========== */
type ComponentRuntime = {
  cleanups: CleanupFn[];
  el: HTMLElement;
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

/* ========== Context (provide/inject) ========== */
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
/* ========== Form-associated custom elements ========== */
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

  el[formCallbacksKey] ??= {};
  el[formCallbacksKey]!.formAssociated = fn;
};
export const onFormDisabled = (fn: (disabled: boolean) => void): void => {
  const rt = currentRuntime();
  const el = rt.el as FormHost;

  el[formCallbacksKey] ??= {};
  el[formCallbacksKey]!.formDisabled = fn;
};
export const onFormReset = (fn: () => void): void => {
  const rt = currentRuntime();
  const el = rt.el as FormHost;

  el[formCallbacksKey] ??= {};
  el[formCallbacksKey]!.formReset = fn;
};
export const onFormStateRestore = (fn: (state: unknown, mode: 'autocomplete' | 'restore') => void): void => {
  const rt = currentRuntime();
  const el = rt.el as FormHost;

  el[formCallbacksKey] ??= {};
  el[formCallbacksKey]!.formStateRestore = fn;
};
export type FormFieldOptions<T = unknown> = {
  disabled?: Signal<boolean>;
  toFormValue?: (value: T) => File | FormData | string | null;
  value: Signal<T>;
};
export type FormFieldHandle = {
  readonly internals: ElementInternals | null;
  reportValidity: () => boolean;
  setValidity: ElementInternals['setValidity'];
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

      if (isDisabled) internals.states.add('disabled');
      else internals.states.delete('disabled');
    });

    rt.cleanups.push(stopDisabled);
  }

  const setValidity: ElementInternals['setValidity'] = (...args) => (internals.setValidity as any)(...args);
  const reportValidity = () => internals.reportValidity();

  return { internals, reportValidity, setValidity };
};

/* ========== Props / Attributes ========== */
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

  el[propsKey] ??= new Map();

  const parse = options?.parse ?? ((v: string | null): T => (v == null ? defaultValue : (v as unknown as T)));
  const s = signal<T>(defaultValue);

  el[propsKey]!.set(name, {
    name,
    parse,
    reflect: options?.reflect ?? false,
    signal: s,
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
/* ========== define(tag, setup) ========== */
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
/* Global keyed state storage for html.each */
const globalKeyedStates = new Map<string, Map<string | number, KeyedNode>>();

type KeyedNode = {
  bindings: Binding[];
  cleanups: CleanupFn[];
  html: string;
  key: string | number;
  nodes: Node[];
};
export const define = (name: string, setup: () => SetupResult, options?: DefineOptions): void => {
  if (customElements.get(name)) {
    console.warn(`[craftit] Element "${name}" already defined`);

    return;
  }

  class CraftitElement extends HTMLElement implements PropHost, ContextHost, FormHost {
    static formAssociated = !!options?.formAssociated;
    [contextKey]?: Map<InjectionKey<unknown> | string | symbol, unknown>;
    [formCallbacksKey]?: FormAssociatedCallbacks;
    [propsKey]?: Map<string, PropMeta>;
    shadow: ShadowRoot;
    private _attrObserver: MutationObserver | null = null;
    private _styles?: (string | CSSStyleSheet)[];
    private _template: string | HTMLResult | null = null;
    private appliedHtmlBindings = new Set<string>();
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

      if (typeof res === 'string' || '__html' in res) {
        this._template = res as string | HTMLResult;
      } else {
        this._template = res.template;
        this._styles = res.styles;
      }
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

            meta.signal.value = parser(attrValue) as never;
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
    formAssociatedCallback(form: HTMLFormElement | null): void {
      this[formCallbacksKey]?.formAssociated?.(form);
    }
    formDisabledCallback(disabled: boolean): void {
      this[formCallbacksKey]?.formDisabled?.(disabled);
    }
    formResetCallback(): void {
      this[formCallbacksKey]?.formReset?.();
    }
    formStateRestoreCallback(state: unknown, mode: 'autocomplete' | 'restore'): void {
      this[formCallbacksKey]?.formStateRestore?.(state, mode);
    }
    private applyBindings(bindings: Binding[]) {
      if (!bindings.length) return;

      const root = this.shadow;
      const registerCleanup: RegisterCleanup = (fn) => this.runtime.cleanups.push(fn);

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
          if (!this.appliedHtmlBindings.has(b.marker)) {
            this.appliedHtmlBindings.add(b.marker);
            this.applyHtmlBinding(root, b);
          }
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
    private applyHtmlBinding(root: Node, b: HtmlBinding, registerCleanup?: RegisterCleanup) {
      const found = findCommentMarker(root, b.marker);

      if (!found) return;

      const marker = document.createComment('html-binding');

      found.replaceWith(marker);

      let currentCleanups: CleanupFn[] = [];
      const registerInnerCleanup: RegisterCleanup = (fn) => currentCleanups.push(fn);
      const runCurrentCleanups = () => {
        currentCleanups.forEach((cleanup) => cleanup());
        currentCleanups = [];
      };
      const clearNodesAfterMarker = () => {
        let node = marker.nextSibling;

        while (node) {
          const next = node.nextSibling;

          node.parentNode?.removeChild(node);
          node = next;
        }
      };
      const createNodesFromHTML = (htmlString: string): Node[] => {
        const container = document.createElement('div');

        container.innerHTML = htmlString;

        return Array.from(container.childNodes);
      };
      const removeKeyedNode = (keyedNode: KeyedNode) => {
        keyedNode.cleanups.forEach((cleanup) => cleanup());
        keyedNode.nodes.forEach((node) => node.parentNode?.removeChild(node));
      };
      let lastDataHash: string | null = null;
      const stop = effect(() => {
        batch(() => {
          const data = b.signal.value;

          // Deduplicate: skip if data hasn't changed
          // Include items data which contains bindings with their values
          const dataHash = JSON.stringify({
            html: data.html,
            keys: data.keys,
            items: data.items?.map(item => ({
              html: item.html,
              bindings: item.bindings.map(b => ({
                type: b.type,
                name: (b as PropBinding).name,
                value: (b as PropBinding).value,
              }))
            }))
          });
          if (dataHash === lastDataHash) {
            return;
          }
          lastDataHash = dataHash;

          runCurrentCleanups();

          const { bindings, html, keys } = data;
        const keyedState = b.keyed ? (globalKeyedStates.get(b.marker) ?? new Map()) : null;

        if (b.keyed && !globalKeyedStates.has(b.marker)) {
          globalKeyedStates.set(b.marker, keyedState!);
        }

        let bindingsAlreadyApplied = false;

        untrack(() => {
          batch(() => {
            if (keyedState && keys?.length && data.items?.length === keys.length) {
              bindingsAlreadyApplied = true;

              if (keyedState.size === 0) clearNodesAfterMarker();

              const newKeyedState = new Map<string | number, KeyedNode>();

              for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const itemData = data.items[i];
                const existing = keyedState.get(key);

                const insertPoint = (() => {
                  if (i === 0) return marker.nextSibling;

                  const prevKey = keys[i - 1];
                  const prevNodes = newKeyedState.get(prevKey)?.nodes;

                  return prevNodes?.length ? prevNodes[prevNodes.length - 1].nextSibling : marker.nextSibling;
                })();
                const applyItemBindings = (nodes: Node[], itemBindings: Binding[]): CleanupFn[] => {
                  const itemCleanups: CleanupFn[] = [];
                  const itemRegisterCleanup: RegisterCleanup = (fn) => itemCleanups.push(fn);
                  const container = marker.parentElement || root;
                  const queryWithinNodes = (markerAttr: string): HTMLElement | null => {
                    for (const node of nodes) {
                      if (node instanceof HTMLElement && node.hasAttribute(markerAttr)) return node;

                      if (node instanceof Element) {
                        const found = node.querySelector<HTMLElement>(`[${markerAttr}]`);

                        if (found) return found;
                      }
                    }

                    return null;
                  };

                  for (const binding of itemBindings) {
                    const el = queryWithinNodes(binding.marker);

                    if (!el && binding.type !== 'ref') continue;

                    if (binding.type === 'prop' && el) {
                      applyPropBinding(el, binding, itemRegisterCleanup, true);
                    } else if (binding.type === 'event' && el) {
                      applyEventBinding(el, binding, itemRegisterCleanup, false, true);
                    } else if (binding.type === 'attr' && el) {
                      applyAttrBinding(el, binding, itemRegisterCleanup, true);
                    } else if (binding.type === 'ref') {
                      const refEl = el ?? (container as ParentNode).querySelector<HTMLElement>(`[${binding.marker}]`);

                      if (refEl) {
                        binding.ref.value = refEl as never;
                      }
                    }
                  }

                  return itemCleanups;
                };

                if (existing && existing.html === itemData.html) {
                  if (marker.parentNode && existing.nodes[0]) {
                    existing.nodes.forEach((node: Node) => marker.parentNode!.insertBefore(node, insertPoint));
                  }

                  existing.cleanups.forEach((cleanup: CleanupFn) => cleanup());
                  const itemCleanups = applyItemBindings(existing.nodes, itemData.bindings);

                  newKeyedState.set(key, {
                    ...existing,
                    bindings: itemData.bindings,
                    cleanups: itemCleanups,
                  });
                  continue;
                }

                if (existing) {
                  existing.cleanups.forEach((cleanup: CleanupFn) => cleanup());

                  const newNodes = createNodesFromHTML(itemData.html);

                  if (marker.parentNode) {
                    newNodes.forEach((node) => marker.parentNode!.insertBefore(node, insertPoint));
                  }

                  const itemCleanups = applyItemBindings(newNodes, itemData.bindings);

                  newKeyedState.set(key, {
                    bindings: itemData.bindings,
                    cleanups: itemCleanups,
                    html: itemData.html,
                    key,
                    nodes: newNodes,
                  });

                  // Remove old nodes AFTER inserting new ones
                  existing.nodes.forEach((node: Node) => node.parentNode?.removeChild(node));
                  continue;
                }

                // CREATE case - new item
                const newNodes = createNodesFromHTML(itemData.html);

                if (marker.parentNode) {
                  newNodes.forEach((node) => marker.parentNode!.insertBefore(node, insertPoint));
                }

                const itemCleanups = applyItemBindings(newNodes, itemData.bindings);

                newKeyedState.set(key, {
                  bindings: itemData.bindings,
                  cleanups: itemCleanups,
                  html: itemData.html,
                  key,
                  nodes: newNodes,
                });
              }
              const removedKeys = [];
              for (const [oldKey, oldNode] of keyedState) {
                if (!newKeyedState.has(oldKey)) {
                  removedKeys.push(oldKey);
                  removeKeyedNode(oldNode);
                }
              }

              if (b.keyed) globalKeyedStates.set(b.marker, newKeyedState);
            } else {
              clearNodesAfterMarker();
              marker.after(parseHTML(html));

              if (b.keyed) globalKeyedStates.set(b.marker, new Map());
            }
          });

          const container = marker.parentElement || root;

          if (!bindingsAlreadyApplied) {
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
                this.applyHtmlBinding(container, binding, registerInnerCleanup);
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
          }
        });
        }); // end batch
      }); // end effect

      if (registerCleanup) {
        registerCleanup(stop);
        registerCleanup(runCurrentCleanups);
      } else {
        this.runtime.cleanups.push(stop);
        this.runtime.cleanups.push(runCurrentCleanups);
      }
    }
    private applyPortalBinding(b: PortalBinding) {
      const targetEl = typeof b.target === 'string' ? document.querySelector(b.target) : (b.target as HTMLElement);

      if (!targetEl) return;

      const stop = effect(() => {
        const content = b.signal.value;
        const existing = targetEl.querySelector('[data-portal]');

        if (existing) existing.remove();

        if (!content || content.trim() === '') return;

        const container = document.createElement('div');

        container.setAttribute('data-portal', 'true');
        container.innerHTML = content;
        targetEl.appendChild(container);
      });

      this.runtime.cleanups.push(stop);
      this.runtime.cleanups.push(() => {
        const existing = targetEl.querySelector('[data-portal]');

        if (existing) existing.remove();
      });
    }
    private handleAttributeChange(name: string, oldValue: string | null, newValue: string | null) {
      if (oldValue === newValue) return;

      const props = this[propsKey];

      if (!props) return;

      const meta = props.get(name);

      if (!meta) return;

      const parser = meta.parse ?? ((v: string | null) => v as unknown);
      const parsedValue = parser(newValue);

      if (!Object.is(meta.signal.peek(), parsedValue)) {
        meta.signal.value = parsedValue as never;
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

/*  Error Boundary / Lazy =================== */

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
