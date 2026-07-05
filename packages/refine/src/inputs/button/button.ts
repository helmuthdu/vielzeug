import { define, useField, html, inject, prop } from '@vielzeug/ore';
import { computed } from '@vielzeug/ripple';

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

/** Visual variant for ore-button — derived from BUTTON_VARIANTS for a single source of truth. */
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/** Animated border effect for ore-button. */
export type ButtonEffect = 'shine' | 'rainbow';

/** Button component properties */
export type OreButtonProps = {
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
 * @element ore-button
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
 * <ore-button variant="solid" color="primary">Click me</ore-button>
 * <ore-button loading color="success">Processing...</ore-button>
 * <ore-button effect="shine" color="primary">Shine</ore-button>
 * <ore-button effect="rainbow" variant="frost">Rainbow</ore-button>
 * ```
 */
export const BUTTON_TAG = 'ore-button' as const;
define<OreButtonProps>(BUTTON_TAG, {
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
    const formField = useField({
      disabled: isDisabled,
      toFormValue: () => null,
      value: computed(() => ''),
    });

    const handleClick = (e: MouseEvent) => {
      if (isDisabled.value) {
        e.preventDefault();

        return;
      }

      // Link mode renders a real <a href> below — the browser handles left/middle/ctrl-click
      // navigation, target, and rel natively. No manual window.open/location.href needed.
      useFormAction(() => (isLink.value ? null : formField.internals.form), props.type, isDisabled, el)(e);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        (el.shadowRoot?.querySelector('[part="button"]') as HTMLElement)?.click();
      }
    };

    // ARIA attributes live on the host.
    bind({
      attr: {
        'aria-busy': props.loading,
        'aria-disabled': isDisabled,
        'aria-label': props.label,
        color: effectiveColor,
        effect: props.effect,
        role: computed(() => el.getAttribute('role') ?? (isLink.value ? 'link' : 'button')),
        size: effectiveSize,
        tabindex: computed(() => (isDisabled.value ? '-1' : '0')),
        variant: effectiveVariant,
      },
      on: {
        keydown: handleKeydown,
      },
    });

    const buttonContent = html`
      <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
      <slot name="prefix"></slot>
      <span class="content" part="content"><slot></slot></span>
      <slot name="suffix"></slot>
    `;

    // The inner element (<a> or <span>) is deliberately non-focusable/decorative — this
    // component's real interactive semantics (role, tabindex, aria-label) live on the
    // custom-element host itself (see the `bind()` block above), since ore-button is
    // formAssociated and needs the host, not an inner element, to carry ElementInternals.
    // This differs from ore-navbar-item / ore-sidebar-item, which aren't form-associated
    // and so render their <a> as the one real focusable/semantic element.
    return html`
      ${() =>
        isLink.value
          ? html`<a
              part="button"
              role="presentation"
              tabindex="-1"
              href="${props.href}"
              :rel="${effectiveRel}"
              :target="${props.target}"
              @click="${handleClick}">
              ${buttonContent}
            </a>`
          : html`<span part="button" role="presentation" @click="${handleClick}">${buttonContent}</span>`}
    `;
  },
  shadow: { delegatesFocus: false },
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
