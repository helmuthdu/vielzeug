import { type CleanupFn, type ReadonlySignal } from '@vielzeug/stateit';

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

// ─── Helper utilities ────────────────────────────────────────────────────────

/** Check if a value is a structured type (object or array), not a primitive. */
const isStructuredValue = (value: unknown): value is object =>
  Array.isArray(value) || (typeof value === 'object' && value !== null);

/**
 * Register a reactive effect that updates when a signal changes.
 * Common pattern: `if (signal) registerCleanup(effect(() => update(signal.value)))`
 */
const signalEffect = (
  signal: ReadonlySignal<unknown>,
  update: (v: unknown) => void,
  registerCleanup: RegisterCleanup,
): void => {
  registerCleanup(effect(() => update(signal.value)));
};

// ─── Individual binding application functions ─────────────────────────────────

/**
 * Apply an attribute binding to an element.
 * Handles bool/attr modes, prop pre-upgrade, and reactive updates.
 */
export const applyAttrBinding = (el: HTMLElement, binding: AttrBinding, registerCleanup: RegisterCleanup) => {
  const update = (value: unknown) => {
    const meta = propRegistry.get(el)?.get(binding.name);

    // Preserve structured values as pre-upgrade properties
    if (!meta && isStructuredValue(value)) {
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

    const parsedValue = isStructuredValue(value)
      ? value
      : meta.parse(
          binding.mode === 'bool' ? (value ? '' : null) : value == null || value === false ? null : String(value),
        );

    if (!Object.is(meta.signal.peek(), parsedValue)) {
      meta.signal.value = parsedValue as never;
    }
  };

  if (binding.signal) {
    signalEffect(binding.signal, update, registerCleanup);
  } else {
    update(binding.value!);
  }
};

/**
 * Apply a property binding to an element.
 * Handles reactive updates and two-way binding via property models.
 */
export const applyPropBinding = (el: HTMLElement, binding: PropBinding, registerCleanup: RegisterCleanup) => {
  const update = (value: unknown) => {
    (el as any)[binding.name] = value;
  };

  if (binding.signal) {
    signalEffect(binding.signal, update, registerCleanup);
  } else {
    update(binding.value!);
  }

  bindPropertyModel(el, binding.name, binding.model, registerCleanup);
};

/**
 * Apply an event listener binding to an element.
 * Handles event modifiers (stop, prevent, self, capture, once, passive).
 */
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

/**
 * Apply a ref binding to an element.
 * Supports function refs, ref arrays, and signal refs with cleanup.
 */
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

// ─── Binding orchestration ────────────────────────────────────────────────────

import { type BindingTargets } from './template-dom';

/**
 * Apply all bindings to target elements.
 *
 * - Text bindings: Create text nodes, register reactive effects
 * - HTML bindings: Notify caller for keyed reconciliation
 * - Element bindings: Group by ID, apply attr/prop/event/ref in one pass per element
 *
 * @param bindings Array of compiled bindings to apply
 * @param registerCleanup Function to register cleanup callbacks
 * @param targets Indexed comment/element targets from DOM
 * @param opts Optional callbacks (e.g., onHtml for keyed reconciliation)
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
      switch (b.type) {
        case 'attr':
          applyAttrBinding(el, b, registerCleanup);
          break;
        case 'callback':
          b.apply(el, registerCleanup);
          break;
        case 'event':
          applyEventBinding(el, b, registerCleanup);
          break;
        case 'prop':
          applyPropBinding(el, b, registerCleanup);
          break;
        case 'ref':
          applyRefBinding(el, b, registerCleanup);
          break;
      }
    }
  }
};

// ─── Binding factories ────────────────────────────────────────────────────────

import { type Signal } from '@vielzeug/stateit';

import { hasWritableValueSetter, toReactiveBindingSource } from './runtime-bindings';

/**
 * Create an attribute binding descriptor.
 * Called during template compilation for each attribute interpolation.
 *
 * @param mode 'bool' for boolean attributes (presence = true), 'attr' for string values
 * @param name Attribute name (e.g., 'disabled', 'aria-label')
 * @param uid Unique binding ID
 * @param value Attribute value (signal or static)
 */
export const createAttrBinding = (mode: 'bool' | 'attr', name: string, uid: string, value: unknown): AttrBinding => {
  const source = toReactiveBindingSource(value);

  return source ? { mode, name, signal: source, type: 'attr', uid } : { mode, name, type: 'attr', uid, value };
};

/**
 * Create a property binding descriptor.
 * Called during template compilation for each `.property` interpolation.
 *
 * @param name Property name (e.g., 'value', 'checked')
 * @param uid Unique binding ID
 * @param value Property value (signal, function, or static)
 */
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
