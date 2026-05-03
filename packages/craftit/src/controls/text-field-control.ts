import { signal, watch } from '@vielzeug/stateit';

import { onElement } from '../runtime';
import {
  createAssistiveState,
  createFieldControlBase,
  mountTextFieldLifecycle,
  type TextFieldHandle,
  type TextFieldOptions,
} from './field-control';

export const createTextField = (options: TextFieldOptions): TextFieldHandle => {
  const value = signal('');

  watch(
    options.value,
    (next) => {
      value.value = String(next ?? '');
    },
    { immediate: true },
  );

  const { base, triggerValidation } = createFieldControlBase(options, { value });

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
        onChange: (event, nextValue) => {
          value.value = nextValue;
          options.onChange?.(event, nextValue);
        },
        onInput: (event, nextValue) => {
          value.value = nextValue;
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
    triggerValidation,
    value,
  };
};
