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
  createId,
  createFormIds,
  defineField,
  inject,
  type ReadonlySignal,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';

import { FORM_CTX } from '../../form/form';
import { mountLabelSyncStandalone } from '../dom-sync';
import { triggerValidationOnEvent } from '../validation';

export type TextFieldBaseProps = {
  disabled: ReadonlySignal<boolean | undefined>;
  label: ReadonlySignal<string | undefined>;
  'label-placement': ReadonlySignal<'inset' | 'outside' | undefined>;
  name: ReadonlySignal<string | undefined>;
  value: ReadonlySignal<string | undefined>;
};

export function useTextField(props: TextFieldBaseProps, fieldPrefix: string) {
  const formCtx = inject(FORM_CTX, undefined);
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
      valueSignal.value = String(v ?? '');
    },
    { immediate: true },
  );

  const {
    errorId,
    fieldId,
    helperId,
    labelId: labelInsetId,
  } = createFormIds(fieldPrefix, props.name.value || createId(fieldPrefix));
  const labelOutsideId = `${labelInsetId}-outside`;

  const labelInsetRef = ref<HTMLLabelElement>();
  const labelOutsideRef = ref<HTMLLabelElement>();

  /** Create label-visibility reactive effect. Call inside `onMount`. */
  function mountLabelSync(): void {
    mountLabelSyncStandalone(labelInsetRef, labelOutsideRef, props);
  }

  /** Call inside a blur or change handler to trigger validation if the form context warrants it. */
  function triggerValidation(on: 'blur' | 'change'): void {
    triggerValidationOnEvent(formCtx, fd, on);
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
