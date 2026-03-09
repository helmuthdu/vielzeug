/** @vielzeug/craftit — Functional, signals-based web component library.
 * Signal primitives (Signal, signal, effect, computed, batch, watch, etc.)
 * are provided by @vielzeug/stateit and re-exported here for convenience.
 */

// ─── Signal primitives (re-exported from @vielzeug/stateit) ──────────────────
// Consumers of craftit do not need to also import from @vielzeug/stateit.
export {
  batch, computed, effect,
  isSignal, readonly, signal,
  toValue,
  untrack, writable, type CleanupFn, type EffectFn, type ReadonlySignal, type Signal, type WatchOptions
} from '@vielzeug/stateit';

import {
  watch as _signalWatch,
  batch,
  type CleanupFn,
  computed,
  effect,
  isSignal,
  type ReadonlySignal,
  type Signal,
  signal,
  untrack,
  type WatchOptions,
} from '@vielzeug/stateit';

// Internal iterate-and-call helper — used by component disconnectedCallback.
const runAll = (fns: Iterable<() => void>): void => {
  for (const fn of fns) fn();
};

/* ========== Watch (component-context-aware) ========== */
/**
 * Watches a Signal and calls cb with (next, prev) whenever its value changes.
 * Watches an array of Signals and calls cb (no args) whenever any of them changes.
 * When called inside a component setup function, the watcher is automatically
 * cleaned up when the component unmounts — no manual cleanup needed.
 */
export function watch<T>(source: ReadonlySignal<T>, cb: (value: T, prev: T) => void, options?: WatchOptions): CleanupFn;
export function watch(
  sources: ReadonlyArray<ReadonlySignal<unknown>>,
  cb: () => void,
  options?: WatchOptions,
): CleanupFn;
export function watch(
  source: ReadonlySignal<unknown> | ReadonlyArray<ReadonlySignal<unknown>>,
  cb: ((value: unknown, prev: unknown) => void) | (() => void),
  options?: WatchOptions,
): CleanupFn {
  if (Array.isArray(source)) {
    let initialized = false;
    let dispose!: CleanupFn;
    dispose = effect(() => {
      for (const s of source) s.value; // register all listed deps
      if (!initialized) {
        initialized = true;
        if (options?.immediate) untrack(cb as () => void);
      } else {
        untrack(cb as () => void);
        if (options?.once) dispose();
      }
    });
    if (runtimeStack.length > 0) onCleanup(dispose);
    return dispose;
  }
  const stop = _signalWatch(source as ReadonlySignal<unknown>, cb as (value: unknown, prev: unknown) => void, options);
  if (runtimeStack.length > 0) onCleanup(stop);
  return stop;
}

/* ========== Utilities ========== */
let _idCounter = 0;
/**
 * Creates a unique, stable ID string — suitable for `aria-labelledby`, `aria-describedby`,
 * and similar accessibility linkages. Call once per component instance (at setup time or inside `onMount`).
 */
export const createId = (prefix?: string): string => `${prefix ? `${prefix}-` : 'cft-'}${++_idCounter}`;

/**
 * Wraps an event handler with a guard condition. The handler is only invoked when `condition()` returns `true`.
 * Use for disabled checks, readonly guards, or any runtime condition.
 *
 * @example
 * const handleClick = guard(() => !props.disabled.value, (e) => toggle(e));
 */
export const guard =
  <E extends Event = Event>(condition: () => boolean, handler: (e: E) => void): ((e: E) => void) =>
  (e) => {
    if (condition()) handler(e);
  };

const kebabCache = new Map<string, string>();
const toKebab = (str: string): string => {
  const cached = kebabCache.get(str);
  if (cached !== undefined) return cached;
  const result = str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  kebabCache.set(str, result);
  return result;
};
// Basic HTML escaping for untrusted text
const _htmlEscapeMap: Record<string, string> = {
  "'": '&#39;',
  '"': '&quot;',
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};
export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => _htmlEscapeMap[c]!);
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
type TextBinding = { marker: string; signal: ReadonlySignal<unknown>; type: 'text' };
type AttrBindingBase = {
  marker: string;
  name: string;
  signal?: ReadonlySignal<unknown>;
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
  ref: Ref<Element> | RefCallback<Element> | RefList<Element>;
  type: 'ref';
};
type ModelBinding = {
  marker: string;
  signal: Signal<string | number | boolean>;
  type: 'model';
};
type HtmlBinding = {
  keyed?: boolean;
  marker: string;
  signal: ReadonlySignal<{
    bindings: Binding[];
    html: string;
    items?: Array<{ bindings: Binding[]; html: string }>;
    keys?: (string | number)[];
  }>;
  type: 'html';
};
export type Binding = TextBinding | AttrBinding | PropBinding | EventBinding | RefBinding | ModelBinding | HtmlBinding;
export type WhenDirective = {
  condition: unknown;
  elseBranch?: () => string | HTMLResult;
  thenBranch: () => string | HTMLResult;
  type: 'when';
};
export type EachDirective<T = unknown> = {
  empty?: () => string | HTMLResult;
  items: T[];
  keyFn: (item: T, index: number) => string | number;
  template: (item: T, index: number) => string | HTMLResult;
  type: 'each';
};
export type Directive = WhenDirective | EachDirective;
export type HTMLResult = {
  __bindings: Binding[];
  __html: string;
  toString(): string;
};
/* Ref objects and callbacks */
export interface Ref<T extends Element | null> {
  value: T | null;
}
export function ref<T extends Element>(): Ref<T> {
  return { value: null };
}

// Refs list for multiple elements
export interface RefList<T extends Element> {
  /** Live read-only array — no defensive copy; `ReadonlyArray` prevents external mutation. */
  readonly values: ReadonlyArray<T>;
  add(el: T | null): void;
  clear(): void;
}
export function refs<T extends Element>(): RefList<T> {
  const seen = new Set<T>();
  const values: T[] = [];

  return {
    add(el: T | null) {
      if (el && !seen.has(el)) {
        seen.add(el);
        values.push(el);
      }
    },
    clear() {
      values.length = 0;
      seen.clear();
    },
    get values(): ReadonlyArray<T> {
      return values;
    },
  };
}

// Ref callback support
export type RefCallback<T extends Element> = (el: T | null) => void;
/* ========== Template Engine — DOM Binding Helpers ========== */
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
      el.toggleAttribute(binding.name, Boolean(v));
      // For checkbox/radio inputs, also update the property
      if (binding.name === 'checked' && el instanceof HTMLInputElement) {
        el.checked = Boolean(v);
      }
    } else {
      if (v == null || v === false) {
        el.removeAttribute(binding.name);
      } else {
        el.setAttribute(binding.name, String(v));
      }
    }
  };

  binding.signal ? registerCleanup(effect(() => update(binding.signal!.value))) : update(binding.value!);
};
const applyPropBinding = (
  el: HTMLElement,
  binding: PropBinding,
  registerCleanup: RegisterCleanup,
  keepMarker = false,
) => {
  if (!keepMarker) el.removeAttribute(binding.marker);

  const setVal = (v: unknown) => {
    if (
      binding.name === 'value' &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)
    ) {
      el.value = v as string;
    } else if (binding.name === 'checked' && el instanceof HTMLInputElement) {
      el.checked = Boolean(v);
    } else {
      (el as unknown as Record<string, unknown>)[binding.name] = v;
    }
  };

  binding.signal ? registerCleanup(effect(() => setVal(binding.signal!.value))) : setVal(binding.value!);
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

  const modifiers = binding.modifiers;
  // Pre-compute all modifier flags once at binding time — avoids linear Array.includes on every event fire.
  const prevent = modifiers.includes('prevent');
  const stop = modifiers.includes('stop');
  const self = modifiers.includes('self');
  const km = modifiers.find((m) => keyMap[m]);
  const expectedKey = km ? keyMap[km] : null;
  const options: AddEventListenerOptions = {
    capture: modifiers.includes('capture'),
    once: modifiers.includes('once'),
    passive: modifiers.includes('passive'),
  };
  const handler = (e: Event) => {
    if (prevent) e.preventDefault();
    if (stop) e.stopPropagation();
    if (self && e.target !== el) return;
    if (expectedKey && (e as KeyboardEvent).key !== expectedKey) return;
    binding.handler(e);
  };

  el.addEventListener(binding.name, handler, options);
  registerCleanup(() => el.removeEventListener(binding.name, handler, options));
};
/* ========== Template Engine — Directives & Builder ========== */
const booleanAttrs = new Set([
  'disabled',
  'readonly',
  'required',
  'checked',
  'selected',
  'hidden',
  'multiple',
  'novalidate',
  'open',
  'autofocus',
  'autoplay',
  'controls',
  'loop',
  'muted',
]);
const hasKey = (obj: unknown, key: string): boolean => typeof obj === 'object' && !!obj && key in obj;
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

/* Marker for raw HTML content */
export type RawHTML = {
  __raw: string;
};

/* Mark content as raw HTML (bypasses escaping) */
export const rawHtml = (content: string): RawHTML => ({ __raw: content });

/** Module-level helpers for applyHtmlBinding — hoisted to avoid re-creating closures per binding. */
const htmlBindingClearAfter = (marker: Comment) => {
  while (marker.nextSibling) marker.nextSibling.remove();
};
const htmlBindingCreateNodes = (htmlString: string): Node[] => Array.from(parseHTML(htmlString).childNodes);
const htmlBindingRemoveKeyed = (keyedNode: KeyedNode) => {
  runAll(keyedNode.cleanups);
  for (const n of keyedNode.nodes) {
    n.parentNode?.removeChild(n);
  }
};
const htmlBindingInsertBefore = (marker: Comment, nodes: Node[], before: Node | null) => {
  if (marker.parentNode) {
    for (const node of nodes) marker.parentNode.insertBefore(node, before);
  }
};
const isRawHtml = (value: unknown): value is RawHTML => typeof value === 'object' && !!value && '__raw' in value;
const isHtmlResult = (value: unknown): value is HTMLResult => typeof value === 'object' && !!value && '__html' in value;
// Helper to extract HTML and bindings from string | HTMLResult
const extractHtml = (value: string | HTMLResult): { bindings: Binding[]; html: string } =>
  typeof value === 'string' ? { bindings: [], html: value } : { bindings: value.__bindings, html: value.__html };

const applyRefBinding = (
  el: HTMLElement,
  binding: RefBinding,
  registerCleanup: RegisterCleanup,
  keepMarker = false,
) => {
  if (!keepMarker) el.removeAttribute(binding.marker);

  const bindingRef = binding.ref;

  if (typeof bindingRef === 'function') {
    bindingRef(el as never);
    registerCleanup(() => bindingRef(null));
  } else if ('values' in bindingRef) {
    // RefList — no per-element cleanup; caller should call ref.clear() on unmount
    (bindingRef as RefList<Element>).add(el as never);
  } else {
    bindingRef.value = el as never;
    registerCleanup(() => {
      bindingRef.value = null;
    });
  }
};

const applyModelBinding = (
  el: HTMLElement,
  binding: ModelBinding,
  registerCleanup: RegisterCleanup,
  keepMarker = false,
) => {
  if (!keepMarker) el.removeAttribute(binding.marker);
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement)) return;

  const updateElement = () => {
    const value = binding.signal.value;

    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      el.checked = el.value === String(value);
    } else {
      (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = String(value);
    }
  };

  registerCleanup(effect(() => updateElement()));

  const eventName = el instanceof HTMLSelectElement ? 'change' : 'input';
  const handler = () => {
    if (el instanceof HTMLInputElement && el.type === 'checkbox') {
      binding.signal.value = el.checked as never;
    } else if (el instanceof HTMLInputElement && el.type === 'radio') {
      if (el.checked) binding.signal.value = el.value as never;
    } else {
      const value = (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;

      if (typeof binding.signal.peek() === 'number' && !Number.isNaN(Number(value))) {
        binding.signal.value = Number(value) as never;
      } else {
        binding.signal.value = value as never;
      }
    }
  };

  el.addEventListener(eventName, handler);
  registerCleanup(() => el.removeEventListener(eventName, handler));
};

/** Helper to apply bindings in a container - reduces duplication */
const applyBindingsInContainer = (
  container: ParentNode,
  bindings: Binding[],
  registerCleanup: RegisterCleanup,
  opts?: { eventModifiers?: boolean; onHtml?: (b: HtmlBinding) => void },
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Core binding application logic requires handling many binding types
) => {
  for (const b of bindings) {
    if (b.type === 'text') {
      const found = findCommentMarker(container, b.marker);

      if (found) {
        const textNode = document.createTextNode('');

        found.replaceWith(textNode);
        registerCleanup(
          effect(() => {
            textNode.textContent = String(b.signal.value);
          }),
        );
      }
    } else if (b.type === 'html') {
      opts?.onHtml?.(b);
    } else {
      const el = container.querySelector<HTMLElement>(`[${b.marker}]`);

      if (el) {
        if (b.type === 'attr') applyAttrBinding(el, b, registerCleanup);
        else if (b.type === 'prop') applyPropBinding(el, b, registerCleanup);
        else if (b.type === 'event') applyEventBinding(el, b, registerCleanup, opts?.eventModifiers ?? true);
        else if (b.type === 'ref') applyRefBinding(el, b, registerCleanup);
        else if (b.type === 'model') applyModelBinding(el, b, registerCleanup);
      }
    }
  }
};
const resolveCondition = (cond: unknown): boolean => !!(isSignal(cond) ? cond.value : cond);

/* Internal helper for looping - used by html.each() */
const eachHelper = <T>(
  source: T[] | Signal<T[]> | ReadonlySignal<T[]> | (() => T[]),
  keyFn: (item: T, index: number) => string | number,
  template: (item: T, index: number) => string | HTMLResult,
  empty?: () => string | HTMLResult,
) => {
  const src = typeof source === 'function' ? computed(source) : source;
  if (isSignal<T[]>(src)) {
    const htmlSignal = computed(() => {
      const items = src.value;

      if (!items.length) {
        const emptyResult = empty?.();

        return emptyResult
          ? { ...extractHtml(emptyResult), items: [], keys: [] }
          : { bindings: [], html: '', items: [], keys: [] };
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
          const newMarker = binding.marker.replace(/(\\d+)$/, () => String(globalBindingCounter++));

          replacements.set(binding.marker, newMarker);
          renumberedBindings.push({ ...binding, marker: newMarker });
        }

        // Single-pass replacement: sort keys longest-first so data-b10 is matched before data-b1,
        // preventing shorter keys from incorrectly matching inside longer ones.
        const sortedKeys = [...replacements.keys()].sort((a, b) => b.length - a.length);
        const escapedKeys = sortedKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const replaceRe = new RegExp(escapedKeys.join('|'), 'g');
        const itemHtml = res.__html.replace(replaceRe, (m) => replacements.get(m) ?? m);

        return { bindings: renumberedBindings, html: itemHtml };
      };

      for (let i = 0; i < items.length; i++) {
        allKeys.push(keyFn(items[i], i));

        const res = template(items[i], i);
        const { bindings: itemBindings, html: itemHtml } =
          typeof res === 'string' ? { bindings: [], html: res } : renumberBindingsForItem(res);

        allHtml.push(itemHtml);
        allBindings.push(...itemBindings);
        itemsData.push({ bindings: itemBindings, html: itemHtml });
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

  return { empty, items: src as T[], keyFn, template, type: 'each' };
};

/* Global marker index to ensure unique markers across all components */
let globalMarkerIndex = 0;

/** Shared toString for all HTMLResult object literals — avoids one new closure per template call */
const htmlResultToString = function (this: HTMLResult): string {
  return this.__html;
};
/** Factory for HTMLResult literals — avoids repeating the 3-field shape at every call site */
const makeHtmlResult = (html: string, bindings: Binding[] = []): HTMLResult => ({
  __bindings: bindings,
  __html: html,
  toString: htmlResultToString,
});
/** Reusable empty result — returned by conditional helpers when the falsy branch produces no content */
const EMPTY_RESULT: HTMLResult = makeHtmlResult('');

/** Marker attribute prefixes — centralised so a typo causes a TS error rather than a silent selector miss. */
const MARKER_PREFIX = {
  attr: 'a',
  bool: 'b',
  event: 'e',
  html: '__h_',
  model: 'v',
  prop: 'p',
  ref: 'r',
} as const;

/** Hoisted out of htmlTemplate so it isn't re-created as a new closure on every tag call. */
const createAttrBinding = (mode: 'bool' | 'attr', name: string, markerAttr: string, value: unknown): AttrBinding => {
  const sig = isSignal(value)
    ? (value as ReadonlySignal<unknown>)
    : typeof value === 'function'
      ? computed(value as () => unknown)
      : undefined;

  return sig
    ? { marker: markerAttr, mode, name, signal: sig, type: 'attr' }
    : { marker: markerAttr, mode, name, type: 'attr', value };
};

/* Internal template function - handles both escaping and raw modes */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Template processing requires handling many value types and directives
const htmlTemplate = (strings: TemplateStringsArray, values: unknown[], shouldEscape: boolean): HTMLResult => {
  let result = '';
  const bindings: Binding[] = [];
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Directive resolution handles many types including nested HTMLResults
  const resolveDirectiveValue = (value: unknown): string => {
    // Handle raw HTML markers
    if (isRawHtml(value)) return value.__raw;

    if (typeof value === 'string') return shouldEscape ? escapeHtml(value) : value;

    if (value == null) return '';

    if (typeof value === 'object' && 'type' in value) {
      const directive = value as Directive;

      if (directive.type === 'each') {
        const eachDir = directive as EachDirective;

        if (!eachDir.items?.length) return eachDir.empty ? resolveDirectiveValue(eachDir.empty()) : '';

        const htmlParts: string[] = [];

        for (let i = 0; i < eachDir.items.length; i++) {
          const { bindings: itemBindings, html } = extractHtml(eachDir.template(eachDir.items[i], i));

          htmlParts.push(html);
          bindings.push(...itemBindings);
        }

        return htmlParts.join('');
      }

      if (directive.type === 'when') {
        const whenDir = directive as WhenDirective;
        const res = resolveCondition(whenDir.condition) ? whenDir.thenBranch() : (whenDir.elseBranch?.() ?? '');

        if (!res) return '';

        const { bindings: whenBindings, html } = extractHtml(res);

        bindings.push(...whenBindings);

        return html;
      }
    }

    // HTMLResult is always kept as raw HTML
    if (isHtmlResult(value)) return value.__html;

    // Other values are stringified and optionally escaped
    return shouldEscape ? escapeHtml(String(value)) : String(value);
  };
  const addMarker = (str: string, match: RegExpMatchArray, prefix: string) => {
    const marker = `data-${prefix}${globalMarkerIndex++}`;

    result += `${str.slice(0, -match[0].length)} ${marker}=""`;

    return marker;
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
      bindings.push(createAttrBinding('bool', boolMatch[1], addMarker(str, boolMatch, MARKER_PREFIX.bool), value));
      continue;
    }

    if (attrMatch) {
      bindings.push(createAttrBinding('attr', attrMatch[1], addMarker(str, attrMatch, MARKER_PREFIX.attr), value));
      continue;
    }

    if (propMatch) {
      const m = addMarker(str, propMatch, MARKER_PREFIX.prop);

      bindings.push(
        isSignal(value)
          ? {
              marker: m,
              name: propMatch[1],
              signal: value as ReadonlySignal<unknown>,
              type: 'prop' as const,
            }
          : { marker: m, name: propMatch[1], type: 'prop' as const, value },
      );
      continue;
    }

    if (eventMatch) {
      const parts = eventMatch[1].split('.');
      const m = addMarker(str, eventMatch, MARKER_PREFIX.event);

      typeof value !== 'function'
        ? console.warn(`[craftit] @${eventMatch[1]} expects a function, got`, value)
        : bindings.push({
            handler: value as (e: Event) => void,
            marker: m,
            modifiers: parts.slice(1),
            name: parts[0],
            type: 'event',
          });
      continue;
    }

    if (refMatch) {
      const m = addMarker(str, refMatch, MARKER_PREFIX.ref);

      if (!value) {
        console.warn('[craftit] ref= expects a ref() object or callback');
      } else if (typeof value === 'function') {
        // Ref callback
        bindings.push({
          marker: m,
          ref: value as RefCallback<Element>,
          type: 'ref',
        });
      } else if (typeof value === 'object' && ('value' in value || 'values' in value)) {
        // Ref or RefList
        bindings.push({
          marker: m,
          ref: value as Ref<Element> | RefList<Element>,
          type: 'ref',
        });
      } else {
        console.warn('[craftit] ref= expects a ref() object or callback function');
      }
      continue;
    }

    // Model binding for two-way data binding
    if (hasKey(value, '__model')) {
      const marker = `data-${MARKER_PREFIX.model}${globalMarkerIndex++}`;
      const sig = (value as { __model: Signal<string | number | boolean> }).__model;

      result += `${str} ${marker}=""`;
      bindings.push({
        marker,
        signal: sig,
        type: 'model',
      });
      continue;
    }

    if (plainAttrMatch) {
      bindings.push(
        createAttrBinding(
          booleanAttrs.has(plainAttrMatch[1]) ? 'bool' : 'attr',
          plainAttrMatch[1],
          addMarker(str, plainAttrMatch, MARKER_PREFIX.attr),
          value,
        ),
      );
      continue;
    }

    /*  Reactive HTML wrappers  */
    let htmlWrapper: { __htmlSignal: ReadonlySignal<{ bindings: Binding[]; html: string }> } | null = null;
    let isKeyed = false;

    if (hasKey(value, '__eachSignal')) {
      htmlWrapper = {
        __htmlSignal: (
          value as {
            __eachSignal: ReadonlySignal<{
              bindings: Binding[];
              html: string;
              items?: Array<{ bindings: Binding[]; html: string }>;
              keys?: (string | number)[];
            }>;
          }
        ).__eachSignal,
      };
      isKeyed = true;
    } else if (hasKey(value, 'type') && (value as Directive).type === 'when') {
      const whenDir = value as WhenDirective;

      if (isSignal(whenDir.condition)) {
        const whenSignal = computed(() => {
          const cond = resolveCondition(whenDir.condition);
          const res = cond ? whenDir.thenBranch() : whenDir.elseBranch ? whenDir.elseBranch() : '';

          if (typeof res === 'string') return { bindings: [], html: res };

          return { bindings: res.__bindings, html: res.__html };
        });

        htmlWrapper = { __htmlSignal: whenSignal };
      }
    }

    // Reactive function (() => ...)
    if (!htmlWrapper && typeof value === 'function') {
      let cached = { bindings: [] as Binding[], html: '' };
      const fnSignal = signal(cached);

      effect(() => {
        const res = (value as () => unknown)();
        const items = Array.isArray(res) ? res : [res];
        let htmlStr = '';
        const resBindings: Binding[] = [];

        for (const item of items) {
          if (isHtmlResult(item)) {
            htmlStr += item.__html;
            resBindings.push(...item.__bindings);
          } else {
            htmlStr += resolveDirectiveValue(item);
          }
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

    // Signal interpolation with an array or HTMLResult => reactive HTML
    if (!htmlWrapper && isSignal(value)) {
      if (Array.isArray(value.value) || isHtmlResult(value.value)) {
        htmlWrapper = {
          __htmlSignal: Array.isArray(value.value)
            ? computed(() => {
                let html = '';
                const bs: Binding[] = [];

                for (const item of (value as ReadonlySignal<unknown[]>).value) {
                  if (isHtmlResult(item)) {
                    html += item.__html;
                    bs.push(...item.__bindings);
                  } else {
                    html += String(item ?? '');
                  }
                }

                return { bindings: bs, html };
              })
            : computed(() => {
                const val = (value as ReadonlySignal<unknown>).value;
                return isHtmlResult(val)
                  ? { bindings: val.__bindings, html: val.__html }
                  : { bindings: [], html: String(val) };
              }),
        };
      }
    }

    if (htmlWrapper) {
      const marker = `${MARKER_PREFIX.html}${globalMarkerIndex++}`;

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
    if (isSignal(value)) {
      const marker = `__s_${globalMarkerIndex++}`;

      result += `${str}<!--${marker}-->`;
      bindings.push({
        marker,
        signal: value as Signal<unknown>,
        type: 'text',
      });
    } else if (isHtmlResult(value)) {
      result += str + value.__html;
      bindings.push(...value.__bindings);
    } else {
      result += str + resolveDirectiveValue(value);
    }
  }

  const trimmed = result.trim();

  // Always return HTMLResult object to preserve HTML status (important for nesting)
  return makeHtmlResult(trimmed, bindings);
};

/* ========== Template Engine — html & raw ========== */
export const html = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult => htmlTemplate(strings, values, true),
  {
    /** Two-way binding shorthand — use as a prop value: html`<my-input ${html.bind(mySignal)} />` */
    bind: (sig: Signal<string | number | boolean>) => ({ __model: sig }),
    /* --- helpers: classes, escape, log, style --- */
    /**
     * Builds a class string from an object map of `{ className: condition }` pairs.
     * Conditions can be booleans, Signals, or getter functions for reactivity.
     * Returns a plain string for static conditions or a computed Signal for reactive ones.
     *
     * @example
     * html.classes({ active: isActive, hidden: () => !visible.value })
     */
    classes: (
      classes: Record<string, boolean | Signal<boolean> | (() => boolean) | undefined>,
    ): string | ReadonlySignal<string> => {
      const entries = Object.entries(classes);
      const hasReactive = entries.some(([, v]) => isSignal(v) || typeof v === 'function');
      if (hasReactive) {
        return computed(() =>
          entries
            .filter(([, v]) => (isSignal(v) ? v.value : typeof v === 'function' ? (v as () => boolean)() : v))
            .map(([k]) => k)
            .join(' '),
        );
      }
      return entries
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(' ');
    },
    // Loop rendering - renamed from 'for' to 'each' for clarity
    each: <T>(
      source: T[] | Signal<T[]> | (() => T[]),
      ...args:
        | [(item: T, index: number) => string | HTMLResult]
        | [
            (item: T, index: number) => string | number,
            (item: T, index: number) => string | HTMLResult,
            (() => string | HTMLResult)?,
          ]
    ) => {
      if (args.length === 1) {
        const first = args[0];
        // Simple form: html.each(items, item => html`...`)
        return eachHelper(source, (_, i) => i, first);
      }
      // Three-argument form: html.each(items, keyFn, templateFn, emptyFn?)
      const [keyFn, templateFn, emptyFn] = args as [
        (item: T, index: number) => string | number,
        (item: T, index: number) => string | HTMLResult,
        (() => string | HTMLResult)?,
      ];
      return eachHelper(source, keyFn, templateFn, emptyFn);
    },
    // Conditional visibility — keeps the DOM mounted, only toggles display.
    // Use instead of html.when when the content has expensive setup or local state
    // that must survive visibility changes (e.g. a video player, a form with inputs).
    show: <V extends string | HTMLResult>(
      condition: unknown | Signal<unknown> | (() => unknown),
      templateFn: () => V,
    ): HTMLResult => {
      const inner = templateFn();
      const { html: innerHtml, bindings: innerBindings } = extractHtml(inner);
      const condSignal = isSignal(condition)
        ? condition
        : typeof condition === 'function'
          ? computed(() => resolveCondition((condition as () => unknown)()))
          : null;

      if (condSignal) {
        // Reactive: wrap in a layout-transparent <span> and toggle display reactively.
        // Child components remain mounted — only visibility changes.
        const marker = `data-${MARKER_PREFIX.attr}${globalMarkerIndex++}`;
        const styleSignal = computed(() =>
          resolveCondition(condSignal.value) ? 'display: contents' : 'display: none',
        );
        return makeHtmlResult(`<span ${marker}="">${innerHtml}</span>`, [
          { marker, mode: 'attr' as const, name: 'style', signal: styleSignal, type: 'attr' as const },
          ...innerBindings,
        ]);
      }

      // Static condition: render once or skip entirely
      return resolveCondition(condition)
        ? typeof inner === 'string'
          ? makeHtmlResult(inner)
          : (inner as HTMLResult)
        : EMPTY_RESULT;
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
    // Conditional rendering
    // Two forms:
    //   html.when(cond, thenFn, elseFn?)                    — single condition
    //   html.when([cond1, fn1], [cond2, fn2], ..., fallback?) — multi-branch else-if chain
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: multi-branch conditional directive requires complex branching logic
    when: <V extends string | HTMLResult>(...args: unknown[]): V | WhenDirective | string => {
      // Multi-branch form: each positional arg is a [condition, fn] tuple
      if (Array.isArray(args[0])) {
        type Branch = [unknown | Signal<unknown> | (() => unknown), () => V];
        const lastArg = args[args.length - 1];
        const fallback = !Array.isArray(lastArg) && typeof lastArg === 'function' ? (lastArg as () => V) : undefined;
        const branches = (fallback ? args.slice(0, -1) : args) as Branch[];
        const isReactive = branches.some(([cond]) => isSignal(cond) || typeof cond === 'function');

        if (!isReactive) {
          for (const [cond, fn] of branches) {
            if (resolveCondition(cond as unknown)) return fn();
          }
          return fallback ? fallback() : ('' as V);
        }

        // Reactive multi-branch: a computed signal that is truthy when any branch matches,
        // driving re-evaluation whenever branch conditions change.
        const conditionSignal = computed(() =>
          branches.some(([cond]) =>
            resolveCondition(
              isSignal(cond) ? cond.value : typeof cond === 'function' ? (cond as () => unknown)() : cond,
            ),
          ),
        );
        return {
          condition: conditionSignal,
          elseBranch: fallback,
          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: resolving the matching branch is inherently iterative
          thenBranch: () => {
            for (const [cond, fn] of branches) {
              const val = isSignal(cond) ? cond.value : typeof cond === 'function' ? (cond as () => unknown)() : cond;
              if (resolveCondition(val)) return fn();
            }
            return fallback ? fallback() : ('' as V);
          },
          type: 'when' as const,
        } as WhenDirective;
      }

      // Single-condition form: html.when(condition, thenFn, elseFn?)
      const [condition, thenFn, elseFn] = args as [unknown | Signal<unknown>, () => V, (() => V) | undefined];
      if (isSignal(condition)) {
        return { condition, elseBranch: elseFn, thenBranch: thenFn, type: 'when' };
      }
      if (typeof condition === 'function') {
        const conditionSignal = computed(() => resolveCondition((condition as () => unknown)()));
        return { condition: conditionSignal, elseBranch: elseFn, thenBranch: thenFn, type: 'when' };
      }
      return resolveCondition(condition) ? thenFn() : elseFn ? elseFn() : ('' as V);
    },
  },
);

/* ========== Template Engine — raw (no escaping) ========== */
export const raw = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult =>
  htmlTemplate(strings, values, false);

/* ========== Runtime Helpers — suspense & bind ========== */
export const suspense = <T>(
  asyncFn: (signal?: AbortSignal) => Promise<T>,
  options: {
    error?: (error: Error, retry: () => void) => string | HTMLResult;
    fallback: () => string | HTMLResult;
    template: (data: T) => string | HTMLResult;
  },
): (() => string | HTMLResult) => {
  const state = signal<{ data?: T; error?: Error; loading: boolean }>({ loading: true });
  let controller: AbortController | null = null;

  const run = () => {
    // Abort any in-flight request before starting a new one (handles retry and unmount races)
    controller?.abort();
    controller = new AbortController();
    const ac = controller;
    state.value = { loading: true };
    asyncFn(ac.signal)
      .then((data) => {
        if (!ac.signal.aborted) state.value = { data, loading: false };
      })
      .catch((error) => {
        if (!ac.signal.aborted) state.value = { error, loading: false };
      });
  };

  run();

  return () => {
    const current = state.value;
    if (current.loading) return options.fallback();
    if (current.error) {
      return options.error ? options.error(current.error, run) : html`<div>Error loading</div>`;
    }
    return options.template(current.data!);
  };
};

/* ========== CSS Helper ========== */
export type CSSResult = {
  content: string;
  toString(): string;
};
type ThemeVars<T extends Record<string, string | number>> = {
  [K in keyof T]: string;
} & { toString(): string };
const cssResultToString = function (this: CSSResult): string {
  return this.content;
};
export const css = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): CSSResult => {
    const content = strings
      .reduce((out, str, i) => {
        const value = values[i];
        // Explicitly handle CSSResult objects
        const stringValue =
          value && typeof value === 'object' && 'content' in value ? (value as CSSResult).content : (value ?? '');
        return out + str + stringValue;
      }, '')
      .trim();

    return { content, toString: cssResultToString };
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

/* ========== Component Runtime & Lifecycle ========== */
type ComponentRuntime = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  /** Scoped error handler set by onError() — catches render & lifecycle errors in this component only */
  errorHandler?: (error: Error, info?: { componentStack?: string }) => void;
  // biome-ignore lint/suspicious/noConfusingVoidType: void is needed for optional cleanup returns
  onMount: (() => CleanupFn | undefined | void)[];
  onUnmount: CleanupFn[];
  onUpdated: (() => void)[];
};

const runtimeStack: ComponentRuntime[] = [];
const currentRuntime = (): ComponentRuntime => {
  const rt = runtimeStack[runtimeStack.length - 1];

  if (!rt) throw new Error('[craftit] lifecycle API used outside of component setup/instance');

  return rt;
};

// biome-ignore lint/suspicious/noConfusingVoidType: void is needed for optional cleanup returns
export const onMount = (fn: () => CleanupFn | undefined | void): void => {
  currentRuntime().onMount.push(fn);
};
/** Runs when the element disconnects from the DOM. Use for external subscriptions or resources tied to component lifetime. */
export const onUnmount = (fn: CleanupFn): void => {
  currentRuntime().onUnmount.push(fn);
};
export const onUpdated = (fn: () => void): void => {
  currentRuntime().onUpdated.push(fn);
};
/**
 * Registers a cleanup function alongside reactive effect teardowns.
 * Runs on unmount. Prefer {@link onUnmount} for explicit lifecycle callbacks;
 * use `onCleanup` when registering cleanup inside a reactive context.
 */
export const onCleanup = (fn: CleanupFn): void => {
  currentRuntime().cleanups.push(fn);
};

/**
 * Registers an event listener on `target` and automatically removes it via {@link onCleanup} on unmount.
 * Must be called within an active lifecycle context — typically inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   handle(host, 'click', onClick);
 *   handle(host, 'keydown', onKeydown);
 *   // no return/cleanup needed
 * });
 */
export const handle = <K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void => {
  target.addEventListener(event, listener as EventListener, options);
  onCleanup(() => target.removeEventListener(event, listener as EventListener, options));
};

// Error boundary support — scoped to this component's render & lifecycle, NOT a global window error listener
export const onError = (fn: (error: Error, info?: { componentStack?: string }) => void): void => {
  currentRuntime().errorHandler = fn;
};

/** Value type accepted per ARIA attribute key: a getter function (for reactive tracking), a plain value, or null/undefined to remove. */
type AriaAttrValue =
  | (() => string | boolean | number | null | undefined)
  | string
  | boolean
  | number
  | null
  | undefined;

/**
 * Reactively sets ARIA attributes on the host element.
 * Pass getter functions to make individual attributes reactive — they will be tracked as signal dependencies.
 * Plain primitive values are set once. `null` / `undefined` / `false` remove the attribute.
 *
 * Must be called synchronously during component setup.
 *
 * @example
 * aria({
 *   role: 'checkbox',
 *   checked: () => checkedSignal.value,
 *   disabled: () => props.disabled.value,
 * });
 */
export const aria = (attrs: Record<string, AriaAttrValue>): void => {
  const host = currentRuntime().el;
  const applyAttr = (name: string, val: AriaAttrValue) => {
    const attrName = `aria-${name}`;
    const value = typeof val === 'function' ? (val as () => AriaAttrValue)() : val;
    if (value === null || value === undefined || value === false) {
      host.removeAttribute(attrName);
    } else {
      host.setAttribute(attrName, String(value));
    }
  };

  for (const [name, value] of Object.entries(attrs)) {
    if (typeof value === 'function') {
      // Wrap in a reactive effect so getter-functions are re-evaluated on signal changes
      onCleanup(effect(() => applyAttr(name, value)));
    } else {
      applyAttr(name, value);
    }
  }
};

/* ========== Context (provide/inject) ========== */

/** WeakMap-based logical parent tracking — lets inject() traverse through portaled components */
const _logicalParents = new WeakMap<HTMLElement, HTMLElement>();

const contextKey = Symbol('craftit.context');

export type InjectionKey<T> = symbol & {
  readonly __craftit_injection_key?: T;
};
interface ContextHost extends HTMLElement {
  [contextKey]?: Map<InjectionKey<unknown> | string | symbol, unknown>;
}
export const provide = <T>(key: InjectionKey<T> | string | symbol, value: T): void => {
  const el = currentRuntime().el as ContextHost;

  el[contextKey] ??= new Map();
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
        return host[contextKey]!.get(key) as T;
      }
    }

    // Try logical parent first (for portaled components)
    const logicalParent: HTMLElement | null = node instanceof HTMLElement ? (_logicalParents.get(node) ?? null) : null;

    if (logicalParent) {
      node = logicalParent;
      continue;
    }

    // Fall back to DOM traversal
    const rootNode: Node = node.getRootNode() as Node;
    const parentElement: HTMLElement | null = (node as HTMLElement).parentElement;
    const hostElement: Element | null = rootNode instanceof ShadowRoot ? rootNode.host : null;

    node = parentElement ?? hostElement ?? null;
  }

  if (fallback === undefined) {
    console.warn(
      `[craftit] Injection key not found: ${String(key)}\n\nPossible causes:
  • No parent component calls provide() with this key
  • inject() called outside component setup
  • Component hierarchy doesn't include provider
Solutions:
  • Ensure a parent component calls provide(key, value)
  • Provide a fallback: inject(key, defaultValue)
  • Check component nesting in your template`,
    );
  }

  return fallback;
}

// Create strongly-typed injection key
export const createContext = <T>(): InjectionKey<T> => Symbol() as InjectionKey<T>;

/* ========== Slots API ========== */
export type SlotsAPI<T extends Record<string, unknown> = Record<string, unknown>> = {
  has(name: keyof T): boolean;
};

export const defineSlots = <T extends Record<string, unknown> = Record<string, unknown>>(): SlotsAPI<T> => {
  const el = currentRuntime().el;

  return {
    has(name: keyof T): boolean {
      const slotName = name === 'default' ? '' : String(name);
      const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(
        slotName ? `slot[name="${slotName}"]` : 'slot:not([name])',
      );
      return (slot?.assignedNodes().length ?? 0) > 0;
    },
  };
};

/* ========== Type-safe Event Emitter ========== */
export type EmitFn<T extends Record<string, unknown>> = <K extends keyof T>(event: K, detail: T[K]) => void;

export const defineEmits = <T extends Record<string, unknown>>(): EmitFn<T> => {
  const el = currentRuntime().el;

  return <K extends keyof T>(event: K, detail: T[K]) => {
    el.dispatchEvent(
      new CustomEvent(String(event), {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  };
};

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
const setFormCallback = <K extends keyof FormAssociatedCallbacks>(key: K, fn: FormAssociatedCallbacks[K]): void => {
  const el = currentRuntime().el as FormHost;
  el[formCallbacksKey] ??= {};
  (el[formCallbacksKey] as FormAssociatedCallbacks)[key] = fn;
};
export const onFormAssociated = (fn: (form: HTMLFormElement | null) => void): void =>
  setFormCallback('formAssociated', fn);
export const onFormDisabled = (fn: (disabled: boolean) => void): void => setFormCallback('formDisabled', fn);
export const onFormReset = (fn: () => void): void => setFormCallback('formReset', fn);
export const onFormStateRestore = (fn: (state: unknown, mode: 'autocomplete' | 'restore') => void): void =>
  setFormCallback('formStateRestore', fn);
export type FormFieldOptions<T = unknown> = {
  disabled?: Signal<boolean> | ReadonlySignal<boolean>;
  toFormValue?: (value: T) => File | FormData | string | null;
  value: Signal<T> | ReadonlySignal<T>;
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
    return {
      internals: null,
      reportValidity: () => true,
      setValidity: () => {},
    };
  }

  const internals = host._internals ?? host.attachInternals();

  host._internals = internals;

  const toFormValue = options.toFormValue ?? ((v: T) => (v == null ? '' : String(v)));

  rt.cleanups.push(
    effect(() => {
      internals.setFormValue(toFormValue(options.value.value));
    }),
  );

  if (options.disabled) {
    rt.cleanups.push(
      effect(() => {
        options.disabled!.value ? internals.states.add('disabled') : internals.states.delete('disabled');
      }),
    );
  }

  return {
    internals,
    reportValidity: () => internals.reportValidity(),
    setValidity: internals.setValidity.bind(internals),
  };
};

/* ========== Props & defineProps ========== */
const propsKey = Symbol('craftit.props');

type PropType<T> = T extends string
  ? StringConstructor
  : T extends number
    ? NumberConstructor
    : T extends boolean
      ? BooleanConstructor
      : T extends unknown[]
        ? ArrayConstructor
        : ObjectConstructor;

export type PropOptions<T> = {
  parse?: (value: string | null) => T;
  reflect?: boolean;
  type?: PropType<T>;
  validator?: (value: T) => boolean;
  required?: boolean;
};
type PropMeta<T = unknown> = {
  name: string;
  parse: (value: string | null) => T;
  reflect: boolean;
  required?: boolean;
  signal: Signal<T>;
  validator?: (value: T) => boolean;
};
interface PropHost extends HTMLElement {
  [propsKey]?: Map<string, PropMeta<unknown>>;
}

/** Returns a Signal<T> whose value setter runs validator before accepting the write.
 * Uses a Proxy over signal() since Signal<T> is an interface, not a class. */
const validatedSignal = <T>(defaultValue: T, validator: (v: T) => boolean, propName: string): Signal<T> => {
  const s = signal<T>(defaultValue);
  return new Proxy(s, {
    get(target, prop) {
      const val = Reflect.get(target, prop, target);
      return typeof val === 'function' ? val.bind(target) : val;
    },
    set(_target, prop, value) {
      if (prop === 'value') {
        if (!validator(value as T)) {
          console.warn(`[craftit] Prop "${propName}" validation failed for value:`, value);
          return true;
        }
        s.value = value as T;
        return true;
      }
      return Reflect.set(s, prop, value, s);
    },
  }) as Signal<T>;
};

export const prop = <T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const rt = currentRuntime();
  const el = rt.el as PropHost;

  el[propsKey] ??= new Map();

  const parse =
    options?.parse ??
    // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: attribute parsing must handle all HTML scalar types
    ((v: string | null): T => {
      // Explicit Boolean type: string values 'true' / '' → boolean
      if (options?.type === Boolean) return (v === '' || v === 'true') as T;
      // Boolean default: HTML attribute-presence semantics (absent = false, present = true)
      if (typeof defaultValue === 'boolean') return (v !== null) as T;
      if (v == null) return defaultValue;
      // Numeric — inferred from an explicit type option or default value type
      if (options?.type === Number || typeof defaultValue === 'number') return Number(v) as T;
      if (options?.type === Array || options?.type === Object) {
        try {
          return JSON.parse(v) as T;
        } catch {
          return defaultValue;
        }
      }
      return v as unknown as T;
    });
  const validator = options?.validator;
  const s: Signal<T> = validator ? validatedSignal<T>(defaultValue, validator, name) : signal<T>(defaultValue);

  el[propsKey]!.set(name, {
    name,
    parse,
    reflect: options?.reflect ?? false,
    required: options?.required,
    signal: s as Signal<unknown>,
    validator: validator as ((value: unknown) => boolean) | undefined,
  });
  Object.defineProperty(el, name, {
    configurable: true,
    enumerable: true,
    get: () => s.value,
    set: (value: T) => {
      s.value = value;
    },
  });

  if (options?.reflect) {
    rt.onMount.push(() => {
      rt.cleanups.push(
        effect(() => {
          const v = s.value;

          v == null || v === false ? el.removeAttribute(name) : el.setAttribute(name, v === true ? '' : String(v));
        }),
      );
    });
  }

  return s;
};
/**
 * Shape accepted by {@link defineProps} — the prop's default value plus any PropOptions.
 * Use inline object literals directly: `{ default: 0, type: Number }` or just `{ default: '' }`.
 */
export type PropDef<T> = PropOptions<T> & { default: T };
export type InferPropsSignals<T extends Record<string, PropDef<any>>> = {
  [K in keyof T]: Signal<T[K]['default']>;
};
/**
 * Declares multiple props at once, deriving attribute names from object keys.
 * Pass an inline object literal instead of calling a wrapper function:
 *
 * @example
 * const props = defineProps({
 *   count: { default: 0, type: Number },
 *   label: { default: '' },
 * });
 * // props.count → Signal<number>, props.label → Signal<string>
 */
export const defineProps = <T extends Record<string, PropDef<any>>>(defs: T): InferPropsSignals<T> => {
  const result = {} as Record<string, Signal<unknown>>;

  for (const [name, def] of Object.entries(defs)) {
    // Map camelCase keys to kebab-case attribute names (HTML spec convention).
    // e.g. defineProps({ myProp: { default: '' } }) registers the "my-prop" attribute
    // but the signal is accessed as props.myProp.
    result[name] = prop(toKebab(name), def.default, def as PropOptions<unknown>);
  }

  return result as InferPropsSignals<T>;
};
/* ========== Component Definition ========== */
/** Context object passed as the first argument to every `define()` setup function. */
export type SetupContext = {
  /** The host `HTMLElement` instance for this component. */
  host: HTMLElement;
};
export type SetupResult =
  | string
  | HTMLResult
  | {
      styles?: (string | CSSStyleSheet | CSSResult)[];
      template: string | HTMLResult;
    };
export type DefineOptions = {
  /** Indicates if this should be a form-associated element */
  formAssociated?: boolean;
  /** Mount this component to a specific DOM location */
  target?: string | HTMLElement;
};

const loadStylesheet = async (style: string | CSSStyleSheet | CSSResult): Promise<CSSStyleSheet> => {
  if (style instanceof CSSStyleSheet) return style;

  const cssText = typeof style === 'string' ? style : style.content;
  const sheet = new CSSStyleSheet();

  await sheet.replace(cssText);

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

/* Helper to apply bindings for a keyed list item */
/** Searches a shallow node list for an element carrying `markerAttr`, then falls back to querySelector. */
const queryWithinNodes = (nodes: Node[], markerAttr: string): HTMLElement | null => {
  for (const node of nodes) {
    if (node instanceof HTMLElement && node.hasAttribute(markerAttr)) return node;
    if (node instanceof Element) {
      const found = node.querySelector<HTMLElement>(`[${markerAttr}]`);
      if (found) return found;
    }
  }
  return null;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keyed item binding requires handling multiple binding types
const applyKeyedItemBindings = (nodes: Node[], itemBindings: Binding[], container: ParentNode): CleanupFn[] => {
  const itemCleanups: CleanupFn[] = [];
  const itemRegisterCleanup: RegisterCleanup = (fn) => itemCleanups.push(fn);

  for (const binding of itemBindings) {
    const el = queryWithinNodes(nodes, binding.marker);
    if (!el && binding.type !== 'ref') continue;

    if (binding.type === 'prop') {
      applyPropBinding(el!, binding, itemRegisterCleanup, true);
    } else if (binding.type === 'event') {
      applyEventBinding(el!, binding, itemRegisterCleanup, false, true);
    } else if (binding.type === 'attr') {
      applyAttrBinding(el!, binding, itemRegisterCleanup, true);
    } else if (binding.type === 'ref') {
      const refEl = el ?? (container as ParentNode).querySelector<HTMLElement>(`[${binding.marker}]`);
      if (refEl) {
        const bindingRef = binding.ref;
        if (typeof bindingRef !== 'function' && !('values' in bindingRef)) {
          bindingRef.value = refEl as never;
        }
      }
    }
  }

  return itemCleanups;
};
class CraftitBaseElement extends HTMLElement implements PropHost, ContextHost, FormHost {
  /** The component's setup function — assigned as a static on each subclass by define() */
  static _setup: (ctx: SetupContext) => SetupResult;
  /** The component's define options — assigned as a static on each subclass by define() */
  static _options?: DefineOptions;
  static formAssociated = false;
  [contextKey]?: Map<InjectionKey<unknown> | string | symbol, unknown>;
  [formCallbacksKey]?: FormAssociatedCallbacks;
  [propsKey]?: Map<string, PropMeta>;
  shadow: ShadowRoot;
  private _attrObserver: MutationObserver | null = null;
  private _mounted = false;
  private _styles?: (string | CSSStyleSheet | CSSResult)[];
  private _template: string | HTMLResult | null = null;
  private appliedHtmlBindings = new Set<string>();
  private runtime: ComponentRuntime;
  private _portalTarget: HTMLElement | null = null;
  private _originalParent: { parent: Node; nextSibling: Node | null } | null = null;
  private _isPortaling = false;
  /** Guards setup execution — setup runs exactly once even when the element is moved in the DOM */
  private _setupDone = false;
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
  }
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Lifecycle method manages portal setup, attribute observation, setup execution, and component initialization
  connectedCallback(): void {
    const options = (this.constructor as typeof CraftitBaseElement)._options;

    if (options?.target && !this._isPortaling && !this._portalTarget) {
      const target = typeof options.target === 'string' ? document.querySelector(options.target) : options.target;
      if (target instanceof HTMLElement) {
        this._portalTarget = target;
        this._originalParent = {
          nextSibling: this.nextSibling,
          parent: this.parentNode!,
        };

        // Register logical parent BEFORE moving the element.
        // This preserves the component hierarchy for provide/inject.
        // When the element is a direct child of a ShadowRoot, parentElement is null
        // (ShadowRoot is not an Element), so we fall back to the shadow host.
        const rootNode = this.getRootNode();
        const logicalParent =
          this.parentElement ?? (rootNode instanceof ShadowRoot ? (rootNode.host as HTMLElement) : null);
        if (logicalParent) {
          _logicalParents.set(this, logicalParent);
        }

        this._isPortaling = true;
        target.appendChild(this);
        this._isPortaling = false;
        // appendChild triggers another connectedCallback where initialization will happen
        return;
      }
      if (typeof options.target === 'string') {
        console.warn(
          `[craftit] Portal target element "${options.target}" not found\n\n` +
            'Possible causes:\n' +
            "  • Target element doesn't exist in the DOM yet\n" +
            '  • Selector is incorrect\n' +
            '  • Target element was removed\n\n' +
            'Solutions:\n' +
            '  • Ensure target exists before component renders\n' +
            '  • Use a valid CSS selector\n' +
            "  • Try: document.body or document.querySelector('...')",
        );
      }
    }

    // Run setup exactly once — connectedCallback fires again when the element is moved in the DOM
    if (!this._setupDone) {
      this._setupDone = true;
      runtimeStack.push(this.runtime);

      let res: unknown;

      try {
        res = (this.constructor as typeof CraftitBaseElement)._setup({ host: this });
      } finally {
        runtimeStack.pop();
      }

      // Async setup breaks the runtimeStack context — lifecycle APIs called in await continuations will throw.
      // Use onMount() with an async body for deferred async work instead.
      if (res instanceof Promise) {
        console.warn(
          `[craftit] <${this.localName}> setup() must be synchronous — async functions break lifecycle context.\n` +
            'Use onMount() with an async body if you need async operations on mount.',
        );
      }

      if (typeof res === 'string' || (typeof res === 'object' && res !== null && '__html' in res)) {
        this._template = res as string | HTMLResult;
      } else if (typeof res === 'object' && res !== null && 'template' in res) {
        const r = res as { template: string | HTMLResult; styles?: (string | CSSStyleSheet | CSSResult)[] };

        this._template = r.template;
        this._styles = r.styles;
      }
    }

    this._attrObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName) {
          this.handleAttributeChange(
            mutation.attributeName,
            mutation.oldValue,
            this.getAttribute(mutation.attributeName),
          );
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
          meta.signal.value = meta.parse(this.getAttribute(attrName)) as never;
        } else if (meta.required) {
          console.warn(`[craftit] <${this.localName}> missing required prop "${attrName}"`);
        }
      }
    }

    this.init();
  }
  disconnectedCallback(): void {
    // Skip cleanup if we're in the middle of portaling
    if (this._isPortaling) {
      return;
    }

    if (this._attrObserver) {
      this._attrObserver.disconnect();
      this._attrObserver = null;
    }

    runAll(this.runtime.cleanups);
    runAll(this.runtime.onUnmount);
    this.runtime.cleanups = [];
    this.runtime.onUnmount = [];

    // Clean up logical parent reference
    _logicalParents.delete(this);

    // Restore element to original position if it was portaled
    if (this._originalParent && this._portalTarget && !this._isPortaling) {
      this._isPortaling = true;
      if (this._originalParent.nextSibling) {
        this._originalParent.parent.insertBefore(this, this._originalParent.nextSibling);
      } else {
        this._originalParent.parent.appendChild(this);
      }
      this._isPortaling = false;
      this._portalTarget = null;
      this._originalParent = null;
    }
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

    // Single-pass: non-HTML bindings handled by helper, HTML bindings via onHtml callback.
    applyBindingsInContainer(root, bindings, registerCleanup, {
      onHtml: (b) => {
        if (!this.appliedHtmlBindings.has(b.marker)) {
          this.appliedHtmlBindings.add(b.marker);
          this.applyHtmlBinding(root, b, registerCleanup);
        }
      },
    });
  }
  private applyHtmlBinding(root: Node, b: HtmlBinding, registerCleanup: RegisterCleanup) {
    const found = findCommentMarker(root, b.marker);

    if (!found) return;

    const marker = document.createComment('html-binding');

    found.replaceWith(marker);

    let currentCleanups: CleanupFn[] = [];
    const registerInnerCleanup: RegisterCleanup = (fn) => currentCleanups.push(fn);
    const runCurrentCleanups = () => {
      runAll(currentCleanups);
      currentCleanups = [];
    };
    const clearNodesAfterMarker = () => htmlBindingClearAfter(marker);
    const insertNodesBefore = (nodes: Node[], before: Node | null) => htmlBindingInsertBefore(marker, nodes, before);
    let lastDataHash: string | null = null;
    const stop = effect(() => {
      batch(() => {
        const data = b.signal.value;

        const dataHash = JSON.stringify({
          html: data.html,
          keys: data.keys,
        });

        if (dataHash === lastDataHash && !b.keyed) {
          return;
        }

        lastDataHash = dataHash;

        runCurrentCleanups();

        const { bindings, html, keys } = data;
        const keyedState = b.keyed
          ? (globalKeyedStates.get(b.marker) ??
            (() => {
              const newMap = new Map();

              globalKeyedStates.set(b.marker, newMap);

              return newMap;
            })())
          : null;
        const container = (marker.parentElement || root) as ParentNode;

        let bindingsAlreadyApplied = false;

        untrack(() => {
          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Reconciliation logic requires multiple conditional paths
          batch(() => {
            if (keyedState && keys?.length && data.items?.length === keys.length) {
              bindingsAlreadyApplied = true;
              if (keyedState.size === 0) clearNodesAfterMarker();

              const newKeyedState = new Map<string | number, KeyedNode>();

              // Reconcile each keyed item
              for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                const itemData = data.items[i];
                const existing = keyedState.get(key);

                // Calculate insert position (after previous item or after marker)
                const prevNodes = i > 0 ? newKeyedState.get(keys[i - 1])?.nodes : null;
                const insertPoint = prevNodes?.length
                  ? prevNodes[prevNodes.length - 1].nextSibling
                  : marker.nextSibling;

                if (existing?.html === itemData.html) {
                  // UPDATE: Same HTML - reuse nodes, reapply bindings
                  if (existing.nodes[0]) insertNodesBefore(existing.nodes, insertPoint);
                  runAll(existing.cleanups);
                  const itemCleanups = applyKeyedItemBindings(existing.nodes, itemData.bindings, container);
                  newKeyedState.set(key, {
                    ...existing,
                    bindings: itemData.bindings,
                    cleanups: itemCleanups,
                  });
                } else if (existing) {
                  // REPLACE: Different HTML - create new nodes, remove old
                  runAll(existing.cleanups);
                  const newNodes = htmlBindingCreateNodes(itemData.html);
                  insertNodesBefore(newNodes, insertPoint);
                  const itemCleanups = applyKeyedItemBindings(newNodes, itemData.bindings, container);
                  newKeyedState.set(key, {
                    bindings: itemData.bindings,
                    cleanups: itemCleanups,
                    html: itemData.html,
                    key,
                    nodes: newNodes,
                  });
                  for (const n of existing.nodes) n.parentNode?.removeChild(n);
                } else {
                  // CREATE: New item
                  const newNodes = htmlBindingCreateNodes(itemData.html);
                  insertNodesBefore(newNodes, insertPoint);
                  const itemCleanups = applyKeyedItemBindings(newNodes, itemData.bindings, container);
                  newKeyedState.set(key, {
                    bindings: itemData.bindings,
                    cleanups: itemCleanups,
                    html: itemData.html,
                    key,
                    nodes: newNodes,
                  });
                }
              }

              // DELETE: Remove old items not in new state
              for (const [oldKey, oldNode] of keyedState) {
                if (!newKeyedState.has(oldKey)) {
                  htmlBindingRemoveKeyed(oldNode);
                }
              }

              globalKeyedStates.set(b.marker, newKeyedState);
            } else {
              // Non-keyed or empty list
              clearNodesAfterMarker();
              marker.after(parseHTML(html));
              if (b.keyed) globalKeyedStates.set(b.marker, new Map());
            }
          });

          if (!bindingsAlreadyApplied) {
            // Single-pass: non-HTML and HTML bindings handled together.
            applyBindingsInContainer(container, bindings, registerInnerCleanup, {
              eventModifiers: false,
              onHtml: (binding) => this.applyHtmlBinding(container, binding, registerInnerCleanup),
            });
          }
        });
      }); // end batch
    }); // end effect

    registerCleanup(stop);
    registerCleanup(runCurrentCleanups);
    if (b.keyed) registerCleanup(() => globalKeyedStates.delete(b.marker));
  }
  private handleAttributeChange(name: string, oldValue: string | null, newValue: string | null) {
    if (oldValue === newValue) return;

    const meta = this[propsKey]?.get(name);

    if (!meta) return;

    const parsedValue = meta.parse(newValue);

    if (!Object.is(meta.signal.peek(), parsedValue)) {
      meta.signal.value = parsedValue as never;
    }
  }
  private async init() {
    try {
      if (this._styles?.length) {
        this.shadow.adoptedStyleSheets = await Promise.all(this._styles.map(loadStylesheet));
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
      this._mounted = true;
      for (const fn of this.runtime.onUpdated) fn();
    } catch (error) {
      if (this.runtime.errorHandler && error instanceof Error) {
        this.runtime.errorHandler(error, {
          componentStack: `  at <${this.localName}>\n${error.stack ?? ''}`,
        });
      } else {
        throw error;
      }
    }
  }
  private render(tpl: string | HTMLResult) {
    const htmlResult: HTMLResult = typeof tpl === 'string' ? makeHtmlResult(tpl) : tpl;

    this.shadow.innerHTML = '';

    const frag = parseHTML(htmlResult.__html);

    this.shadow.appendChild(frag);
    this.applyBindings(htmlResult.__bindings);
    if (this._mounted) {
      for (const fn of this.runtime.onUpdated) fn();
    }
  }
}

export const define = (name: string, setup: (ctx: SetupContext) => SetupResult, options?: DefineOptions): string => {
  if (customElements.get(name)) {
    console.warn(`[craftit] Element "${name}" already defined`);

    return name;
  }

  // Each call creates a thin subclass that carries the setup function and options as statics.
  // All instances share the CraftitBaseElement prototype, so methods are not duplicated per-tag.
  class CraftitElement extends CraftitBaseElement {
    static override _setup = setup;
    static override _options = options;
    static override formAssociated = !!options?.formAssociated;
  }

  customElements.define(name, CraftitElement);
  return name;
};

// ─── withRuntime ──────────────────────────────────────────────────────────────

/**
 * Run a function within an isolated component runtime context.
 *
 * Lets you call any composable API (`prop`, `ref`, `onMount`, `inject`, `field`,
 * etc.) outside of a real mounted component — useful for unit-testing composables
 * in isolation without defining + mounting a full element.
 *
 * @example
 * const count = withRuntime(() => prop('count', 0));
 * expect(count.value).toBe(0);
 *
 * @example
 * const { slots } = withRuntime(() => {
 *   const slots = defineSlots();
 *   return { slots };
 * });
 * expect(slots.has('header')).toBe(false);
 */
export function withRuntime<T>(fn: () => T): T {
  const el = document.createElement('div');
  const rt: ComponentRuntime = { cleanups: [], el, onMount: [], onUnmount: [], onUpdated: [] };
  runtimeStack.push(rt);
  try {
    return fn();
  } finally {
    runtimeStack.pop();
  }
}
