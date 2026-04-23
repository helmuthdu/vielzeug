import { computed, define, html, inject } from '@vielzeug/craftit';
import { type CheckableChangePayload, createCheckableFieldControl } from '@vielzeug/craftit/controls';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import '../../content/icon/icon';
import { coarsePointerMixin, formControlMixins, sizeVariantMixin } from '../../styles';
import { CHECKBOX_GROUP_CTX } from '../checkbox-group/checkbox-group';
import { disablableBundle, sizableBundle, themableBundle } from '../shared/bundles';
import { CONTROL_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
import { FORM_CTX } from '../shared/form-context';
import componentStyles from './checkbox.css?inline';

export type BitCheckboxEvents = {
  change: CheckableChangePayload;
};

export type BitCheckboxProps = CheckableProps &
  ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Error message (marks field as invalid) */
    error?: string;
    /** Helper text displayed below the checkbox */
    helper?: string;
    /** Indeterminate state (partially checked) */
    indeterminate?: boolean;
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
 * @part checkbox - The checkbox wrapper element
 * @part box - The visual checkbox box
 * @part label - The label element
 * @part helper-text - The helper/error text element
 */
export const CHECKBOX_TAG = define<BitCheckboxProps, BitCheckboxEvents>('bit-checkbox', {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    checked: { default: false, reflect: false }, // managed by host.bind (form-control derived state)
    error: '',
    helper: '',
    indeterminate: { default: false, reflect: false }, // managed by host.bind (form-control derived state)
    name: '',
    value: 'on',
  },
  setup(props, { emit, host }) {
    const formCtx = inject(FORM_CTX);
    const groupCtx = inject(CHECKBOX_GROUP_CTX);

    const checkable = createCheckableFieldControl({
      checked: props.checked,
      clearIndeterminateFirst: true,
      disabled: computed(
        () => Boolean(props.disabled.value) || Boolean(formCtx?.disabled.value) || Boolean(groupCtx?.disabled.value),
      ),
      error: props.error,
      group: groupCtx,
      helper: props.helper,
      host: host.el,
      indeterminate: props.indeterminate,
      onToggle: (payload) => {
        checkable.control.triggerValidation('change');

        // In a checkbox-group, the group owns change emission/state updates.
        // Emitting here would bubble to the group and toggle a second time.
        if (groupCtx) return;

        emit('change', payload);
      },
      prefix: 'checkbox',
      role: 'checkbox',
      validateOn: formCtx?.validateOn,
      value: props.value,
    });
    const { a11y, control: controlHandle, press: pressControl } = checkable;

    mountFormContextSync(host.el, formCtx, props);

    host.bind({
      attr: {
        checked: controlHandle.checked,
        indeterminate: controlHandle.indeterminate,
        tabindex: () => (controlHandle.disabled.value ? undefined : 0),
      },
      class: () => ({
        'is-checked': controlHandle.checked.value,
        'is-disabled': controlHandle.disabled.value,
        'is-indeterminate': controlHandle.indeterminate.value,
      }),
      on: {
        click: pressControl.handleClick,
        keydown: pressControl.handleKeydown,
      },
    });

    return {
      render: () => html`
        <div class="checkbox-wrapper" part="checkbox">
          <div class="box" part="box">
            <bit-icon class="checkmark" name="check" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
            <bit-icon class="dash" name="minus" size="14" stroke-width="2" aria-hidden="true"></bit-icon>
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
      `,
    };
  },
  styles: [...formControlMixins, coarsePointerMixin, sizeVariantMixin(CONTROL_SIZE_PRESET), componentStyles],
});
