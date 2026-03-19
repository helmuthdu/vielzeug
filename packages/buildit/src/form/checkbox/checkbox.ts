import { defineComponent, html, inject, signal, watch } from '@vielzeug/craftit/core';
import { useA11yControl, useCheckableControl } from '@vielzeug/craftit/labs';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { coarsePointerMixin, formControlMixins, sizeVariantMixin } from '../../styles';
import { CHECKBOX_GROUP_CTX } from '../checkbox-group/checkbox-group';
import { useToggleField } from '../shared/composables';
import { CONTROL_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
import componentStyles from './checkbox.css?inline';

export type BitCheckboxEvents = {
  change: { checked: boolean; fieldValue: string; originalEvent?: Event; value: boolean };
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
 * @fires change - Emitted when checkbox is toggled. detail: { value: boolean, checked: boolean, fieldValue: string, originalEvent?: Event }
 *
 * @slot - Checkbox label text
 *
 * @part checkbox - The checkbox wrapper element
 * @part box - The visual checkbox box
 * @part label - The label element
 * @part helper-text - The helper/error text element
 */
export const CHECKBOX_TAG = defineComponent<BitCheckboxProps, BitCheckboxEvents>({
  formAssociated: true,
  props: {
    checked: { default: false },
    color: { default: undefined },
    disabled: { default: false },
    error: { default: '' },
    helper: { default: '' },
    indeterminate: { default: false },
    name: { default: '' },
    size: { default: undefined },
    value: { default: 'on' },
  },
  setup({ emit, host, props, reflect, slots }) {
    // Form integration — provides checkedSignal and triggerValidation
    const { checkedSignal, formCtx, triggerValidation } = useToggleField(props);

    mountFormContextSync(host, formCtx, props);

    // Separate writable indeterminate signal, synced from the prop
    const indeterminateSignal = signal(Boolean(props.indeterminate.value));

    watch(props.indeterminate, (v) => {
      indeterminateSignal.value = Boolean(v);
    });

    const groupCtx = inject(CHECKBOX_GROUP_CTX, undefined);

    // Pass the writable checkedSignal directly — toggle() mutates it in place
    const controlHandle = useCheckableControl({
      checked: checkedSignal,
      clearIndeterminateFirst: true,
      disabled: props.disabled,
      group: groupCtx,
      indeterminate: indeterminateSignal,
      onToggle: (e) => {
        triggerValidation('change');

        // In a checkbox-group, the group owns change emission/state updates.
        // Emitting here would bubble to the group and toggle a second time.
        if (groupCtx) return;

        emit('change', controlHandle.changePayload(e));
      },
      value: props.value,
    });

    const a11y = useA11yControl(host, {
      checked: () => {
        if (controlHandle.indeterminate.value) return 'mixed';

        return controlHandle.checked.value ? 'true' : 'false';
      },
      helperId: undefined,
      helperText: () => props.error.value || props.helper.value,
      invalid: () => !!props.error.value,
      labelId: undefined,
      labelSlot: slots as any,
      role: 'checkbox',
    });

    reflect({
      checked: () => controlHandle.checked.value,
      classMap: () => ({
        'is-checked': controlHandle.checked.value,
        'is-disabled': !!props.disabled.value,
        'is-indeterminate': controlHandle.indeterminate.value,
      }),
      indeterminate: () => controlHandle.indeterminate.value,
      onClick: (e: Event) => controlHandle.toggle(e),
      onKeydown: (e: Event) => {
        const ke = e as KeyboardEvent;

        if (ke.key === ' ' || ke.key === 'Enter') {
          ke.preventDefault();
          controlHandle.toggle(e);
        }
      },
      tabindex: () => (props.disabled.value ? undefined : 0),
    });

    return html`
      <div class="checkbox-wrapper" part="checkbox">
        <div class="box" part="box">
          <svg
            class="checkmark"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M 20,6 9,17 4,12" />
          </svg>
          <svg
            class="dash"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            xmlns="http://www.w3.org/2000/svg">
            <path d="M 5,12 H 19" />
          </svg>
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
  styles: [...formControlMixins, coarsePointerMixin, sizeVariantMixin(CONTROL_SIZE_PRESET), componentStyles],
  tag: 'bit-checkbox',
});
