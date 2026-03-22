import { type CleanupFn } from '@vielzeug/stateit';

import { propRegistry } from './component';
import {
  type AttrBinding,
  type EventBinding,
  type PropBinding,
  type RefBinding,
  type Binding,
  type HtmlBinding,
  CF_ID_ATTR,
} from './internal';
import { bindPropertyModel } from './runtime-bindings';
import { effect } from './runtime-lifecycle';
import { listen, setAttr } from './utilities';

export type RegisterCleanup = (fn: CleanupFn) => void;

// ─── Individual binding application functions ─────────────────────────────────

export const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: RegisterCleanup) => {
  const update = (value: unknown) => {
    const meta = propRegistry.get(el)?.get(binding.name);
    const isStructuredValue = Array.isArray(value) || (typeof value === 'object' && value !== null);

    // If prop metadata is not available yet, preserve structured values by
    // assigning them as host properties. prop() will read this pre-upgrade
    // value once the component registers the property descriptor.
    if (!meta && isStructuredValue) {
      (el as any)[binding.name] = value;

      return;
    }

    if (!meta || meta.reflect) {
      if (binding.mode === 'bool') {
        el.toggleAttribute(binding.name, Boolean(value));
      } else {
        setAttr(el, binding.name, value);
      }
    }

    if (!meta) return;

    const parsedValue = isStructuredValue
      ? value
      : meta.parse(
          binding.mode === 'bool' ? (value ? '' : null) : value == null || value === false ? null : String(value),
        );

    if (!Object.is(meta.signal.peek(), parsedValue)) {
      meta.signal.value = parsedValue as never;
    }
  };

  if (binding.signal) {
    registerCleanup(effect(() => update(binding.signal!.value)));
  } else {
    update(binding.value!);
  }
};

export const applyPropBinding = (el: HTMLElement, binding: PropBinding, registerCleanup: RegisterCleanup) => {
  const update = (value: unknown) => {
    (el as any)[binding.name] = value;
  };

  if (binding.signal) {
    registerCleanup(effect(() => update(binding.signal!.value)));
  } else {
    update(binding.value!);
  }

  bindPropertyModel(el, binding.name, binding.model, registerCleanup);
};

export const applyEventBinding = (el: HTMLElement, binding: EventBinding, registerCleanup: RegisterCleanup) => {
  const modifiers = binding.modifiers;
  const listenerOptions =
    modifiers?.capture || modifiers?.once || modifiers?.passive
      ? {
          capture: !!modifiers?.capture,
          once: !!modifiers?.once,
          passive: !!modifiers?.passive,
        }
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

// ─── Binding orchestration ────────────────────────────────────────────────────

import { type BindingTargets } from './template-dom';

/**
 * Apply bindings to a target element or container.
 * Separates text/html bindings from attr/prop/event/ref bindings for efficient processing.
 */
export const applyBindingsWithTargets = (
  bindings: Binding[],
  registerCleanup: RegisterCleanup,
  targets: BindingTargets,
  opts?: { onHtml?: (b: HtmlBinding) => void },
) => {
  const bindingMap = new Map<string, Binding[]>();

  for (const b of bindings) {
    const id = b.uid;

    if (b.type === 'text') {
      const found = targets.comments.get(id);

      if (found) {
        const textNode = document.createTextNode('');

        found.replaceWith(textNode);
        targets.comments.delete(id);
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
    const el = targets.elements.get(id);

    if (!el) continue;

    el.removeAttribute(CF_ID_ATTR);
    targets.elements.delete(id);

    for (const b of elBindings) {
      if (b.type === 'attr') applyAttrBinding(el, b, registerCleanup);
      else if (b.type === 'prop') applyPropBinding(el, b, registerCleanup);
      else if (b.type === 'event') applyEventBinding(el, b, registerCleanup);
      else if (b.type === 'ref') applyRefBinding(el, b, registerCleanup);
      else if (b.type === 'callback') b.apply(el, registerCleanup);
    }
  }
};

// ─── Binding factories ────────────────────────────────────────────────────────

import { type Signal } from '@vielzeug/stateit';

import { hasWritableValueSetter, toReactiveBindingSource } from './runtime-bindings';

export const createAttrBinding = (mode: 'bool' | 'attr', name: string, uid: string, value: unknown): AttrBinding => {
  const source = toReactiveBindingSource(value);

  return source ? { mode, name, signal: source, type: 'attr', uid } : { mode, name, type: 'attr', uid, value };
};

export const createPropBinding = (name: string, uid: string, value: unknown): PropBinding => {
  const source = toReactiveBindingSource(value);

  if (source) {
    return {
      model: hasWritableValueSetter(value) ? (value as Signal<unknown>) : undefined,
      name,
      signal: source,
      type: 'prop',
      uid,
    };
  }

  return { name, type: 'prop', uid, value };
};
