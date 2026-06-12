import { computed, define, defineField, html, inject, prop } from '@vielzeug/craft';

import type { ButtonType, ComponentSize, LinkTarget, RoundedSize, ThemeColor } from '../../types';

import { commonProps } from '../../shared';
import {
  coarsePointerMixin,
  colorThemeMixin,
  disabledLoadingMixin,
  forcedColorsMixin,
  frostVariantMixin,
  rainbowEffectMixin,
  reducedMotionMixin,
  roundedVariantMixin,
  shineEffectMixin,
  sizeVariantMixin,
} from '../../styles';
import { useLinkProps } from '../../utils';
import { BUTTON_GROUP_CTX } from '../button-group/button-group';
import { useFormAction } from '../shared';
import componentStyles from './button.css?inline';

export const BUTTON_VARIANTS = ['solid', 'flat', 'bordered', 'outline', 'ghost', 'text', 'frost'] as const;

/** Visual variant for sg-button — derived from BUTTON_VARIANTS for a single source of truth. */
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/** Animated border effect for sg-button. */
export type ButtonEffect = 'shine' | 'rainbow';

/** Button component properties */
export type SgButtonProps = {
  /** Theme color */
  color?: ThemeColor;
  /** Disable interaction */
  disabled?: boolean;
  /** Animated border effect: 'shine' (color-aware neon sweep) or 'rainbow' */
  effect?: ButtonEffect;
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
  /** Link rel attribute (requires href) */
  rel?: string;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Component size */
  size?: ComponentSize;
  /** Link target (requires href) */
  target?: LinkTarget;
  /** HTML button type attribute */
  type?: ButtonType;
  /** Visual style variant */
  variant?: ButtonVariant;
};

/**
 * A customizable button component with multiple variants, sizes, and states.
 * Supports icons, loading states, and animated border effects.
 *
 * @element sg-button
 *
 * @attr {string} type - HTML button type: 'button' | 'submit' | 'reset'
 * @attr {boolean} disabled - Disable button interaction
 * @attr {boolean} loading - Show loading state with spinner
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} variant - Visual variant: 'solid' | 'flat' | 'bordered' | 'outline' | 'ghost' | 'text' | 'frost'
 * @attr {string} size - Button size: 'sm' | 'md' | 'lg'
 * @attr {string} rounded - Border radius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'
 * @attr {string} effect - Animated border effect: 'shine' | 'rainbow'
 * @attr {boolean} icon-only - Icon-only mode (square aspect ratio, no padding)
 * @attr {boolean} fullwidth - Full width button (100% of container)
 *
 * @fires click - Emitted when button is clicked (unless disabled/loading)
 *
 * @slot - Button content (text, icons, etc.)
 * @slot prefix - Content before the button text (e.g., icons)
 * @slot suffix - Content after the button text (e.g., icons, badges)
 *
 * @part button - The inner button or anchor element
 * @part loader - The loading spinner element
 * @part content - The button content wrapper
 *
 * @cssprop --button-bg - Background color override
 * @cssprop --button-color - Text color override
 * @cssprop --button-border - Border width override
 * @cssprop --button-border-color - Border color override
 * @cssprop --button-radius - Border radius override
 * @cssprop --button-padding - Inner padding override
 * @cssprop --button-gap - Gap between icon and text override
 * @cssprop --button-font-size - Font size override
 * @cssprop --button-frost-active-bg - Background when pressed (frost variant)
 * @cssprop --button-frost-active-border-color - Border color when pressed (frost variant)
 *
 * @example
 * ```html
 * <sg-button variant="solid" color="primary">Click me</sg-button>
 * <sg-button loading color="success">Processing...</sg-button>
 * <sg-button effect="shine" color="primary">Shine</sg-button>
 * <sg-button effect="rainbow" variant="frost">Rainbow</sg-button>
 * ```
 */
export const BUTTON_TAG = 'sg-button' as const;
define<SgButtonProps>(BUTTON_TAG, {
  formAssociated: true,
  props: {
    ...commonProps,
    effect: prop.string<ButtonEffect>(),
    fullwidth: prop.bool(false),
    href: prop.string(),
    iconOnly: prop.bool(false),
    label: prop.string(),
    rel: prop.string(),
    target: prop.string<LinkTarget>(),
    type: prop.oneOf(['button', 'submit', 'reset'] as const, 'button'),
    variant: prop.oneOf(BUTTON_VARIANTS, 'solid'),
  },
  setup(props, { bind, el }) {
    // Prefer group context over own props for color/size/variant.
    const groupCtx = inject(BUTTON_GROUP_CTX);
    const effectiveColor = computed(() => groupCtx?.color.value ?? props.color.value);
    const effectiveSize = computed(() => groupCtx?.size.value ?? props.size.value);
    const effectiveVariant = computed(() => groupCtx?.variant.value ?? props.variant.value);

    const isDisabled = computed(() => !!(props.disabled.value || props.loading.value));

    // isLink and effectiveRel are computed from signals — correct even if href changes at runtime.
    const { effectiveRel, isLink } = useLinkProps(props.href, props.rel, props.target);

    // Form association: relay submit/reset clicks to the associated form.
    // The inner <button> always has type="button" so shadow DOM never drives native form actions.
    // getForm() returns null for link mode at runtime, so no form actions fire.
    const formField = defineField({
      disabled: isDisabled,
      toFormValue: () => null,
      value: computed(() => ''),
    });

    const handleClick = useFormAction(
      () => (isLink.value ? null : formField.internals.form),
      props.type,
      isDisabled,
      el,
    );

    // ARIA attributes live on the host; delegatesFocus ensures AT reads them correctly.
    bind({
      attr: {
        'aria-busy': props.loading,
        'aria-disabled': isDisabled,
        'aria-label': props.label,
        color: effectiveColor,
        effect: props.effect,
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
              :aria-busy="${props.loading}"
              @click="${handleClick}">
              <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
              <slot name="prefix"></slot>
              <span class="content" part="content"><slot></slot></span>
              <slot name="suffix"></slot>
            </a>`
          : html`<button part="button" type="button" ?disabled=${isDisabled} @click="${handleClick}">
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
    shineEffectMixin('button'),
    disabledLoadingMixin,
    componentStyles,
  ],
});
