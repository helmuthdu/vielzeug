import { bridgeContextAttributes, type ReadonlySignal } from '@vielzeug/craftit';

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

  bridgeContextAttributes(host, {
    contextDisabled: formCtx.disabled,
    contextSize: formCtx.size,
    contextVariant: props.variant ? formCtx.variant : undefined,
    ownDisabled: props.disabled,
    ownSize: props.size,
    ownVariant: props.variant,
  });
}
