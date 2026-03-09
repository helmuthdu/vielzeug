/**
 * useTextField — shared setup composable for text-based form fields.
 *
 * Extracts the value-signal management, form-field registration, accessibility
 * IDs, and label-visibility sync that is identical between `bit-input` and
 * `bit-textarea`. Helper/error sync differs between the two and stays in each
 * component.
 *
 * Call this function synchronously inside a component factory. The returned
 * `mountLabelSync()` must be called inside `onMount` once DOM refs are ready.
 */

import {
  computed,
  createFormIds,
  defineField,
  effect,
  inject,
  type ReadonlySignal,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';
import { FORM_CTX } from '../form/form';

export interface TextFieldBaseProps {
  disabled: ReadonlySignal<boolean>;
  value: ReadonlySignal<string>;
  name: ReadonlySignal<string>;
  'label-placement': ReadonlySignal<'inset' | 'outside'>;
  label: ReadonlySignal<string>;
}

export function useTextField(props: TextFieldBaseProps, fieldPrefix: string) {
  const formCtx = inject(FORM_CTX);
  const valueSignal = signal('');

  const fd = defineField(
    { disabled: computed(() => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value)), value: valueSignal },
    {
      onReset: () => {
        valueSignal.value = '';
      },
    },
  );

  watch(
    props.value,
    (v) => {
      valueSignal.value = String(v || '');
    },
    { immediate: true },
  );

  const { fieldId, labelId: labelInsetId, helperId, errorId } = createFormIds(fieldPrefix, props.name);
  const labelOutsideId = `${labelInsetId}-outside`;

  const labelInsetRef = ref<HTMLLabelElement>();
  const labelOutsideRef = ref<HTMLLabelElement>();

  /** Create label-visibility reactive effect. Call inside `onMount`. */
  function mountLabelSync(): void {
    effect(() => {
      const placement = props['label-placement'].value;
      const labelText = props.label.value || '';
      if (labelInsetRef.value) {
        labelInsetRef.value.textContent = labelText;
        labelInsetRef.value.hidden = !labelText || placement !== 'inset';
      }
      if (labelOutsideRef.value) {
        labelOutsideRef.value.textContent = labelText;
        labelOutsideRef.value.hidden = !labelText || placement !== 'outside';
      }
    });
  }

  /** Call inside a blur or change handler to trigger validation if the form context warrants it. */
  function triggerValidation(on: 'blur' | 'change'): void {
    if (formCtx?.validateOn.value === on) fd.reportValidity();
  }

  return {
    errorId,
    fieldId,
    formCtx,
    helperId,
    labelInsetId,
    labelInsetRef,
    labelOutsideId,
    labelOutsideRef,
    mountLabelSync,
    triggerValidation,
    valueSignal,
  };
}
