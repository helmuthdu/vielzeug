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
      --_size: var(--radio-size, var(--size-5));
      --_font-size: var(--radio-font-size, var(--text-sm));
      --_bg: var(--radio-bg, var(--color-contrast-200));
      --_border: var(--radio-border-color, var(--color-contrast-300));

      display: inline-flex;
      align-items: center;
      gap: var(--_gap, var(--size-2));
      cursor: pointer;
      user-select: none;
    }

    .radio-wrapper {
      position: relative;
      display: block;
      width: var(--_size);
      height: var(--_size);
      flex-shrink: 0;
    }

    input {
      display: none;
    }

    .circle {
      width: var(--_size);
      height: var(--_size);
      border: var(--border-2) solid var(--_border);
      border-radius: 50%;
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

    input:focus-visible + .circle {
      box-shadow: var(--_focus-shadow);
    }

    /* ========================================
       Inner Dot
       ======================================== */

    .dot {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 50%;
      height: 50%;
      border-radius: 50%;
      background: var(--_dot-color);
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.5);
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
    /* Map theme variables to radio-specific variables */
    :host {
      --_active-bg: var(--radio-checked-bg, var(--_theme-base));
      --_dot-color: var(--radio-color, var(--_theme-contrast));
      --_focus-shadow: var(--_theme-shadow);
    }

    /* ========================================
       Checked State
       ======================================== */

    :host([checked]) .circle {
      background: var(--_active-bg);
      border-color: var(--_active-bg);
    }

    :host([checked]) .dot {
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

/** Radio component properties */
export interface RadioProps {
  /** Checked state */
  checked?: boolean;
  /** Disable radio interaction */
  disabled?: boolean;
  /** Field value */
  value?: string;
  /** Form field name (required for radio groups) */
  name?: string;
  /** Theme color */
  color?: ThemeColor;
  /** Radio size */
  size?: ComponentSize;
}

/**
 * A customizable radio button component for mutually exclusive selections.
 *
 * @element bit-radio
 *
 * @attr {boolean} checked - Checked state
 * @attr {boolean} disabled - Disable radio interaction
 * @attr {string} value - Field value
 * @attr {string} name - Form field name (required for radio groups)
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
 * @attr {string} size - Radio size: 'sm' | 'md' | 'lg'
 *
 * @fires change - Emitted when radio is selected
 *
 * @slot - Radio button label text
 *
 * @part radio - The radio wrapper element
 * @part circle - The visual radio circle
 * @part label - The label text element
 *
 * @cssprop --radio-size - Radio button dimensions
 * @cssprop --radio-bg - Background color (unchecked)
 * @cssprop --radio-checked-bg - Background color (checked)
 * @cssprop --radio-border-color - Border color
 * @cssprop --radio-color - Inner dot color
 * @cssprop --radio-font-size - Label font size
 *
 * @example
 * ```html
 * <bit-radio name="size" value="small">Small</bit-radio>
 * <bit-radio name="size" value="medium" checked>Medium</bit-radio>
 * <bit-radio name="size" value="large">Large</bit-radio>
 * ```
 */
define(
  'bit-radio',
  ({ host }) => {
    const slots = defineSlots();
    const emit = defineEmits<{ change: { checked: boolean; originalEvent: Event } }>();
    const props = defineProps({
      checked: { default: false },
      color: { default: undefined as ThemeColor | undefined },
      disabled: { default: false },
      name: { default: '' },
      size: { default: undefined as ComponentSize | undefined },
      value: { default: '' },
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

    const getRadioGroup = (): HTMLElement[] => {
      const radioName = props.name.value;
      if (!radioName) return [];
      return Array.from(document.querySelectorAll<HTMLElement>(`bit-radio[name="${radioName}"]`)).filter(
        (r) => !r.hasAttribute('disabled'),
      );
    };

    const selectRadio = (target: HTMLElement, originalEvent: Event) => {
      const radios = getRadioGroup();
      if (radios.length === 0) return;

      radios.forEach((radio) => {
        if (radio === target) {
          if (!radio.hasAttribute('checked')) {
            radio.setAttribute('checked', '');
            // Sync local signal if this is our host
            if (radio === host) {
              checkedSignal.value = true;
              emit('change', { checked: true, originalEvent });
            } else {
              radio.dispatchEvent(
                new CustomEvent('change', {
                  bubbles: true,
                  composed: true,
                  detail: { checked: true, originalEvent },
                }),
              );
            }
          }
        } else if (radio.hasAttribute('checked')) {
          radio.removeAttribute('checked');
          radio.dispatchEvent(
            new CustomEvent('change', { bubbles: true, composed: true, detail: { checked: false, originalEvent } }),
          );
        }
      });
    };

    const handleClick = guard(
      () => !props.disabled.value && !host.hasAttribute('checked'),
      (e: Event) => {
        selectRadio(host, e);
      },
    );

    const handleKeydown = guard(
      () => !props.disabled.value,
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keyboard navigation requires handling multiple arrow keys and radio group coordination
      (e: KeyboardEvent) => {
        const radios = getRadioGroup();
        if (radios.length === 0) return;

        const currentIndex = radios.indexOf(host);
        if (currentIndex === -1) return;

        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (!host.hasAttribute('checked')) {
            selectRadio(host, e);
          }
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % radios.length;
          const nextRadio = radios[nextIndex];
          nextRadio.focus();
          selectRadio(nextRadio, e);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = currentIndex === 0 ? radios.length - 1 : currentIndex - 1;
          const prevRadio = radios[prevIndex];
          prevRadio.focus();
          selectRadio(prevRadio, e);
        }
      },
    );

    handle(host, 'click', handleClick);
    handle(host, 'keydown', handleKeydown);

    onMount(() => {
      // labelRef.value is only populated after template render
      const label = labelRef.value;
      if (slots.has('default') && label) {
        const labelId = createId('radio-label');
        label.id = labelId;
        aria({ labelledby: labelId });
      }
    });

    return {
      styles: [styles],
      template: html` <div class="radio-wrapper" part="radio">
          <input type="radio" aria-hidden="true" tabindex="-1" />
          <div class="circle" part="circle">
            <div class="dot"></div>
          </div>
        </div>
        <span class="label" part="label" ref=${labelRef}><slot></slot></span>`,
    };
  },
  { formAssociated: true },
);

export default {};
