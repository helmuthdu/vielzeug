import { computed, defineField, inject, type ReadonlySignal, signal, watch } from '@vielzeug/craftit';

import { FORM_CTX } from '../form/form/form';

export interface ToggleFieldBaseProps {
  disabled: ReadonlySignal<boolean>;
  value: ReadonlySignal<string>;
  checked: ReadonlySignal<boolean>;
}

/**
 * Shared setup for toggle-style form fields (checkbox, switch).
 *
 * @param props  - Component props object with `disabled`, `value`, and `checked`
 * @param onExtraReset - Optional callback invoked alongside the field reset (e.g. to reset `indeterminateSignal`)
 */
export function useToggleField(props: ToggleFieldBaseProps, onExtraReset?: () => void) {
  const formCtx = inject(FORM_CTX);
  const checkedSignal = signal(false);

  const fd = defineField(
    {
      disabled: computed(() => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value)),
      toFormValue: (v: string | null) => v,
      value: computed(() => (checkedSignal.value ? props.value.value : null)),
    },
    {
      onReset: () => {
        checkedSignal.value = props.checked.value ?? false;
        onExtraReset?.();
      },
    },
  );

  watch(
    props.checked,
    (v) => {
      checkedSignal.value = v ?? false;
    },
    { immediate: true },
  );

  /** Call inside a change or blur handler to trigger validation based on the form context. */
  function triggerValidation(on: 'blur' | 'change'): void {
    if (formCtx?.validateOn.value === on) fd.reportValidity();
  }

  return { checkedSignal, formCtx, triggerValidation };
}
