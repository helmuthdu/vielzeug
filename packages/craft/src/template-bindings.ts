import { effect as rawEffect, isSignal, type ReadonlySignal, StateError, untrack } from '@vielzeug/ripple';

import {
  type AttrBinding,
  type AttrPropMeta,
  type Binding,
  type DirectiveBinding,
  type EventBinding,
  type HtmlBinding,
  type HtmlBindingValue,
  isHtmlResult,
  type RefBinding,
  type SpreadBinding,
  type TextBinding,
} from './types/bindings';
import { isStructuredValue, listen, removeNodes, runAll, setAttr } from './utils/dom';

export type RegisterCleanup = (fn: () => void) => void;

// ─── Signal helpers ───────────────────────────────────────────────────────────

const signalEffect = (
  signal: ReadonlySignal<unknown>,
  update: (v: unknown) => void,
  registerCleanup: RegisterCleanup,
): void => {
  const sub = rawEffect(() => update(signal.value));

  registerCleanup(() => sub.dispose());
};

/**
 * Read a signal safely, suppressing disposed-signal errors during scope teardown.
 */
const readSignalSafe = <T>(sig: ReadonlySignal<T>): T | undefined => {
  try {
    return sig.value;
  } catch (error) {
    if (error instanceof StateError && error.code === 'DISPOSED_READ') return undefined;

    throw error;
  }
};

// ─── Text ─────────────────────────────────────────────────────────────────────

const applyTextBinding = (binding: TextBinding, registerCleanup: RegisterCleanup): void => {
  signalEffect(
    binding.signal,
    (v) => {
      binding.node.textContent = String(v ?? '');
    },
    registerCleanup,
  );
};

// ─── Attributes ───────────────────────────────────────────────────────────────

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

const syncRegisteredProp = (el: HTMLElement, meta: AttrPropMeta, binding: AttrBinding, value: unknown): void => {
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

    if (!isSignal(value) && isStructuredValue(value)) {
      (el as unknown as Record<string, unknown>)[name] = value;

      return;
    }

    if (name === 'value' && isNativeFormInput(el)) {
      applyFormValue(el, value, binding.live, liveState);

      return;
    }

    if (name === 'checked' && el instanceof HTMLInputElement) {
      applyCheckedValue(el, value, binding.live, liveState);

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
  const parent = insertBefore.parentNode!;

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

  let currentCleanups: (() => void)[] = [];
  const clearCurrent = (): void => {
    runAll(currentCleanups);
    currentCleanups = [];
  };
  let currentNodes: Node[] = [];

  const stop = rawEffect(() => {
    const raw = readSignalSafe(signal);

    clearCurrent();
    removeNodes(currentNodes);
    currentNodes = [];

    if (raw == null) return;

    untrack(() => {
      const values = Array.isArray(raw) ? raw : [raw];

      currentNodes = insertHtmlValues(values as HtmlBindingValue[], anchor, (fn) => currentCleanups.push(fn));
    });
  });

  registerCleanup(() => stop.dispose());
  registerCleanup(() => {
    clearCurrent();
    removeNodes(currentNodes);
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

// ─── Dispatch ─────────────────────────────────────────────────────────────────

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
    case 'text':
      applyTextBinding(binding, registerCleanup);
      break;
  }
};
