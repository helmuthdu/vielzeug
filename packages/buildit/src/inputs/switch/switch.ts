import { computed, define, html, inject } from '@vielzeug/craftit';
import { type CheckableChangePayload, createCheckableFieldControl } from '../../controls';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { formControlMixins, sizeVariantMixin } from '../../styles';
import { disablableBundle, sizableBundle, themableBundle } from '../shared/bundles';
import { SWITCH_SIZE_PRESET } from '../shared/design-presets';
import { FORM_CTX } from '../shared/form-context';
import componentStyles from './switch.css?inline';

export type BitSwitchEvents = {
  change: CheckableChangePayload;
};

export type BitSwitchProps = CheckableProps &
  ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Error message (marks field as invalid) */
    error?: string;
    /** Helper text displayed below the switch */
    helper?: string;
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

    let labelRef: HTMLElement | null = null;
    let helperRef: HTMLElement | null = null;

    const checkable = createCheckableFieldControl({
      checked: props.checked,
      clearIndeterminateFirst: false,
      disabled: computed(() => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value)),
      error: props.error,
      getHelperEl: () => helperRef,
      getLabelEl: () => labelRef,
      helper: props.helper,
      onToggle: (payload) => {
        checkable.triggerValidation('change');
        emit('change', payload);
      },
      prefix: 'switch',
      role: 'switch',
      validateOn: formCtx?.validateOn,
      value: props.value,
    });
    const { checked, disabled, handleClick, handleKeydown, helperId, labelId } = checkable;


    host.bind({
      attr: {
        checked,
        size: () => props.size?.value ?? formCtx?.size.value,
        tabindex: () => (disabled.value ? undefined : 0),
      },
      class: () => ({
        'is-checked': checked.value,
        'is-disabled': disabled.value,
      }),
      on: {
        click: handleClick,
        keydown: handleKeydown,
      },
    });

    return () => html`
      <div class="switch-wrapper" part="switch">
        <div class="switch-track" part="track">
          <div class="switch-thumb" part="thumb"></div>
        </div>
      </div>
      <span class="label" part="label" ref=${(el: HTMLElement | null) => { labelRef = el; }} id="${labelId}"><slot></slot></span>
      <div class="helper-text" part="helper-text" ref=${(el: HTMLElement | null) => { helperRef = el; }} id="${helperId}" aria-live="polite" hidden></div>
    `;
  },
  styles: [...formControlMixins, sizeVariantMixin(SWITCH_SIZE_PRESET), componentStyles],
});
