import { signal, watch } from '@vielzeug/stateit';

import { defineField } from '../form';
import { onElement } from '../runtime';
import {
  createAssistiveState,
  createBaseFieldHandle,
  mountTextFieldLifecycle,
  type TextFieldHandle,
  type TextFieldOptions,
} from './field-control';

export const createTextField = (options: TextFieldOptions): TextFieldHandle => {
  const value = signal('');
  const { bindTrigger, ...base } = createBaseFieldHandle({
    ...options,
  });

  watch(
    options.value,
    (next) => {
      value.value = String(next ?? '');
    },
    { immediate: true },
  );

  const field = defineField({
    disabled: base.disabled,
    value,
  });

  const triggerValidation = bindTrigger(field);

  const assistive = createAssistiveState({
    error: options.error,
    helper: options.helper,
    maxLength: options.maxLength,
    value,
  });

  const clear = (event?: Event): void => {
    event?.preventDefault?.();

    value.value = '';
    options.onInput?.(event ?? new Event('input'), '');
    options.onChange?.(event ?? new Event('change'), '');
    triggerValidation('change');
    options.elementRef?.value?.focus();
  };

  if (options.elementRef) {
    onElement(options.elementRef, (element) => {
      mountTextFieldLifecycle({
        element,
        onBlur: options.onBlur,
        onChange: options.onChange,
        onInput: (event, nextValue) => {
          options.onInputExtra?.(event);
          options.onInput?.(event, nextValue);
        },
        triggerValidation,
      });
    });
  }

  return {
    assistive,
    ...base,
    clear,
    field,
    triggerValidation,
    value,
  };
};
