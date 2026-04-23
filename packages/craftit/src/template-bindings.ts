import { computed, effect as rawEffect, type CleanupFn, type ReadonlySignal, untrack } from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  type AttrBinding,
  type Binding,
  type EventBinding,
  type HtmlBinding,
  type RefBinding,
  listen,
  setAttr,
} from './internal';
import { propRegistry } from './props';

export type RegisterCleanup = (fn: CleanupFn) => void;

export type BindingTargets = {
  comments: Map<string, Comment>;
  elements: Map<string, HTMLElement>;
};

const templateCache = new Map<string, HTMLTemplateElement>();

const getCachedTemplate = (html: string): HTMLTemplateElement => {
  let tpl = templateCache.get(html);

  if (!tpl) {
    tpl = document.createElement('template');
    tpl.innerHTML = html;

    if (templateCache.size >= 100) {
      const first = templateCache.keys().next().value;

      if (first !== undefined) templateCache.delete(first);
    }

    templateCache.set(html, tpl);
  }

  return tpl;
};

export const parseHTML = (html: string): DocumentFragment =>
  getCachedTemplate(html).content.cloneNode(true) as DocumentFragment;

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

const scanBindingTargets = (nodes: Iterable<Node>): BindingTargets => {
  const targets: BindingTargets = { comments: new Map(), elements: new Map() };

  for (const node of nodes) walkBindingTargets(node, (current) => collectBindingTarget(current, targets));

  return targets;
};

export const indexBindingTargets = (nodes: Iterable<Node>): BindingTargets => scanBindingTargets(nodes);

export const findCommentMarker = (root: Node, marker: string): Comment | null => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

  while (walker.nextNode()) {
    const comment = walker.currentNode as Comment;

    if (comment.nodeValue === marker) return comment;
  }

  return null;
};

const isStructuredValue = (value: unknown): value is object =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

const isSignal = (val: unknown): val is ReadonlySignal<unknown> =>
  typeof val === 'object' && val !== null && 'value' in val && typeof (val as { value?: unknown }).value !== 'function';

const signalEffect = (
  signal: ReadonlySignal<unknown>,
  update: (v: unknown) => void,
  registerCleanup: RegisterCleanup,
): void => {
  registerCleanup(rawEffect(() => update(signal.value)));
};

export const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: RegisterCleanup) => {
  const meta = propRegistry.get(el)?.get(binding.name);

  const update = (value: unknown) => {
    // Structured data (object/array) without a registered prop — set as JS property
    if (!meta && isStructuredValue(value)) {
      (el as any)[binding.name] = value;

      return;
    }

    // Keep common native form properties in sync when using :attr bindings.
    if (!meta && binding.name === 'value') {
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        (el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value = value == null ? '' : String(value);
      }
    }

    if (!meta && binding.name === 'checked' && el instanceof HTMLInputElement) {
      el.checked = Boolean(value);
    }

    // If no prop registered, apply as DOM attribute only
    if (!meta) {
      if (binding.mode === 'bool') {
        el.toggleAttribute(binding.name, Boolean(value));
      } else {
        setAttr(el, binding.name, value);
      }

      return;
    }

    // Prop registered — sync both DOM attribute (if reflects) and signal
    if (binding.mode === 'bool') {
      el.toggleAttribute(binding.name, Boolean(value));
    } else {
      setAttr(el, binding.name, value);
    }

    const parsedValue = isStructuredValue(value)
      ? value
      : meta.parse(
          binding.mode === 'bool' ? (value ? '' : null) : value == null || value === false ? null : String(value),
        );

    if (
      !Object.is(
        untrack(() => meta.signal.value),
        parsedValue,
      )
    ) {
      meta.signal.value = parsedValue as never;
    }
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
  if (typeof value === 'function') {
    return { mode, name, signal: computed(value as () => unknown), type: 'attr', uid };
  }

  if (isSignal(value)) {
    return { mode, name, signal: value as ReadonlySignal<unknown>, type: 'attr', uid };
  }

  return { mode, name, type: 'attr', uid, value };
};
