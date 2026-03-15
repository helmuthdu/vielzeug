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
  inject,
  onMount,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';

import type { CheckableProps, DisablableProps, SizableProps, ThemableProps } from '../../types';

import { coarsePointerMixin, formControlMixins, sizeVariantMixin } from '../../styles';
import { mountFormContextSync } from '../../utils/use-text-field';
import { useToggleField } from '../../utils/use-toggle-field';
import { CHECKBOX_GROUP_CTX } from '../checkbox-group/checkbox-group';
import componentStyles from './checkbox.css?inline';

/** Checkbox component properties */

export type BitCheckboxEvents = {
  change: { checked: boolean; value: string };
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
 * @attr {boolean} indeterminate - Indeterminate state (partially checked)
 * @attr {string} value - Field value
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - Checkbox size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when the checkbox state changes
 *
 * @slot - Checkbox label text
 *
 * @part checkbox - The checkbox wrapper element
 * @part box - The visual checkbox box
 * @part label - The label text element
 *
 * @cssprop --checkbox-size - Checkbox dimensions
 * @cssprop --checkbox-bg - Background color (unchecked)
 * @cssprop --checkbox-checked-bg - Background color (checked)
 * @cssprop --checkbox-border-color - Border color
 * @cssprop --checkbox-color - Checkmark icon color
 * @cssprop --checkbox-radius - Border radius
 * @cssprop --checkbox-font-size - Label font size
 *
 * @example
 * ```html
 * <bit-checkbox checked>Accept terms</bit-checkbox>
 * <bit-checkbox color="primary" size="lg">Subscribe</bit-checkbox>
 * <bit-checkbox indeterminate>Select all</bit-checkbox>
 * ```
 */
export const CHECKBOX_TAG = define(
  'bit-checkbox',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<BitCheckboxEvents>();
    const props = defineProps<BitCheckboxProps>({
      checked: { default: false },
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      helper: { default: '' },
      indeterminate: { default: false },
      name: { default: '' },
      size: { default: undefined },
      value: { default: 'on' },
    });

    const indeterminateSignal = signal(false);

    const { checkedSignal, formCtx, triggerValidation } = useToggleField(props, () => {
      indeterminateSignal.value = props.indeterminate.value ?? false;
    });

    const groupCtx = inject(CHECKBOX_GROUP_CTX);

    // Propagate form context size/disabled to host when not explicitly set
    mountFormContextSync(host, formCtx, props);

    const labelRef = ref<HTMLSpanElement>();
    const helperRef = ref<HTMLDivElement>();
    const helperId = createId('checkbox-helper');

    watch(
      props.indeterminate,
      (v) => {
        indeterminateSignal.value = v ?? false;
      },
      { immediate: true },
    );

    const toggle = guard(
      () => !props.disabled.value,
      (e: Event) => {
        e.preventDefault();

        if (groupCtx) {
          indeterminateSignal.value = false;
          host.removeAttribute('indeterminate');
          groupCtx.toggle(props.value.value ?? '');
          triggerValidation('change');

          return;
        }

        const wasIndeterminate = indeterminateSignal.value;

        indeterminateSignal.value = false;

        if (!wasIndeterminate) {
          checkedSignal.value = !checkedSignal.value;
        }

        const isChecked = checkedSignal.value;

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        isChecked ? host.setAttribute('checked', '') : host.removeAttribute('checked');
        host.removeAttribute('indeterminate');

        emit('change', { checked: isChecked, value: props.value.value ?? '' });
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
      host.setAttribute('role', 'checkbox');

      if (!props.disabled.value) host.setAttribute('tabindex', '0');

      // labelRef.value is only populated after template render
      const label = labelRef.value;

      if (slots.has('default').value && label) {
        const labelId = createId('checkbox-label');

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
      checked: () => (indeterminateSignal.value ? 'mixed' : String(checkedSignal.value)),
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
        coarsePointerMixin,
        sizeVariantMixin({
          lg: {
            fontSize: 'var(--text-base)',
            gap: 'var(--size-2-5)',
            size: 'var(--size-6)',
          },
          sm: {
            fontSize: 'var(--text-xs)',
            gap: 'var(--size-1-5)',
            size: 'var(--size-4)',
          },
        }),
        componentStyles,
      ],
      template: html` <div class="checkbox-wrapper" part="checkbox">
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
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>
        <div class="helper-text" part="helper-text" ref=${helperRef} aria-live="polite" hidden></div>`,
    };
  },
  { formAssociated: true },
);
