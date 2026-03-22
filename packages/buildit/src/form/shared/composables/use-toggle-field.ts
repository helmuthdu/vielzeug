import { computed, defineField, inject, type ReadonlySignal, signal, watch } from '@vielzeug/craftit';

import { FORM_CTX } from '../../form/form';
import { createFieldValidation } from '../validation';

export interface ToggleFieldBaseProps {
  disabled: ReadonlySignal<boolean | undefined>;
  value: ReadonlySignal<string | undefined>;
  checked: ReadonlySignal<boolean | undefined>;
}

/**
 * Shared setup for toggle-style form fields (checkbox, switch).
 *
 * @param props  - Component props object with `disabled`, `value`, and `checked`
 * @param onExtraReset - Optional callback invoked alongside the field reset (e.g. to reset `indeterminateSignal`)
 */
export function useToggleField(props: ToggleFieldBaseProps, onExtraReset?: () => void) {
  const formCtx = inject(FORM_CTX, undefined);
  const checkedSignal = signal(false);

  const fd = defineField(
    {
      disabled: computed(() => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value)),
      toFormValue: (v: string | null) => v,
      value: computed(() => (checkedSignal.value ? (props.value.value ?? '') : null)),
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

  const { triggerValidation } = createFieldValidation(formCtx, fd);

  return { checkedSignal, formCtx, triggerValidation };
}
