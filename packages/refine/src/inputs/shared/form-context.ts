import { bind, createContext } from '@vielzeug/ore';
import { computed, type Readable } from '@vielzeug/ripple';

import type { ValidationTrigger } from '../../headless';
import type { ComponentSize, VisualVariant } from '../../types';

export type FormContext = {
  /** Whether all child fields are disabled */
  disabled: Readable<boolean>;
  /** Default size propagated to all child form fields */
  size: Readable<ComponentSize | undefined>;
  /**
   * When to validate child form controls:
   * - `'submit'` (default): only on form submit
   * - `'blur'`: validate each field when it loses focus
   * - `'change'`: validate on every value change
   * - `'input'`: validate on every input event
   */
  validateOn: Readable<ValidationTrigger>;
  /** Default variant propagated to all child form fields */
  variant: Readable<VisualVariant | undefined>;
};

export const FORM_CTX = createContext<FormContext>('FormContext');

// ── Prop resolver ─────────────────────────────────────────────────────────────

type FormContextResolvedProps = {
  disabled: Readable<boolean>;
  size: Readable<ComponentSize | undefined>;
  variant: Readable<VisualVariant | undefined>;
};

/**
 * Pure resolver: merges local prop signals with an optional `FormContext`.
 * Returns computed `disabled`, `size`, and `variant` signals without any
 * side-effects — suitable for unit testing and composition.
 */
export const mergeFormContext = (
  props: {
    disabled?: Readable<boolean | undefined> | Readable<boolean>;
    size?: Readable<string | undefined> | Readable<string>;
    variant?: Readable<string | undefined> | Readable<string>;
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
 * (`bind()` on the current component's host) in addition to returning the
 * resolved props — a real composable, since `bind` resolves the active
 * component through implicit context rather than being passed in.
 *
 * Accepts `FormContext | undefined` directly — pass `inject(FORM_CTX)`.
 *
 * `props` here is a field component's *own* full props object (from `setup(props)`), not a
 * narrowed struct — this reads `props.disabled`/`props.size`/`props.variant` off it directly,
 * by name. That's easy to miss when auditing a component: `props.variant` can look unused
 * (never appears as `props.variant` anywhere else in the file) purely because its only reader
 * is this call — grepping for `useFormContext(props` is the tell.
 */
export const useFormContext = (
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
