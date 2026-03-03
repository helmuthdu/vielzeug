import {
  aria,
  computed,
  createId,
  css,
  define,
  defineEmits,
  defineProps,
  defineSlots,
  field,
  guard,
  handle,
  html,
  onFormReset,
  onMount,
  ref,
  signal,
  watch,
} from '@vielzeug/craftit';
import { colorThemeMixin, disabledStateMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, ThemeColor } from '../../types';

const styles = /* css */ css`
  @layer buildit.base {
    /* ========================================
       Base Styles & Defaults
       ======================================== */

    :host {
      --_size: var(--checkbox-size, var(--size-5));
      --_radius: var(--checkbox-radius, var(--rounded-md));
      --_font-size: var(--checkbox-font-size, var(--text-sm));
      --_bg: var(--checkbox-bg, var(--color-contrast-200));
      --_border: var(--checkbox-border-color, var(--color-contrast-300));

      display: inline-flex;
      align-items: center;
      gap: var(--_gap, var(--size-2));
      cursor: pointer;
      user-select: none;
    }

    .checkbox-wrapper {
      position: relative;
      display: block;
      width: var(--_size);
      height: var(--_size);
      flex-shrink: 0;
    }

    input {
      display: none;
    }

    .box {
      width: var(--_size);
      height: var(--_size);
      border: var(--border-2) solid var(--_border);
      border-radius: var(--_radius);
      background: var(--_bg);
      transition:
        background var(--transition-slower),
        border-color var(--transition-slower),
        box-shadow var(--transition-normal);
      position: relative;
      box-sizing: border-box;
    }

    /* ========================================
       Focus State
       ======================================== */

    input:focus-visible + .box {
      box-shadow: var(--_focus-shadow);
    }

    /* ========================================
       Icons (Checkmark & Dash)
       ======================================== */

    .checkmark,
    .dash {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 80%;
      height: 80%;
      transform: translate(-50%, -50%) scale(0.5);
      color: var(--_icon-color);
      stroke: currentColor;
      stroke-width: 3;
      stroke-linecap: round;
      stroke-linejoin: round;
      fill: none;
      opacity: 0;
      transition:
        opacity var(--transition-spring),
        transform var(--transition-spring);
    }

    /* ========================================
       Label
       ======================================== */

    .label {
      font-size: var(--_font-size);
      color: var(--color-contrast);
    }
  }

  ${colorThemeMixin()}
  ${disabledStateMixin()}

  @layer buildit.overrides {
    /* Map theme variables to checkbox-specific variables */
    :host {
      --_active-bg: var(--checkbox-checked-bg, var(--_theme-base));
      --_icon-color: var(--checkbox-color, var(--_theme-contrast));
      --_focus-shadow: var(--_theme-shadow);
    }

    /* ========================================
       Checked & Indeterminate States
       ======================================== */

    :host([checked]) .box,
    :host([indeterminate]) .box {
      background: var(--_active-bg);
      border-color: var(--_active-bg);
    }

    :host([checked]) .checkmark,
    :host([indeterminate]:not([checked])) .dash {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  ${sizeVariantMixin({
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
  })}
`;

/** Checkbox component properties */
export interface CheckboxProps {
  /** Checked state */
  checked?: boolean;
  /** Disable checkbox interaction */
  disabled?: boolean;
  /** Indeterminate state (partially checked) */
  indeterminate?: boolean;
  /** Field value */
  value?: string;
  /** Form field name */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Checkbox size */
  size?: ComponentSize;
}

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
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
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
define(
  'bit-checkbox',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<{ change: { checked: boolean } }>();
    const props = defineProps({
      checked: { default: false },
      color: { default: undefined as ThemeColor | undefined },
      disabled: { default: false },
      indeterminate: { default: false },
      name: { default: '' },
      size: { default: undefined as ComponentSize | undefined },
      value: { default: 'on' },
    });

    const checkedSignal = signal(false);
    const indeterminateSignal = signal(false);

    // Sync props → signals
    field({
      disabled: computed(() => props.disabled.value),
      toFormValue: (v: string | null) => v,
      value: computed(() => {
        if (checkedSignal.value) return props.value.value;
        return null;
      }),
    });

    onFormReset(() => {
      checkedSignal.value = props.checked.value;
      indeterminateSignal.value = props.indeterminate.value;
    });

    const inputRef = ref<HTMLInputElement>();
    const labelRef = ref<HTMLSpanElement>();

    watch(
      props.checked,
      (v) => {
        checkedSignal.value = v;
      },
      { immediate: true },
    );
    watch(
      props.indeterminate,
      (v) => {
        indeterminateSignal.value = v;
      },
      { immediate: true },
    );

    const toggle = guard(
      () => !props.disabled.value,
      (e: Event) => {
        e.preventDefault();

        const wasIndeterminate = indeterminateSignal.value;
        indeterminateSignal.value = false;
        if (inputRef.value) inputRef.value.indeterminate = false;

        if (!wasIndeterminate) {
          checkedSignal.value = !checkedSignal.value;
        }

        const isChecked = checkedSignal.value;
        isChecked ? host.setAttribute('checked', '') : host.removeAttribute('checked');
        host.removeAttribute('indeterminate');

        if (inputRef.value) inputRef.value.checked = isChecked;

        emit('change', { checked: isChecked });
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

    onMount(() => {
      // labelRef.value and inputRef.value are only populated after template render
      const label = labelRef.value;
      if (slots.has('default') && label) {
        const labelId = createId('checkbox-label');
        label.id = labelId;
        aria({ labelledby: labelId });
      }

      if (inputRef.value) {
        inputRef.value.checked = checkedSignal.value;
        inputRef.value.indeterminate = indeterminateSignal.value;
      }
    });

    return {
      styles: [styles],
      template: html` <div class="checkbox-wrapper" part="checkbox">
          <input type="checkbox" ref=${inputRef} aria-hidden="true" tabindex="-1" />
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
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>`,
    };
  },
  { formAssociated: true },
);

export default {};
