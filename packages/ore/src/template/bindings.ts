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

import {
  computed,
  isReactive,
  onCleanup,
  type Readable,
  effect as rawEffect,
  type Signal,
  untrack,
} from '@vielzeug/ripple';

import { invariant } from '../errors';
import { getPropMeta, type PropMeta } from '../props';
import { createReplaceableSlot, listen, setAttr } from '../utils/dom';
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

// ─── Signal helpers ───────────────────────────────────────────────────────────

// Every mount runs inside a reactive owner (component scope, each() item/fallback
// scope, or a replaceable slot's scope) whose lifetime matches the nodes'.
// Binding effects and `onCleanup` registrations are disposed with that owner.
const signalEffect = (signal: Readable<unknown>, update: (v: unknown) => void): void => {
  rawEffect(() => {
    update(signal.value);
    return undefined;
  });
};

// ─── Form control value sync ──────────────────────────────────────────────────

const isNativeFormInput = (el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;

const isCheckableInput = (el: HTMLElement): el is HTMLInputElement =>
  el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio');

type LiveWriteState = { last: unknown };

/**
 * The single write path from a reactive value to a form control's `value`/`checked`
 * property.
 *
 * Stale-write guard (`model()` bindings pass `liveState`): a write is skipped when the
 * DOM value has diverged from this binding's last write (in-progress user input),
 * unless the incoming value already matches the DOM (the write would be a no-op).
 */
export const syncFormControl = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: unknown,
  liveState?: LiveWriteState,
): void => {
  const checkable = isCheckableInput(el);
  const next: boolean | string = checkable ? Boolean(value) : value == null ? '' : String(value);
  const current: boolean | string = checkable ? (el as HTMLInputElement).checked : el.value;

  if (liveState && liveState.last !== undefined && !Object.is(current, liveState.last) && !Object.is(current, next)) {
    return;
  }

  if (checkable) (el as HTMLInputElement).checked = next as boolean;
  else el.value = next as string;

  if (liveState) liveState.last = next;
};

// ─── Attributes ───────────────────────────────────────────────────────────────

const isAttributeValue = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/**
 * The one write path from an attribute binding into a registered child prop. Absent
 * values (`null`/`undefined`/`false`) behave like a removed attribute and `?name=`
 * like attribute presence; strings parse like attribute text; every other value
 * (numbers, booleans, objects, arrays, functions) reaches the prop signal as-is,
 * the same as assigning the element property.
 */
const toRegisteredPropValue = (meta: PropMeta, mode: AttrBinding['mode'], value: unknown): unknown => {
  if (mode === 'bool') return meta.parse(value ? '' : null);
  if (value == null || value === false) return meta.parse(null);
  if (typeof value === 'string') return meta.parse(value);

  return value;
};

const syncRegisteredProp = (el: HTMLElement, meta: PropMeta, binding: AttrBinding, value: unknown): void => {
  const next = toRegisteredPropValue(meta, binding.mode, value);

  if (
    !Object.is(
      untrack(() => meta.signal.value),
      next,
    )
  )
    meta.signal.value = next;

  // A non-reflecting prop still mirrors plain attribute values, so attribute
  // selectors on the host keep matching what the parent template bound.
  if (meta.reflect || !(value == null || isAttributeValue(value))) return;

  if (binding.mode === 'bool') el.toggleAttribute(binding.name, Boolean(value));
  else setAttr(el, binding.name, value);
};

export const applyAttrBinding = (binding: AttrBinding): void => {
  const { el, mode, name } = binding;

  const update = (value: unknown): void => {
    // Resolved per update, not at instantiation: a nested custom element only
    // registers its props when it is connected, which happens when this result
    // mounts: later than binding construction. For a child that is already
    // connected (or connects before this write), a structured value
    // (array/object/callback) reaches the registered prop through its signal
    // instead of an attribute round-trip that could not represent it. Note the
    // staging window: `each()` mounts items into a detached fragment, so a
    // STATIC structured binding on a staged child misses the registry and falls
    // through to the attribute path — deliver such values through an explicitly
    // reactive binding (applied again after the child connects) or `.prop=`.
    // Unregistered targets get no signal pass at all: structured data to them
    // is an explicit `.prop=` binding.
    const propMeta = getPropMeta(el, name);

    if (propMeta) {
      syncRegisteredProp(el, propMeta, binding, value);

      return;
    }

    if ((name === 'value' && isNativeFormInput(el)) || (name === 'checked' && el instanceof HTMLInputElement)) {
      syncFormControl(el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value);

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
    signalEffect(binding.signal, update);
  } else {
    update(binding.value);
  }
};

// ─── Events ───────────────────────────────────────────────────────────────────

const applyEventBinding = (binding: EventBinding): void => {
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

  onCleanup(listen(binding.el, binding.name, handler, options));
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
const applyPropBinding = (binding: PropBinding): void => {
  const update = (value: unknown): void => {
    (binding.el as unknown as Record<string, unknown>)[binding.name] = value;
  };

  if ('signal' in binding) {
    signalEffect(binding.signal, update);
  } else {
    update(binding.value);
  }
};

// ─── Two-way model bindings ──────────────────────────────────────────────────

/**
 * `model()` binding: signal → control property (through `syncFormControl` with its
 * stale-write guard, so an in-progress user edit is never clobbered) and control
 * event → signal (the write-back that makes it two-way).
 */
const applyModelBinding = (binding: ModelBinding): void => {
  const { el, get, signal } = binding;
  const liveState: LiveWriteState = { last: undefined };

  const write = (value: unknown): void => {
    if (isNativeFormInput(el)) {
      syncFormControl(el, value, liveState);
    } else {
      // Non-native target: plain property write (custom controls expose `value`).
      (el as unknown as { value: unknown }).value = value;
    }
  };

  rawEffect(() => {
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

  onCleanup(listen(el, binding.event, onEvent));
};

// ─── Refs ─────────────────────────────────────────────────────────────────────

const applyRefBinding = (binding: RefBinding): void => {
  const { el, ref } = binding;

  if (typeof ref === 'function') {
    ref(el as never);
    onCleanup(() => ref(null as never));

    return;
  }

  ref.value = el as never;
  onCleanup(() => {
    ref.value = null as never;
  });
};

// ─── HTML (reactive) ─────────────────────────────────────────────────────────

const insertHtmlValues = (values: HtmlBindingValue[], insertBefore: ChildNode, nodes: Node[] = []): Node[] => {
  const parent = insertBefore.parentNode;

  invariant(parent, 'html binding anchor has no parent node');

  for (const v of values) {
    if (isHtmlResult(v)) {
      v.claim();

      const captured = Array.from(v.fragment.childNodes);

      parent.insertBefore(v.fragment, insertBefore);
      v.apply();
      nodes.push(...captured);
    } else if (v != null && v !== false) {
      const text = document.createTextNode(String(v));

      parent.insertBefore(text, insertBefore);
      nodes.push(text);
    }
  }

  return nodes;
};

/** Normalize a reactive node-slot value to the render effect's array shape. */
const toHtmlValues = (raw: unknown): HtmlBindingValue[] =>
  Array.isArray(raw) ? (raw as HtmlBindingValue[]) : [raw as HtmlBindingValue];

export const applyHtmlBinding = (binding: HtmlBinding): void => {
  const { anchor, source } = binding;

  const slot = createReplaceableSlot();

  // The source is read here, not through a memo computed, so this effect is the
  // observer of its dependencies. Nested results mount inside the slot's own
  // scope (`slot.render`), which `clear()` disposes together with the nodes.
  const stop = rawEffect(() => {
    const raw = toHtmlValues(typeof source === 'function' ? source() : source.value);

    if (raw == null || raw.length === 0) {
      slot.clear();

      return;
    }

    untrack(() => {
      slot.render(() => {
        // Register items incrementally: if a later item throws (a reused,
        // already-claimed result, or user code in `apply()`), the earlier nodes
        // are already inserted in the DOM, and only a tracked list lets the
        // next `clear()` remove them.
        const inserted: Node[] = [];

        try {
          insertHtmlValues(raw, anchor, inserted);
        } finally {
          slot.setNodes(inserted);
        }
      });
    });
  });

  onCleanup(() => {
    stop.dispose();
    slot.clear();
  });
};

// ─── Directives ───────────────────────────────────────────────────────────────

const applyDirectiveBinding = (binding: DirectiveBinding): void => {
  binding.directive.mount(binding.anchor);
};

// ─── Binding dispatch ─────────────────────────────────────────────────────────

export const applyBinding = (binding: Binding): void => {
  switch (binding.type) {
    case 'attr':
      applyAttrBinding(binding);
      break;
    case 'directive':
      applyDirectiveBinding(binding);
      break;
    case 'event':
      applyEventBinding(binding);
      break;
    case 'html':
      applyHtmlBinding(binding);
      break;
    case 'model':
      applyModelBinding(binding);
      break;
    case 'prop':
      applyPropBinding(binding);
      break;
    case 'ref':
      applyRefBinding(binding);
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
