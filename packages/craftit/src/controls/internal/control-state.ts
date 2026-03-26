import { computed, type ReadonlySignal } from '@vielzeug/stateit';

export type FormControlValidationTrigger = 'blur' | 'change';

export type ControlValidationMode = 'blur' | 'change' | 'submit' | undefined;

export type ValidationReporter = {
  reportValidity: () => void;
};

export type ControlContextOptions = {
  disabled?: ReadonlySignal<boolean | undefined>;
  validateOn?: ReadonlySignal<ControlValidationMode>;
};

const shouldReportValidity = (
  validateOn: ReadonlySignal<ControlValidationMode> | undefined,
  on: FormControlValidationTrigger,
): boolean => {
  return validateOn?.value === on;
};

const triggerValidationForField = (
  validateOn: ReadonlySignal<ControlValidationMode> | undefined,
  field: ValidationReporter,
  on: FormControlValidationTrigger,
): void => {
  if (shouldReportValidity(validateOn, on)) field.reportValidity();
};

export const createControlState = (options: ControlContextOptions) => {
  const disabled = computed(() => Boolean(options.disabled?.value));

  const validateOn = options.validateOn;

  return {
    disabled,
    triggerValidation: (field: ValidationReporter, on: FormControlValidationTrigger): void =>
      triggerValidationForField(validateOn, field, on),
    validateOn,
  };
};

export const createValidationControl = (
  validateOn: ReadonlySignal<ControlValidationMode> | undefined,
  field: ValidationReporter,
) => {
  return {
    triggerValidation: (on: FormControlValidationTrigger): void => triggerValidationForField(validateOn, field, on),
  };
};
