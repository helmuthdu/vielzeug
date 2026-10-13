/**
 * template/bindings.ts: Runtime binding appliers.
 *
 * Responsibilities:
 * - Apply each Binding variant to the live DOM (attr, event, html, model,
 *   prop, ref, directive).
 * - Manage reactive effects and cleanup registration.
 * - Expose `applyBinding()` as the single dispatch entry point.
 * - Own the signal-to-form-control write path (`syncFormControl`) for regular
 *   attribute bindings, and the two-way `model()` write-back loop.
 */

import { computed, isReactive, type Readable, effect as rawEffect, type Signal, untrack } from '@vielzeug/ripple';

import { isLiveBinding } from '../directives/live';
import { invariant } from '../errors';
import { getPropMeta, type PropMeta } from '../props';
import { createReplaceableSlot, isStructuredValue, listen, setAttr } from '../utils/dom';
import type {
  AttrBinding,
  Binding,
  DirectiveBinding,
  EventBinding,
  HtmlBinding,
  HtmlBindingValue,
  ModelBinding,
  PropBinding,
  RefBinding,
} from './binding-types';
import { isHtmlResult } from './result';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RegisterCleanup = (fn: () => void) => void;

// ─── Signal helpers ───────────────────────────────────────────────────────────

const signalEffect = (
  signal: Readable<unknown>,
  update: (v: unknown) => void,
  registerCleanup: RegisterCleanup,
): void => {
  const sub = rawEffect(() => {
    update(signal.value);
    return undefined;
  });

  registerCleanup(() => sub.dispose());
};

// ─── Form control value sync ──────────────────────────────────────────────────

const isNativeFormInput = (el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;

const isCheckableInput = (el: HTMLElement): el is HTMLInputElement =>
  el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio');

type LiveWriteState = { last: unknown };

/**
 * The single write path from a reactive value to a form control's `value`/`checked`
 * property for regular attribute bindings.
 *
 * Live-write: when the binding was created from `live(source)`, a write is skipped
 * if the DOM value has diverged from this binding's last write (in-progress user
 * input): unless the incoming value already matches the DOM (write would be a no-op).
 */
export const syncFormControl = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: unknown,
  isLive?: boolean,
  state: LiveWriteState = { last: undefined },
): void => {
  const checkable = isCheckableInput(el);
  const next: boolean | string = checkable ? Boolean(value) : value == null ? '' : String(value);
  const current: boolean | string = checkable ? (el as HTMLInputElement).checked : el.value;

  if (isLive && state.last !== undefined && !Object.is(current, state.last) && !Object.is(current, next)) return;

  if (checkable) (el as HTMLInputElement).checked = next as boolean;
  else el.value = next as string;

  if (isLive) state.last = next;
};

// ─── Attributes ───────────────────────────────────────────────────────────────

const syncRegisteredProp = (el: HTMLElement, meta: PropMeta, binding: AttrBinding, value: unknown): void => {
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
    meta.signal.value = parsed;
  }

  if (!meta.reflect) {
    if (isStructuredValue(value)) return;

    if (binding.mode === 'bool') el.toggleAttribute(binding.name, Boolean(value));
    else setAttr(el, binding.name, value);
  }
};

export const applyAttrBinding = (binding: AttrBinding, registerCleanup: RegisterCleanup): void => {
  const { el, mode, name } = binding;
  const liveState: LiveWriteState = { last: undefined };

  const update = (value: unknown): void => {
    // Resolved per update, not at instantiation: a nested custom element only
    // registers its props when it is connected, which happens when this result
    // mounts: later than binding construction. By update time the registry entry
    // exists, so a structured value (array/object/callback) reaches a registered
    // prop through its signal instead of an attribute round-trip that could not
    // represent it. Unregistered targets get no such pass: structured data to
    // them is an explicit `.prop=` binding.
    const propMeta = getPropMeta(el, name);

    if (propMeta) {
      syncRegisteredProp(el, propMeta, binding, value);

      return;
    }

    if ((name === 'value' && isNativeFormInput(el)) || (name === 'checked' && el instanceof HTMLInputElement)) {
      syncFormControl(el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value, binding.live, liveState);

      return;
    }

    // `indeterminate` is a property-only concept on checkboxes (no attribute exists):
    // bind it like any other element property so reactive indeterminate state works
    // through the same `indeterminate="${sig}"` syntax as `checked`.
    if (name === 'indeterminate' && el instanceof HTMLInputElement) {
      el.indeterminate = Boolean(value);

      return;
    }

    if (mode === 'bool') el.toggleAttribute(name, Boolean(value));
    else setAttr(el, name, value);
  };

  if ('signal' in binding) {
    signalEffect(binding.signal, update, registerCleanup);
  } else {
    update(binding.value);
  }
};

// ─── Events ───────────────────────────────────────────────────────────────────

const applyEventBinding = (binding: EventBinding, registerCleanup: RegisterCleanup): void => {
  const { modifiers } = binding;

  const handler =
    modifiers?.stop || modifiers?.prevent
      ? (e: Event): void => {
          if (modifiers.stop) e.stopPropagation();
          if (modifiers.prevent) e.preventDefault();
          binding.handler(e);
        }
      : binding.handler;

  const options =
    modifiers?.once || modifiers?.capture ? { capture: modifiers.capture, once: modifiers.once } : undefined;

  registerCleanup(listen(binding.el, binding.name, handler, options));
};

// ─── Explicit property bindings ───────────────────────────────────────────────

/**
 * `.prop=${value}` binding: always writes the element property (never an
 * attribute). This is the explicit channel for structured values (arrays,
 * objects, callbacks): the old implicit "value happens to be an object, so set
 * a property" fallback in the attr path is gone, so intent lives in the markup.
 * Prototype-polluting names are rejected at compile time (see compiler.ts
 * PROP_RE), not silently dropped here.
 */
const applyPropBinding = (binding: PropBinding, registerCleanup: RegisterCleanup): void => {
  const update = (value: unknown): void => {
    (binding.el as unknown as Record<string, unknown>)[binding.name] = value;
  };

  if ('signal' in binding) {
    signalEffect(binding.signal, update, registerCleanup);
  } else {
    update(binding.value);
  }
};

// ─── Two-way model bindings ──────────────────────────────────────────────────

/**
 * `model()` binding: signal → control property (through the same live-aware
 * `syncFormControl` write path as `live()`, so an in-progress user edit is never
 * clobbered) and control event → signal (the write-back that makes it two-way).
 */
const applyModelBinding = (binding: ModelBinding, registerCleanup: RegisterCleanup): void => {
  const { el, get, signal } = binding;
  const liveState: LiveWriteState = { last: undefined };

  const write = (value: unknown): void => {
    if (isNativeFormInput(el)) {
      syncFormControl(el, value, true, liveState);
    } else {
      // Non-native target: plain property write (custom controls expose `value`).
      (el as unknown as { value: unknown }).value = value;
    }
  };

  const sub = rawEffect(() => {
    write(signal.value);
    return undefined;
  });

  const onEvent: EventListener = () => {
    const next = get(el);

    if (
      !Object.is(
        untrack(() => signal.value),
        next,
      )
    ) {
      (signal as Signal<unknown>).value = next;
    }
  };

  registerCleanup(() => sub.dispose());
  registerCleanup(listen(el, binding.event, onEvent));
};

// ─── Refs ─────────────────────────────────────────────────────────────────────

const applyRefBinding = (binding: RefBinding, registerCleanup: RegisterCleanup): void => {
  const { el, ref } = binding;

  if (typeof ref === 'function') {
    ref(el as never);
    registerCleanup(() => ref(null as never));

    return;
  }

  ref.value = el as never;
  registerCleanup(() => {
    ref.value = null as never;
  });
};

// ─── HTML (reactive) ─────────────────────────────────────────────────────────

const insertHtmlValues = (
  values: HtmlBindingValue[],
  insertBefore: ChildNode,
  registerCleanup: RegisterCleanup,
): Node[] => {
  const nodes: Node[] = [];
  const parent = insertBefore.parentNode;

  invariant(parent, 'html binding anchor has no parent node');

  for (const v of values) {
    if (isHtmlResult(v)) {
      const captured = Array.from(v.fragment.childNodes);

      parent.insertBefore(v.fragment, insertBefore);
      v.apply(registerCleanup);
      nodes.push(...captured);
    } else if (v != null && v !== false) {
      const text = document.createTextNode(String(v));

      parent.insertBefore(text, insertBefore);
      nodes.push(text);
    }
  }

  return nodes;
};

export const applyHtmlBinding = (binding: HtmlBinding, registerCleanup: RegisterCleanup): void => {
  const { anchor, signal } = binding;

  const slot = createReplaceableSlot();

  const stop = rawEffect(() => {
    const raw = signal.value;

    slot.clear();

    if (raw == null || raw.length === 0) return;

    untrack(() => {
      slot.setNodes(insertHtmlValues(raw, anchor, slot.registerCleanup));
    });
  });

  registerCleanup(() => {
    stop.dispose();
    slot.clear();
  });
};

// ─── Directives ───────────────────────────────────────────────────────────────

const applyDirectiveBinding = (binding: DirectiveBinding, registerCleanup: RegisterCleanup): void => {
  binding.directive.mount(binding.anchor, registerCleanup);
};

// ─── Binding dispatch ─────────────────────────────────────────────────────────

export const applyBinding = (binding: Binding, registerCleanup: RegisterCleanup): void => {
  switch (binding.type) {
    case 'attr':
      applyAttrBinding(binding, registerCleanup);
      break;
    case 'directive':
      applyDirectiveBinding(binding, registerCleanup);
      break;
    case 'event':
      applyEventBinding(binding, registerCleanup);
      break;
    case 'html':
      applyHtmlBinding(binding, registerCleanup);
      break;
    case 'model':
      applyModelBinding(binding, registerCleanup);
      break;
    case 'prop':
      applyPropBinding(binding, registerCleanup);
      break;
    case 'ref':
      applyRefBinding(binding, registerCleanup);
      break;
  }
};

// ─── Attr binding factory (used by instantiator) ──────────────────────────────

export const createAttrBindingFromValue = (
  el: HTMLElement,
  mode: 'attr' | 'bool',
  name: string,
  value: unknown,
): AttrBinding => {
  if (isLiveBinding(value)) {
    return { el, live: true, mode, name, signal: value.source, type: 'attr' };
  }

  if (typeof value === 'function') {
    return { el, mode, name, signal: computed(value as () => unknown), type: 'attr' };
  }

  if (isReactive(value)) {
    return { el, mode, name, signal: value as Readable<unknown>, type: 'attr' };
  }

  return { el, mode, name, type: 'attr', value };
};

export const resolveStaticText = (value: unknown): string => {
  if (value == null) return '';

  return String(value);
};
