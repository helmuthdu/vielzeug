import { defineComponent, html } from '@vielzeug/craftit';
import { useA11yControl, createCheckableControl } from '@vielzeug/craftit/labs';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { formControlMixins, sizeVariantMixin } from '../../styles';
import { useToggleField } from '../shared/composables';
import { SWITCH_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
import componentStyles from './switch.css?inline';

export type BitSwitchEvents = {
  change: { checked: boolean; originalEvent?: Event; value: boolean };
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
 * @fires change - Emitted when switch is toggled. detail: { value: boolean, checked: boolean, originalEvent?: Event }
 *
 * @slot - Switch label text
 *
 * @part switch - The switch wrapper element
 * @part track - The switch track element
 * @part thumb - The switch thumb element
 * @part label - The label element
 * @part helper-text - The helper/error text element
 */
export const SWITCH_TAG = defineComponent<BitSwitchProps, BitSwitchEvents>({
  formAssociated: true,
  props: {
    checked: { default: false },
    color: { default: undefined },
    disabled: { default: false },
    error: { default: '' },
    helper: { default: '' },
    name: { default: '' },
    size: { default: undefined },
    value: { default: 'on' },
  },
  setup({ emit, host, props, reflect }) {
    const { checkedSignal, formCtx, triggerValidation } = useToggleField(props);

    mountFormContextSync(host, formCtx, props);

    // Pass writable checkedSignal directly — toggle() mutates it in place
    const control = createCheckableControl({
      checked: checkedSignal,
      clearIndeterminateFirst: false,
      disabled: props.disabled,
      onToggle: (e) => {
        triggerValidation('change');
        emit('change', control.changePayload(e));
      },
      value: props.value,
    });

    const a11y = useA11yControl(host, {
      checked: () => (control.checked.value ? 'true' : 'false'),
      helperText: () => props.error.value || props.helper.value,
      helperTone: () => (props.error.value ? 'error' : 'default'),
      invalid: () => !!props.error.value,
      role: 'switch',
    });

    reflect({
      checked: () => control.checked.value,
      classMap: () => ({
        'is-checked': control.checked.value,
        'is-disabled': !!props.disabled.value,
      }),
      onClick: (e: Event) => control.toggle(e),
      onKeydown: (e: Event) => {
        const ke = e as KeyboardEvent;

        if (ke.key === ' ' || ke.key === 'Enter') {
          ke.preventDefault();
          control.toggle(e);
        }
      },
      tabindex: () => (props.disabled.value ? undefined : 0),
    });

    return html`
      <div class="switch-wrapper" part="switch">
        <div class="switch-track" part="track">
          <div class="switch-thumb" part="thumb"></div>
        </div>
      </div>
      <span class="label" part="label" data-a11y-label id="${a11y.labelId}"><slot></slot></span>
      <div
        class="helper-text"
        part="helper-text"
        data-a11y-helper
        id="${a11y.helperId}"
        aria-live="polite"
        hidden></div>
    `;
  },
  styles: [...formControlMixins, sizeVariantMixin(SWITCH_SIZE_PRESET), componentStyles],
  tag: 'bit-switch',
});
