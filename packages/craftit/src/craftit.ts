/** @vielzeug/craftit — Functional, signals-based web component library.
 * Signal primitives (Signal, signal, effect, computed, batch, watch, derived,
 * writable, onCleanup, etc.) are provided by @vielzeug/stateit and
 * re-exported here for convenience.
 */

// ─── Signal primitives (re-exported from @vielzeug/stateit) ──────────────────
export * from '@vielzeug/stateit';

import * as stateit from '@vielzeug/stateit';
import {
  batch,
  type CleanupFn,
  computed,
  type EffectCallback,
  type EffectOptions,
  isSignal,
  type ReadonlySignal,
  type Signal,
  signal,
  type Subscription,
  untrack,
  type WatchOptions,
} from '@vielzeug/stateit';

// Internal iterate-and-call helper — used by a component disconnectedCallback.
const runAll = (fns: Iterable<() => void>): void => {
  for (const fn of fns) fn();
};

/** Sentinel used to distinguish "argument not passed" from `undefined` in overloaded functions. */
const _UNSET = Symbol('craftit.unset');

/* ========== Watch (component-context-aware) ========== */
/**
 * Watches a Signal and calls cb with (next, prev) whenever its value changes.
 * Watches an array of Signals and calls cb (no args) whenever any of them changes.
 * When called inside a component setup function, the watcher is automatically
 * cleaned up when the component unmounts — no manual cleanup needed.
 */
export function watch<T>(
  source: ReadonlySignal<T>,
  cb: (value: T, prev: T) => void,
  options?: WatchOptions<T>,
): Subscription;
export function watch(
  sources: ReadonlyArray<ReadonlySignal<unknown>>,
  cb: () => void,
  options?: WatchOptions<unknown>,
): Subscription;
export function watch(
  source: ReadonlySignal<unknown> | ReadonlyArray<ReadonlySignal<unknown>>,
  cb: ((value: unknown, prev: unknown) => void) | (() => void),
  options?: WatchOptions<unknown>,
): Subscription {
  if (Array.isArray(source)) {
    const opts = options;
    let initialized = false;
    const dispose = effect(() => {
      for (const s of source) void s.value; // register all listed deps

      if (!initialized) {
        initialized = true;

        if (opts?.immediate) untrack(cb as () => void);
      } else {
        untrack(cb as () => void);

        if (opts?.once) dispose();
      }
    });

    return dispose;
  }

  const stop = stateit.watch(source as ReadonlySignal<unknown>, cb as (value: unknown, prev: unknown) => void, options);

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

const toKebab = (str: string): string => str.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const _ESC: Record<string, string> = { "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export const escapeHtml = (value: unknown): string => String(value).replace(/[&<>"']/g, (c) => _ESC[c]);

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
type EventBinding = {
  handler: (e: Event) => void;
  marker: string;
  name: string;
  type: 'event';
};
type RefBinding = {
  marker: string;
  ref: Ref<Element> | RefCallback<Element>;
  type: 'ref';
};
type CallbackBinding = {
  apply: (el: HTMLElement, registerCleanup: (fn: () => void) => void) => void;
  marker: string;
  type: 'callback';
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
export type Binding = TextBinding | AttrBinding | EventBinding | RefBinding | CallbackBinding | HtmlBinding;
/** @internal — opaque marker carried by each() reactive results */
export const EACH_SIGNAL: unique symbol = Symbol('craftit.eachSignal');
export type EachResult =
  | HTMLResult
  | {
      [EACH_SIGNAL]: ReadonlySignal<{
        bindings: Binding[];
        html: string;
        items?: Array<{ bindings: Binding[]; html: string }>;
        keys?: (string | number)[];
      }>;
    };
/**
 * Descriptor returned by any spread-position directive (e.g. `bind()`).
 * The `__craftit_directive` callback is invoked by the runtime once the element
 * is in the DOM and ready. `registerCleanup` ties the cleanup to the component
 * lifetime automatically.
 *
 * @example
 * // Custom spread directive:
 * function myDirective(): DirectiveDescriptor {
 *   return { __craftit_directive: (el, cleanup) => { ... } };
 * }
 * html`<div ${myDirective()}></div>`
 */
export interface DirectiveDescriptor {
  /** @internal */
  __craftit_directive: (el: HTMLElement, registerCleanup: (fn: () => void) => void) => void;
}
export type HTMLResult = {
  __bindings: Binding[];
  __html: string;
  toString(): string;
};
/** @internal — construct an HTMLResult from a pre-built html string and bindings. */
export function htmlResult(html: string, bindings: Binding[] = []): HTMLResult {
  return {
    __bindings: bindings,
    __html: html,
    toString() {
      return html;
    },
  };
}
/** @internal — extract html and bindings from a string or HTMLResult. */
export function extractResult(v: string | HTMLResult): { bindings: Binding[]; html: string } {
  return typeof v === 'string' ? { bindings: [], html: v } : { bindings: v.__bindings, html: v.__html };
}
/**
 * Returns `computed(build)` when `hasReactive` is true, otherwise calls `build()` directly.
 * Shared by `classes()` and `style()` to avoid duplicating the static/reactive dispatch.
 */
export function computedOrStatic<T>(hasReactive: boolean, build: () => T): T | ReadonlySignal<T> {
  return hasReactive ? computed(build) : build();
}
/* Ref objects and callbacks */
export interface Ref<T extends Element> {
  value: T | null;
}
export function ref<T extends Element>(): Ref<T> {
  return { value: null };
}

// Ref callback support
export type RefCallback<T extends Element> = (el: T | null) => void;
/* ========== Template Engine — DOM Binding Helpers ========== */
type RegisterCleanup = (fn: CleanupFn) => void;

const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: RegisterCleanup) => {
  const update = (v: unknown) => {
    if (binding.mode === 'bool') {
      el.toggleAttribute(binding.name, Boolean(v));
    } else {
      if (v == null || v === false) {
        el.removeAttribute(binding.name);
      } else {
        el.setAttribute(binding.name, String(v));
      }
    }
  };

  if (binding.signal) {
    registerCleanup(effect(() => update(binding.signal!.value)));
  } else {
    update(binding.value!);
  }
};
const applyEventBinding = (el: HTMLElement, binding: EventBinding, registerCleanup: RegisterCleanup) => {
  el.addEventListener(binding.name, binding.handler);
  registerCleanup(() => el.removeEventListener(binding.name, binding.handler));
};
/* ========== Template Engine — Directives & Builder ========== */
const hasKey = (obj: unknown, key: string): boolean => typeof obj === 'object' && !!obj && key in obj;

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
  for (const n of keyedNode.nodes) (n as ChildNode).remove();
};
const htmlBindingInsertBefore = (marker: Comment, nodes: Node[], before: Node | null) => {
  if (marker.parentNode) {
    for (const node of nodes) marker.parentNode.insertBefore(node, before);
  }
};
const isHtmlResult = (value: unknown): value is HTMLResult => typeof value === 'object' && !!value && '__html' in value;

const applyRefBinding = (el: HTMLElement, binding: RefBinding, registerCleanup: RegisterCleanup) => {
  const bindingRef = binding.ref;

  if (typeof bindingRef === 'function') {
    bindingRef(el as never);
    registerCleanup(() => bindingRef(null));
  } else {
    bindingRef.value = el as never;
    registerCleanup(() => {
      bindingRef.value = null;
    });
  }
};

/** Helper to apply bindings in a container - reduces duplication */
const applyBindingsInContainer = (
  container: ParentNode,
  bindings: Binding[],
  registerCleanup: RegisterCleanup,
  opts?: { onHtml?: (b: HtmlBinding) => void },
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
        else if (b.type === 'event') applyEventBinding(el, b, registerCleanup);
        else if (b.type === 'ref') applyRefBinding(el, b, registerCleanup);
        else if (b.type === 'callback') b.apply(el, registerCleanup);
      }
    }
  }
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
/** Marker attribute prefixes — centralised so a typo causes a TS error rather than a silent selector miss. */
const MARKER_PREFIX = {
  attr: 'a',
  bool: 'b',
  directive: 'd',
  event: 'e',
  html: '__h_',
  ref: 'r',
} as const;

/**
 * @internal — regex that matches any marker string embedded in craftit-generated HTML.
 * Used by `each()` when renumbering markers across list items. Must stay in sync with
 * `MARKER_PREFIX` and the `__s_` signal-text marker format.
 * The `g` flag is required — `String.replace` with `/g` replaces all occurrences.
 */
export const MARKER_PATTERN = /data-[a-z]\d+|__h_\d+|__s_\d+/g;

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
const RE_EVENT = /\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/;
const RE_REF = /\s+ref\s*=\s*["']?$/;
const RE_PLAIN_ATTR = /\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;

/* Internal template function */
const htmlTemplate = (strings: TemplateStringsArray, values: unknown[]): HTMLResult => {
  let result = '';
  const bindings: Binding[] = [];
  const resolveDirectiveValue = (value: unknown): string => {
    if (typeof value === 'string') return escapeHtml(value);

    if (value == null) return '';

    // HTMLResult is always kept as raw HTML
    if (isHtmlResult(value)) return value.__html;

    return escapeHtml(String(value));
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

    // Evaluate each regex only when the preceding pattern didn't match — avoids
    // running all six patterns unconditionally on every template interpolation slot.
    const boolMatch = RE_BOOL_ATTR.exec(str);

    if (boolMatch) {
      bindings.push(createAttrBinding('bool', boolMatch[1], addMarker(str, boolMatch, MARKER_PREFIX.bool), value));
      continue;
    }

    const attrMatch = RE_ATTR.exec(str);

    if (attrMatch) {
      bindings.push(createAttrBinding('attr', attrMatch[1], addMarker(str, attrMatch, MARKER_PREFIX.attr), value));
      continue;
    }

    const eventMatch = RE_EVENT.exec(str);

    if (eventMatch) {
      const m = addMarker(str, eventMatch, MARKER_PREFIX.event);

      if (typeof value === 'function') {
        bindings.push({
          handler: value as (e: Event) => void,
          marker: m,
          name: eventMatch[1].split('.')[0],
          type: 'event',
        });
      }

      continue;
    }

    const refMatch = RE_REF.exec(str);

    if (refMatch) {
      const m = addMarker(str, refMatch, MARKER_PREFIX.ref);

      if (value) {
        bindings.push({
          marker: m,
          ref: value as Ref<Element> | RefCallback<Element>,
          type: 'ref',
        });
      }

      continue;
    }

    const plainAttrMatch = RE_PLAIN_ATTR.exec(str);

    if (plainAttrMatch) {
      bindings.push(
        createAttrBinding('attr', plainAttrMatch[1], addMarker(str, plainAttrMatch, MARKER_PREFIX.attr), value),
      );
      continue;
    }

    // Spread-position directive — any object with __craftit_directive (e.g. bind())
    if (hasKey(value, '__craftit_directive')) {
      const marker = `data-${MARKER_PREFIX.directive}${globalMarkerIndex++}`;

      result += `${str}${marker}=""`;
      bindings.push({ apply: (value as DirectiveDescriptor).__craftit_directive, marker, type: 'callback' });
      continue;
    }

    /*  Reactive HTML wrappers  */
    let htmlWrapper: { __htmlSignal: ReadonlySignal<{ bindings: Binding[]; html: string }> } | null = null;
    let isKeyed = false;

    if (typeof value === 'object' && value !== null && EACH_SIGNAL in value) {
      htmlWrapper = {
        __htmlSignal: (
          value as {
            [EACH_SIGNAL]: ReadonlySignal<{
              bindings: Binding[];
              html: string;
              items?: Array<{ bindings: Binding[]; html: string }>;
              keys?: (string | number)[];
            }>;
          }
        )[EACH_SIGNAL],
      };
      isKeyed = true;
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

    // Signal interpolation with HTMLResult => reactive HTML
    if (!htmlWrapper && isSignal(value) && isHtmlResult(value.value)) {
      htmlWrapper = {
        __htmlSignal: computed(() => {
          const val = (value as ReadonlySignal<unknown>).value;

          return isHtmlResult(val)
            ? { bindings: val.__bindings, html: val.__html }
            : { bindings: [], html: String(val) };
        }),
      };
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

/* ========== Template Engine — html ========== */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult => htmlTemplate(strings, values);

/* ========== CSS Helper ========== */
export type CSSResult = {
  content: string;
  toString(): string;
};

const cssResultToString = function (this: CSSResult): string {
  return this.content;
};

export const css = (strings: TemplateStringsArray, ...values: unknown[]): CSSResult => {
  let content = '';

  for (let i = 0; i < strings.length; i++) {
    content += strings[i];

    if (i < values.length) {
      const v = values[i];

      content += v && typeof v === 'object' && 'content' in v ? (v as CSSResult).content : (v ?? '');
    }
  }

  return { content: content.trim(), toString: cssResultToString };
};

/* ========== Component Runtime & Lifecycle ========== */
type ComponentRuntime = {
  cleanups: CleanupFn[];
  el: HTMLElement;
  errorHandlers: ((err: unknown) => void)[];
  onMount: (() => CleanupFn | undefined | void)[];
};

const runtimeStack: ComponentRuntime[] = [];
const currentRuntime = (): ComponentRuntime => {
  const rt = runtimeStack[runtimeStack.length - 1];

  if (!rt) throw new Error('[craftit] lifecycle API used outside of component setup/instance');

  return rt;
};

export const onMount = (fn: () => CleanupFn | undefined | void): void => {
  currentRuntime().onMount.push(fn);
};
/** Runs when the element disconnects from the DOM. Use for external subscriptions or resources tied to component lifetime. */
/**
 * Registers a cleanup function.
 * - Inside a component setup or `onMount` callback: runs when the component
 *   unmounts. Prefer {@link onCleanup} for explicit lifecycle cleanup.
 * - Outside a component context (e.g. inside a plain `effect()`): delegates to
 *   stateit's `onCleanup`, which runs before each effect re-run.
 */
export const onCleanup = (fn: CleanupFn): void => {
  if (runtimeStack.length > 0) {
    currentRuntime().cleanups.push(fn);
  } else {
    stateit.onCleanup(fn);
  }
};

/**
 * Registers a scoped error handler for this component.
 * Called when an unhandled error is thrown during setup, `onMount` callbacks,
 * or rendering. If no handler is registered, errors are logged to the console.
 *
 * @example
 * define('my-component', () => {
 *   onError((err) => console.error('Component error:', err));
 *   // ... rest of setup
 * });
 */
export const onError = (fn: (err: unknown) => void): void => {
  currentRuntime().errorHandlers.push(fn);
};

/** Registers a cleanup only when currently inside a component setup context. Avoids the repeated inline check pattern. */
const autoCleanup = (dispose: Subscription | CleanupFn): void => {
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
export const effect = (fn: EffectCallback, options?: EffectOptions): Subscription => {
  const dispose = stateit.effect(fn, options);

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
  event: K,
  listener: (e: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
): void => {
  if (!target) return;

  target.addEventListener(event, listener as EventListener, options);
  onCleanup(() => target.removeEventListener(event, listener as EventListener, options));
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

  const applyAttr = (name: string, val: AriaAttrValue) => {
    const attrName = `aria-${name}`;
    const value = typeof val === 'function' ? (val as () => AriaAttrValue)() : val;

    if (value === null || value === undefined) {
      target.removeAttribute(attrName);
    } else {
      target.setAttribute(attrName, String(value));
    }
  };

  const stop = effect(() => {
    for (const [name, value] of Object.entries(attrs)) applyAttr(name, value);
  });

  return maybeAttrs !== undefined ? stop : undefined;
}

/* ========== Context (provide/inject) ========== */

/** WeakMap-based logical parent tracking — lets inject() traverse through portaled components */

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
export function inject<T>(key: InjectionKey<T> | string | symbol, fallback: T | typeof _UNSET = _UNSET): T | undefined {
  const rt = currentRuntime();
  let node: Node | null = rt.el;

  while (node) {
    if (node instanceof HTMLElement) {
      const host = node as ContextHost;

      if (host[contextKey]?.has(key)) {
        return host[contextKey]!.get(key) as T;
      }
    }

    // Fall back to DOM traversal
    const rootNode = node.getRootNode() as Node;
    const parentElement: HTMLElement | null = (node as HTMLElement).parentElement;
    const hostElement = rootNode instanceof ShadowRoot ? rootNode.host : null;

    node = parentElement ?? hostElement ?? null;
  }

  if (fallback === _UNSET) {
    console.warn(`[craftit] inject: key not found — ${String(key)}. Is provide() called in a parent?`);

    return undefined;
  }

  return fallback as T;
}

export function createContext<T>(): InjectionKey<T> {
  return Symbol() as InjectionKey<T>;
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
export const observeResize = (el: Element): ReadonlySignal<{ height: number; width: number }> => {
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
 * Observes an element's intersection with the viewport (or a given root) via
 * `IntersectionObserver`. Returns a `ReadonlySignal` that updates whenever the
 * intersection ratio changes.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   const entry = observeIntersection(cardRef.value!);
 *   effect(() => console.log(entry.value.isIntersecting));
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
 * Observes a CSS media query via `window.matchMedia`. Returns a `ReadonlySignal`
 * that is `true` when the query matches and `false` when it does not.
 * Must be called inside an {@link onMount} callback.
 *
 * @example
 * onMount(() => {
 *   const prefersReducedMotion = observeMedia('(prefers-reduced-motion: reduce)');
 *   effect(() => console.log(prefersReducedMotion.value));
 * });
 */
export const observeMedia = (query: string): ReadonlySignal<boolean> => {
  const mql = window.matchMedia(query);
  const matches = signal(mql.matches);
  const handler = (e: MediaQueryListEvent) => {
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
  checkValidity: () => boolean;
  readonly internals: ElementInternals;
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
      if (options.disabled!.value) {
        internals.states.add('disabled');
      } else {
        internals.states.delete('disabled');
      }
    });
  }

  if (callbacks?.onReset) setFormCallback('formReset', callbacks.onReset);

  if (callbacks?.onAssociated) setFormCallback('formAssociated', callbacks.onAssociated);

  if (callbacks?.onDisabled) setFormCallback('formDisabled', callbacks.onDisabled);

  if (callbacks?.onStateRestore) setFormCallback('formStateRestore', callbacks.onStateRestore);

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
  /** When `true`, removes the host attribute instead of setting it to `""` when the value is an empty string. */
  omit?: boolean;
  parse?: (value: string | null) => T;
  reflect?: boolean;
  type?: PropType<T>;
};
type PropMeta<T = unknown> = {
  parse: (value: string | null) => T;
  reflect: boolean;
  signal: Signal<T>;
};
interface PropHost extends HTMLElement {
  [propsKey]?: Map<string, PropMeta<unknown>>;
}

export const prop = <T>(name: string, defaultValue: T, options?: PropOptions<T>): Signal<T> => {
  const rt = currentRuntime();
  const el = rt.el as PropHost;

  el[propsKey] ??= new Map();

  const parse =
    options?.parse ??
    ((v: string | null): T => {
      // Explicit Boolean type: string values 'true' / '' → boolean
      if (options?.type === Boolean) return (v === '' || v === 'true') as T;

      // Boolean default: treat absent or explicit "false" as false, anything else as true.
      // This handles frameworks (e.g. Vue) that set the attribute to the string "false"
      // when a reactive binding evaluates to false, rather than removing the attribute.
      if (typeof defaultValue === 'boolean') return (v !== null && v !== 'false') as T;

      if (v == null) return defaultValue;

      // Numeric — inferred from an explicit type option or default value type
      if (options?.type === Number || typeof defaultValue === 'number') return Number(v) as T;

      return v as unknown as T;
    });
  const s = signal<T>(defaultValue);

  el[propsKey]!.set(name, {
    parse,
    reflect: options?.reflect ?? true,
    signal: s as Signal<unknown>,
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
        stateit.effect(() => {
          const v = s.value;

          if (v == null || v === false || (omit && v === '')) {
            el.removeAttribute(name);
          } else {
            el.setAttribute(name, v === true ? '' : String(v));
          }
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
export function defineProps(defs: Record<string, { default: unknown }>): Record<string, Signal<unknown>> {
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
        meta.signal.value = meta.parse(el.getAttribute(attrName)) as never;
      }
    }
  }

  return result;
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
};

const stylesheetStringCache = new Map<string, CSSStyleSheet>();

/**
 * Resolves a style entry to a CSSStyleSheet synchronously.
 * Uses a module-level cache so the same CSS string produces only one sheet,
 * shared across all instances of the same component.
 */
const loadStylesheet = (style: string | CSSStyleSheet | CSSResult): CSSStyleSheet => {
  if (style instanceof CSSStyleSheet) return style;

  const cssText = typeof style === 'string' ? style : style.content;
  const cached = stylesheetStringCache.get(cssText);

  if (cached) return cached;

  const sheet = new CSSStyleSheet();

  sheet.replaceSync(cssText);
  stylesheetStringCache.set(cssText, sheet);

  return sheet;
};
/* Global keyed state storage removed — keyed states are now owned per-element via _keyedStates */

type KeyedNode = {
  bindings: Binding[];
  cleanups: CleanupFn[];
  html: string;
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
          stateit.effect(() => {
            textNode.textContent = String(binding.signal.value);
          }),
        );
      }

      continue;
    }

    const el = queryWithinNodes(nodes, binding.marker);

    if (!el && binding.type !== 'ref') continue;

    if (binding.type === 'event') {
      applyEventBinding(el!, binding, itemRegisterCleanup);
    } else if (binding.type === 'attr') {
      applyAttrBinding(el!, binding, itemRegisterCleanup);
    } else if (binding.type === 'callback') {
      binding.apply(el!, itemRegisterCleanup);
    } else if (binding.type === 'ref') {
      const refEl = el ?? (container as ParentNode).querySelector<HTMLElement>(`[${binding.marker}]`);

      if (refEl) {
        const bindingRef = binding.ref;

        if (typeof bindingRef !== 'function') {
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
  private _keyedStates = new Map<string, Map<string | number, KeyedNode>>();
  private _onMountFns: (() => CleanupFn | undefined | void)[] = [];
  private _styles?: (string | CSSStyleSheet | CSSResult)[];
  private _template: string | HTMLResult | null = null;
  private appliedHtmlBindings = new Set<string>();
  private runtime: ComponentRuntime;
  /** Guards setup execution — setup runs exactly once even when the element is moved in the DOM */
  private _setupDone = false;
  constructor() {
    super();

    const shadowInit = (this.constructor as typeof CraftitBaseElement)._options?.shadow;

    this.shadow = this.attachShadow({ mode: 'open', ...shadowInit });
    this.runtime = {
      cleanups: [],
      el: this,
      errorHandlers: [],
      onMount: [],
    };
  }
  connectedCallback(): void {
    if (!this._setupDone) this._runSetup();

    if (this[propsKey]) {
      for (const [attrName, meta] of this[propsKey]) {
        if (this.hasAttribute(attrName)) {
          meta.signal.value = meta.parse(this.getAttribute(attrName)) as never;
        }
      }
    }

    this._initAttrObserver();
    this.init();
  }
  private _handleError(err: unknown): void {
    if (this.runtime.errorHandlers.length > 0) {
      for (const fn of this.runtime.errorHandlers) fn(err);
    } else {
      console.error(`[craftit] <${this.localName}> unhandled error:`, err);
    }
  }
  private _runSetup(): void {
    this._setupDone = true;
    runtimeStack.push(this.runtime);

    let res: unknown;

    try {
      res = (this.constructor as typeof CraftitBaseElement)._setup({ host: this, shadow: this.shadow });
    } catch (err) {
      runtimeStack.pop();
      this._handleError(err);

      return;
    }

    runtimeStack.pop();

    if (typeof res === 'string' || (typeof res === 'object' && res !== null && '__html' in res)) {
      this._template = res as string | HTMLResult;
    } else if (typeof res === 'object' && res !== null && 'template' in res) {
      const r = res as { styles?: (string | CSSStyleSheet | CSSResult)[]; template: string | HTMLResult };

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
        if (mutation.attributeName) {
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
    if (this._attrObserver) {
      this._attrObserver.disconnect();
      this._attrObserver = null;
    }

    runAll(this.runtime.cleanups);
    this.runtime.cleanups = [];
    // Restore onMount hooks so they re-run on reconnect (#4)
    this.runtime.onMount = this._onMountFns.slice();
    this.appliedHtmlBindings.clear();
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
                    nodes: newNodes,
                  });
                  for (const n of existing.nodes) (n as ChildNode).remove();
                } else {
                  // CREATE: New item
                  const newNodes = htmlBindingCreateNodes(itemData.html);

                  insertNodesBefore(newNodes, insertPoint);

                  const itemCleanups = applyKeyedItemBindings(newNodes, itemData.bindings, container);

                  newKeyedState.set(key, {
                    bindings: itemData.bindings,
                    cleanups: itemCleanups,
                    html: itemData.html,
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
                for (const n of lastInsertedNodes) (n as ChildNode).remove();
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
    // Apply styles synchronously before rendering to prevent FOUC.
    if (this._styles?.length) {
      try {
        this.shadow.adoptedStyleSheets = this._styles.map(loadStylesheet);
      } catch (err) {
        console.error(`[craftit] <${this.localName}> failed to load styles:`, err);
      }
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
    } catch (err) {
      this._handleError(err);
    } finally {
      runtimeStack.pop();
    }

    this.runtime.onMount = [];
  }
  private render(tpl: string | HTMLResult) {
    const htmlResult: HTMLResult = typeof tpl === 'string' ? makeHtmlResult(tpl) : tpl;

    this.shadow.replaceChildren(parseHTML(htmlResult.__html));
    this.applyBindings(htmlResult.__bindings);
  }
}

export const define = (name: string, setup: (ctx: SetupContext) => SetupResult, options?: DefineOptions): string => {
  if (customElements.get(name)) return name;

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
