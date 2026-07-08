import { define, html, inject, prop, onCleanup, useEmit } from '@vielzeug/ore';
import { useField } from '@vielzeug/ore/forms';

import type { CheckableProps, ComponentSize, ThemeColor } from '../../types';

import { type CheckableChangePayload, lifecycleSignal, createCheckable } from '../../headless';
import { disablableBundle, sizableBundle, SWITCH_SIZE_PRESET, themableBundle } from '../../shared';
import { colorThemeMixin, disabledStateMixin, forcedColorsFormControlMixin, sizeVariantMixin } from '../../styles';
import { applyCheckableBinding } from '../shared/field-binding';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { renderHelperRegion } from '../shared/templates';
import componentStyles from './switch.css?inline';

export type OreSwitchEvents = {
  change: CheckableChangePayload;
};

export type OreSwitchProps = CheckableProps & {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Helper text displayed below the switch */
  helper?: string;
  /** Component size */
  size?: ComponentSize;
};

/**
 * A toggle switch component for binary on/off states.
 *
 * @element ore-switch
 *
 * @attr {boolean} checked - Checked/on state
 * @attr {boolean} disabled - Disable switch interaction
 * @attr {string} value - Field value
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Switch size: 'sm' | 'md' | 'lg'
 * @attr {string} error - Error message (marks field as invalid)
 * @attr {string} helper - Helper text displayed below the switch
 *
 * @fires change - Emitted when switch is toggled. detail: { checked: boolean, value: string, originalEvent?: Event }
 *
 * @slot - Switch label text
 *
 * @cssprop --switch-width - Track width
 * @cssprop --switch-height - Track height
 * @cssprop --switch-track-bg - Inactive track background color
 * @cssprop --switch-checked-bg - Active/checked track background color
 * @cssprop --switch-thumb-bg - Thumb background color
 * @cssprop --switch-font-size - Label font size
 * @part switch - The switch wrapper element
 * @part track - The switch track element
 * @part thumb - The switch thumb element
 * @part label - The label element
 * @part helper-text - The helper/error text element
 *
 * @example
 * ```html
 * <ore-switch name="notifications" checked color="primary">Enable notifications</ore-switch>
 * <ore-switch name="darkMode" size="sm">Dark mode</ore-switch>
 * <ore-switch disabled helper="Contact admin to change">Admin only</ore-switch>
 * ```
 */
export const SWITCH_TAG = 'ore-switch' as const;
define<OreSwitchProps>(SWITCH_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    checked: prop.bool(false),
    error: prop.string(),
    helper: prop.string(),
    name: prop.string(),
    value: prop.string('on'),
  },
  setup(props) {
    const emit = useEmit<OreSwitchEvents>();

    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(props, formCtx);

    let _formField: { reportValidity(): void } | null = null;
    const checkable = createCheckable({
      checked: props.checked,
      clearIndeterminateFirst: false,
      disabled: fCtxProps.disabled,
      error: props.error,
      getFormField: () => _formField,
      helper: props.helper,
      onToggle: (payload) => {
        checkable.triggerValidation('change');
        emit('change', payload);
      },
      prefix: 'switch',
      signal: lifecycleSignal(onCleanup),
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    _formField = useField<string | null>({
      disabled: checkable.disabled,
      toFormValue: (v) => v,
      value: checkable.checkableFormValue,
    });

    const { assistiveId, checked, disabled, errorText, handleClick, handleKeydown, helperText, labelId } = checkable;

    applyCheckableBinding(
      fCtxProps.size,
      { assistiveId, checked, disabled, errorText, handleClick, handleKeydown, helperText, labelId },
      'switch',
    );

    return html`
      <div class="switch-wrapper" part="switch">
        <div class="switch-track" part="track">
          <div class="switch-thumb" part="thumb"></div>
        </div>
      </div>
      <span class="label" part="label" id="${labelId}"><slot></slot></span>
      ${renderHelperRegion(assistiveId, errorText, helperText)}
    `;
  },
  styles: [
    colorThemeMixin,
    forcedColorsFormControlMixin,
    disabledStateMixin,
    sizeVariantMixin(SWITCH_SIZE_PRESET),
    componentStyles,
  ],
});
