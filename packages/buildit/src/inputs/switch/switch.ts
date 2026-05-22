import { define, defineField, html, inject, onCleanup } from '@vielzeug/craftit';

import type { CheckableProps, ComponentSize, ThemeColor } from '../../types';

import { type CheckableChangePayload, createCheckable, createHeadlessScope } from '../../headless';
import { SWITCH_SIZE_PRESET, disablableBundle, sizableBundle, themableBundle } from '../../shared/config';
import { colorThemeMixin, disabledStateMixin, forcedColorsFormControlMixin, sizeVariantMixin } from '../../styles';
import { connectFormField } from '../shared/connect-form-field';
import { applyCheckableBinding } from '../shared/field-binding';
import { FORM_CTX, useFormContext } from '../shared/form-context';
import { renderHelperRegion } from '../shared/templates';
import componentStyles from './switch.css?inline';

export type BitSwitchEvents = {
  change: CheckableChangePayload;
};

export type BitSwitchProps = CheckableProps & {
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
 * @element bit-switch
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
 * @cssprop --color-contrast - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-300 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-400 - Contrast color token for text and surfaces.
 * @cssprop --color-contrast-500 - Contrast color token for text and surfaces.
 * @cssprop --color-error - Error state color token.
 * @cssprop --leading-tight - Line-height token.
 * @cssprop --rounded-full - Border radius token.
 * @cssprop --shadow-sm - Shadow/elevation token.
 * @cssprop --size-0-5 - Spacing/sizing token.
 * @cssprop --size-10 - Spacing/sizing token.
 * @cssprop --size-11 - Spacing/sizing token.
 * @cssprop --size-2-5 - Spacing/sizing token.
 * @part switch - The switch wrapper element
 * @part track - The switch track element
 * @part thumb - The switch thumb element
 * @part label - The label element
 * @part helper-text - The helper/error text element
 *
 * @example
 * ```html
 * <bit-switch></bit-switch>
 * ```
 */
export const SWITCH_TAG = define<BitSwitchProps, BitSwitchEvents>('bit-switch', {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    checked: { default: false, reflect: false }, // managed by host.bind (form-control derived state)
    error: '',
    helper: '',
    name: '',
    value: 'on',
  },
  setup(props, { emit, host }) {
    const formCtx = inject(FORM_CTX);
    const fCtxProps = useFormContext(host, props, formCtx);

    const checkable = createCheckable({
      checked: props.checked,
      clearIndeterminateFirst: false,
      disabled: fCtxProps.disabled,
      error: props.error,
      helper: props.helper,
      host: host.el,
      onToggle: (payload) => {
        checkable.triggerValidation('change');
        emit('change', payload);
      },
      prefix: 'switch',
      role: 'switch',
      signal: createHeadlessScope(onCleanup).signal,
      validateOn: formCtx?.validateOn,
      value: props.value,
    });
    const { assistiveId, checked, disabled, handleClick, handleKeydown, labelId } = checkable;

    connectFormField(checkable, defineField, checkable.checkableFormValue, (v) => v);

    applyCheckableBinding(host, fCtxProps.size, { checked, disabled, handleClick, handleKeydown });

    return html`
      <div class="switch-wrapper" part="switch">
        <div class="switch-track" part="track">
          <div class="switch-thumb" part="thumb"></div>
        </div>
      </div>
      <span class="label" part="label" ref=${(el: HTMLElement | null) => checkable.setLabelEl(el)} id="${labelId}"><slot></slot></span>
      ${renderHelperRegion(assistiveId, checkable.assistive, checkable.setHelperEl)}
    `;
  },
  styles: [
    colorThemeMixin,
    forcedColorsFormControlMixin,
    disabledStateMixin(),
    sizeVariantMixin(SWITCH_SIZE_PRESET),
    componentStyles,
  ],
});
