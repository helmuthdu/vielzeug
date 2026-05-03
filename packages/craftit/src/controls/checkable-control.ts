import { computed, signal, watch } from '@vielzeug/stateit';

import { createA11yControl } from './a11y-control';
import {
  createAssistiveState,
  createFieldControlBase,
  type CheckableChangePayload,
  type CheckableStateHandle,
  type CheckableStateOptions,
} from './field-control';
import { createPressControl } from './press-control';

export type CheckableFieldControlOptions = CheckableStateOptions & {
  onPress?: (control: CheckableStateHandle, originalEvent: Event) => void;
  role: 'checkbox' | 'radio' | 'switch';
};

export type CheckableFieldControlHandle = CheckableStateHandle & {
  handleClick: (event: MouseEvent) => boolean;
  handleKeydown: (event: KeyboardEvent) => boolean;
  helperId: string;
  labelId: string;
};

/** @internal */
export const createCheckableState = (options: CheckableStateOptions): CheckableStateHandle => {
  const value = signal('');
  const checked = signal(Boolean(options.checked.value));
  const indeterminate = signal(Boolean(options.indeterminate?.value));
  const assistive = createAssistiveState({ error: options.error, helper: options.helper });

  watch(
    options.checked,
    (next) => {
      checked.value = Boolean(next);
    },
    { immediate: true },
  );

  if (options.indeterminate) {
    watch(
      options.indeterminate,
      (next) => {
        indeterminate.value = Boolean(next);
      },
      { immediate: true },
    );
  }

  const { base, triggerValidation } = createFieldControlBase(options, {
    toFormValue: (nextValue: string | null) => nextValue,
    value: computed(() => {
      if (indeterminate.value) return null;

      return checked.value ? (options.value.value ?? '') : null;
    }),
  });

  watch(
    options.value,
    (next) => {
      value.value = String(next ?? '');
    },
    { immediate: true },
  );

  const createPayload = (event: Event): CheckableChangePayload => ({
    checked: checked.value,
    originalEvent: event,
    value: options.value.value ?? '',
  });

  const toggle = (event: Event): void => {
    if (base.disabled.value) return;

    if (options.group) {
      indeterminate.value = false;
      options.group.toggle(options.value.value ?? '', event);
      options.onToggle?.(createPayload(event));

      return;
    }

    if (options.clearIndeterminateFirst && indeterminate.value) {
      indeterminate.value = false;
    } else {
      checked.value = !checked.value;
      indeterminate.value = false;
    }

    options.onToggle?.(createPayload(event));
  };

  return {
    ...base,
    assistive,
    checked,
    indeterminate,
    toggle,
    triggerValidation,
    value,
  };
};

export const createCheckableFieldControl = (options: CheckableFieldControlOptions): CheckableFieldControlHandle => {
  const control = createCheckableState(options);
  const a11y = createA11yControl({
    checked: () =>
      options.role === 'checkbox' && control.indeterminate.value ? 'mixed' : control.checked.value ? 'true' : 'false',
    helperText: () => control.assistive.value.errorText || control.assistive.value.helperText,
    helperTone: () => (control.assistive.value.errorText ? 'error' : 'default'),
    invalid: () => Boolean(control.assistive.value.errorText),
    role: options.role,
  });

  const press = createPressControl({
    disabled: () => control.disabled.value,
    onPress: (originalEvent) => {
      if (options.onPress) {
        options.onPress(control, originalEvent);

        return;
      }

      control.toggle(originalEvent);
    },
  });

  return {
    ...control,
    handleClick: press.handleClick,
    handleKeydown: press.handleKeydown,
    helperId: a11y.helperId,
    labelId: a11y.labelId,
  };
};
