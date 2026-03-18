import {
  batch,
  untrack,
  computed,
  isSignal,
  signal,
  effect as _effect,
  type CleanupFn,
  type ReadonlySignal,
  type Signal,
} from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  EACH_SIGNAL,
  type AttrBinding,
  type Binding,
  type CallbackBinding,
  type Directive,
  type EventBinding,
  type HtmlBinding,
  type HTMLResult,
  type PropBinding,
  type Ref,
  type RefBinding,
  type RefCallback,
  type TextBinding,
} from './internal';
import { propRegistry } from './props';
import { effect } from './runtime';
import { escapeHtml, listen, runAll, setAttr } from './utils';

// ─── Internal helpers ─────────────────────────────────────────────────────────
export type RegisterCleanup = (fn: CleanupFn) => void;

/** Keyed reconciliation node — holds DOM nodes + lifecycle for one `each()` item. */
export type KeyedNode = {
  bindings: Binding[];
  cleanups: CleanupFn[];
  html: string;
  nodes: Node[];
};

export const parseHTML = (html: string): DocumentFragment => {
  const tpl = document.createElement('template');

  tpl.innerHTML = html;

  return tpl.content;
};

export const findCommentMarker = (root: Node, marker: string): Comment | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

  while (walker.nextNode()) {
    const c = walker.currentNode as Comment;

    if (c.nodeValue === marker) return c;
  }

  return null;
};

// ─── HTML Binding helpers ─────────────────────────────────────────────────────
const isHtmlBindingMarker = (node: Node): boolean =>
  node.nodeType === Node.COMMENT_NODE &&
  ((node as Comment).data === 'html-binding' || (node as Comment).data.startsWith('__h_'));

export const htmlBindingClearAfter = (marker: Comment) => {
  let next = marker.nextSibling;

  while (next) {
    if (isHtmlBindingMarker(next)) break;

    const toRemove = next;

    next = next.nextSibling;
    toRemove.remove();
  }
};

export const htmlBindingCreateNodes = (htmlString: string): Node[] => Array.from(parseHTML(htmlString).childNodes);

export const htmlBindingRemoveKeyed = (keyedNode: KeyedNode) => {
  runAll(keyedNode.cleanups);
  for (const n of keyedNode.nodes) (n as ChildNode).remove();
};

export const htmlBindingInsertBefore = (marker: Comment, nodes: Node[], before: Node | null) => {
  if (marker.parentNode) {
    for (const node of nodes) marker.parentNode.insertBefore(node, before);
  }
};

export const isHtmlResult = (value: unknown): value is HTMLResult =>
  typeof value === 'object' && !!value && '__html' in value;

// ─── Binding application ──────────────────────────────────────────────────────
export const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: RegisterCleanup) => {
  const update = (v: unknown) => {
    if (binding.mode === 'bool') {
      el.toggleAttribute(binding.name, Boolean(v));
    } else {
      setAttr(el, binding.name, v);
    }

    const meta = propRegistry.get(el)?.get(binding.name);

    if (!meta) return;

    const rawValue = binding.mode === 'bool' ? (v ? '' : null) : v == null || v === false ? null : String(v);
    const parsedValue = meta.parse(rawValue);

    if (!Object.is(meta.signal.peek(), parsedValue)) {
      meta.signal.value = parsedValue as never;
    }
  };

  if (binding.signal) {
    const sig = binding.signal;

    registerCleanup(effect(() => update(sig.value)));
  } else {
    update(binding.value!);
  }
};

export const applyPropBinding = (el: HTMLElement, binding: PropBinding, registerCleanup: RegisterCleanup) => {
  const update = (v: unknown) => {
    (el as any)[binding.name] = v;
  };

  if (binding.signal) {
    const sig = binding.signal;

    registerCleanup(effect(() => update(sig.value)));
  } else {
    update(binding.value!);
  }

  if (!binding.model) return;

  if (binding.name === 'value') {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
      const eventName = el instanceof HTMLSelectElement ? 'change' : 'input';

      registerCleanup(
        listen(el, eventName, () => {
          const next = el.value;

          if (!Object.is(binding.model!.value, next)) {
            try {
              binding.model!.value = next;
            } catch {
              // Readonly signal/computed source: keep one-way behavior.
            }
          }
        }),
      );
    }

    return;
  }

  if (binding.name === 'checked' && el instanceof HTMLInputElement) {
    registerCleanup(
      listen(el, 'change', () => {
        const next = el.checked;

        if (!Object.is(binding.model!.value, next)) {
          try {
            binding.model!.value = next;
          } catch {
            // Readonly signal/computed source: keep one-way behavior.
          }
        }
      }),
    );
  }
};

export const applyEventBinding = (el: HTMLElement, binding: EventBinding, registerCleanup: RegisterCleanup) => {
  registerCleanup(listen(el, binding.name, binding.handler));
};

export const applyRefBinding = (el: HTMLElement, binding: RefBinding, registerCleanup: RegisterCleanup) => {
  const bindingRef = binding.ref;

  if (typeof bindingRef === 'function') {
    bindingRef(el as never);
    registerCleanup(() => bindingRef(null));
  } else if (Array.isArray(bindingRef)) {
    bindingRef.push(el);
    registerCleanup(() => {
      const idx = bindingRef.indexOf(el);

      if (idx !== -1) bindingRef.splice(idx, 1);
    });
  } else {
    bindingRef.value = el as never;
    registerCleanup(() => {
      bindingRef.value = null;
    });
  }
};

const hasKey = (obj: unknown, key: string): boolean => typeof obj === 'object' && !!obj && key in obj;

/** Helper to apply bindings in a container — single-pass for non-HTML and HTML bindings. */
export const applyBindingsInContainer = (
  container: ParentNode,
  bindings: Binding[],
  registerCleanup: RegisterCleanup,
  opts?: { onHtml?: (b: HtmlBinding) => void },
) => {
  const bindingMap = new Map<string, Binding[]>();

  for (const b of bindings) {
    const id = b.uid;

    if (b.type === 'text') {
      const found = findCommentMarker(container, id);

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
      if (!bindingMap.has(id)) bindingMap.set(id, []);

      bindingMap.get(id)!.push(b);
    }
  }

  for (const [id, elBindings] of bindingMap) {
    const el = container.querySelector<HTMLElement>(`[${CF_ID_ATTR}="${id}"]`);

    if (el) {
      el.removeAttribute(CF_ID_ATTR);
      for (const b of elBindings) {
        if (b.type === 'attr') applyAttrBinding(el, b, registerCleanup);
        else if (b.type === 'prop') applyPropBinding(el, b, registerCleanup);
        else if (b.type === 'event') applyEventBinding(el, b, registerCleanup);
        else if (b.type === 'ref') applyRefBinding(el, b, registerCleanup);
        else if (b.type === 'callback') b.apply(el, registerCleanup);
      }
    }
  }
};

/** Searches a shallow node list for an element carrying `markerAttr`, then falls back to querySelector. */
const queryWithinNodes = (nodes: Node[], id: string): HTMLElement | null => {
  for (const node of nodes) {
    if (node instanceof HTMLElement && node.getAttribute(CF_ID_ATTR) === id) return node;

    if (node instanceof Element) {
      const found = node.querySelector<HTMLElement>(`[${CF_ID_ATTR}="${id}"]`);

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

export const applyKeyedItemBindings = (nodes: Node[], itemBindings: Binding[], container: ParentNode): CleanupFn[] => {
  const itemCleanups: CleanupFn[] = [];
  const itemRegisterCleanup: RegisterCleanup = (fn) => itemCleanups.push(fn);

  for (const binding of itemBindings) {
    const id = binding.uid;

    // Text bindings use comment markers, not element attributes — handle separately.
    if (binding.type === 'text') {
      const found = findCommentInNodes(nodes, id);

      if (found) {
        const textNode = document.createTextNode('');

        found.replaceWith(textNode);
        itemRegisterCleanup(
          effect(() => {
            textNode.textContent = String((binding as TextBinding).signal.value);
          }),
        );
      }

      continue;
    }

    const el = queryWithinNodes(nodes, id);

    if (!el && binding.type !== 'ref') continue;

    if (binding.type === 'event') {
      applyEventBinding(el!, binding as EventBinding, itemRegisterCleanup);
    } else if (binding.type === 'attr') {
      applyAttrBinding(el!, binding as AttrBinding, itemRegisterCleanup);
    } else if (binding.type === 'prop') {
      applyPropBinding(el!, binding as PropBinding, itemRegisterCleanup);
    } else if (binding.type === 'callback') {
      (binding as CallbackBinding).apply(el!, itemRegisterCleanup);
    } else if (binding.type === 'ref') {
      const refEl = el ?? (container as ParentNode).querySelector<HTMLElement>(`[${CF_ID_ATTR}="${id}"]`);

      if (refEl) applyRefBinding(refEl, binding as RefBinding, itemRegisterCleanup);
    }
  }

  return itemCleanups;
};

// ─── Global marker counter ────────────────────────────────────────────────────
let globalMarkerIndex = 0;

/** @internal — resets the marker counter. Used by __resetCounters in the barrel. */
export const _resetMarkerIndex = (): void => {
  globalMarkerIndex = 0;
};

// ─── HTMLResult factory ───────────────────────────────────────────────────────
const htmlResultToString = function (this: HTMLResult): string {
  return this.__html;
};

export const makeHtmlResult = (html: string, bindings: Binding[] = []): HTMLResult => ({
  __bindings: bindings,
  __html: html,
  toString: htmlResultToString,
});

// ─── Attribute binding factory ────────────────────────────────────────────────
const createAttrBinding = (mode: 'bool' | 'attr', name: string, uid: string, value: unknown): AttrBinding => {
  const sig = isSignal(value)
    ? (value as ReadonlySignal<unknown>)
    : typeof value === 'function'
      ? computed(value as () => unknown)
      : undefined;

  return sig ? { mode, name, signal: sig, type: 'attr', uid } : { mode, name, type: 'attr', uid, value };
};

const hasWritableValueSetter = (value: unknown): value is Signal<unknown> => {
  if (!isSignal(value)) return false;

  let proto: object | null = Object.getPrototypeOf(value);

  while (proto) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    if (descriptor) return typeof descriptor.set === 'function';

    proto = Object.getPrototypeOf(proto);
  }

  return false;
};

// ─── Property binding factory ────────────────────────────────────────────────
const createPropBinding = (name: string, uid: string, value: unknown): PropBinding => {
  if (isSignal(value)) {
    return {
      model: hasWritableValueSetter(value) ? (value as Signal<unknown>) : undefined,
      name,
      signal: value as ReadonlySignal<unknown>,
      type: 'prop',
      uid,
    };
  }

  const sig = typeof value === 'function' ? computed(value as () => unknown) : undefined;

  return sig ? { name, signal: sig, type: 'prop', uid } : { name, type: 'prop', uid, value };
};

// ─── Template regex patterns ──────────────────────────────────────────────────
const RE_EVENT = /\s+@([a-zA-Z_][-a-zA-Z0-9_.]*)\s*=\s*["']?$/;
const RE_REF = /\s+ref\s*=\s*["']?$/;
const RE_SPECIAL_ATTR = /\s+(:|\?)([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const RE_PROP = /\.([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;
const RE_PLAIN_ATTR = /\s+([a-zA-Z_][-a-zA-Z0-9_]*)\s*=\s*["']?$/;

// ─── htmlTemplate ─────────────────────────────────────────────────────────────
const htmlTemplate = (strings: TemplateStringsArray, values: unknown[]): HTMLResult => {
  let result = '';
  const bindings: Binding[] = [];
  let activeElementId: string | null = null;
  const resolveDirectiveValue = (value: unknown): string => {
    if (typeof value === 'string') return escapeHtml(value);

    if (value == null) return '';

    // HTMLResult is always kept as raw HTML
    if (isHtmlResult(value)) return value.__html;

    return escapeHtml(String(value));
  };

  const getNextId = () => String(globalMarkerIndex++);
  const isInsideStartTag = (prefix: string) => prefix.lastIndexOf('<') > prefix.lastIndexOf('>');
  const getElementBindingId = (str: string, matchLength: number): string => {
    const prefix = str.slice(0, -matchLength);

    if (!activeElementId || isInsideStartTag(prefix)) {
      activeElementId = getNextId();
    }

    return activeElementId;
  };
  const resetElementBindingId = (): void => {
    activeElementId = null;
  };

  for (let i = 0; i < strings.length; i++) {
    const str = strings[i];

    if (i >= values.length) {
      result += str;
      break;
    }

    const value = values[i];

    // Evaluate each regex only when the preceding pattern didn't match.
    const eventMatch = RE_EVENT.exec(str);

    if (eventMatch) {
      if (typeof value === 'function') {
        const id = getElementBindingId(str, eventMatch[0].length);

        result += `${str.slice(0, -eventMatch[0].length)} ${CF_ID_ATTR}="${id}"`;
        bindings.push({
          handler: value as (e: Event) => void,
          name: eventMatch[1].split('.')[0],
          type: 'event',
          uid: id,
        });
      } else {
        result += str;
      }

      continue;
    }

    const refMatch = RE_REF.exec(str);

    if (refMatch) {
      if (value) {
        const id = getElementBindingId(str, refMatch[0].length);

        result += `${str.slice(0, -refMatch[0].length)} ${CF_ID_ATTR}="${id}"`;
        bindings.push({
          ref: value as Ref<Element> | RefCallback<Element>,
          type: 'ref',
          uid: id,
        });
      } else {
        result += str;
      }

      continue;
    }

    const specialAttrMatch = RE_SPECIAL_ATTR.exec(str);

    if (specialAttrMatch) {
      const [, prefix, name] = specialAttrMatch;
      const id = getElementBindingId(str, specialAttrMatch[0].length);

      result += `${str.slice(0, -specialAttrMatch[0].length)} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createAttrBinding(prefix === '?' ? 'bool' : 'attr', name, id, value));
      continue;
    }

    const propMatch = RE_PROP.exec(str);

    if (propMatch) {
      const name = propMatch[1];
      const id = getElementBindingId(str, propMatch[0].length);

      result += `${str.slice(0, -propMatch[0].length)} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createPropBinding(name, id, value));
      continue;
    }

    const plainAttrMatch = RE_PLAIN_ATTR.exec(str);

    if (plainAttrMatch) {
      const name = plainAttrMatch[1];
      const id = getElementBindingId(str, plainAttrMatch[0].length);

      result += `${str.slice(0, -plainAttrMatch[0].length)} ${CF_ID_ATTR}="${id}"`;
      bindings.push(createAttrBinding('attr', name, id, value));
      continue;
    }

    // Spread-position directive
    if (hasKey(value, 'mount') || hasKey(value, 'render')) {
      const isInterpolation = hasKey(value, 'render');
      const id = isInterpolation ? getNextId() : getElementBindingId(str, 0);

      if (isInterpolation) {
        result += `${str}<!--${id}-->`;
      } else {
        result += `${str} ${CF_ID_ATTR}="${id}"`;
      }

      const apply = (value as Directive).mount?.bind(value);

      if (apply) {
        bindings.push({
          apply: (el: HTMLElement, registerCleanup: (fn: () => void) => void) => {
            apply(el, { registerCleanup });
          },
          type: 'callback',
          uid: id,
        });
      }

      if (isInterpolation) {
        const render = (value as Directive).render!.bind(value);
        let cached = { bindings: [] as Binding[], html: '' };
        const fnSignal = signal(cached);

        effect(() => {
          const res = render();
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

        bindings.push({
          keyed: false,
          signal: fnSignal,
          type: 'html',
          uid: id,
        });
      }

      continue;
    }

    /*  Reactive HTML wrappers  */
    resetElementBindingId();

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

    // Reactive function (() => string | HTMLResult)
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
      const id = getNextId();

      result += `${str}<!--${id}-->`;
      bindings.push({
        keyed: isKeyed,
        signal: htmlWrapper.__htmlSignal,
        type: 'html',
        uid: id,
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
      const id = getNextId();

      result += `${str}<!--${id}-->`;
      bindings.push({
        signal: value as Signal<unknown>,
        type: 'text',
        uid: id,
      });
    } else if (isHtmlResult(value)) {
      result += str + value.__html;
      bindings.push(...value.__bindings);
    } else {
      result += str + resolveDirectiveValue(value);
    }
  }

  const trimmed = result.trim();

  return makeHtmlResult(trimmed, bindings);
};

// ─── Public html tagged template ──────────────────────────────────────────────
export const html = (strings: TemplateStringsArray, ...values: unknown[]): HTMLResult => htmlTemplate(strings, values);

// ─── applyHtmlBinding ─────────────────────────────────────────────────────────
/**
 * Sets up the reactive effect for an html-binding marker. Handles both non-keyed
 * (full replace) and keyed (`each()`) reconciliation.
 *
 * @param root         The root node containing the marker comment.
 * @param b            The HtmlBinding descriptor.
 * @param registerCleanup  Function that registers a cleanup tied to the outer container's lifetime.
 * @param keyedStates  Per-element map of `marker → (key → KeyedNode)` — caller owns this state.
 */
export const applyHtmlBinding = (
  root: Node,
  b: HtmlBinding,
  registerCleanup: RegisterCleanup,
  keyedStates: Map<string, Map<string | number, KeyedNode>>,
): void => {
  const found = findCommentMarker(root, b.uid);

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

  // Use stateit.effect directly so cleanup is managed manually via registerCleanup, not autoCleanup.
  const stop = _effect(() => {
    batch(() => {
      const data = b.signal.value;

      if (!b.keyed && data.html === lastHtml) {
        return;
      }

      lastHtml = data.html;

      runCurrentCleanups();

      const { bindings, html, keys } = data;

      if (b.keyed && !keyedStates.has(b.uid)) keyedStates.set(b.uid, new Map());

      const keyedState = b.keyed ? keyedStates.get(b.uid)! : null;
      const container = (marker.parentElement || root) as ParentNode;

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

              const prevNodes = i > 0 ? newKeyedState.get(keys[i - 1])?.nodes : null;
              const insertPoint = prevNodes?.length ? prevNodes[prevNodes.length - 1].nextSibling : marker.nextSibling;

              if (existing?.html === itemData.html) {
                // UPDATE: Same HTML — reuse nodes, reapply bindings
                if (existing.nodes[0]) insertNodesBefore(existing.nodes, insertPoint);

                runAll(existing.cleanups);

                const itemCleanups = applyKeyedItemBindings(existing.nodes, itemData.bindings, container);

                newKeyedState.set(key, { ...existing, bindings: itemData.bindings, cleanups: itemCleanups });
              } else if (existing) {
                // REPLACE: Different HTML — create new nodes, remove old
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
              if (!newKeyedState.has(oldKey)) htmlBindingRemoveKeyed(oldNode);
            }

            keyedStates.set(b.uid, newKeyedState);
          } else {
            // Non-keyed or empty list: replace previously inserted nodes.
            if (b.keyed && keyedState && keyedState.size > 0) {
              for (const [, kn] of keyedState) htmlBindingRemoveKeyed(kn);
            } else {
              for (const n of lastInsertedNodes) (n as ChildNode).remove();
            }

            const parsed = parseHTML(html);

            lastInsertedNodes = Array.from(parsed.childNodes);
            marker.after(parsed);

            if (b.keyed) keyedStates.set(b.uid, new Map());
          }
        });

        if (!bindingsAlreadyApplied) {
          applyBindingsInContainer(container, bindings, registerInnerCleanup, {
            onHtml: (binding) => applyHtmlBinding(container, binding, registerInnerCleanup, keyedStates),
          });
        }
      });
    });
  });

  registerCleanup(stop);
  registerCleanup(runCurrentCleanups);

  if (b.keyed) registerCleanup(() => keyedStates.delete(b.uid));
};
