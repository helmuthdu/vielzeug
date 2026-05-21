import { type ReadonlySignal, type Signal, signal, watch } from '@vielzeug/stateit';

import {
  attachTextFieldListeners,
  createAssistiveState,
  createFieldControlBase,
  type AssistiveState,
  type FieldBaseOptions,
  type FieldControlBaseHandle,
  type FormControlValidationTrigger,
} from './field-control';

export type TextFieldOptions = FieldBaseOptions & {
  elementRef?: { value: HTMLInputElement | HTMLTextAreaElement | null };
  maxLength?: ReadonlySignal<number | undefined>;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (event: Event, value: string) => void;
  onInput?: (event: Event, value: string) => void;
  onInputExtra?: (event: Event) => void;
  value: ReadonlySignal<string | undefined>;
};

export type TextFieldHandle = FieldControlBaseHandle & {
  assistive: ReadonlySignal<AssistiveState>;
  clear: (event?: Event) => void;
  triggerValidation: (on: FormControlValidationTrigger) => void;
  value: Signal<string>;
};

export const createTextField = (options: TextFieldOptions): TextFieldHandle => {
  const value = signal('');

  watch(
    options.value,
    (next) => {
      value.value = String(next ?? '');
    },
    { immediate: true },
  );

  const { triggerValidation, ...base } = createFieldControlBase(options, { value });

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
    watch(
      () => options.elementRef?.value,
      (element) => {
        if (!element) return;

        return attachTextFieldListeners({
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
      },
    );
  }

  return {
    assistive,
    ...base,
    clear,
    triggerValidation,
    value,
  };
};
