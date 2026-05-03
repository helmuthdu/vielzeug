import { define, prop, computed, defineField, effect, html, inject } from '@vielzeug/craftit';

import type { ButtonType, DisablableProps, RoundedSize, SizableProps, ThemableProps, VisualVariant } from '../../types';

import {
  disabledLoadingMixin,
  forcedColorsMixin,
  formFieldMixins,
  frostVariantMixin,
  rainbowEffectMixin,
  sizeVariantMixin,
} from '../../styles';
import { BUTTON_GROUP_CTX } from '../button-group/button-group';
import { disablableBundle, loadableBundle, roundableBundle, sizableBundle, themableBundle } from '../shared/bundles';
import componentStyles from './button.css?inline';

const BUTTON_COLORS = ['primary', 'secondary', 'info', 'success', 'warning', 'error'] as const;
const BUTTON_SIZES = ['sm', 'md', 'lg'] as const;
const BUTTON_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'] as const;

/** Button component properties */
export type BitButtonProps = ThemableProps &
  SizableProps &
  DisablableProps & {
    /** Full width button (100% of container) */
    fullwidth?: boolean;
    /** When set, renders an `<a>` instead of `<button>` */
    href?: string;
    /** Icon-only mode (square aspect ratio, no padding) */
    iconOnly?: boolean;
    /** Accessible label for the inner button — required for icon-only buttons */
    label?: string;
    /** Show loading state with spinner */
    loading?: boolean;
    /** Enable animated rainbow border effect */
    rainbow?: boolean;
    /** Link rel attribute (requires href) */
    rel?: string;
    /** Border radius size */
    rounded?: RoundedSize;
    /** Link target (requires href) */
    target?: '_blank' | '_self' | '_parent' | '_top';
    /** HTML button type attribute */
    type?: ButtonType;
    /** Visual style variant */
    variant?: Exclude<VisualVariant, 'glass'>;
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
 *
 * @example
 * ```html
 * <bit-button variant="solid" color="primary">Click me</bit-button>
 * <bit-button loading color="success">Processing...</bit-button>
 * <bit-button variant="frost" rainbow>Special Button</bit-button>
 * ```
 */
export const BUTTON_TAG = define<BitButtonProps, { click: MouseEvent }>('bit-button', {
  formAssociated: true,
  props: {
    ...themableBundle,
    ...sizableBundle,
    ...disablableBundle,
    ...loadableBundle,
    ...roundableBundle,
    fullwidth: false,
    href: undefined,
    iconOnly: false,
    label: undefined,
    rainbow: false,
    rel: undefined,
    target: undefined,
    type: prop.oneOf(['button', 'submit', 'reset'] as const, 'button'),
    variant: prop.oneOf(BUTTON_VARIANTS, 'solid'),
  },
  setup(props, { emit, host }) {
    // Reactively inherit size/variant/color from a parent bit-button-group when present.
    const groupCtx = inject(BUTTON_GROUP_CTX);

    if (groupCtx) {
      effect(() => {
        const color = groupCtx.color.value;
        const size = groupCtx.size.value;
        const variant = groupCtx.variant.value;

        if (color !== undefined && BUTTON_COLORS.includes(color as (typeof BUTTON_COLORS)[number])) {
          props.color.value = color as BitButtonProps['color'];
        }

        if (size !== undefined && BUTTON_SIZES.includes(size as (typeof BUTTON_SIZES)[number])) {
          props.size.value = size as BitButtonProps['size'];
        }

        if (variant !== undefined && BUTTON_VARIANTS.includes(variant as (typeof BUTTON_VARIANTS)[number])) {
          props.variant.value = variant as BitButtonProps['variant'];
        }
      });
    }

    const isLink = computed(() => !!props.href.value);
    const isDisabled = computed(() => !!(props.disabled.value || props.loading.value));

    // Form association: relay submit/reset clicks to the associated form.
    // The inner <button> always has type="button" so shadow DOM never drives native form actions.
    const formField = defineField({
      disabled: isDisabled,
      toFormValue: () => null,
      value: computed(() => ''),
    });

    // Unified click handler for both links and buttons.
    // Forward only when native click didn't traverse to host (jsdom/shadow interop).
    const handleClick = (e: MouseEvent) => {
      if (isDisabled.value) {
        e.preventDefault();
        e.stopImmediatePropagation();

        return;
      }

      // If it's a form button, handle submit/reset
      if (isLink.value) return;

      const form = formField.internals.form;

      if (form) {
        if (props.type.value === 'submit') {
          e.preventDefault();
          form.requestSubmit();
        } else if (props.type.value === 'reset') {
          e.preventDefault();
          form.reset();
        }
      }

      const path = e.composedPath();
      const reachedHost = path.includes(host.el);

      if (!reachedHost) {
        emit('click', e);
      }
    };

    host.bind({
      attr: {
        'aria-busy': props.loading,
        'aria-disabled': isDisabled,
        'aria-label': props.label,
      },
    });

    return () => html`
      ${() =>
        isLink.value
          ? html`<a
              part="button"
              :href="${props.href}"
              :target="${props.target}"
              :rel="${props.rel}"
              role="button"
              :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
              :aria-busy="${() => (props.loading.value ? 'true' : null)}"
              @click="${handleClick}">
              <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
              <slot name="prefix"></slot>
              <span class="content" part="content"><slot></slot></span>
              <slot name="suffix"></slot>
            </a>`
          : html`<button
              part="button"
              type="button"
              ?disabled=${isDisabled}
              :aria-disabled="${() => (isDisabled.value ? 'true' : null)}"
              :aria-busy="${() => (props.loading.value ? 'true' : null)}"
              @click="${handleClick}">
              <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
              <slot name="prefix"></slot>
              <span class="content" part="content"><slot></slot></span>
              <slot name="suffix"></slot>
            </button>`}
    `;
  },
  shadow: { delegatesFocus: true },
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
});
