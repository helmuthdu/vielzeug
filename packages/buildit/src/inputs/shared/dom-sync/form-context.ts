import { effect, type ReadonlySignal } from '@vielzeug/craftit';

import { type FormContext } from '../form-context';

export interface FormContextSyncProps {
  disabled: ReadonlySignal<boolean | undefined>;
  size: ReadonlySignal<string | undefined>;
  variant?: ReadonlySignal<string | undefined>;
}

/**
 * Propagates form context `disabled`, `size`, and optionally `variant` to the
 * host element's attributes. Call this in setup or inside an `onMount` callback.
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

  let ctxDisabledActive = false;

  effect(() => {
    const ctxDisabled = formCtx.disabled.value;

    if (ctxDisabled && !ctxDisabledActive) {
      host.setAttribute('disabled', '');
      ctxDisabledActive = true;
    } else if (!ctxDisabled && ctxDisabledActive) {
      host.removeAttribute('disabled');
      ctxDisabledActive = false;
    }

    const ctxSize = formCtx.size.value;

    if (ctxSize && !props.size.value) host.setAttribute('size', ctxSize);
    else if (!props.size.value) host.removeAttribute('size');

    if (props.variant) {
      const ctxVariant = formCtx.variant.value;

      if (ctxVariant && !props.variant.value) host.setAttribute('variant', ctxVariant);
      else if (!props.variant.value) host.removeAttribute('variant');
    }
  });
}
