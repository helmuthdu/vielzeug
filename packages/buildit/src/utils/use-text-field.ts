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
  effect,
  useInject,
  type ReadonlySignal,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';

import { FORM_CTX } from '../form/form/form';

export type TextFieldBaseProps = {
  disabled: ReadonlySignal<boolean | undefined>;
  label: ReadonlySignal<string | undefined>;
  'label-placement': ReadonlySignal<'inset' | 'outside' | undefined>;
  name: ReadonlySignal<string | undefined>;
  value: ReadonlySignal<string | undefined>;
};

export function useTextField(props: TextFieldBaseProps, fieldPrefix: string) {
  const formCtx = useInject(FORM_CTX, undefined);
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

export type LabelSyncProps = {
  label: ReadonlySignal<string | undefined>;
  'label-placement': ReadonlySignal<'inset' | 'outside' | undefined>;
};

export type CounterState = {
  atLimit: boolean;
  hidden: boolean;
  nearLimit: boolean;
  text: string;
};

export type SplitAssistiveState = {
  errorHidden: boolean;
  errorText: string;
  helperHidden: boolean;
  helperText: string;
};

export type MergedAssistiveState = {
  hidden: boolean;
  isError: boolean;
  text: string;
};

export type ValidationTriggerSource = {
  validateOn: { value: 'blur' | 'change' | 'submit' | undefined };
};

export type ValidationReporter = {
  reportValidity: () => void;
};

/** Parse comma-separated values used by multi-select style controls. */
export function parseCsvValues(value: string | undefined): string[] {
  if (!value) return [];

  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Serialize selected values to the shared comma-separated form value shape. */
export function stringifyCsvValues(values: string[]): string {
  return values.join(',');
}

/** Parse positive numeric values from optional component props. */
export function parsePositiveNumber(value: unknown): number | null {
  if (value == null) return null;

  const n = Number(value);

  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Shared counter-state thresholds for text controls with maxlength support. */
export function resolveCounterState(length: number, max: number | null): CounterState {
  if (max == null) {
    return { atLimit: false, hidden: true, nearLimit: false, text: '' };
  }

  const ratio = length / max;

  return {
    atLimit: ratio >= 1,
    hidden: false,
    nearLimit: ratio >= 0.9 && ratio < 1,
    text: `${length} / ${max}`,
  };
}

/** Split helper/error state for controls that render separate helper and error elements (input). */
export function resolveSplitAssistiveText(error: string | undefined, helper: string | undefined): SplitAssistiveState {
  const hasError = Boolean(error);
  const hasHelper = Boolean(helper);

  return {
    errorHidden: !hasError,
    errorText: error ?? '',
    helperHidden: hasError || !hasHelper,
    helperText: helper ?? '',
  };
}

/** Merged helper/error state for controls that render one assistive text element (textarea). */
export function resolveMergedAssistiveText(
  error: string | undefined,
  helper: string | undefined,
): MergedAssistiveState {
  const isError = Boolean(error);
  const text = error || helper || '';

  return {
    hidden: !text,
    isError,
    text,
  };
}

/** Call reportValidity only when form context is configured for the given event. */
export function triggerValidationOnEvent(
  formCtx: ValidationTriggerSource | undefined,
  field: ValidationReporter,
  on: 'blur' | 'change',
): void {
  if (formCtx?.validateOn.value === on) field.reportValidity();
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
    const placement = props['label-placement'].value ?? 'inset';
    const labelText = props.label.value ?? '';

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
