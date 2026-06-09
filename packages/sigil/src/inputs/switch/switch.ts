import { define, defineField, html, inject, onCleanup, prop } from '@vielzeug/craft';

import type { CheckableProps, ComponentSize, ThemeColor } from '../../types';

import { type CheckableChangePayload, lifecycleSignal, createCheckable } from '../../headless';
import { disablableBundle, sizableBundle, SWITCH_SIZE_PRESET, themableBundle } from '../../shared';
import { colorThemeMixin, disabledStateMixin, forcedColorsFormControlMixin, sizeVariantMixin } from '../../styles';
import { applyCheckableBinding } from '../shared/field-binding';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { renderHelperRegion } from '../shared/templates';
import componentStyles from './switch.css?inline';

export type SgSwitchEvents = {
  change: CheckableChangePayload;
};

export type SgSwitchProps = CheckableProps & {
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
 * @element sg-switch
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
 * <sg-switch name="notifications" checked color="primary">Enable notifications</sg-switch>
 * <sg-switch name="darkMode" size="sm">Dark mode</sg-switch>
 * <sg-switch disabled helper="Contact admin to change">Admin only</sg-switch>
 * ```
 */
export const SWITCH_TAG = 'sg-switch' as const;
define<SgSwitchProps, SgSwitchEvents>(SWITCH_TAG, {
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
  setup(props, { bind, emit }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);

    const checkable = createCheckable({
      checked: props.checked,
      clearIndeterminateFirst: false,
      disabled: fCtxProps.disabled,
      error: props.error,
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
    const { assistive, assistiveId, checked, disabled, handleClick, handleKeydown, labelId } = checkable;

    checkable.bindFormField(
      defineField<string | null>({
        disabled: checkable.disabled,
        toFormValue: (v) => v,
        value: checkable.checkableFormValue,
      }),
    );

    applyCheckableBinding(
      bind,
      fCtxProps.size,
      { assistive, assistiveId, checked, disabled, handleClick, handleKeydown, labelId },
      'switch',
    );

    return html`
      <div class="switch-wrapper" part="switch">
        <div class="switch-track" part="track">
          <div class="switch-thumb" part="thumb"></div>
        </div>
      </div>
      <span class="label" part="label" id="${labelId}"><slot></slot></span>
      ${renderHelperRegion(assistiveId, assistive)}
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
