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

import { FORM_CTX } from '../form/form/form';

export type TextFieldBaseProps = {
  disabled: ReadonlySignal<boolean>;
  label: ReadonlySignal<string>;
  'label-placement': ReadonlySignal<'inset' | 'outside'>;
  name: ReadonlySignal<string>;
  value: ReadonlySignal<string>;
};

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

  const { errorId, fieldId, helperId, labelId: labelInsetId } = createFormIds(fieldPrefix, props.name);
  const labelOutsideId = `${labelInsetId}-outside`;

  const labelInsetRef = ref<HTMLLabelElement>();
  const labelOutsideRef = ref<HTMLLabelElement>();

  /** Create label-visibility reactive effect. Call inside `onMount`. */
  function mountLabelSync(): void {
    mountLabelSyncStandalone(labelInsetRef, labelOutsideRef, props);
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

export type LabelSyncProps = {
  label: ReadonlySignal<string>;
  'label-placement': ReadonlySignal<'inset' | 'outside'>;
};

/**
 * Reactively synchronises label text and visibility for components that manage
 * their own `labelInsetRef` / `labelOutsideRef` refs (e.g. select, combobox).
 * Call inside `onMount` once DOM refs are ready.
 */
export function mountLabelSyncStandalone(
  labelInsetRef: { value: HTMLElement | null | undefined },
  labelOutsideRef: { value: HTMLElement | null | undefined },
  props: LabelSyncProps,
): void {
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

export { mountFormContextSync } from './use-form-context';
export type { FormContextSyncProps } from './use-form-context';
