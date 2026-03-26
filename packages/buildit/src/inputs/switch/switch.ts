import { define, computed, html, inject } from '@vielzeug/craftit';
import { type CheckableChangePayload, createCheckableFieldControl } from '@vielzeug/craftit/controls';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { formControlMixins, sizeVariantMixin } from '../../styles';
import { disablableBundle, type PropBundle, sizableBundle, themableBundle } from '../shared/bundles';
import { SWITCH_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
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

const switchProps = {
  ...themableBundle,
  ...sizableBundle,
  ...disablableBundle,
  checked: false,
  error: '',
  helper: '',
  name: '',
  value: 'on',
} satisfies PropBundle<BitSwitchProps>;

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
 * @fires change - Emitted when switch is toggled. detail: { checked: boolean, fieldValue: string, originalEvent?: Event }
 *
 * @slot - Switch label text
 *
 * @part switch - The switch wrapper element
 * @part track - The switch track element
 * @part thumb - The switch thumb element
 * @part label - The label element
 * @part helper-text - The helper/error text element
 */
export const SWITCH_TAG = define<BitSwitchProps, BitSwitchEvents>('bit-switch', {
  formAssociated: true,
  props: switchProps,
  setup({ emit, host, props }) {
    const formCtx = inject(FORM_CTX, undefined);

    const checkable = createCheckableFieldControl({
      checked: props.checked,
      clearIndeterminateFirst: false,
      disabled: computed(() => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value)),
      error: props.error,
      helper: props.helper,
      host: host.el,
      onToggle: (payload) => {
        checkable.control.triggerValidation('change');
        emit('change', payload);
      },
      prefix: 'switch',
      role: 'switch',
      validateOn: formCtx?.validateOn,
      value: props.value,
    });
    const { a11y, control, press: pressControl } = checkable;

    mountFormContextSync(host.el, formCtx, props);

    host.bind('class', () => ({
      'is-checked': control.checked.value,
      'is-disabled': control.disabled.value,
    }));

    host.bind('attr', {
      checked: () => control.checked.value,
      tabindex: () => (control.disabled.value ? undefined : 0),
    });
    host.bind('on', {
      click: (e) => {
        pressControl.handleClick(e);
      },
      keydown: (e) => {
        pressControl.handleKeydown(e);
      },
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
});
