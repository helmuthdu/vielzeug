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
import { FORM_CTX, type FormContext } from '../form/form';

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

export interface LabelSyncProps {
  'label-placement': ReadonlySignal<'inset' | 'outside'>;
  label: ReadonlySignal<string>;
}

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

export interface FormContextSyncProps {
  disabled: ReadonlySignal<boolean>;
  size: ReadonlySignal<string | undefined>;
  variant?: ReadonlySignal<string | undefined>;
}

/**
 * Propagates form context `disabled`, `size`, and optionally `variant` to the
 * host element's attributes. Call this in setup or inside an `onMount` callback.
 *
 * - `disabled` is tracked with a flag so that context-driven removal only
 *   clears the attribute when it was set by the context (not by the component).
 * - `size` and `variant` are only applied when the component's own prop is unset.
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
    if (props.variant) {
      const ctxVariant = formCtx.variant.value;
      if (ctxVariant && !props.variant.value) host.setAttribute('variant', ctxVariant);
    }
  });
}
