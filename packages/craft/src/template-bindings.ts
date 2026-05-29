import {
  batch,
  computed,
  effect as rawEffect,
  isSignal,
  StateError,
  type CleanupFn,
  type ReadonlySignal,
  untrack,
} from '@vielzeug/ripple';

import { isLiveSignal } from './directives/live';
import { propRegistry } from './props';
import { type AttrBinding, type Binding, type EventBinding, type HtmlBinding, type RefBinding } from './types/bindings';
import { listen, removeNodes, runAll, setAttr, isStructuredValue } from './utils/dom';
import { CF_ID_ATTR } from './utils/id';

export type RegisterCleanup = (fn: CleanupFn) => void;

export type BindingTargets = {
  comments: Map<string, Comment>;
  elements: Map<string, HTMLElement>;
};

export const parseHTML = (html: string): DocumentFragment => {
  const tpl = document.createElement('template');

  tpl.innerHTML = html;

  return tpl.content.cloneNode(true) as DocumentFragment;
};

const collectBindingTarget = (node: Node, targets: BindingTargets): void => {
  if (node.nodeType === Node.COMMENT_NODE) {
    const marker = (node as Comment).nodeValue;

    if (marker) targets.comments.set(marker, node as Comment);

    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const id = (node as Element).getAttribute(CF_ID_ATTR);

  if (id) targets.elements.set(id, node as HTMLElement);
};

const walkBindingTargets = (root: Node, visit: (node: Node) => void): void => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_ELEMENT);

  visit(root);

  while (walker.nextNode()) visit(walker.currentNode);
};

export const indexBindingTargets = (nodes: Iterable<Node>): BindingTargets => {
  const targets: BindingTargets = { comments: new Map(), elements: new Map() };

  for (const node of nodes) walkBindingTargets(node, (current) => collectBindingTarget(current, targets));

  return targets;
};

export const findCommentMarker = (root: Node, marker: string): Comment | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

  while (walker.nextNode()) {
    const comment = walker.currentNode as Comment;

    if (comment.nodeValue === marker) return comment;
  }

  return null;
};

const isNativeFormInput = (el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;

type LiveWriteState = { last: unknown };

const applyFormValue = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: unknown,
  isLive: boolean | undefined,
  state: LiveWriteState,
): void => {
  const next = value == null ? '' : String(value);

  if (isLive && state.last !== undefined && !Object.is(el.value, state.last) && !Object.is(el.value, next)) return;

  el.value = next;

  if (isLive) state.last = next;
};

const applyCheckedValue = (
  el: HTMLInputElement,
  value: unknown,
  isLive: boolean | undefined,
  state: LiveWriteState,
): void => {
  const next = Boolean(value);

  if (isLive && state.last !== undefined && el.checked !== Boolean(state.last) && el.checked !== next) return;

  el.checked = next;

  if (isLive) state.last = next;
};

type PropMetaLike = { parse: (v: string | null) => unknown; reflect: boolean; signal: { value: unknown } };

const syncRegisteredProp = (el: HTMLElement, meta: PropMetaLike, binding: AttrBinding, value: unknown): void => {
  const parsed = isStructuredValue(value)
    ? value
    : meta.parse(
        binding.mode === 'bool' ? (value ? '' : null) : value == null || value === false ? null : String(value),
      );

  if (
    !Object.is(
      untrack(() => meta.signal.value),
      parsed,
    )
  ) {
    meta.signal.value = parsed as never;
  }

  // When reflect:false the prop signal has no reflect-effect; write the attribute
  // directly so the DOM stays in sync with template bindings.
  if (!meta.reflect) {
    if (isStructuredValue(value)) return;

    if (binding.mode === 'bool') el.toggleAttribute(binding.name, Boolean(value));
    else setAttr(el, binding.name, value);
  }
};

const signalEffect = (
  signal: ReadonlySignal<unknown>,
  update: (v: unknown) => void,
  registerCleanup: RegisterCleanup,
): void => {
  registerCleanup(rawEffect(() => update(signal.value)));
};

export const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: RegisterCleanup): void => {
  const meta = propRegistry.get(el)?.get(binding.name) as PropMetaLike | undefined;
  const liveState: LiveWriteState = { last: undefined };

  const update = (value: unknown): void => {
    if (!meta && isStructuredValue(value)) {
      (el as unknown as Record<string, unknown>)[binding.name] = value;

      return;
    }

    if (!meta && binding.name === 'value' && isNativeFormInput(el)) {
      applyFormValue(el, value, binding.live, liveState);

      return;
    }

    if (!meta && binding.name === 'checked' && el instanceof HTMLInputElement) {
      applyCheckedValue(el, value, binding.live, liveState);

      return;
    }

    if (!meta) {
      if (binding.mode === 'bool') el.toggleAttribute(binding.name, Boolean(value));
      else setAttr(el, binding.name, value);

      return;
    }

    syncRegisteredProp(el, meta, binding, value);
  };

  if (binding.signal) {
    signalEffect(binding.signal, update, registerCleanup);
  } else {
    update(binding.value!);
  }
};

export const applyEventBinding = (el: HTMLElement, binding: EventBinding, registerCleanup: RegisterCleanup) => {
  registerCleanup(listen(el, binding.name, binding.handler, binding.options));
};

export const applyRefBinding = (el: HTMLElement, binding: RefBinding, registerCleanup: RegisterCleanup) => {
  const { ref } = binding;

  if (typeof ref === 'function') {
    ref(el as never);
    registerCleanup(() => ref(null as never));

    return;
  }

  if (Array.isArray(ref)) {
    ref.push(el);
    registerCleanup(() => {
      const i = ref.indexOf(el);

      if (i !== -1) ref.splice(i, 1);
    });

    return;
  }

  ref.value = el as never;
  registerCleanup(() => {
    ref.value = null as never;
  });
};

type ElementBinding = AttrBinding | EventBinding | RefBinding;

export const applyBindingsWithTargets = (
  bindings: Binding[],
  registerCleanup: RegisterCleanup,
  targets: BindingTargets,
  opts?: { onHtml?: (b: HtmlBinding) => void },
) => {
  const bindingMap = new Map<string, ElementBinding[]>();

  for (const b of bindings) {
    const id = b.uid;

    if (b.type === 'text') {
      const found = targets.comments.get(id);

      if (found) {
        const textNode = document.createTextNode('');

        found.replaceWith(textNode);
        targets.comments.delete(id);
        signalEffect(
          b.signal,
          (v) => {
            textNode.textContent = String(v);
          },
          registerCleanup,
        );
      }
    } else if (b.type === 'directive') {
      const found = targets.comments.get(id);

      if (found) {
        b.directive.mount(found, registerCleanup);
        targets.comments.delete(id);
      }
    } else if (b.type === 'html') {
      opts?.onHtml?.(b);
    } else {
      const grouped = bindingMap.get(id);

      if (grouped) grouped.push(b);
      else bindingMap.set(id, [b]);
    }
  }

  for (const [id, elBindings] of bindingMap) {
    const el = targets.elements.get(id);

    if (!el) continue;

    el.removeAttribute(CF_ID_ATTR);
    targets.elements.delete(id);

    // Inline element binding dispatch
    for (const b of elBindings) {
      if (b.type === 'attr') {
        applyAttrBinding(el, b, registerCleanup);
      } else if (b.type === 'event') {
        applyEventBinding(el, b, registerCleanup);
      } else if (b.type === 'ref') {
        applyRefBinding(el, b, registerCleanup);
      }
    }
  }
};

export const applyBindingsInContainer = (
  container: ParentNode,
  bindings: Binding[],
  registerCleanup: RegisterCleanup,
  opts?: { onHtml?: (b: HtmlBinding) => void },
) => {
  applyBindingsWithTargets(bindings, registerCleanup, indexBindingTargets([container]), opts);
};

export const createAttrBinding = (mode: 'bool' | 'attr', name: string, uid: string, value: unknown): AttrBinding => {
  if (isLiveSignal(value)) {
    return { live: true, mode, name, signal: value as ReadonlySignal<unknown>, type: 'attr', uid };
  }

  if (typeof value === 'function') {
    return { mode, name, signal: computed(value as () => unknown), type: 'attr', uid };
  }

  if (isSignal(value)) {
    return { mode, name, signal: value as ReadonlySignal<unknown>, type: 'attr', uid };
  }

  return { mode, name, type: 'attr', uid, value };
};

/**
 * Sets up the reactive effect for an html-binding marker using full fragment replacement.
 */
export const applyHtmlBinding = (root: Node, b: HtmlBinding, registerCleanup: RegisterCleanup): void => {
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
  let lastHtml: string | null = null;
  let lastInsertedNodes: Node[] = [];

  const stop = rawEffect(() => {
    batch(() => {
      let data: HtmlBinding['signal']['value'];

      try {
        data = b.signal.value;
      } catch (error) {
        // Silently skip reads from disposed computed signals (happens during scope teardown
        // when effects briefly outlive their source computeds). Use the typed error code
        // rather than string-matching on the message to avoid brittle cross-package coupling.
        if (error instanceof StateError && error.code === 'DISPOSED_READ') return;

        throw error;
      }

      if (data.html === lastHtml) {
        return;
      }

      lastHtml = data.html;
      runCurrentCleanups();

      const { bindings, html } = data;
      const container = (marker.parentElement || root) as ParentNode;

      untrack(() => {
        batch(() => {
          removeNodes(lastInsertedNodes);

          const parsed = parseHTML(html);

          lastInsertedNodes = Array.from(parsed.childNodes);
          marker.after(parsed);
        });

        applyBindingsInContainer(container, bindings, registerInnerCleanup, {
          onHtml: (binding) => applyHtmlBinding(container as unknown as Node, binding, registerInnerCleanup),
        });
      });
    });
  });

  registerCleanup(stop);
  registerCleanup(runCurrentCleanups);
};
