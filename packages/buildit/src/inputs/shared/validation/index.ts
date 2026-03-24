export type ValidationTrigger = 'blur' | 'change';

export type ValidationTriggerSource = {
  validateOn: { value: ValidationTrigger | 'submit' | undefined };
};

export type ValidationReporter = {
  reportValidity: () => void;
};

export function triggerValidationOnEvent(
  formCtx: ValidationTriggerSource | undefined,
  field: ValidationReporter,
  on: ValidationTrigger,
): void {
  if (formCtx?.validateOn.value === on) field.reportValidity();
}

export function createFieldValidation(formCtx: ValidationTriggerSource | undefined, field: ValidationReporter) {
  return {
    triggerValidation(on: ValidationTrigger): void {
      triggerValidationOnEvent(formCtx, field, on);
    },
  };
}
