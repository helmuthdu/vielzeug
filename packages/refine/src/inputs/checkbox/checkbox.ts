import { define, useField, html, inject, prop } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';

import type { CheckableProps, ComponentSize, ThemeColor } from '../../types';

import { type CheckableChangePayload, lifecycleSignal, createCheckable } from '../../headless';
import '../../content/icon/icon';
import { CONTROL_SIZE_PRESET, disablableBundle, sizableBundle, themableBundle } from '../../shared';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledStateMixin,
  forcedColorsFormControlMixin,
  sizeVariantMixin,
} from '../../styles';
import { CHECKBOX_GROUP_CTX } from '../checkbox-group/checkbox-group';
import { applyCheckableBinding } from '../shared/field-binding';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { renderHelperRegion } from '../shared/templates';
import componentStyles from './checkbox.css?inline';

export type OreCheckboxEvents = {
  change: CheckableChangePayload;
};

export type OreCheckboxProps = CheckableProps & {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Error message (marks field as invalid) */
  error?: string;
  /** Helper text displayed below the checkbox */
  helper?: string;
  /** Indeterminate state (partially checked) */
  indeterminate?: boolean;
  /** Component size */
  size?: ComponentSize;
};

/**
 * A customizable checkbox component with theme colors, sizes, and indeterminate state support.
 *
 * @element ore-checkbox
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disable checkbox interaction
 * @attr {boolean} indeterminate - Indeterminate (partially checked) state
 * @attr {string} value - Field value submitted with forms
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Checkbox size: 'sm' | 'md' | 'lg'
 * @attr {string} error - Error message (marks field as invalid)
 * @attr {string} helper - Helper text displayed below the checkbox
 *
 * @fires change - Emitted when checkbox is toggled. detail: { checked: boolean, value: string, originalEvent?: Event }
 *
 * @slot - Checkbox label text
 *
 * @cssprop --checkbox-size - Control size (width and height)
 * @cssprop --checkbox-radius - Control border radius
 * @cssprop --checkbox-bg - Unchecked background color
 * @cssprop --checkbox-border-color - Unchecked border color
 * @cssprop --checkbox-checked-bg - Checked/indeterminate background color
 * @cssprop --checkbox-color - Checkmark icon color
 * @cssprop --checkbox-font-size - Label font size
 * @part checkbox - The checkbox wrapper element
 * @part box - The visual checkbox box
 * @part label - The label element
 * @part helper-text - The helper/error text element
 *
 * @example
 * ```html
 * <ore-checkbox name="agree" required>I agree to the terms</ore-checkbox>
 * <ore-checkbox checked color="primary" size="lg">Enabled by default</ore-checkbox>
 * <ore-checkbox error="This field is required" helper="Check to continue">Accept</ore-checkbox>
 * ```
 */
export const CHECKBOX_TAG = 'ore-checkbox' as const;
define<OreCheckboxProps, OreCheckboxEvents>(CHECKBOX_TAG, {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    checked: prop.bool(false),
    error: prop.string(),
    helper: prop.string(),
    indeterminate: prop.bool(false),
    name: prop.string(),
    value: prop.string('on'),
  },
  setup(props, { bind, emit, onCleanup }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const groupCtx = inject(CHECKBOX_GROUP_CTX);

    let _formField: { reportValidity(): void } | null = null;
    const checkable = createCheckable({
      checked: props.checked,
      clearIndeterminateFirst: true,
      disabled: computed(() => fCtxProps.disabled.value || Boolean(groupCtx?.disabled.value)),
      error: props.error,
      getFormField: () => _formField,
      group: groupCtx,
      helper: props.helper,
      indeterminate: props.indeterminate,
      onToggle: (payload) => {
        checkable.triggerValidation('change');

        // In a checkbox-group, the group owns change emission/state updates.
        // Emitting here would bubble to the group and toggle a second time.
        if (groupCtx) return;

        emit('change', payload);
      },
      prefix: 'checkbox',
      signal: lifecycleSignal(onCleanup),
      validateOn: formCtx?.validateOn,
      value: props.value,
    });

    _formField = useField<string | null>({
      disabled: checkable.disabled,
      toFormValue: (v) => v,
      value: checkable.checkableFormValue,
    });

    const {
      assistiveId,
      checked,
      disabled,
      errorText,
      handleClick,
      handleKeydown,
      helperText,
      indeterminate,
      labelId,
    } = checkable;

    applyCheckableBinding(
      bind,
      fCtxProps.size,
      { assistiveId, checked, disabled, errorText, handleClick, handleKeydown, helperText, indeterminate, labelId },
      'checkbox',
    );

    return html`
      <div class="checkbox-wrapper" part="checkbox">
        <div class="box" part="box">
          <ore-icon class="checkmark" name="check" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
          <ore-icon class="dash" name="minus" size="14" stroke-width="2" aria-hidden="true"></ore-icon>
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
    coarsePointerMixin,
    sizeVariantMixin(CONTROL_SIZE_PRESET),
    componentStyles,
  ],
});
