import { effect, type ReadonlySignal } from '@vielzeug/craftit';

import { type FormContext } from '../form-context';

export interface FormContextSyncProps {
  disabled?: ReadonlySignal<boolean | undefined>;
  size?: ReadonlySignal<string | undefined>;
  variant?: ReadonlySignal<string | undefined>;
}

/**
 * Propagates form context `disabled`, `size`, and optionally `variant` to the
 * host element's attributes. Call this in setup or in `mount()`.
 *
 * - `disabled` is tracked with a flag so that context-driven removal only
 *   clears the attribute when it was set by the context (not by the component).
 * - `size` and `variant` are only applied when the component's own prop is unset,
 *   and removed when the context value disappears to prevent stale attributes.
 */
export function mountFormContextSync(
  host: HTMLElement,
  formCtx: FormContext | undefined,
  props: FormContextSyncProps,
): void {
  if (!formCtx) return;

  effect(() => {
    const ctxDisabled = formCtx.disabled.value;
    const disabledPropValue = props.disabled?.value;

    if (ctxDisabled && !disabledPropValue) host.setAttribute('disabled', '');
    else if (!disabledPropValue) host.removeAttribute('disabled');

    const ctxSize = formCtx.size.value;
    const sizePropValue = props.size?.value;

    if (ctxSize && !sizePropValue) host.setAttribute('size', ctxSize);
    else if (!sizePropValue) host.removeAttribute('size');

    const ctxVariant = formCtx.variant?.value;

    if (props.variant) {
      if (ctxVariant && !props.variant.value) host.setAttribute('variant', ctxVariant);
      else if (!props.variant.value) host.removeAttribute('variant');
    }
  });
}
