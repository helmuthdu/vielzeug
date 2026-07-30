/**
 * template/bindings.ts — Runtime binding appliers.
 *
 * Responsibilities:
 * - Apply each Binding variant to the live DOM (attr, event, html, ref,
 *   directive, spread).
 * - Manage reactive effects and cleanup registration.
 * - Expose `applyBinding()` as the single dispatch entry point.
 * - Own the one signal-to-form-control write path (`syncFormControl`) shared by
 *   the attr engine and `model()` — there is no second implementation of
 *   input value/checked semantics anywhere else in the package.
 */

import { computed, effect as rawEffect, isReactive, type Readable, untrack } from '@vielzeug/ripple';

import { isLiveBinding } from '../directives/live';
import { invariant } from '../errors';
import { getPropMeta, type PropMeta } from '../props';
import { createReplaceableSlot, isStructuredValue, listen, setAttr } from '../utils/dom';
import {
  type AttrBinding,
  type Binding,
  type DirectiveBinding,
  type EventBinding,
  type HtmlBinding,
  type HtmlBindingValue,
  type RefBinding,
  type SpreadBinding,
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
  const sub = rawEffect(() => update(signal.value));

  registerCleanup(() => sub.dispose());
};

// ─── Form control value sync ──────────────────────────────────────────────────

const isNativeFormInput = (el: HTMLElement): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
  el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;

const isCheckbox = (el: HTMLElement): el is HTMLInputElement =>
  el instanceof HTMLInputElement && el.type === 'checkbox';

type LiveWriteState = { last: unknown };

/**
 * The single write path from a reactive value to a form control's `value`/`checked`
 * property. Used by the attr binding engine (`value`/`checked` special cases) and
 * by `model()` — both share value-shape coercion and live-write semantics, so both
 * call this instead of keeping their own copies.
 *
 * Live-write: when the binding was created from `live(source)`, a write is skipped
 * if the DOM value has diverged from this binding's last write (in-progress user
 * input) — unless the incoming value already matches the DOM (write would be a no-op).
 */
export const syncFormControl = (
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: unknown,
  isLive?: boolean,
  state: LiveWriteState = { last: undefined },
): void => {
  const checkbox = isCheckbox(el);
  const next: boolean | string = checkbox ? Boolean(value) : value == null ? '' : String(value);
  const current: boolean | string = checkbox ? (el as HTMLInputElement).checked : el.value;

  if (isLive && state.last !== undefined && !Object.is(current, state.last) && !Object.is(current, next)) return;

  if (checkbox) (el as HTMLInputElement).checked = next as boolean;
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
  const { el, mode, name, propMeta } = binding;
  const liveState: LiveWriteState = { last: undefined };

  const update = (value: unknown): void => {
    if (propMeta) {
      syncRegisteredProp(el, propMeta, binding, value);

      return;
    }

    if (!isReactive(value) && isStructuredValue(value)) {
      if (name !== '__proto__' && name !== 'constructor' && name !== 'prototype') {
        (el as unknown as Record<string, unknown>)[name] = value;
      }

      return;
    }

    if ((name === 'value' && isNativeFormInput(el)) || (name === 'checked' && el instanceof HTMLInputElement)) {
      syncFormControl(el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value, binding.live, liveState);

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
  registerCleanup(listen(binding.el, binding.name, binding.handler, binding.options));
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

// ─── Spread ───────────────────────────────────────────────────────────────────

const applySpreadBinding = (binding: SpreadBinding, registerCleanup: RegisterCleanup): void => {
  binding.spread.apply(binding.el, registerCleanup);
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
    case 'ref':
      applyRefBinding(binding, registerCleanup);
      break;
    case 'spread':
      applySpreadBinding(binding, registerCleanup);
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
  const propMeta = getPropMeta(el, name);

  if (isLiveBinding(value)) {
    return { el, live: true, mode, name, propMeta, signal: value.source, type: 'attr' };
  }

  if (typeof value === 'function') {
    return { el, mode, name, propMeta, signal: computed(value as () => unknown), type: 'attr' };
  }

  if (isReactive(value)) {
    return { el, mode, name, propMeta, signal: value as Readable<unknown>, type: 'attr' };
  }

  return { el, mode, name, propMeta, type: 'attr', value };
};

export const resolveStaticText = (value: unknown): string => {
  if (value == null) return '';

  return String(value);
};
