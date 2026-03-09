/** @vielzeug/craftit — Functional, signals-based web component library.
 * Signal primitives (Signal, signal, effect, computed, batch, watch, derived,
 * writable, onCleanup, etc.) are provided by @vielzeug/stateit and
 * re-exported here for convenience.
 */

// ─── Signal primitives (re-exported from @vielzeug/stateit) ──────────────────
export * from '@vielzeug/stateit';

import {
  effect as _rawEffect,
  watch as _signalWatch,
  onCleanup as _stateOnCleanup,
  batch,
  type CleanupFn,
  computed,
  type EffectOptions,
  isSignal,
  type ReadonlySignal,
  type Signal,
  signal,
  untrack,
  type WatchOptions,
} from '@vielzeug/stateit';

// Internal iterate-and-call helper — used by a component disconnectedCallback.
const runAll = (fns: Iterable<() => void>): void => {
  for (const fn of fns) fn();
};

/* ========== Watch (component-context-aware) ========== */
/**
 * Watches a Signal and calls cb with (next, prev) whenever its value changes.
 * Watches a Signal with a selector and calls cb only when the selected slice changes.
 * Watches an array of Signals and calls cb (no args) whenever any of them changes.
 * When called inside a component setup function, the watcher is automatically
 * cleaned up when the component unmounts — no manual cleanup needed.
 */
export function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: Omit<WatchOptions<T>, 'select'>,
): CleanupFn;
export function watch<T, U>(
  source: ReadonlySignal<T>,
  selector: (state: T) => U,
  cb: (value: U, prev: U) => void,
  options?: Omit<WatchOptions<T, U>, 'select'>,
): CleanupFn;
export function watch(
  sources: ReadonlyArray<ReadonlySignal<unknown>>,
  cb: () => void,
  options?: Omit<WatchOptions<unknown>, 'select'>,
): CleanupFn;
export function watch(
  source: ReadonlySignal<unknown> | ReadonlyArray<ReadonlySignal<unknown>>,
  cbOrSelector: ((value: unknown, prev: unknown) => void) | (() => void),
  cbOrOptions?: ((value: unknown, prev: unknown) => void) | WatchOptions<unknown, unknown>,
  options?: WatchOptions<unknown, unknown>,
): CleanupFn {
  if (Array.isArray(source)) {
    const cb = cbOrSelector as () => void;
    const opts = cbOrOptions as WatchOptions<unknown> | undefined;
    let initialized = false;
    let dispose!: CleanupFn;
    dispose = effect(() => {
      for (const s of source) s.value; // register all listed deps
      if (!initialized) {
        initialized = true;
        if (opts?.immediate) untrack(cb);
      } else {
        untrack(cb);
        if (opts?.once) dispose();
      }
    });
    return dispose;
  }
  const stop =
    typeof cbOrOptions === 'function'
      ? _signalWatch(source as ReadonlySignal<unknown>, cbOrOptions as (value: unknown, prev: unknown) => void, {
          ...options,
          select: cbOrSelector as (s: unknown) => unknown,
        })
      : _signalWatch(
          source as ReadonlySignal<unknown>,
          cbOrSelector as (value: unknown, prev: unknown) => void,
          cbOrOptions,
        );
  autoCleanup(stop);
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
 * Generates a stable set of ARIA-related IDs for a form control.
 * Call after `defineProps()` so `name.value` already reflects any HTML attribute.
 *
 * @example
 * const { fieldId, labelId, helperId, errorId } = createFormIds('input', props.name);
 */
export const createFormIds = (prefix: string, name: string | ReadonlySignal<string>) => {
  const nameVal = typeof name === 'string' ? name : name.value;
  const fieldId = nameVal ? `${prefix}-${nameVal}` : createId(prefix);
  return {
    errorId: `error-${fieldId}`,
    fieldId,
    helperId: `helper-${fieldId}`,
    labelId: `label-${fieldId}`,
  };
};

/**
 * Creates a typed PropDef with an explicit type parameter.
 * Use when TypeScript cannot infer the signal type from the default value alone.
 *
 * @example
 * const props = defineProps<ButtonProps>({
 *   color: typed<ThemeColor | undefined>(undefined),
 *   disabled: { default: false },
 * });
 */
export const typed = <T>(defaultValue: T, options?: Omit<PropDef<T>, 'default'>): PropDef<T> => ({
  default: defaultValue,
  ...options,
});

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
/** Branded type returned by {@link html.bind} — prevents accidental object collisions in templates. */
export type ModelDirective<T extends string | number | boolean = string | number | boolean> = {
  readonly __craftit_model: Signal<T>;
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
/** @deprecated Use {@link WhenDirective} directly. EachDirective has been removed — static arrays now render to HTMLResult inline. */
export type Directive = WhenDirective;
export type HTMLResult = {
  __bindings: Binding[];
  __html: string;
  toString(): string;
};
/* Ref objects and callbacks */
export interface Ref<T extends Element> {
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
  const items: T[] = [];

  return {
    add(el: T | null) {
      if (el && !items.includes(el)) items.push(el);
    },
    clear() {
      items.length = 0;
    },
    get values(): ReadonlyArray<T> {
      return items;
    },
  };
}

// Ref callback support
export type RefCallback<T extends Element> = (el: T | null) => void;
/* ========== Template Engine — DOM Binding Helpers ========== */
type RegisterCleanup = (fn: CleanupFn) => void;
const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: RegisterCleanup) => {
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
const applyPropBinding = (el: HTMLElement, binding: PropBinding, registerCleanup: RegisterCleanup) => {
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
) => {
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
const isHtmlBindingMarker = (node: Node): boolean =>
  node.nodeType === Node.COMMENT_NODE &&
  ((node as Comment).data === 'html-binding' || (node as Comment).data.startsWith('__h_'));
const htmlBindingClearAfter = (marker: Comment) => {
  let next = marker.nextSibling;
  while (next) {
    if (isHtmlBindingMarker(next)) break;
    const toRemove = next;
    next = next.nextSibling;
    toRemove.remove();
  }
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

const applyRefBinding = (el: HTMLElement, binding: RefBinding, registerCleanup: RegisterCleanup) => {
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

const applyModelBinding = (el: HTMLElement, binding: ModelBinding, registerCleanup: RegisterCleanup) => {
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
        el.removeAttribute(b.marker);
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
  // A plain getter function (() => T[]) must be wrapped so eachHelper can subscribe reactively.
  // A plain getter function (() => T[]) must be wrapped so eachHelper can subscribe reactively.
  // isSignal() guard prevents wrapping a ComputedSignal (which has value/peek but is not callable).
  const src = typeof source === 'function' && !isSignal(source) ? computed(source) : source;
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

  // Static array — render directly to HTMLResult (no reactivity or DOM reconciliation needed)
  const staticSrc = src as T[];
  if (staticSrc.length === 0) {
    if (empty) {
      const emptyResult = empty();
      const { html: eh, bindings: eb } = extractHtml(emptyResult);
      return makeHtmlResult(eh, eb);
    }
    return EMPTY_RESULT;
  }
  const allHtml: string[] = [];
  const allBindings: Binding[] = [];
  for (let i = 0; i < staticSrc.length; i++) {
    const { html: ih, bindings: ib } = extractHtml(template(staticSrc[i], i));
    allHtml.push(ih);
    allBindings.push(...ib);
  }
  return makeHtmlResult(allHtml.join(''), allBindings);
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

/* Template regex patterns — compiled once at module load, not per template call */
const RE_BOOL_ATTR = /\s+\?([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const RE_ATTR = /\s+:([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const RE_PROP = /\s+\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const RE_EVENT = /\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/;
const RE_REF = /\s+ref\s*=\s*["']?$/;
const RE_PLAIN_ATTR = /\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;

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

    if (typeof value === 'object' && 'type' in value && (value as WhenDirective).type === 'when') {
      const whenDir = value as WhenDirective;
      const res = resolveCondition(whenDir.condition) ? whenDir.thenBranch() : (whenDir.elseBranch?.() ?? '');

      if (!res) return '';

      const { bindings: whenBindings, html } = extractHtml(res);

      bindings.push(...whenBindings);

      return html;
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
    const boolMatch = RE_BOOL_ATTR.exec(str);
    const attrMatch = RE_ATTR.exec(str);
    const propMatch = RE_PROP.exec(str);
    const eventMatch = RE_EVENT.exec(str);
    const refMatch = RE_REF.exec(str);
    const plainAttrMatch = RE_PLAIN_ATTR.exec(str);

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
    if (hasKey(value, '__craftit_model')) {
      const marker = `data-${MARKER_PREFIX.model}${globalMarkerIndex++}`;
      const sig = (value as ModelDirective).__craftit_model;

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
        createAttrBinding('attr', plainAttrMatch[1], addMarker(str, plainAttrMatch, MARKER_PREFIX.attr), value),
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
    // A plain render function (() => string | HTMLResult) must be handled here.
    // isSignal() guard prevents treating a ComputedSignal as a render function.
    if (!htmlWrapper && typeof value === 'function' && !isSignal(value)) {
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
/** CSS properties that accept unitless numbers — adding `px` to these is incorrect */
const _UNITLESS_CSS_PROPS = new Set([
  'animation-iteration-count',
  'column-count',
  'columns',
  'fill-opacity',
  'flex',
  'flex-grow',
  'flex-shrink',
  'flex-order',
  'flood-opacity',
  'font-weight',
  'grid-column-end',
  'grid-column-start',
  'grid-row-end',
  'grid-row-start',
  'line-height',
  'opacity',
  'order',
  'orphans',
  'stop-opacity',
  'stroke-miterlimit',
  'stroke-opacity',
  'tab-size',
  'widows',
  'z-index',
  'zoom',
]);
export const html = Object.assign(
  (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult => htmlTemplate(strings, values, true),
  {
    /** Two-way binding shorthand — use as a prop value: html`<my-input ${html.bind(mySignal)} />` */
    bind: <T extends string | number | boolean>(sig: Signal<T>): ModelDirective<T> => ({ __craftit_model: sig }),
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
    //
    // @note Wraps content in `<span style="display: contents/none">`. Avoid inside
    // flex/grid containers where the wrapper span breaks layout. Use html.when instead.
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
      return resolveCondition(condition) ? makeHtmlResult(innerHtml, innerBindings) : EMPTY_RESULT;
    },
    style: (styles: Partial<CSSStyleDeclaration> | Record<string, string | number | null | undefined>): string =>
      Object.entries(styles)
        .filter(([, v]) => v != null)
        .map(([key, value]) => {
          const cssKey = toKebab(key);

          if (typeof value === 'number' && !_UNITLESS_CSS_PROPS.has(cssKey)) {
            return `${cssKey}: ${value}px`;
          }

          return `${cssKey}: ${value}`;
        })
        .join('; '),
    // Conditional rendering — binary form only.
    // For multi-branch else-if chains, use match() instead.
    when: <V extends string | HTMLResult>(
      condition: unknown | Signal<unknown> | (() => unknown),
      thenFn: () => V,
      elseFn?: () => V,
    ): V | WhenDirective | string => {
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

/**
 * Multi-branch conditional rendering with full TypeScript type safety.
 * Use instead of nesting `html.when()` for else-if chains.
 *
 * @example
 * match(
 *   [isAdmin, () => html`<admin-panel />`],
 *   [isEditor, () => html`<editor-panel />`],
 *   () => html`<viewer-panel />`,
 * )
 */
export function match<V extends string | HTMLResult>(
  ...args:
    | [...branches: Array<[condition: unknown | Signal<unknown> | (() => unknown), fn: () => V]>, fallback: () => V]
    | [...branches: Array<[condition: unknown | Signal<unknown> | (() => unknown), fn: () => V]>]
): V | WhenDirective | string {
  const lastArg = args[args.length - 1];
  const hasFallback = !Array.isArray(lastArg) && typeof lastArg === 'function';
  type Branch = [unknown | Signal<unknown> | (() => unknown), () => V];
  const branches = (hasFallback ? args.slice(0, -1) : args) as Branch[];
  const fallback = hasFallback ? (lastArg as () => V) : undefined;
  const isReactive = branches.some(([cond]) => isSignal(cond) || typeof cond === 'function');

  if (!isReactive) {
    for (const [cond, fn] of branches) {
      if (resolveCondition(cond as unknown)) return fn();
    }
    return fallback ? fallback() : ('' as V);
  }

  const conditionSignal = computed(() =>
    branches.some(([cond]) =>
      resolveCondition(isSignal(cond) ? cond.value : typeof cond === 'function' ? (cond as () => unknown)() : cond),
    ),
  );
  return {
    condition: conditionSignal,
    elseBranch: fallback,
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

/* ========== Runtime Helpers — suspense & bind ========== */
export const suspense = <T>(
  asyncFn: (signal?: AbortSignal) => Promise<T>,
  options: {
    deps?: ReadonlySignal<unknown> | ReadonlySignal<unknown>[];
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

  if (options.deps) {
    const depsArr = Array.isArray(options.deps) ? options.deps : [options.deps];
    const stop = _rawEffect(() => {
      for (const dep of depsArr) dep.value; // register all dep subscriptions
      untrack(run);
    });
    autoCleanup(stop);
  } else {
    run();
  }
  autoCleanup(() => controller?.abort());

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
    let content = '';

    for (let i = 0; i < strings.length; i++) {
      content += strings[i];
      if (i < values.length) {
        const v = values[i];
        content += v && typeof v === 'object' && 'content' in v ? (v as CSSResult).content : (v ?? '');
      }
    }

    return { content: content.trim(), toString: cssResultToString };
  },
  {
    theme: <T extends Record<string, string | number>>(
      light: T,
      dark?: Partial<T>,
      options?: { attribute?: string; selector?: string },
    ): ThemeVars<T> => {
      const selector = options?.selector ?? ':host';
      const attr = options?.attribute ?? 'data-theme';
      // Merge dark over light so partial overrides inherit unspecified keys from the light theme.
      const resolvedDark = dark ? ({ ...light, ...dark } as T) : undefined;
      const toVars = (obj: T) =>
        Object.entries(obj)
          .map(([key, val]) => {
            const cssVar = key.startsWith('--') ? key : `--${toKebab(key)}`;

            return `${cssVar}: ${val};`;
          })
          .join(' ');
      const cssRule = resolvedDark
        ? [
            `${selector} { ${toVars(light)} }`,
            '@media (prefers-color-scheme: dark) {',
            `  ${selector}:not([${attr}="light"]) { ${toVars(resolvedDark)} }`,
            '}',
            `${selector}[${attr}="dark"] { ${toVars(resolvedDark)} }`,
            `${selector}[${attr}="light"] { ${toVars(light)} }`,
          ].join('\n')
        : `${selector} { ${toVars(light)} }`;

      // Build the result object eagerly — full IDE completions and jump-to-definition.
      const vars = Object.fromEntries(
        Object.keys(light).map((key) => [key, `var(${key.startsWith('--') ? key : `--${toKebab(key)}`})`]),
      ) as ThemeVars<T>;
      // toString / Symbol.toPrimitive for CSS string interpolation: `${theme}`
      const toCss = () => cssRule;
      Object.defineProperty(vars, 'toString', { enumerable: false, value: toCss });
      Object.defineProperty(vars, Symbol.toPrimitive, { enumerable: false, value: toCss });
      return vars;
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
  onRendered: (() => void)[];
  onUnmount: CleanupFn[];
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
/** Runs once after the component's initial render and all `onMount` hooks have completed. */
export const onRendered = (fn: () => void): void => {
  currentRuntime().onRendered.push(fn);
};
/**
 * Registers a cleanup function.
 * - Inside a component setup or `onMount` callback: runs when the component
 *   unmounts. Prefer {@link onUnmount} for explicit lifecycle cleanup.
 * - Outside a component context (e.g. inside a plain `effect()`): delegates to
 *   stateit's `onCleanup`, which runs before each effect re-run.
 */
export const onCleanup = (fn: CleanupFn): void => {
  if (runtimeStack.length > 0) {
    currentRuntime().cleanups.push(fn);
  } else {
    _stateOnCleanup(fn);
  }
};
/** Registers a cleanup only when currently inside a component setup context. Avoids the repeated inline check pattern. */
const autoCleanup = (dispose: CleanupFn): void => {
  if (runtimeStack.length > 0) onCleanup(dispose);
};

/**
 * Creates a reactive effect that re-runs whenever its signal dependencies change.
 * When called inside a component setup function or `onMount` callback, the effect is
 * automatically cleaned up when the component unmounts — no manual `onCleanup` needed.
 * Outside a component context, behaves identically to stateit's `effect`.
 *
 * @example
 * // Inside setup — auto-cleaned on unmount:
 * effect(() => { document.title = props.title.value; });
 *
 * // Inside onMount — also auto-cleaned:
 * onMount(() => { effect(() => syncExternal(data.value)); });
 */
export const effect = (fn: () => void, options?: EffectOptions): CleanupFn => {
  const dispose = _rawEffect(fn, options);
  autoCleanup(dispose);
  return dispose;
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
  target: EventTarget | null | undefined,
  event: K | K[],
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void => {
  if (!target) return;
  const events = Array.isArray(event) ? event : [event];
  for (const ev of events) {
    target.addEventListener(ev, listener as EventListener, options);
    onCleanup(() => target.removeEventListener(ev, listener as EventListener, options));
  }
};

/**
 * Reactively synchronises Signal or getter values onto DOM element properties inside an `onMount` callback.
 * Creates a single tracked effect and registers its cleanup automatically — no manual teardown needed.
 *
 * @example
 * onMount(() => {
 *   syncDOMProps(inputRef.value!, {
 *     disabled: props.disabled,
 *     name: props.name,
 *     type: () => validateInputType(props.type.value),
 *   });
 * });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const syncDOMProps = <E extends Element>(
  el: E,
  map: Partial<Record<string, ReadonlySignal<unknown> | (() => unknown)>>,
): void => {
  effect(() => {
    for (const [key, src] of Object.entries(map)) {
      if (src !== undefined) {
        (el as unknown as Record<string, unknown>)[key] = typeof src === 'function' ? src() : src.value;
      }
    }
  });
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
 * Reactively sets ARIA attributes on an element.
 *
 * **Two call signatures:**
 * - `aria(attrs)` — targets the component host. Must be called during setup.
 * - `aria(target, attrs)` — targets any element; returns a cleanup function.
 *   When called inside {@link onMount}, returning the result is sufficient for auto-cleanup.
 *
 * Pass getter functions to make attributes reactive. Plain primitives are set once.
 * `null` / `undefined` / `false` remove the attribute.
 *
 * @example
 * // Host (during setup):
 * aria({ role: 'checkbox', checked: () => checked.value });
 *
 * // Inner element (inside onMount):
 * onMount(() => {
 *   return aria(inputRef.value!, {
 *     invalid: () => !!props.error.value,
 *     describedby: () => props.error.value ? errorId : helperId,
 *   });
 * });
 */
export function aria(attrs: Record<string, AriaAttrValue>): void;
export function aria(target: Element, attrs: Record<string, AriaAttrValue>): CleanupFn;
export function aria(
  targetOrAttrs: Element | Record<string, AriaAttrValue>,
  maybeAttrs?: Record<string, AriaAttrValue>,
): CleanupFn | undefined {
  const target = maybeAttrs !== undefined ? (targetOrAttrs as Element) : currentRuntime().el;
  const attrs = maybeAttrs !== undefined ? maybeAttrs : (targetOrAttrs as Record<string, AriaAttrValue>);
  const cleanups: CleanupFn[] = [];

  const applyAttr = (name: string, val: AriaAttrValue) => {
    const attrName = `aria-${name}`;
    const value = typeof val === 'function' ? (val as () => AriaAttrValue)() : val;
    if (value === null || value === undefined) {
      target.removeAttribute(attrName);
    } else {
      target.setAttribute(attrName, String(value));
    }
  };

  const hasReactive = Object.values(attrs).some((v) => typeof v === 'function');
  if (hasReactive) {
    const stop = effect(() => {
      for (const [name, value] of Object.entries(attrs)) applyAttr(name, value);
    });
    cleanups.push(stop);
  } else {
    for (const [name, value] of Object.entries(attrs)) applyAttr(name, value);
  }

  return maybeAttrs !== undefined ? () => runAll(cleanups) : undefined;
}

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

/** Module-level Map storing default values for contexts created with createContext(defaultValue). */
const _contextDefaults = new Map<symbol, { value: unknown }>();

export function inject<T>(key: InjectionKey<T> | string | symbol): T | undefined;
export function inject<T>(key: InjectionKey<T> | string | symbol, fallback: T): T;
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: context traversal requires DOM + logical parent + shadow root + default handling
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

  // Check for a default value registered at createContext(defaultValue) call time
  if (typeof key === 'symbol') {
    const ctxDefault = _contextDefaults.get(key);
    if (ctxDefault !== undefined) return ctxDefault.value as T;
  }

  if (arguments.length < 2) {
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

/**
 * Creates a strongly typed injection key.
 * Pass a default value to make inject() return it when no provider is found — no `| undefined` needed.
 *
 * @example
 * const THEME_CTX = createContext<ThemeColor>('default');
 * // inject(THEME_CTX) → ThemeColor  (never undefined)
 */
export function createContext<T>(): InjectionKey<T>;
export function createContext<T>(defaultValue: T): InjectionKey<T>;
export function createContext<T>(defaultValue?: T): InjectionKey<T> {
  const key = Symbol() as InjectionKey<T>;
  if (arguments.length > 0) _contextDefaults.set(key, { value: defaultValue as unknown });
  return key;
}

/**
 * Reactively inherits prop values from a context object provided by an ancestor component.
 * For each key, when the context value is not `undefined`, it is written into the matching prop signal.
 * The effect is automatically cleaned up when the component unmounts.
 *
 * @example
 * syncContextProps(inject(BUTTON_GROUP_CTX), props, ['color', 'size', 'variant']);
 */
export const syncContextProps = <
  K extends string,
  Ctx extends Partial<Record<K, ReadonlySignal<unknown>>>,
  Props extends Record<K, Signal<unknown>>,
>(
  ctx: Ctx | undefined,
  props: Props,
  keys: K[],
): void => {
  if (!ctx) return;
  // Defer to onMount so the effect runs after craftit's own attribute→prop sync
  // (the propsKey loop in connectedCallback). This ensures context values win
  // over HTML attribute values set on the child element.
  onMount(() =>
    effect(() => {
      for (const k of keys) {
        const v = ctx[k]?.value;
        if (v !== undefined) props[k].value = v;
      }
    }),
  );
};

/* ========== Slots API ========== */
export type SlotsAPI<T extends Record<string, unknown> = Record<string, unknown>> = {
  /**
   * Returns a `ReadonlySignal<boolean>` that is `true` when the slot has assigned content.
   * Reactive — use the returned signal directly in computed(), html templates, or effects.
   * @example const hasIcon = slots.has('icon'); // ReadonlySignal<boolean>
   */
  has(name: keyof T): ReadonlySignal<boolean>;
};

/**
 * Observes a named slot (or the default slot when `slotName` is `'default'` or `''`) and
 * calls `callback` with the list of assigned elements whenever the slot's children change.
 *
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   onSlotChange('default', (nodes) => {
 *     console.log('Default slot has', nodes.length, 'elements');
 *   });
 *   onSlotChange('icon', (nodes) => setHasIcon(nodes.length > 0));
 * });
 */
export const onSlotChange = (slotName: string, callback: (elements: Element[]) => void): void => {
  const el = currentRuntime().el;
  const name = slotName === 'default' ? '' : slotName;
  const selector = name ? `slot[name="${name}"]` : 'slot:not([name])';
  const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(selector);
  if (!slot) return;

  const handler = () => callback(slot.assignedElements({ flatten: true }));
  handler(); // run immediately with current content
  slot.addEventListener('slotchange', handler);
  onCleanup(() => slot.removeEventListener('slotchange', handler));
};

export const defineSlots = <T extends Record<string, unknown> = Record<string, unknown>>(): SlotsAPI<T> => {
  const el = currentRuntime().el;
  const sigs = new Map<string, Signal<boolean>>();

  const setup = (slotName: string, s: Signal<boolean>): (() => void) | undefined => {
    const slot = el.shadowRoot?.querySelector<HTMLSlotElement>(
      slotName ? `slot[name="${slotName}"]` : 'slot:not([name])',
    );
    if (!slot) return;
    const update = () => {
      const assigned = slot.assignedNodes();
      if (assigned.length > 0) {
        s.value = true;
      } else if (slotName === '') {
        // Fallback: JSDOM may not populate assignedNodes() synchronously before
        // the slotchange event fires. For the default slot, only count light-DOM
        // nodes that don't have an explicit slot attribute (those go to named slots).
        s.value = Array.from(el.childNodes).some((n) => {
          if (n.nodeType === Node.TEXT_NODE) return (n.textContent ?? '').trim().length > 0;
          if (n.nodeType === Node.ELEMENT_NODE) return !(n as Element).hasAttribute('slot');
          return false;
        });
      } else {
        s.value = false;
      }
    };
    update();
    slot.addEventListener('slotchange', update);
    return () => slot.removeEventListener('slotchange', update);
  };

  const get = (slotName: string): Signal<boolean> => {
    if (!sigs.has(slotName)) {
      const s = signal(false);
      sigs.set(slotName, s);
      // During setup shadow DOM isn't rendered yet — defer to onMount.
      // Post-mount (e.g. test access) shadow DOM is ready, set up immediately.
      if (runtimeStack.length > 0) {
        onMount(() => setup(slotName, s));
      } else {
        setup(slotName, s);
      }
    }
    return sigs.get(slotName)!;
  };

  return {
    has(name: keyof T): ReadonlySignal<boolean> {
      return get(name === 'default' ? '' : String(name));
    },
  };
};

/* ========== Focus Trap ========== */

const _focusableSelectors = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'details > summary',
].join(',');

/**
 * Returns all keyboard-focusable descendants of `root` in DOM order.
 */
export const getFocusableElements = (root: Element): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(_focusableSelectors)).filter(
    (el) => !el.closest('[inert]') && getComputedStyle(el).display !== 'none',
  );

/**
 * Traps keyboard focus inside `container` (or the element returned by the
 * getter). Tab cycles forward through focusable children; Shift+Tab cycles
 * backward. Focus loops when the boundary is reached.
 *
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   useFocusTrap(dialogRef.value!);
 * });
 */
export const useFocusTrap = (container: HTMLElement | (() => HTMLElement | null)): void => {
  const getContainer = typeof container === 'function' ? container : () => container;
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const root = getContainer();
    if (!root) return;
    const focusable = getFocusableElements(root);
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKeydown);
  onCleanup(() => document.removeEventListener('keydown', onKeydown));
};

/* ========== Platform Observer Composables ========== */

/**
 * Observes an element's content-box size via `ResizeObserver`.
 * Returns a `ReadonlySignal` that updates whenever the dimensions change.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   const size = observeResize(containerRef.value!);
 *   effect(() => console.log(size.value.width, size.value.height));
 * });
 */
export const observeResize = (el: Element): ReadonlySignal<{ width: number; height: number }> => {
  const size = signal({ height: 0, width: 0 });
  const ro = new ResizeObserver(([entry]) => {
    if (!entry) return;
    const box = entry.contentBoxSize[0];
    if (box) size.value = { height: box.blockSize, width: box.inlineSize };
  });
  ro.observe(el);
  onCleanup(() => ro.disconnect());
  return size;
};

/**
 * Observes an element's intersection with its root via `IntersectionObserver`.
 * Returns a `ReadonlySignal` that updates on each intersection change.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   const entry = observeIntersection(el);
 *   effect(() => { if (entry.value?.isIntersecting) loadContent(); });
 * });
 */
export const observeIntersection = (
  el: Element,
  options?: IntersectionObserverInit,
): ReadonlySignal<IntersectionObserverEntry | null> => {
  const entry = signal<IntersectionObserverEntry | null>(null);
  const io = new IntersectionObserver(([e]) => {
    if (e) entry.value = e;
  }, options);
  io.observe(el);
  onCleanup(() => io.disconnect());
  return entry;
};

/**
 * Reactively tracks a CSS media query match state via `window.matchMedia`.
 * Returns a `ReadonlySignal<boolean>` that updates when the match changes.
 * Must be called inside an {@link onMount} callback (or at the top level for
 * global media queries outside of components).
 *
 * @example
 * onMount(() => {
 *   const prefersMotion = observeMedia('(prefers-reduced-motion: no-preference)');
 *   effect(() => setAnimated(prefersMotion.value));
 * });
 */
export const observeMedia = (query: string): ReadonlySignal<boolean> => {
  const mql = window.matchMedia(query);
  const matches = signal(mql.matches);
  const handler = (e: MediaQueryListEvent): void => {
    matches.value = e.matches;
  };
  mql.addEventListener('change', handler);
  onCleanup(() => mql.removeEventListener('change', handler));
  return matches;
};

/* ========== Type-safe Event Emitter ========== */
export type EmitFn<T extends Record<string, unknown>> = {
  <K extends { [P in keyof T]: T[P] extends undefined ? P : never }[keyof T]>(event: K): void;
  <K extends keyof T>(event: K, detail: T[K]): void;
};

export const defineEmits = <T extends Record<string, unknown>>(): EmitFn<T> => {
  const el = currentRuntime().el;

  return (<K extends keyof T>(event: K, detail?: T[K]) => {
    el.dispatchEvent(new CustomEvent(String(event), { bubbles: true, composed: true, detail }));
  }) as EmitFn<T>;
};

/* ========== Form-associated custom elements ========== */
type FormAssociatedCallbacks = {
  formAssociated?: (form: HTMLFormElement | null) => void;
  formDisabled?: (disabled: boolean) => void;
  formReset?: () => void;
  formStateRestore?: (state: unknown, mode: 'autocomplete' | 'restore') => void;
};

const formCallbacksKey = Symbol('craftit.formCallbacks');
const _internalsKey = Symbol('craftit.internals');

interface FormHost extends HTMLElement {
  [formCallbacksKey]?: FormAssociatedCallbacks;
}
interface InternalsHost extends HTMLElement {
  [_internalsKey]?: ElementInternals;
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

/**
 * Callbacks that hook into form lifecycle events. Can be passed directly to {@link defineField}
 * as a second argument to keep all form logic co-located.
 */
export type FormFieldCallbacks = {
  onAssociated?: (form: HTMLFormElement | null) => void;
  onDisabled?: (disabled: boolean) => void;
  onReset?: () => void;
  onStateRestore?: (state: unknown, mode: 'autocomplete' | 'restore') => void;
};

export type FormFieldOptions<T = unknown> = {
  disabled?: Signal<boolean> | ReadonlySignal<boolean>;
  toFormValue?: (value: T) => File | FormData | string | null;
  value: Signal<T> | ReadonlySignal<T>;
};
export type FormFieldHandle = {
  readonly internals: ElementInternals;
  checkValidity: () => boolean;
  reportValidity: () => boolean;
  setCustomValidity: (message: string) => void;
  setValidity: ElementInternals['setValidity'];
};
export const defineField = <T = unknown>(
  options: FormFieldOptions<T>,
  callbacks?: FormFieldCallbacks,
): FormFieldHandle => {
  const rt = currentRuntime();
  const host = rt.el as InternalsHost;

  const internals = host[_internalsKey] ?? host.attachInternals();

  host[_internalsKey] = internals;

  const toFormValue = options.toFormValue ?? ((v: T) => (v == null ? '' : String(v)));

  effect(() => {
    internals.setFormValue(toFormValue(options.value.value));
  });

  if (options.disabled) {
    effect(() => {
      options.disabled!.value ? internals.states.add('disabled') : internals.states.delete('disabled');
    });
  }

  if (callbacks?.onReset) onFormReset(callbacks.onReset);
  if (callbacks?.onAssociated) onFormAssociated(callbacks.onAssociated);
  if (callbacks?.onDisabled) onFormDisabled(callbacks.onDisabled);
  if (callbacks?.onStateRestore) onFormStateRestore(callbacks.onStateRestore);

  const checkValidity = () => internals.checkValidity();
  const reportValidity = () => internals.reportValidity();
  const setCustomValidity = (message: string) =>
    message ? internals.setValidity({ customError: true }, message) : internals.setValidity({});

  return {
    checkValidity,
    internals,
    reportValidity,
    setCustomValidity,
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
  /** When `true`, removes the host attribute instead of setting it to `""` when the value is an empty string. */
  omit?: boolean;
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

/** Returns a Signal<T> whose value setter validates before writing.
 * Wraps the underlying signal in a Proxy, pre-binding method references to avoid
 * per-access closure allocation on the hot `get` path. */
const validatedSignal = <T>(defaultValue: T, validator: (v: T) => boolean, propName: string): Signal<T> => {
  const s = signal<T>(defaultValue);
  // Pre-bind all prototype methods once so the get trap never allocates new closures.
  const boundMethods = new Map<PropertyKey, unknown>();
  return new Proxy(s, {
    get(target, prop) {
      if (prop === 'value') return target.value;
      const cached = boundMethods.get(prop);
      if (cached !== undefined) return cached;
      const val = Reflect.get(target, prop, target);
      const result = typeof val === 'function' ? val.bind(target) : val;
      boundMethods.set(prop, result);
      return result;
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
    reflect: options?.reflect ?? true,
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

  if (options?.reflect ?? true) {
    const omit = options?.omit ?? false;
    rt.onMount.push(() => {
      rt.cleanups.push(
        _rawEffect(() => {
          const v = s.value;

          v == null || v === false || (omit && v === '')
            ? el.removeAttribute(name)
            : el.setAttribute(name, v === true ? '' : String(v));
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
export type InferPropsSignals<T extends Record<string, { default: unknown }>> = {
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
// Implementation shared by both overloads
const _definePropsImpl = <T extends Record<string, { default: unknown }>>(defs: T): InferPropsSignals<T> => {
  const rt = currentRuntime();
  const el = rt.el as PropHost;
  const result = {} as Record<string, Signal<unknown>>;

  // First, create all props. Both defineProps() and standalone prop() reflect by default — components depend on :host([attr]) CSS selectors.
  // Use { reflect: false } in PropOptions to opt out of attribute reflection for standalone prop() calls.
  for (const [name, def] of Object.entries(defs)) {
    // Map camelCase keys to kebab-case attribute names (HTML spec convention).
    // e.g. defineProps({ myProp: { default: '' } }) registers the "my-prop" attribute
    // but the signal is accessed as props.myProp.
    const propDef: PropOptions<unknown> = { reflect: true, ...(def as PropOptions<unknown>) };
    result[name] = prop(toKebab(name), def.default, propDef);
  }

  // Then, immediately read initial attribute values
  // This ensures boolean attributes and other initial values are set correctly
  if (el[propsKey]) {
    for (const [attrName, meta] of el[propsKey]) {
      if (el.hasAttribute(attrName)) {
        const attrValue = el.getAttribute(attrName);
        meta.signal.value = meta.parse(attrValue) as never;
      }
    }
  }

  return result as InferPropsSignals<T>;
};

/**
 * Declares multiple props at once, deriving attribute names from object keys.
 *
 * **Two call signatures:**
 * - `defineProps(defs)` — free-form; TypeScript infers signal types from the defaults.
 * - `defineProps<MyInterface>(defs)` — enforces that every key in
 *   `MyInterface` is present and typed correctly.
 *
 * @example
 * // Free-form:
 * const props = defineProps({ count: { default: 0 }, label: { default: '' } });
 *
 * // Interface-constrained:
 * const props = defineProps<ButtonProps>({
 *   color: typed<ThemeColor | undefined>(undefined),
 *   disabled: { default: false },
 * });
 */
export function defineProps<D extends Record<string, { default: unknown }>>(defs: D): InferPropsSignals<D>;
export function defineProps<P>(defs: { [K in keyof Required<P>]: PropDef<P[K]> }): {
  [K in keyof P]-?: Signal<NonNullable<P[K]>>;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
// biome-ignore lint/suspicious/noExplicitAny: implementation overload must accept any for overload resolution
export function defineProps(defs: any): any {
  return _definePropsImpl(defs);
}
/* ========== Component Definition ========== */
/** Context object passed as the first argument to every `define()` setup function. */
export type SetupContext = {
  /** The host `HTMLElement` instance for this component. */
  host: HTMLElement;
  /** Shorthand for `host.shadowRoot` — the component's open shadow root. */
  shadow: ShadowRoot;
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
  /** Shadow root init options (mode is always 'open') — use e.g. `{ delegatesFocus: true }` for form controls */
  shadow?: Omit<ShadowRootInit, 'mode'>;
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
/* Global keyed state storage removed — keyed states are now owned per-element via _keyedStates */

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

/** Finds a comment node matching `marker` within an array of nodes and their subtrees. */
const findCommentInNodes = (nodes: Node[], marker: string): Comment | null => {
  for (const node of nodes) {
    const found = findCommentMarker(node, marker);
    if (found) return found;
  }
  return null;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keyed item binding requires handling multiple binding types
const applyKeyedItemBindings = (nodes: Node[], itemBindings: Binding[], container: ParentNode): CleanupFn[] => {
  const itemCleanups: CleanupFn[] = [];
  const itemRegisterCleanup: RegisterCleanup = (fn) => itemCleanups.push(fn);

  for (const binding of itemBindings) {
    // Text bindings use comment markers, not element attributes — handle separately.
    if (binding.type === 'text') {
      const found = findCommentInNodes(nodes, binding.marker);
      if (found) {
        const textNode = document.createTextNode('');
        found.replaceWith(textNode);
        itemRegisterCleanup(
          _rawEffect(() => {
            textNode.textContent = String(binding.signal.value);
          }),
        );
      }
      continue;
    }

    const el = queryWithinNodes(nodes, binding.marker);
    if (!el && binding.type !== 'ref') continue;

    if (binding.type === 'prop') {
      applyPropBinding(el!, binding, itemRegisterCleanup);
    } else if (binding.type === 'event') {
      applyEventBinding(el!, binding, itemRegisterCleanup, false);
    } else if (binding.type === 'attr') {
      applyAttrBinding(el!, binding, itemRegisterCleanup);
    } else if (binding.type === 'model') {
      applyModelBinding(el!, binding, itemRegisterCleanup);
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
  /** Attribute names observed by the browser via attributeChangedCallback. Set per-subclass by define(). */
  static observedAttributes: string[] = [];
  [contextKey]?: Map<InjectionKey<unknown> | string | symbol, unknown>;
  [formCallbacksKey]?: FormAssociatedCallbacks;
  [propsKey]?: Map<string, PropMeta>;
  shadow: ShadowRoot;
  private _attrObserver: MutationObserver | null = null;
  private _keyedStates = new Map<string, Map<string | number, KeyedNode>>();
  private _mounted = false;
  // biome-ignore lint/suspicious/noConfusingVoidType: void is needed for optional cleanup returns in lifecycle array
  private _onMountFns: (() => CleanupFn | undefined | void)[] = [];
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
    const shadowInit = (this.constructor as typeof CraftitBaseElement)._options?.shadow;
    this.shadow = this.attachShadow({ mode: 'open', ...shadowInit });
    this.runtime = {
      cleanups: [],
      el: this,
      onMount: [],
      onRendered: [],
      onUnmount: [],
    };
  }
  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    // Guard: skip if setup hasn't run yet (attributes can be observed before connectedCallback)
    if (this._setupDone) this.handleAttributeChange(name, oldValue, newValue);
  }
  connectedCallback(): void {
    const options = (this.constructor as typeof CraftitBaseElement)._options;

    if (this._initPortal(options)) return;
    if (!this._setupDone) this._runSetup();

    if (this[propsKey]) {
      for (const [attrName, meta] of this[propsKey]) {
        if (this.hasAttribute(attrName)) {
          meta.signal.value = meta.parse(this.getAttribute(attrName)) as never;
        } else if (meta.required) {
          console.warn(`[craftit] <${this.localName}> missing required prop "${attrName}"`);
        }
      }
    }

    this._initAttrObserver();
    this.init();
  }
  private _initPortal(options: DefineOptions | undefined): boolean {
    if (!options?.target || this._isPortaling || this._portalTarget) return false;

    const target = typeof options.target === 'string' ? document.querySelector(options.target) : options.target;
    if (target instanceof HTMLElement) {
      this._portalTarget = target;
      this._originalParent = {
        nextSibling: this.nextSibling,
        parent: this.parentNode!,
      };

      // Register a logical parent BEFORE moving the element.
      // This preserves the component hierarchy for provide/inject.
      // When the element is a direct child of a ShadowRoot, the parentElement is null
      // (ShadowRoot is not an Element), so we fall back to the shadow host.
      const rootNode = this.getRootNode();
      const logicalParent =
        this.parentElement ?? (rootNode instanceof ShadowRoot ? (rootNode.host as HTMLElement) : null);
      if (logicalParent) _logicalParents.set(this, logicalParent);

      this._isPortaling = true;
      target.appendChild(this);
      this._isPortaling = false;
      // appendChild triggers another connectedCallback where initialization will happen
      return true;
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
    return false;
  }
  private _runSetup(): void {
    this._setupDone = true;
    runtimeStack.push(this.runtime);

    let res: unknown;

    try {
      res = (this.constructor as typeof CraftitBaseElement)._setup({ host: this, shadow: this.shadow });
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
  private _initAttrObserver(): void {
    if (!this[propsKey]) return;
    // Browsers snapshot `observedAttributes` at customElements.define() time — before props are
    // known — so attributeChangedCallback is never triggered in real browsers. MutationObserver
    // is therefore always required to propagate attribute changes to prop signals.
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
    this._attrObserver.observe(this, { attributeOldValue: true, attributes: true });
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

    runAll(this.runtime.onUnmount);
    runAll(this.runtime.cleanups);
    this.runtime.cleanups = [];
    this.runtime.onUnmount = [];
    // Restore onMount hooks so they re-run on reconnect (#4)
    this.runtime.onMount = this._onMountFns.slice();
    this.appliedHtmlBindings.clear();
    this._mounted = false;

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
    let lastHtml: string | null = null;
    let lastInsertedNodes: Node[] = [];
    const stop = effect(() => {
      batch(() => {
        const data = b.signal.value;

        if (!b.keyed && data.html === lastHtml) {
          return;
        }

        lastHtml = data.html;

        runCurrentCleanups();

        const { bindings, html, keys } = data;
        if (b.keyed && !this._keyedStates.has(b.marker)) this._keyedStates.set(b.marker, new Map());
        const keyedState = b.keyed ? this._keyedStates.get(b.marker)! : null;
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

              this._keyedStates.set(b.marker, newKeyedState);
            } else {
              // Non-keyed or empty list: remove previously inserted nodes.
              // When keyed, the existing nodes are owned by keyedState (not lastInsertedNodes),
              // so we must clean them up here on the transition to empty/non-keyed.
              if (b.keyed && keyedState && keyedState.size > 0) {
                for (const [, kn] of keyedState) htmlBindingRemoveKeyed(kn);
              } else {
                for (const n of lastInsertedNodes) n.parentNode?.removeChild(n);
              }
              const parsed = parseHTML(html);
              lastInsertedNodes = Array.from(parsed.childNodes);
              marker.after(parsed);
              if (b.keyed) this._keyedStates.set(b.marker, new Map());
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
    if (b.keyed) registerCleanup(() => this._keyedStates.delete(b.marker));
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
  private init(): void {
    try {
      // Apply styles async (non-blocking — no layout impact on first paint)
      if (this._styles?.length) {
        Promise.all(this._styles.map(loadStylesheet))
          .then((sheets) => {
            this.shadow.adoptedStyleSheets = sheets;
          })
          .catch((err) => console.error(`[craftit] <${this.localName}> failed to load styles:`, err));
      }

      if (this._template) this.render(this._template);

      runtimeStack.push(this.runtime);

      try {
        const fns = this.runtime.onMount;
        this._onMountFns = fns.slice(); // save originals for reconnect (#4)
        for (const fn of fns) {
          const cleanup = fn();

          if (typeof cleanup === 'function') this.runtime.cleanups.push(cleanup);
        }
      } finally {
        runtimeStack.pop();
      }

      this.runtime.onMount = [];
      this._mounted = true;
      for (const fn of this.runtime.onRendered) fn();
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

    this.shadow.replaceChildren(parseHTML(htmlResult.__html));
    this.applyBindings(htmlResult.__bindings);
    if (this._mounted) {
      for (const fn of this.runtime.onRendered) fn();
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
