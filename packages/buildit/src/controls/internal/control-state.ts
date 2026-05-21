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

export type ControlStateOptions = {
  context?: ControlContextOptions;
  disabled?: ReadonlySignal<boolean | undefined>;
  validateOn?: ReadonlySignal<ControlValidationMode>;
};

export const createControlState = (options: ControlStateOptions) => {
  const disabled = computed(() => Boolean(options.disabled?.value) || Boolean(options.context?.disabled?.value));

  const validateOn = options.validateOn ?? options.context?.validateOn;

  return {
    disabled,
    triggerValidation: (field: ValidationReporter, on: FormControlValidationTrigger): void => {
      if (validateOn?.value === on) field.reportValidity();
    },
    validateOn,
  };
};
