import { computed, defineComponent, defineField, html, inject, signal, watch } from '@vielzeug/craftit';
import { useA11yControl, createCheckableControl } from '@vielzeug/craftit/labs';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { coarsePointerMixin, formControlMixins, sizeVariantMixin } from '../../styles';
import { FORM_CTX } from '../form/form';
import { RADIO_GROUP_CTX } from '../radio-group/radio-group';
import { CONTROL_SIZE_PRESET } from '../shared/design-presets';
import { mountFormContextSync } from '../shared/dom-sync';
import componentStyles from './radio.css?inline';

/** Radio component properties */

export type BitRadioEvents = {
  change: { checked: boolean; fieldValue: string; originalEvent?: Event; value: boolean };
};

export type BitRadioProps = CheckableProps &
  ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Error message (marks field as invalid) */
    error?: string;
    /** Helper text displayed below the radio */
    helper?: string;
  };

/**
 * A customizable radio button component for mutually exclusive selections.
 *
 * @element bit-radio
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disable radio interaction
 * @attr {string} value - Field value (required for radio groups)
 * @attr {string} name - Form field name (required for radio groups)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Radio size: 'sm' | 'md' | 'lg'
 * @attr {string} error - Error message (marks field as invalid)
 * @attr {string} helper - Helper text displayed below the radio
 *
 * @fires change - Emitted when radio is selected. detail: { value: boolean, checked: boolean, fieldValue: string, originalEvent?: Event }
 *
 * @slot - Radio button label text
 *
 * @part radio - The radio wrapper element
 * @part circle - The visual radio circle
 * @part label - The label element
 * @part helper-text - The helper/error text element
 */
export const RADIO_TAG = defineComponent<BitRadioProps, BitRadioEvents>({
  formAssociated: true,
  props: {
    checked: { default: false },
    color: { default: undefined },
    disabled: { default: false },
    error: { default: '' },
    helper: { default: '' },
    name: { default: '' },
    size: { default: undefined },
    value: { default: '' },
  },
  setup({ emit, host, props, reflect }) {
    const groupCtx = inject(RADIO_GROUP_CTX, undefined);
    const formCtx = inject(FORM_CTX, undefined);

    const effectiveName = computed(() => groupCtx?.name.value || props.name.value || '');
    const effectiveSize = computed(() => groupCtx?.size.value ?? props.size.value);
    const effectiveColor = computed(() => groupCtx?.color.value ?? props.color.value);
    const effectiveDisabled = computed(() => Boolean(groupCtx?.disabled.value || props.disabled.value));

    mountFormContextSync(host, formCtx, props);

    // Local signal — source of truth for checked state.
    // Driven by group context when inside a radio-group, otherwise by the checked prop.
    const checkedSignal = signal(Boolean(props.checked.value));

    if (groupCtx) {
      watch(
        computed(() => groupCtx.value.value === props.value.value),
        (isChecked) => {
          checkedSignal.value = isChecked;
        },
        { immediate: true },
      );
    } else {
      watch(
        props.checked,
        (v) => {
          checkedSignal.value = Boolean(v);
        },
        { immediate: true },
      );
    }

    const control = createCheckableControl({
      checked: checkedSignal,
      disabled: props.disabled,
      onToggle: (e) => {
        emit('change', {
          checked: control.checked.value,
          fieldValue: props.value.value ?? '',
          originalEvent: e,
          value: control.checked.value,
        });
      },
      value: props.value,
    });

    defineField(
      {
        disabled: effectiveDisabled,
        toFormValue: (v: string | null) => v,
        value: computed(() => (checkedSignal.value ? (props.value.value ?? '') : null)),
      },
      {
        onReset: () => {
          checkedSignal.value = Boolean(props.checked.value);
        },
      },
    );

    const getRadioGroup = (): HTMLElement[] => {
      const radioName = effectiveName.value;

      if (!radioName) return [];

      return Array.from(document.querySelectorAll<HTMLElement>(`bit-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );
    };

    const a11y = useA11yControl(host, {
      checked: () => (control.checked.value ? 'true' : 'false'),
      helperText: () => props.error.value || props.helper.value,
      helperTone: () => (props.error.value ? 'error' : 'default'),
      invalid: () => !!props.error.value,
      role: 'radio',
    });

    reflect({
      checked: () => control.checked.value,
      classMap: () => ({
        'is-checked': control.checked.value,
        'is-disabled': effectiveDisabled.value,
      }),
      color: () => effectiveColor.value,
      disabled: () => (effectiveDisabled.value ? true : undefined),
      name: () => effectiveName.value || undefined,
      onClick: (e: Event) => {
        if (effectiveDisabled.value) return;

        if (groupCtx) {
          groupCtx.select(props.value.value ?? '', e);
        } else {
          // For non-grouped radios, require a name attribute
          // (radios should be part of a group, either via radio-group or via name)
          if (!effectiveName.value) return;

          // Only toggle if not already checked
          // (radio buttons can only be checked, never unchecked by clicking)
          if (!control.checked.value) {
            // Uncheck all other radios with the same name
            const radioName = props.name.value;
            const allRadios = document.querySelectorAll<HTMLElement>(`bit-radio[name="${radioName}"]`);

            allRadios.forEach((radio) => {
              if (radio !== host) {
                radio.removeAttribute('checked');
              }
            });

            control.toggle(e);
          }
        }
      },
      onKeydown: (e: Event) => {
        const ke = e as KeyboardEvent;
        const radios = getRadioGroup();

        if (radios.length === 0) return;

        const currentIndex = radios.indexOf(host);

        if (currentIndex === -1) return;

        if (ke.key === ' ' || ke.key === 'Enter') {
          ke.preventDefault();

          if (!control.checked.value) {
            if (groupCtx) {
              groupCtx.select(props.value.value ?? '', ke);
            } else {
              control.toggle(ke);
            }
          }
        } else if (ke.key === 'ArrowDown' || ke.key === 'ArrowRight') {
          ke.preventDefault();

          const nextIndex = (currentIndex + 1) % radios.length;
          const nextRadio = radios[nextIndex];

          nextRadio.focus();

          if (groupCtx) {
            groupCtx.select(nextRadio.getAttribute('value') ?? '');
          } else {
            // For non-grouped radios, trigger the select on the focused radio
            nextRadio.click();
          }
        } else if (ke.key === 'ArrowUp' || ke.key === 'ArrowLeft') {
          ke.preventDefault();

          const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
          const prevRadio = radios[prevIndex];

          prevRadio.focus();

          if (groupCtx) {
            groupCtx.select(prevRadio.getAttribute('value') ?? '');
          } else {
            // For non-grouped radios, trigger the select on the focused radio
            prevRadio.click();
          }
        }
      },
      size: () => effectiveSize.value,
      tabindex: () => {
        if (effectiveDisabled.value) return undefined;

        return control.checked.value ? 0 : -1;
      },
    });

    return html`
      <div class="radio-wrapper" part="radio">
        <div class="circle" part="circle">
          <div class="dot" part="dot"></div>
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
  tag: 'bit-radio',
});
