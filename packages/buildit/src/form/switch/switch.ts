import {
  aria,
  createId,
  define,
  defineEmits,
  defineProps,
  defineSlots,
  effect,
  guard,
  handle,
  html,
  onMount,
  ref,
  watch,
} from '@vielzeug/craftit';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { formControlMixins, sizeVariantMixin } from '../../styles';
import { mountFormContextSync } from '../../utils/use-text-field';
import { useToggleField } from '../../utils/use-toggle-field';
import componentStyles from './switch.css?inline';

/** Switch component properties */

export type BitSwitchEvents = {
  change: { checked: boolean };
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
 *
 * @fires change - Emitted when switch is toggled
 *
 * @slot - Switch label text
 *
 * @part switch - The switch wrapper element
 * @part track - The switch track element
 * @part thumb - The switch thumb element
 * @part label - The label element
 *
 * @cssprop --switch-width - Track width
 * @cssprop --switch-height - Track height
 * @cssprop --switch-bg - Background color (checked state)
 * @cssprop --switch-track - Track background color (unchecked)
 * @cssprop --switch-thumb - Thumb background color
 * @cssprop --switch-font-size - Label font size
 *
 * @example
 * ```html
 * <bit-switch checked>Enable feature</bit-switch>
 * <bit-switch color="primary">Dark mode</bit-switch>
 * <bit-switch size="lg">Large toggle</bit-switch>
 * ```
 */
export const SWITCH_TAG = define(
  'bit-switch',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<BitSwitchEvents>();
    const props = defineProps<BitSwitchProps>({
      checked: { default: false },
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      helper: { default: '' },
      name: { default: '' },
      size: { default: undefined },
      value: { default: 'on' },
    });

    const { checkedSignal, formCtx, triggerValidation } = useToggleField(props);

    // Propagate form context size/disabled to host when not explicitly set
    mountFormContextSync(host, formCtx, props);

    const labelRef = ref<HTMLSpanElement>();
    const helperRef = ref<HTMLDivElement>();
    const helperId = createId('switch-helper');

    const toggle = guard(
      () => !props.disabled.value,
      (e: Event) => {
        e.preventDefault();
        checkedSignal.value = !checkedSignal.value;

        const isChecked = checkedSignal.value;

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        isChecked ? host.setAttribute('checked', '') : host.removeAttribute('checked');
        emit('change', { checked: isChecked });
        triggerValidation('change');
      },
    );

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggle(e);
      }
    };

    handle(host, 'click', toggle);
    handle(host, 'keydown', handleKeydown);

    // Pre-register the slot signal during setup so its onMount runs before ours,
    // ensuring slots.has('default').value returns the correct value inside onMount.
    slots.has('default');

    onMount(() => {
      host.setAttribute('role', 'switch');

      if (!props.disabled.value) host.setAttribute('tabindex', '0');

      // labelRef.value is only available after the template has been rendered
      const label = labelRef.value;

      if (slots.has('default').value && label) {
        const labelId = createId('switch-label');

        label.id = labelId;
        aria({ labelledby: labelId });
      }

      effect(() => {
        const helperEl = helperRef.value;

        if (!helperEl) return;

        helperEl.id = helperId;
        helperEl.textContent = props.error.value || props.helper.value || '';
        helperEl.hidden = !props.error.value && !props.helper.value;

        if (props.error.value) helperEl.setAttribute('role', 'alert');
        else helperEl.removeAttribute('role');
      });
    });

    aria({
      checked: () => String(checkedSignal.value),
      describedby: () => (props.error.value || props.helper.value ? helperId : null),
      invalid: () => !!props.error.value,
    });

    watch(props.disabled, (disabled) => {
      if (disabled) host.removeAttribute('tabindex');
      else host.setAttribute('tabindex', '0');
    });

    return {
      styles: [
        ...formControlMixins,
        sizeVariantMixin({
          lg: {
            fontSize: 'var(--text-base)',
            gap: 'var(--size-3)',
            height: 'var(--size-7)',
            thumbSize: 'var(--size-6)',
            width: 'var(--size-14)',
          },
          sm: {
            fontSize: 'var(--text-xs)',
            gap: 'var(--size-2)',
            height: 'var(--size-5)',
            thumbSize: 'var(--size-4)',
            width: 'var(--size-9)',
          },
        }),
        componentStyles,
      ],
      template: html`<div class="switch-wrapper" part="switch">
          <div class="switch-track" part="track">
            <div class="switch-thumb" part="thumb"></div>
          </div>
        </div>
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>
        <div class="helper-text" part="helper-text" ref=${helperRef} aria-live="polite" hidden></div>`,
    };
  },
  { formAssociated: true },
);
