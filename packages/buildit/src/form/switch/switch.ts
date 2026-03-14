import {
  aria,
  createId,
  css,
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
import { formControlMixins, sizeVariantMixin } from '../../styles';
import type {
  AddEventListeners,
  BitSwitchEvents,
  CheckableProps,
  DisablableProps,
  FormValidityMethods,
  SizableProps,
  ThemableProps,
} from '../../types';
import { mountFormContextSync } from '../_common/use-text-field';
import { useToggleField } from '../_common/use-toggle-field';

const componentStyles = /* css */ css`
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
      flex-wrap: wrap;
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
      inset-inline-start: var(--_padding);
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

    /* In RTL the thumb starts at the inline-end edge; slide left to reach inline-start */
    :host(:dir(rtl)[checked]) .switch-thumb {
      transform: translateX(calc(-1 * (var(--_width) - var(--_height))));
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

    /* ========================================
       Helper / Error Text
       ======================================== */

    .helper-text {
      color: var(--color-contrast-500);
      font-size: var(--text-xs);
      line-height: var(--leading-tight);
      padding-inline-start: calc(var(--_width) + var(--size-2-5));
      width: 100%;
    }

    .helper-text[role='alert'] {
      color: var(--color-error);
    }
  }
`;

/** Switch component properties */
export interface SwitchProps extends CheckableProps, ThemableProps, SizableProps, DisablableProps {
  /** Helper text displayed below the switch */
  helper?: string;
  /** Error message (marks field as invalid) */
  error?: string;
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
export const TAG = define(
  'bit-switch',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<{ change: { checked: boolean } }>();
    const props = defineProps<SwitchProps>({
      checked: { default: false },
      color: { default: undefined },
      disabled: { default: false },
      error: { default: '', omit: true },
      helper: { default: '' },
      name: { default: '' },
      size: { default: undefined },
      value: { default: 'on' },
    });

    const { formCtx, checkedSignal, triggerValidation } = useToggleField(props);

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

declare global {
  interface HTMLElementTagNameMap {
    'bit-switch': HTMLElement & SwitchProps & FormValidityMethods & AddEventListeners<BitSwitchEvents>;
  }
}
