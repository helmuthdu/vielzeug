import { effect as rawEffect, type CleanupFn, type ReadonlySignal, type Signal, untrack } from '@vielzeug/stateit';

import {
  CF_ID_ATTR,
  type AttrBinding,
  type Binding,
  type EventBinding,
  type HtmlBinding,
  type PropBinding,
  type RefBinding,
  listen,
  setAttr,
} from './internal';
import { propRegistry } from './props';
import { bindPropertyModel, hasWritableValueSetter, toReactiveBindingSource } from './runtime';

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

export const createNodes = (htmlString: string): Node[] => Array.from(parseHTML(htmlString).childNodes);

export const insertNodes = (marker: Comment, nodes: Node[], before: Node | null): void => {
  if (marker.parentNode) {
    for (const node of nodes) marker.parentNode.insertBefore(node, before);
  }
};

const isStructuredValue = (value: unknown): value is object =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

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

    // DOM attribute (when no prop registered, or prop reflects)
    if (!meta || meta.reflect) {
      if (binding.mode === 'bool') {
        el.toggleAttribute(binding.name, Boolean(value));
      } else {
        setAttr(el, binding.name, value);
      }
    }

    // Prop signal sync
    if (!meta) return;

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

export const applyPropBinding = (el: HTMLElement, binding: PropBinding, registerCleanup: RegisterCleanup) => {
  const update = (value: unknown) => {
    (el as any)[binding.name] = value;
  };

  if (binding.signal) signalEffect(binding.signal, update, registerCleanup);
  else update(binding.value!);

  bindPropertyModel(el, binding.name, binding.model, registerCleanup);
};

export const applyEventBinding = (el: HTMLElement, binding: EventBinding, registerCleanup: RegisterCleanup) => {
  const { modifiers } = binding;
  const listenerOptions = modifiers
    ? { capture: !!modifiers.capture, once: !!modifiers.once, passive: !!modifiers.passive }
    : undefined;

  const wrappedHandler = (event: Event) => {
    if (modifiers?.self && event.target !== event.currentTarget) return;

    if (modifiers?.stop) event.stopPropagation();

    if (modifiers?.prevent && !modifiers?.passive) event.preventDefault();

    binding.handler(event);
  };

  registerCleanup(listen(el, binding.name, wrappedHandler, listenerOptions));
};

export const applyRefBinding = (el: HTMLElement, binding: RefBinding, registerCleanup: RegisterCleanup) => {
  const { ref } = binding;

  if (typeof ref === 'function') {
    ref(el as never);
    registerCleanup(() => ref(null));

    return;
  }

  if (Array.isArray(ref)) {
    ref.push(el);
    registerCleanup(() => {
      const idx = ref.indexOf(el);

      if (idx !== -1) ref.splice(idx, 1);
    });

    return;
  }

  ref.value = el as never;
  registerCleanup(() => {
    ref.value = null;
  });
};

type ElementBinding = AttrBinding | EventBinding | PropBinding | RefBinding;

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
      } else if (b.type === 'prop') {
        applyPropBinding(el, b, registerCleanup);
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
  const source = toReactiveBindingSource(value);

  return source ? { mode, name, signal: source, type: 'attr', uid } : { mode, name, type: 'attr', uid, value };
};

export const createPropBinding = (name: string, uid: string, value: unknown): PropBinding => {
  const source = toReactiveBindingSource(value);

  return source
    ? {
        model: hasWritableValueSetter(value) ? (value as Signal<unknown>) : undefined,
        name,
        signal: source,
        type: 'prop',
        uid,
      }
    : { name, type: 'prop', uid, value };
};
