import { createContext, type HostBindFn, type ReadonlySignal } from '@vielzeug/craft';
import { computed } from '@vielzeug/ripple';

import type { ValidationTrigger } from '../../headless';
import type { ComponentSize, VisualVariant } from '../../types';

export type FormContext = {
  /** Whether all child fields are disabled */
  disabled: ReadonlySignal<boolean>;
  /** Default size propagated to all child form fields */
  size: ReadonlySignal<ComponentSize | undefined>;
  /**
   * When to validate child form controls:
   * - `'submit'` (default): only on form submit
   * - `'blur'`: validate each field when it loses focus
   * - `'change'`: validate on every value change
   * - `'input'`: validate on every input event
   */
  validateOn: ReadonlySignal<ValidationTrigger>;
  /** Default variant propagated to all child form fields */
  variant: ReadonlySignal<VisualVariant | undefined>;
};

export const FORM_CTX = createContext<FormContext>('FormContext');

// ── Prop resolver ─────────────────────────────────────────────────────────────

type FormContextResolvedProps = {
  disabled: ReadonlySignal<boolean>;
  size: ReadonlySignal<ComponentSize | undefined>;
  variant: ReadonlySignal<VisualVariant | undefined>;
};

/**
 * Pure resolver: merges local prop signals with an optional `FormContext`.
 * Returns computed `disabled`, `size`, and `variant` signals without any
 * side-effects — suitable for unit testing and composition.
 */
export const mergeFormContext = (
  props: {
    disabled?: ReadonlySignal<boolean | undefined> | ReadonlySignal<boolean>;
    size?: ReadonlySignal<string | undefined> | ReadonlySignal<string>;
    variant?: ReadonlySignal<string | undefined> | ReadonlySignal<string>;
  },
  formCtx?: FormContext,
): FormContextResolvedProps => ({
  disabled: computed(() => Boolean(props.disabled?.value) || Boolean(formCtx?.disabled?.value)),
  size: computed(
    (): ComponentSize | undefined => (props.size?.value ?? formCtx?.size?.value) as ComponentSize | undefined,
  ),
  variant: computed(
    (): VisualVariant | undefined => (props.variant?.value ?? formCtx?.variant?.value) as VisualVariant | undefined,
  ),
});

/**
 * Resolves form context props AND automatically reflects the computed `disabled`
 * state as a `disabled` attribute on the host element.
 *
 * The `use` prefix signals that calling this function performs a side-effect
 * (`host.bind`) in addition to returning the resolved props — similar to a
 * framework hook.
 *
 * Accepts `FormContext | undefined` directly — pass `inject(FORM_CTX)`.
 */
export const useFormContext = (
  bind: HostBindFn,
  props: Parameters<typeof mergeFormContext>[0],
  formCtx?: FormContext,
): FormContextResolvedProps => {
  const resolved = mergeFormContext(props, formCtx);

  bind({
    attr: {
      disabled: () => (resolved.disabled.value ? '' : undefined),
    },
  });

  return resolved;
};
