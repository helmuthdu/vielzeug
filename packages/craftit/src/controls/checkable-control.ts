import { createA11yControl, type A11yControlHandle } from './a11y-control';
import { createFieldControl, type CheckableStateHandle, type CheckableStateOptions } from './field-control';
import { createPressControl, type PressControl } from './press-control';

export type CheckableFieldControlOptions = CheckableStateOptions & {
  host: HTMLElement;
  onPress?: (control: CheckableStateHandle, originalEvent: Event) => void;
  role: 'checkbox' | 'radio' | 'switch';
};

export type CheckableFieldControlHandle = {
  a11y: A11yControlHandle;
  control: CheckableStateHandle;
  press: PressControl;
};

export const createCheckableFieldControl = (options: CheckableFieldControlOptions): CheckableFieldControlHandle => {
  const control = createFieldControl({ kind: 'checkable', options });
  const checkableControl = control as CheckableStateHandle;

  const a11y = createA11yControl(options.host, {
    checked: () => {
      if (options.role === 'checkbox' && checkableControl.indeterminate.value) return 'mixed';

      return checkableControl.checked.value ? 'true' : 'false';
    },
    helperText: () => checkableControl.assistive.value.text,
    helperTone: () => (checkableControl.assistive.value.isError ? 'error' : 'default'),
    invalid: () => checkableControl.assistive.value.isError,
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

  return { a11y, control, press };
};
