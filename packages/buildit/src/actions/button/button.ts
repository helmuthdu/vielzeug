import {
  computed,
  css,
  define,
  defineField,
  defineProps,
  html,
  inject,
  onMount,
  syncContextProps,
} from '@vielzeug/craftit';
import {
  disabledLoadingMixin,
  forcedColorsMixin,
  formFieldMixins,
  frostVariantMixin,
  rainbowEffectMixin,
  sizeVariantMixin,
} from '../../styles';
import type { ButtonType, ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';
import { BUTTON_GROUP_CTX } from '../button-group/button-group';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_bg: var(--button-bg, var(--color-contrast-50));
      --_color: var(--button-color, var(--color-contrast-900));
      --_border: var(--button-border, var(--border));
      --_border-color: var(--button-border-color, var(--color-contrast-200));
      --_radius: var(--button-radius, var(--rounded-md));
      --_shadow: var(--button-shadow, var(--shadow-2xs));

      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    :host([disabled]) {
      cursor: not-allowed;
    }

    /* Link mode: mixin covers <button> but not <a> */
    :host([disabled]) a,
    :host([loading]) a {
      opacity: 0.5;
      cursor: not-allowed;
      pointer-events: none;
    }

    :host([loading]) a {
      cursor: wait;
    }

    button {
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--_height, var(--size-10));
      padding: var(--_padding, var(--size-2) var(--size-4));
      gap: var(--_gap, var(--size-2));

      background: var(--_bg);
      color: var(--_color);
      border: var(--_border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-shadow: var(--_shadow);

      font-size: var(--_font-size, var(--text-sm));
      font-weight: var(--font-medium);
      line-height: var(--_line-height, var(--leading-normal));
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
      min-height: var(--_touch-target);

      transition: var(--_motion-transition,
        background var(--transition-normal),
        border-color var(--transition-normal),
        box-shadow var(--transition-normal),
        color var(--transition-normal),
        opacity var(--transition-normal),
        transform var(--transition-fast));
    }

    a {
      box-sizing: border-box;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: var(--_height, var(--size-10));
      padding: var(--_padding, var(--size-2) var(--size-4));
      gap: var(--_gap, var(--size-2));
      text-decoration: none;

      background: var(--_bg);
      color: var(--_color);
      border: var(--_border) solid var(--_border-color);
      border-radius: var(--_radius);
      box-shadow: var(--_shadow);

      font-size: var(--_font-size, var(--text-sm));
      font-weight: var(--font-medium);
      line-height: var(--_line-height, var(--leading-normal));
      white-space: nowrap;
      user-select: none;
      cursor: pointer;
      min-height: var(--_touch-target);

      transition: var(--_motion-transition,
        background var(--transition-normal),
        border-color var(--transition-normal),
        box-shadow var(--transition-normal),
        color var(--transition-normal),
        opacity var(--transition-normal),
        transform var(--transition-fast));
    }

    button:focus-visible {
      outline: var(--border-2) solid currentColor;
      outline-offset: var(--border-2);
    }

    a:focus-visible {
      outline: var(--border-2) solid currentColor;
      outline-offset: var(--border-2);
    }

    button,
    a {
      min-width: 0;
    }

    .content {
      display: inline-flex;
      align-items: center;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: middle;
    }

    ::slotted([slot='prefix']),
    ::slotted([slot='suffix']) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    ::slotted(svg) {
      width: var(--_icon-size, var(--size-5));
      height: var(--_icon-size, var(--size-5));
      flex-shrink: 0;
    }

  }

  @layer buildit.overrides {
    :host([fullwidth]) {
      display: flex;
      width: 100%;
    }
  }

  @layer buildit.variants {
    :host([icon-only]) :is(button, a) {
      padding: 0;
      aspect-ratio: 1;
    }

    /* Solid (Default) - Full theme color background */
    :host(:not([variant])) :is(button, a),
    :host([variant='solid']) :is(button, a) {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      border-color: var(--_theme-base);
      box-shadow: var(--shadow-2xs);
    }

    :host(:not([variant])) :is(button, a):hover,
    :host([variant='solid']) :is(button, a):hover {
      background: var(--_theme-focus);
      box-shadow: var(--shadow-xs);
    }

    :host(:not([variant])) :is(button, a):active,
    :host([variant='solid']) :is(button, a):active {
      background: var(--_theme-content);
      box-shadow: var(--inset-shadow-2xs);
    }

    /* Flat - Subtle background with theme color text */
    :host([variant='flat']) :is(button, a) {
      background: color-mix(in srgb, var(--_theme-backdrop) 8%, var(--color-contrast-100));
      color: var(--_theme-base);
      border-color: color-mix(in srgb, var(--_theme-focus) 20%, transparent);
      box-shadow: var(--inset-shadow-2xs);
    }

    :host([variant='flat']) :is(button, a):hover {
      background: var(--_theme-focus);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-xs), var(--shadow-xs);
    }

    :host([variant='flat']) :is(button, a):active {
      background: var(--_theme-content);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-sm);
    }

    /* Bordered - Outlined with filled background */
    :host([variant='bordered']) :is(button, a) {
      background: var(--_theme-backdrop);
      color: var(--_theme-base);
      border-color: var(--_theme-border);
      box-shadow: var(--inset-shadow-xs), var(--shadow-xs);
    }

    :host([variant='bordered']) :is(button, a):hover {
      background: var(--_theme-focus);
      color: var(--_theme-contrast);
      border-color: var(--_theme-focus);
      box-shadow: var(--inset-shadow-xs), var(--shadow-sm);
    }

    :host([variant='bordered']) :is(button, a):active {
      background: var(--_theme-content);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-sm);
    }

    /* Outline - Transparent with colored border */
    :host([variant='outline']) :is(button, a) {
      background: transparent;
      color: var(--_theme-base);
      border-color: var(--_theme-base);
      box-shadow: var(--shadow-none);
    }

    :host([variant='outline']) :is(button, a):hover {
      background: var(--_theme-backdrop);
      border-color: var(--_theme-focus);
      box-shadow: var(--shadow-xs);
    }

    :host([variant='outline']) :is(button, a):active {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-2xs);
    }

    /* Ghost - Transparent until interaction */
    :host([variant='ghost']) :is(button, a) {
      background: transparent;
      color: var(--_theme-base);
      border-color: transparent;
      border-width: 0;
      box-shadow: var(--shadow-none);
    }

    :host([variant='ghost']) :is(button, a):hover {
      background: var(--_theme-backdrop);
      box-shadow: var(--shadow-xs);
    }

    :host([variant='ghost']) :is(button, a):active {
      background: var(--_theme-base);
      color: var(--_theme-contrast);
      box-shadow: var(--inset-shadow-2xs);
    }

    /* Text - Minimal styling, color on hover */
    :host([variant='text']) :is(button, a) {
      background: transparent;
      color: var(--_theme-base);
      border-color: transparent;
      border-width: 0;
      box-shadow: var(--shadow-none);
    }

    :host([variant='text']) :is(button, a):hover {
      color: var(--_theme-focus);
    }

    :host([variant='text']) :is(button, a):active {
      color: var(--_theme-content);
    }

    /* Additional button-specific frost active states */
    :host([variant='frost']:not([color])) :is(button, a):active {
      background: color-mix(in srgb, var(--color-canvas) 70%, transparent);
      border-color: color-mix(in srgb, var(--theme-focus) 40%, transparent);
    }

    :host([variant='frost'][color]) :is(button, a):active {
      background: color-mix(in srgb, var(--_theme-backdrop) 50%, var(--_theme-base) 50%);
      border-color: color-mix(in srgb, var(--_theme-focus) 65%, transparent);
    }
  }

  /* ========================================
     Other Variants & States
     ======================================== */

  @layer buildit.overrides {
    /* Icon-only always uses perfect circle */
    :host([rounded][icon-only]) :is(button, a) {
      border-radius: 50%;
    }

    :host([loading]) .content {
      visibility: hidden;
    }

  }

  /* ========================================
     Loading Spinner (unlayered for easy override)
     ======================================== */

  .loader {
    position: absolute;
    width: 1em;
    height: 1em;
    border: var(--border-2) solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: var(--_motion-animation, spin 0.6s linear infinite);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

/** Button component properties */
export type ButtonProps = {
  /** Visual style variant */
  variant?: Exclude<VisualVariant, 'glass'>;
  /** Theme color */
  color?: ThemeColor;
  /** Accessible label for the inner button — required for icon-only buttons */
  label?: string;
  /** Button size */
  size?: ComponentSize;
  /** Disable button interaction */
  disabled?: boolean;
  /** Show loading state with spinner */
  loading?: boolean;
  /** Enable animated rainbow border effect */
  rainbow?: boolean;
  /** HTML button type attribute */
  type?: ButtonType;
  /** Icon-only mode (square aspect ratio, no padding) */
  iconOnly?: boolean;
  /** Full width button (100% of container) */
  fullwidth?: boolean;
  /** Border radius size */
  rounded?: RoundedSize;
  /** When set, renders an `<a>` instead of `<button>` */
  href?: string;
  /** Link target (requires href) */
  target?: '_blank' | '_self' | '_parent' | '_top';
  /** Link rel attribute (requires href) */
  rel?: string;
};

/**
 * A customizable button component with multiple variants, sizes, and states.
 * Supports icons, loading states, and special effects like frost and rainbow.
 *
 * @element bit-button
 *
 * @attr {string} type - HTML button type: 'button' | 'submit' | 'reset'
 * @attr {boolean} disabled - Disable button interaction
 * @attr {boolean} loading - Show loading state with spinner
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'frost'
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {boolean} rainbow - Enable animated rainbow border effect
 * @attr {boolean} icon-only - Icon-only mode (square aspect ratio, no padding)
 * @attr {boolean} fullwidth - Full width button (100% of container)
 *
 * @fires click - Emitted when button is clicked (unless disabled/loading)
 *
 * @slot - Button content (text, icons, etc.)
 * @slot prefix - Content before the button text (e.g., icons)
 * @slot suffix - Content after the button text (e.g., icons, badges)
 *
 * @part button - The button element
 * @part loader - The loading spinner element
 * @part content - The button content wrapper
 *
 * @cssprop --button-bg - Background color
 * @cssprop --button-color - Text color
 * @cssprop --button-hover-bg - Hover background
 * @cssprop --button-active-bg - Active/pressed background
 * @cssprop --button-border - Border width
 * @cssprop --button-border-color - Border color
 * @cssprop --button-radius - Border radius
 * @cssprop --button-padding - Inner padding
 * @cssprop --button-gap - Gap between icon and text
 * @cssprop --button-font-size - Font size
 * @cssprop --button-shadow - Box shadow
 *
 * @example
 * ```html
 * <bit-button variant="solid" color="primary">Click me</bit-button>
 * <bit-button loading color="success">Processing...</bit-button>
 * <bit-button variant="frost" rainbow>Special Button</bit-button>
 * ```
 */
export const TAG = define(
  'bit-button',
  ({ host }) => {
    const props = defineProps<ButtonProps>({
      color: { default: undefined },
      disabled: { default: false },
      fullwidth: { default: false },
      href: { default: undefined },
      iconOnly: { default: false },
      label: { default: undefined },
      loading: { default: false },
      rainbow: { default: false },
      rel: { default: undefined },
      rounded: { default: undefined },
      size: { default: undefined },
      target: { default: undefined },
      type: { default: 'button' },
      variant: { default: 'solid' },
    });

    // Reactively inherit size/variant/color from a parent bit-button-group when present.
    const groupCtx = inject(BUTTON_GROUP_CTX, undefined);
    syncContextProps(groupCtx, props, ['color', 'size', 'variant']);

    const isDisabled = computed(() => props.disabled.value || props.loading.value);
    const isLink = computed(() => !!props.href.value);

    // Form association: relay submit/reset clicks to the associated form.
    // The inner <button> always has type="button" so shadow DOM never drives native form actions.
    const field = defineField({
      disabled: isDisabled,
      toFormValue: () => null,
      value: computed(() => ''),
    });

    // Prevent navigation on disabled links; native <button disabled> handles the button case.
    const handleLinkClick = (e: MouseEvent) => {
      if (isDisabled.value) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Relay to host as a proper MouseEvent. stopPropagation prevents double-dispatch in
      // browsers where shadow DOM already retargets the event to the host.
      e.stopPropagation();
      host.dispatchEvent(new MouseEvent(e.type, e));
    };

    const handleButtonClick = (e: MouseEvent) => {
      if (isDisabled.value) return;
      // Relay to host as a proper MouseEvent. stopPropagation prevents double-dispatch in
      // browsers where shadow DOM already retargets the event to the host.
      e.stopPropagation();
      host.dispatchEvent(new MouseEvent(e.type, e));
    };

    onMount(() => {
      const handleFormAction = () => {
        if (isDisabled.value || isLink.value) return;
        const form = field.internals.form;
        if (!form) return;
        if (props.type.value === 'submit') form.requestSubmit();
        else if (props.type.value === 'reset') form.reset();
      };
      host.addEventListener('click', handleFormAction);
      return () => host.removeEventListener('click', handleFormAction);
    });

    return {
      styles: [
        ...formFieldMixins,
        forcedColorsMixin,
        sizeVariantMixin({
          lg: {
            fontSize: 'var(--text-base)',
            gap: 'var(--size-2-5)',
            height: 'var(--size-12)',
            iconSize: 'var(--size-6)',
            lineHeight: 'var(--leading-relaxed)',
            padding: 'var(--size-2-5) var(--size-5)',
          },
          sm: {
            fontSize: 'var(--text-sm)',
            gap: 'var(--size-1-5)',
            height: 'var(--size-8)',
            iconSize: 'var(--size-4)',
            lineHeight: 'var(--leading-tight)',
            padding: 'var(--size-1-5) var(--size-3)',
          },
        }),
        frostVariantMixin('button'),
        rainbowEffectMixin('button'),
        disabledLoadingMixin('button'),
        componentStyles,
      ],
      template: html`
      ${() =>
        isLink.value
          ? html`<a
          part="button"
          :href="${() => props.href.value ?? null}"
          :target="${() => props.target.value ?? null}"
          :rel="${() => props.rel.value ?? null}"
          :aria-label="${() => props.label.value ?? null}"
          :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
          :aria-busy="${() => (props.loading.value ? 'true' : null)}"
          role="button"
          @click="${handleLinkClick}">
          <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
          <slot name="prefix"></slot>
          <span class="content" part="content"><slot></slot></span>
          <slot name="suffix"></slot>
        </a>`
          : html`<button
          part="button"
          type="button"
          ?disabled=${isDisabled}
          :aria-label="${() => props.label.value ?? null}"
          :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
          :aria-busy="${() => (props.loading.value ? 'true' : null)}"
          @click="${handleButtonClick}">
          <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
          <slot name="prefix"></slot>
          <span class="content" part="content"><slot></slot></span>
          <slot name="suffix"></slot>
        </button>`}
    `,
    };
  },
  { formAssociated: true },
);

declare global {
  interface HTMLElementTagNameMap {
    'bit-button': HTMLElement & ButtonProps;
  }
}
