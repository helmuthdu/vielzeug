import { computed, css, define, defineEmits, defineProps, effect, guard, html, onMount, ref, signal } from '@vielzeug/craftit';
import { colorThemeMixin, frostVariantMixin, roundedVariantMixin, sizeVariantMixin } from '../../styles';
import type { ComponentSize, RoundedSize, ThemeColor } from '../../types';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--alert-bg, var(--_theme-backdrop));
      --_color: var(--alert-color, var(--_theme-base));
      --_border-color: var(--alert-border-color, var(--_theme-border));
      --_radius: var(--alert-radius, var(--rounded-md));
      --_padding: var(--alert-padding, var(--size-3) var(--size-4));
      --_gap: var(--alert-gap, var(--size-3));
      --_font-size: var(--alert-font-size, var(--text-sm));
      --_shadow: var(--alert-shadow, var(--shadow-none));

      display: block;
    }

    :host([dismissed]) {
      display: none;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: var(--_gap);
      padding: var(--_padding);
      background: var(--_bg);
      border: var(--border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-shadow: var(--_shadow);
      font-size: var(--_font-size);
      line-height: var(--leading-normal);
      color: var(--_color);
      box-sizing: border-box;
      width: 100%;
      transition:
        background var(--transition-normal),
        border-color var(--transition-normal),
        box-shadow var(--transition-normal),
        color var(--transition-normal);
    }

    .icon-slot {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .icon-slot[hidden] {
      display: none;
    }

    .body {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      gap: var(--size-0-5);
    }

    .title {
      font-weight: var(--font-semibold);
      line-height: var(--leading-tight);
    }

    .content {
      line-height: var(--leading-relaxed);
    }

    .close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--size-5);
      height: var(--size-5);
      border: none;
      border-radius: var(--rounded-sm);
      background: transparent;
      color: inherit;
      cursor: pointer;
      opacity: 0.7;
      padding: 0;
      margin-left: auto;
      transition:
        opacity var(--transition-fast),
        background var(--transition-fast);
    }

    .close:hover {
      opacity: 1;
      background: color-mix(in srgb, currentColor 12%, transparent);
    }

    .close:focus-visible {
      outline: var(--border-2) solid currentColor;
      outline-offset: var(--border-2);
      opacity: 1;
    }

    /* Hide close button when not dismissable */
    :host(:not([dismissable])) .close {
      display: none;
    }

    /* Left accent border for flat and bordered variants */
    :host([variant='flat'][accented]) .alert,
    :host([variant='bordered'][accented]) .alert {
      border-left-width: var(--border-4, 4px);
    }
  }

  @layer buildit.variants {
    /* =====================
       Flat (default) — subtle tinted background
       ===================== */
    :host(:not([variant])) .alert,
    :host([variant='flat']) .alert {
      background: color-mix(in srgb, var(--_theme-backdrop) 60%, transparent);
      border-color: color-mix(in srgb, var(--_theme-focus) 30%, transparent);
      color: var(--_theme-base);
      box-shadow: var(--inset-shadow-2xs);
    }

    /* =====================
       Solid — opaque themed background
       ===================== */
    :host([variant='solid']) .alert {
      background: var(--_theme-base);
      border-color: var(--_theme-base);
      color: var(--_theme-contrast);
      box-shadow: var(--shadow-xs);
    }

    :host([variant='solid']) .close {
      color: var(--_theme-contrast);
    }

    /* =====================
       Bordered — backdrop bg with visible border + shadow
       ===================== */
    :host([variant='bordered']) .alert {
      background: var(--_theme-backdrop);
      border-color: var(--_theme-border);
      color: var(--_theme-base);
      box-shadow: var(--inset-shadow-xs), var(--shadow-xs);
    }

    /* =====================
       Outline — transparent bg, colored border
       ===================== */
    :host([variant='outline']) .alert {
      background: transparent;
      border-color: var(--_theme-base);
      color: var(--_theme-base);
      box-shadow: var(--shadow-none);
    }
  }
`;

/** Alert component properties */
export interface AlertProps {
  /** Theme color (primary, success, warning, error, etc.) */
  color?: ThemeColor;
  /** Show a dismiss (×) button */
  dismissable?: boolean;
  /** Alert size */
  size?: ComponentSize;
  /** Border radius */
  rounded?: RoundedSize | '';
  /** Title text */
  title?: string;
  /** Visual style variant */
  variant?: 'solid' | 'flat' | 'bordered' | 'outline' | 'frost';
}

/**
 * A status/feedback banner with optional title, icon slot, and dismiss button.
 *
 * @element bit-alert
 *
 * @attr {string} color - Theme color (primary/success/warning/error…)
 * @attr {string} variant - Visual style: 'solid' | 'flat' | 'outline' | 'frost'
 * @attr {string} size - Size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius size
 * @attr {string} title - Bold title text above the content
 * @attr {boolean} dismissable - Show a close (×) button
 *
 * @fires dismiss - Fired when the alert is dismissed
 *
 * @slot - Default slot for the alert message content
 * @slot icon - Custom icon on the left side
 *
 * @cssprop --alert-bg - Background color
 * @cssprop --alert-color - Text / icon color
 * @cssprop --alert-border-color - Border color
 * @cssprop --alert-radius - Border radius
 * @cssprop --alert-padding - Padding
 * @cssprop --alert-gap - Gap between icon, body, and close button
 * @cssprop --alert-font-size - Font size
 *
 * @example
 * ```html
 * <bit-alert color="success">Your changes have been saved.</bit-alert>
 * <bit-alert color="error" variant="solid" dismissable title="Something went wrong">
 *   Please try again later.
 * </bit-alert>
 * ```
 */
define('bit-alert', ({ host }) => {
  const props = defineProps({
    color: { default: undefined as ThemeColor | undefined },
    dismissable: { default: false },
    rounded: { default: undefined as RoundedSize | undefined },
    size: { default: undefined as ComponentSize | undefined },
    title: { default: '' },
    variant: { default: undefined as AlertProps['variant'] | undefined },
  });

  const emit = defineEmits<{
    dismiss: { originalEvent: MouseEvent };
  }>();

  const dismissed = signal(false);

  effect(() => {
    if (dismissed.value) {
      host.setAttribute('dismissed', '');
    } else {
      host.removeAttribute('dismissed');
    }
  });

  const handleDismiss = guard(
    () => props.dismissable.value,
    (e: MouseEvent) => {
      dismissed.value = true;
      emit('dismiss', { originalEvent: e });
    },
  );

  const hasTitle = computed(() => !!props.title.value);
  const hasIcon = signal(false);
  const iconSlotRef = ref<HTMLSlotElement>();

  onMount(() => {
    const slot = iconSlotRef.value;
    if (!slot) return;
    const update = () => { hasIcon.value = slot.assignedElements().length > 0; };
    update();
    slot.addEventListener('slotchange', update);
    return () => slot.removeEventListener('slotchange', update);
  });

  return {
    styles: [
      colorThemeMixin,
      sizeVariantMixin({
        lg: { '--_padding': 'var(--size-4) var(--size-5)', fontSize: 'var(--text-base)', gap: 'var(--size-3-5)' },
        sm: { '--_padding': 'var(--size-2) var(--size-3)', fontSize: 'var(--text-xs)', gap: 'var(--size-2)' },
      }),
      roundedVariantMixin,
      frostVariantMixin('.alert'),
      componentStyles,
    ],
    template: html`
      <div class="alert" role="alert" part="alert" aria-live="polite">
        <span class="icon-slot" part="icon" aria-hidden="true" ?hidden=${() => !hasIcon.value}>
          <slot name="icon" ref=${iconSlotRef}></slot>
        </span>
        <div class="body" part="body">
          <span class="title" part="title" ?hidden=${() => !hasTitle.value}>
            ${() => props.title.value}
          </span>
          <div class="content" part="content">
            <slot></slot>
          </div>
        </div>
        <button
          class="close"
          part="close"
          type="button"
          aria-label="Dismiss alert"
          @click=${handleDismiss}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    `,
  };
});

export default {};
