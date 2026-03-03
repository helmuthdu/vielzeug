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
    :host {
      --_width: var(--switch-width, var(--size-10));
      --_height: var(--switch-height, var(--size-5));
      --_padding: var(--size-0-5);
      --_thumb-size: calc(var(--_height) - var(--_padding) * 2);
      --_track-bg: var(--switch-track, var(--color-contrast-300));
      --_thumb-bg: var(--switch-thumb, white);
      --_font-size: var(--switch-font-size, var(--text-sm));

      display: inline-flex;
      align-items: center;
      gap: var(--_gap, var(--size-2-5));
      min-height: var(--size-11);
      cursor: pointer;
      user-select: none;
      touch-action: manipulation;
    }

    /* ========================================
       Track & Thumb
       ======================================== */

    .switch-wrapper {
      display: flex;
      flex-shrink: 0;
    }

    input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .switch-track {
      position: relative;
      width: var(--_width);
      height: var(--_height);
      background: var(--_track-bg);
      border-radius: var(--rounded-full);
      transition:
        background var(--transition-slower),
        box-shadow var(--transition-normal);
      will-change: background;
    }

    .switch-thumb {
      position: absolute;
      top: var(--_padding);
      left: var(--_padding);
      width: var(--_thumb-size);
      height: var(--_thumb-size);
      background: var(--_thumb-bg);
      border-radius: var(--rounded-full);
      box-shadow: var(--shadow-sm);
      transition:
        transform var(--transition-spring),
        box-shadow var(--transition-normal);
      will-change: transform;
    }

    /* ========================================
       Focus State
       ======================================== */

    input:focus-visible ~ .switch-track {
      box-shadow: var(--_focus-shadow);
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
    /* Map theme variables to switch-specific variables */
    :host {
      --_active-bg: var(--switch-bg, var(--_theme-base));
      --_focus-shadow: var(--_theme-shadow);
    }

    /* ========================================
       Checked State
       ======================================== */

    :host([checked]) .switch-track {
      background: var(--_active-bg);
    }

    :host([checked]) .switch-thumb {
      transform: translateX(calc(var(--_width) - var(--_height)));
    }

    /* ========================================
       Hover & Active States
       ======================================== */

    :host(:hover:not([disabled]):not([checked])) .switch-track {
      background: var(--color-contrast-400);
    }

    :host(:hover:not([disabled])[checked]) .switch-track {
      filter: brightness(1.1);
    }
  }

  ${sizeVariantMixin({
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
  })}
`;

/** Switch component properties */
export interface SwitchProps {
  /** Checked/on state */
  checked?: boolean;
  /** Disable switch interaction */
  disabled?: boolean;
  /** Field value */
  value?: string;
  /** Form field name */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Switch size */
  size?: ComponentSize;
}

/**
 * A toggle switch component for binary on/off states.
 *
 * @element bit-switch
 *
 * @attr {boolean} checked - Checked/on state
 * @attr {boolean} disabled - Disable switch interaction
 * @attr {string} value - Field value
 * @attr {string} name - Form field name
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
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
define(
  'bit-switch',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<{ change: { checked: boolean } }>();
    const props = defineProps({
      checked: { default: false },
      color: { default: undefined as ThemeColor | undefined },
      disabled: { default: false },
      name: { default: '' },
      size: { default: undefined as ComponentSize | undefined },
      value: { default: 'on' },
    });

    const checkedSignal = signal(false);

    field({
      disabled: computed(() => props.disabled.value),
      toFormValue: (v: string | null) => v,
      value: computed(() => (checkedSignal.value ? props.value.value : null)),
    });

    onFormReset(() => {
      checkedSignal.value = props.checked.value;
    });

    const labelRef = ref<HTMLSpanElement>();

    watch(
      props.checked,
      (v) => {
        checkedSignal.value = v;
      },
      { immediate: true },
    );

    const toggle = guard(
      () => !props.disabled.value,
      (e: Event) => {
        e.preventDefault();
        checkedSignal.value = !checkedSignal.value;
        const isChecked = checkedSignal.value;
        isChecked ? host.setAttribute('checked', '') : host.removeAttribute('checked');
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
      // labelRef.value is only available after the template has been rendered
      const label = labelRef.value;
      if (slots.has('default') && label) {
        const labelId = createId('switch-label');
        label.id = labelId;
        aria({ labelledby: labelId });
      }
    });

    return {
      styles: [styles],
      template: html` <div class="switch-wrapper" part="switch">
          <input type="checkbox" aria-hidden="true" tabindex="-1" />
          <div class="switch-track" part="track">
            <div class="switch-thumb" part="thumb"></div>
          </div>
        </div>
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>`,
    };
  },
  { formAssociated: true },
);

export default {};
