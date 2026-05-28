import { define, prop, computed, defineField, html, inject } from '@vielzeug/craftit';

import type { ButtonType, ComponentSize, RoundedSize, ThemeColor, VisualVariant } from '../../types';

import { disablableBundle, loadableBundle, roundableBundle, sizableBundle, themableBundle } from '../../shared/config';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledLoadingMixin,
  forcedColorsMixin,
  frostVariantMixin,
  rainbowEffectMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  sizeVariantMixin,
} from '../../styles';
import { computeSafeRel } from '../../utils';
import { BUTTON_GROUP_CTX } from '../button-group/button-group';
import componentStyles from './button.css?inline';

const BUTTON_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'] as const;

/** Button component properties */
export type BitButtonProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
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
  /** Component size */
  size?: ComponentSize;
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
    fullwidth: prop.bool(false),
    href: prop.string(),
    iconOnly: prop.bool(false),
    label: prop.string(),
    rainbow: prop.bool(false),
    rel: prop.string(),
    target: prop.string<'_blank' | '_self' | '_parent' | '_top'>(),
    type: prop.oneOf(['button', 'submit', 'reset'] as const, 'button'),
    variant: prop.oneOf(BUTTON_VARIANTS, 'solid'),
  },
  setup(props, { emit, el, bind }) {
    // Derive effective color/size/variant — prefer group context, fall back to own prop.
    const groupCtx = inject(BUTTON_GROUP_CTX);
    const effectiveColor = computed(() => groupCtx?.color.value ?? props.color.value);
    const effectiveSize = computed(() => groupCtx?.size.value ?? props.size.value);
    const effectiveVariant = computed(() => groupCtx?.variant.value ?? props.variant.value);

    const isLink = computed(() => !!props.href.value);
    const isDisabled = computed(() => !!(props.disabled.value || props.loading.value));

    // Automatically add noopener/noreferrer when opening in a new tab to prevent
    // reverse tabnapping (opened page accessing window.opener to redirect origin).
    const effectiveRel = computed(() => computeSafeRel(props.rel.value, props.target.value));

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
      const reachedHost = path.includes(el);

      if (!reachedHost) {
        emit('click', e);
      }
    };

    bind({
      attr: {
        'aria-busy': props.loading,
        'aria-disabled': isDisabled,
        'aria-label': props.label,
        color: effectiveColor,
        size: effectiveSize,
        variant: effectiveVariant,
      },
    });

    return html`
      ${() =>
        isLink.value
          ? html`<a
              part="button"
              :href="${props.href}"
              :target="${props.target}"
              :rel="${effectiveRel}"
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
    colorThemeMixin,
    coarsePointerMixin,
    reducedMotionMixin,
    roundedVariantMixin,
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
