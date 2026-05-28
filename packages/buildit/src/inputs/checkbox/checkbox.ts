import { computed, define, defineField, html, inject, onCleanup, prop } from '@vielzeug/craftit';

import type { CheckableProps, ComponentSize, ThemeColor } from '../../types';

import { type CheckableChangePayload, createCheckable, toAbortSignal } from '../../headless';
import '../../content/icon/icon';
import { CONTROL_SIZE_PRESET, disablableBundle, sizableBundle, themableBundle } from '../../shared/config';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledStateMixin,
  forcedColorsFormControlMixin,
  sizeVariantMixin,
} from '../../styles';
import { CHECKBOX_GROUP_CTX } from '../checkbox-group/checkbox-group';
import { connectFormField } from '../shared/connect-form-field';
import { applyCheckableBinding } from '../shared/field-binding';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { renderHelperRegion } from '../shared/templates';
import componentStyles from './checkbox.css?inline';

export type BitCheckboxEvents = {
  change: CheckableChangePayload;
};

export type BitCheckboxProps = CheckableProps & {
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
 * @element bit-checkbox
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
 * @cssprop --border-2 - Border token.
 * @cssprop --checkbox-bg - Checkbox control styling token.
 * @cssprop --checkbox-border-color - Checkbox control styling token.
 * @cssprop --checkbox-checked-bg - Checkbox control styling token.
 * @cssprop --checkbox-color - Checkbox control styling token.
 * @cssprop --checkbox-font-size - Checkbox control styling token.
 * @cssprop --checkbox-radius - Checkbox control styling token.
 * @cssprop --checkbox-size - Checkbox control styling token.
 * @cssprop --color-contrast - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-200 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-300 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-500 - Contrast color token for text and surfaces.
 * @part checkbox - The checkbox wrapper element
 * @part box - The visual checkbox box
 * @part label - The label element
 * @part helper-text - The helper/error text element
 *
 * @example
 * ```html
 * <bit-checkbox></bit-checkbox>
 * ```
 */
export const CHECKBOX_TAG = define<BitCheckboxProps, BitCheckboxEvents>('bit-checkbox', {
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
  setup(props, { bind, el, emit }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(bind, props, formCtx);
    const groupCtx = inject(CHECKBOX_GROUP_CTX);

    const checkable = createCheckable({
      checked: props.checked,
      clearIndeterminateFirst: true,
      disabled: computed(() => fCtxProps.disabled.value || Boolean(groupCtx?.disabled.value)),
      error: props.error,
      group: groupCtx,
      helper: props.helper,
      host: el,
      indeterminate: props.indeterminate,
      onToggle: (payload) => {
        checkable.triggerValidation('change');

        // In a checkbox-group, the group owns change emission/state updates.
        // Emitting here would bubble to the group and toggle a second time.
        if (groupCtx) return;

        emit('change', payload);
      },
      prefix: 'checkbox',
      role: 'checkbox',
      signal: toAbortSignal(onCleanup),
      validateOn: formCtx?.validateOn,
      value: props.value,
    });
    const { assistiveId, checked, disabled, handleClick, handleKeydown, indeterminate, labelId } = checkable;

    connectFormField(checkable, defineField, checkable.checkableFormValue, (v) => v);

    applyCheckableBinding(bind, fCtxProps.size, { checked, disabled, handleClick, handleKeydown, indeterminate });

    return html`
      <div class="checkbox-wrapper" part="checkbox">
        <div class="box" part="box">
          <bit-icon class="checkmark" name="check" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
          <bit-icon class="dash" name="minus" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
        </div>
      </div>
      <span class="label" part="label" ref=${(el: HTMLElement | null) => checkable.setLabelEl(el)} id="${labelId}"
        ><slot></slot
      ></span>
      ${renderHelperRegion(assistiveId, checkable.assistive, checkable.setHelperEl)}
    `;
  },
  styles: [
    colorThemeMixin,
    forcedColorsFormControlMixin,
    disabledStateMixin(),
    coarsePointerMixin,
    sizeVariantMixin(CONTROL_SIZE_PRESET),
    componentStyles,
  ],
});
