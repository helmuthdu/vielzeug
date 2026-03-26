import type { FormContext } from './form-context';

type ValidationEvent = 'blur' | 'change' | 'submit';

type ValidatableField = {
  reportValidity: () => unknown;
};

export const triggerValidationOnEvent = (
  formCtx: Pick<FormContext, 'validateOn'> | undefined,
  field: ValidatableField,
  event: ValidationEvent,
): void => {
  if (formCtx?.validateOn.value !== event) return;

  field.reportValidity();
};
