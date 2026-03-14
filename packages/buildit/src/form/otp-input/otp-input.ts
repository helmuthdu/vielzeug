import { computed, css, define, defineEmits, defineProps, html, onMount } from '@vielzeug/craftit';

import type { AddEventListeners, ComponentSize, ThemeColor, VisualVariant } from '../../types';

import { colorThemeMixin, forcedColorsFocusMixin, sizeVariantMixin } from '../../styles';

const styles = /* css */ css`
  @layer buildit.base {
    :host {
      --_cell-size: var(--otp-cell-size, var(--size-12));
      --_cell-gap: var(--otp-cell-gap, var(--size-2));
      --_cell-font-size: var(--otp-cell-font-size, var(--text-xl));
      --_cell-radius: var(--otp-cell-radius, var(--rounded-md));
      --_cell-border: var(--otp-cell-border, var(--border));
      --_cell-border-color: var(--otp-cell-border-color, var(--color-contrast-300));
      --_cell-bg: var(--otp-cell-bg, var(--color-canvas));
      --_cell-focus-border: var(--otp-cell-focus-border, var(--_theme-base, var(--color-contrast-700)));

      display: inline-flex;
      flex-direction: column;
      gap: var(--size-1);
    }

    .otp-group {
      display: flex;
      align-items: center;
      gap: var(--_cell-gap);
    }

    .cell {
      box-sizing: border-box;
      display: block;
      width: var(--_cell-size);
      height: var(--_cell-size);
      text-align: center;
      font-size: var(--_cell-font-size);
      font-weight: var(--font-semibold);
      line-height: 1;
      background: var(--_cell-bg);
      border: var(--_cell-border) solid var(--_cell-border-color);
      border-radius: var(--_cell-radius);
      color: var(--color-contrast-900);
      caret-color: var(--_cell-focus-border);
      transition:
        border-color var(--transition-fast),
        box-shadow var(--transition-fast);
      padding: 0;
    }

    .cell::selection {
      background: var(--_theme-backdrop, var(--color-contrast-100));
    }

    .cell:focus {
      outline: none;
      border-color: var(--_cell-focus-border);
      box-shadow: 0 0 0 var(--border-2) color-mix(in srgb, var(--_cell-focus-border) 20%, transparent);
    }

    .cell:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .separator {
      color: var(--color-contrast-400);
      font-size: var(--_cell-font-size);
      user-select: none;
    }
  }

  @layer buildit.variants {
    /* Solid (default) */
    :host(:not([variant])) .cell,
    :host([variant='solid']) .cell {
      background: var(--color-contrast-50);
      border-color: var(--color-contrast-300);
      box-shadow: var(--shadow-2xs);
    }

    /* Flat */
    :host([variant='flat']) .cell {
      background: var(--color-contrast-100);
      border-color: var(--_theme-border, var(--color-contrast-200));
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']) .cell:hover:not(:disabled) {
      background: color-mix(in srgb, var(--_theme-base) 6%, var(--color-contrast-100));
      border-color: color-mix(in srgb, var(--_theme-base) 35%, var(--color-contrast-300));
    }

    :host([variant='flat']) .cell:focus {
      background: color-mix(in srgb, var(--_theme-base) 8%, var(--color-canvas));
      border-color: color-mix(in srgb, var(--_cell-focus-border) 60%, transparent);
      box-shadow: var(--_theme-shadow);
    }

    /* Bordered */
    :host([variant='bordered']) .cell {
      background: var(--_theme-backdrop, var(--color-contrast-50));
      border-color: color-mix(in srgb, var(--_cell-focus-border) 70%, transparent);
    }

    :host([variant='bordered']) .cell:hover:not(:disabled) {
      border-color: var(--_cell-focus-border);
    }

    :host([variant='bordered']) .cell {
      color: var(--_theme-content, var(--color-contrast-900));
      caret-color: var(--_theme-content, var(--_cell-focus-border));
    }

    /* Outline */
    :host([variant='outline']) .cell {
      background: transparent;
      box-shadow: none;
    }

    /* Ghost */
    :host([variant='ghost']) .cell {
      background: transparent;
      border-color: transparent;
      box-shadow: none;
    }

    :host([variant='ghost']) .cell:hover:not(:disabled) {
      background: var(--color-contrast-100);
    }
  }

  @layer buildit.utilities {
    :host([size='sm']) {
      --_cell-size: var(--size-9);
      --_cell-font-size: var(--text-base);
    }

    :host([size='lg']) {
      --_cell-size: var(--size-14);
      --_cell-font-size: var(--text-2xl);
    }
  }
`;

/** OTP Input events */
export interface BitOtpInputEvents {
  change: CustomEvent<{ complete: boolean; value: string }>;
  complete: CustomEvent<{ value: string }>;
}

/** OTP Input props */
export interface OtpInputProps {
  /** Number of input cells */
  length?: number;
  /** Input type: 'numeric' (digits only) or 'alphanumeric' */
  type?: 'numeric' | 'alphanumeric';
  /** Current value */
  value?: string;
  /** Make inputs disabled */
  disabled?: boolean;
  /** Mask input (show dots instead of characters) */
  masked?: boolean;
  /** Component size */
  size?: ComponentSize;
  /** Theme color */
  color?: ThemeColor;
  /** Form field name */
  name?: string;
  /** Accessible label */
  label?: string;
  /** Show a separator in the middle (e.g. "–") */
  separator?: string;
  /** Visual variant */
  variant?: Exclude<VisualVariant, 'text' | 'frost' | 'glass'>;
}

/**
 * A segmented OTP (One-Time Password) input with N individual cells.
 * Auto-advances focus on input, auto-backs on Backspace, handles paste.
 *
 * @element bit-otp-input
 *
 * @attr {number} length - Number of cells (default: 6)
 * @attr {string} type - 'numeric' (default) | 'alphanumeric'
 * @attr {string} value - Current code value
 * @attr {boolean} disabled - Disable all cells
 * @attr {boolean} masked - Show as password
 * @attr {string} size - 'sm' | 'md' | 'lg'
 * @attr {string} color - Theme color
 * @attr {string} name - Form field name
 * @attr {string} label - Group aria-label
 * @attr {string} separator - Optional separator character shown in the middle
 *
 * @fires change - Emitted whenever a cell changes, with { value, complete }
 * @fires complete - Emitted when all cells are filled
 *
 * @cssprop --otp-cell-size - Width and height of each cell
 * @cssprop --otp-cell-gap - Gap between cells
 * @cssprop --otp-cell-font-size - Font size inside cells
 * @cssprop --otp-cell-radius - Border radius of cells
 * @cssprop --otp-cell-border-color - Default border color
 * @cssprop --otp-cell-focus-border - Focused border color
 *
 * @example
 * ```html
 * <bit-otp-input length="6" color="primary"></bit-otp-input>
 * ```
 */
export const TAG = define('bit-otp-input', ({ host }) => {
  const props = defineProps<OtpInputProps>({
    color: { default: undefined },
    disabled: { default: false },
    label: { default: 'One-time password' },
    length: { default: 6 },
    masked: { default: false },
    name: { default: undefined },
    separator: { default: undefined },
    size: { default: undefined },
    type: { default: 'numeric' },
    value: { default: '' },
    variant: { default: undefined },
  });

  const emit = defineEmits<{ change: { complete: boolean; value: string }; complete: { value: string } }>();

  const cells = computed(() => Array.from({ length: Number(props.length.value) || 6 }, (_, i) => i));

  function getInputs(): HTMLInputElement[] {
    return [...(host.shadowRoot?.querySelectorAll<HTMLInputElement>('input.cell') ?? [])];
  }

  function getValue(): string {
    return getInputs()
      .map((i) => i.value)
      .join('');
  }

  function isAllowed(char: string): boolean {
    if (props.type.value === 'numeric') return /^\d$/.test(char);

    return /^[a-z\d]$/i.test(char);
  }

  function handleInput(e: Event, index: number) {
    const input = e.target as HTMLInputElement;
    let val = input.value;

    // Keep only last character if multiple were typed somehow
    if (val.length > 1) val = val.slice(-1);

    // Validate character
    if (val && !isAllowed(val)) {
      input.value = '';

      return;
    }

    input.value = val;

    const allInputs = getInputs();
    const full = getValue();
    const complete = full.length === allInputs.length && full.split('').every(Boolean);

    host.setAttribute('value', full);
    emit('change', { complete, value: full });

    if (complete) emit('complete', { value: full });

    // Auto-advance
    if (val && index < allInputs.length - 1) {
      allInputs[index + 1].focus();
      allInputs[index + 1].select();
    }
  }

  function handleKeydown(e: KeyboardEvent, index: number) {
    const input = e.target as HTMLInputElement;
    const allInputs = getInputs();

    if (e.key === 'Backspace') {
      if (input.value) {
        input.value = '';
      } else if (index > 0) {
        allInputs[index - 1].focus();
        allInputs[index - 1].select();
        allInputs[index - 1].value = '';
      }

      const full = getValue();

      host.setAttribute('value', full);
      emit('change', { complete: false, value: full });
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      allInputs[index - 1].focus();
      e.preventDefault();
    } else if (e.key === 'ArrowRight' && index < allInputs.length - 1) {
      allInputs[index + 1].focus();
      e.preventDefault();
    } else if (e.key === 'Home') {
      allInputs[0].focus();
      e.preventDefault();
    } else if (e.key === 'End') {
      allInputs[allInputs.length - 1].focus();
      e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent) {
    e.preventDefault();

    const pasted = e.clipboardData?.getData('text') ?? '';
    const chars = pasted
      .split('')
      .filter((c) => isAllowed(c))
      .slice(0, Number(props.length.value) || 6);

    const allInputs = getInputs();

    chars.forEach((char, i) => {
      if (allInputs[i]) allInputs[i].value = char;
    });

    const full = getValue();
    const complete = full.length === allInputs.length && full.split('').every(Boolean);

    host.setAttribute('value', full);
    emit('change', { complete, value: full });

    if (complete) emit('complete', { value: full });

    // Focus the cell after last pasted char
    const focusIdx = Math.min(chars.length, allInputs.length - 1);

    allInputs[focusIdx]?.focus();
  }

  onMount(() => {
    // Populate cells from value prop on mount
    const initialVal = String(props.value.value || '');
    const allInputs = getInputs();

    initialVal.split('').forEach((c, i) => {
      if (allInputs[i]) allInputs[i].value = c;
    });
  });

  const separatorIdx = computed(() => {
    const len = Number(props.length.value) || 6;

    return props.separator.value != null ? Math.floor(len / 2) : -1;
  });

  return {
    styles: [colorThemeMixin, sizeVariantMixin({}), forcedColorsFocusMixin('.cell'), styles],
    template: html`
      <div class="otp-group" part="group" role="group" :aria-label="${() => props.label.value}">
        ${() =>
          cells.value.map(
            (i) => html`
              ${() =>
                separatorIdx.value > 0 && i === separatorIdx.value
                  ? html`<span class="separator" aria-hidden="true">${() => props.separator.value || '-'}</span>`
                  : ''}
              <input
                class="cell"
                part="cell"
                :type="${() => (props.masked.value ? 'password' : 'text')}"
                inputmode="${() => (props.type.value === 'numeric' ? 'numeric' : 'text')}"
                maxlength="1"
                autocomplete="${() => (i === 0 ? 'one-time-code' : 'off')}"
                :aria-label="${() => `Digit ${i + 1} of ${props.length.value}`}"
                :disabled="${() => props.disabled.value || null}"
                :name="${() => (props.name.value ? `${props.name.value}[${i}]` : null)}"
                @input="${(e: Event) => handleInput(e, i)}"
                @keydown="${(e: KeyboardEvent) => handleKeydown(e, i)}"
                @paste="${(e: ClipboardEvent) => (i === 0 ? handlePaste(e) : e.preventDefault())}"
                @focus="${(e: FocusEvent) => (e.target as HTMLInputElement).select()}" />
            `,
          )}
      </div>
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-otp-input': HTMLElement & OtpInputProps & AddEventListeners<BitOtpInputEvents>;
  }
}
