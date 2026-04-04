import { define, computed, defineField, fire, html, inject, syncContextProps } from '@vielzeug/craftit';
import { when } from '@vielzeug/craftit/directives';

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
import {
  disablableBundle,
  loadableBundle,
  type PropBundle,
  roundableBundle,
  sizableBundle,
  themableBundle,
} from '../shared/bundles';
import componentStyles from './button.css?inline';

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
export const BUTTON_TAG = define<BitButtonProps>('bit-button', {
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
    type: 'button',
    variant: 'solid',
  } satisfies PropBundle<BitButtonProps>,
  setup({ host, props }) {
    // Reactively inherit size/variant/color from a parent bit-button-group when present.
    syncContextProps(inject(BUTTON_GROUP_CTX, undefined), props, ['color', 'size', 'variant']);

    const isLink = computed(() => !!props.href.value);
    const isDisabled = (): boolean => !!(props.disabled.value || props.loading.value);

    // Form association: relay submit/reset clicks to the associated form.
    // The inner <button> always has type="button" so shadow DOM never drives native form actions.
    const formField = defineField({
      disabled: computed(isDisabled),
      toFormValue: () => null,
      value: computed(() => ''),
    });

    // Unified click handler for both links and buttons.
    // Forward only when native click didn't traverse to host (jsdom/shadow interop).
    const handleClick = (e: MouseEvent) => {
      if (isDisabled()) {
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
        fire.mouse(host.el, e.type, e);
      }
    };

    return html`
      ${when({
        condition: isLink,
        else: () =>
          html`<button
            part="button"
            type="button"
            ?disabled=${() => isDisabled()}
            :aria-label="${() => props.label.value ?? null}"
            :aria-disabled="${() => (isDisabled() ? 'true' : null)}"
            :aria-busy="${() => (props.loading.value ? 'true' : null)}"
            @click="${handleClick}">
            <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
            <slot name="prefix"></slot>
            <span class="content" part="content"><slot></slot></span>
            <slot name="suffix"></slot>
          </button>`,
        then: () =>
          html`<a
            part="button"
            :href="${() => props.href.value ?? null}"
            :target="${() => props.target.value ?? null}"
            :rel="${() => props.rel.value ?? null}"
            :aria-label="${() => props.label.value ?? null}"
            :aria-disabled="${() => (isDisabled() ? 'true' : null)}"
            :aria-busy="${() => (props.loading.value ? 'true' : null)}"
            role="button"
            @click="${handleClick}">
            <span class="loader" part="loader" aria-label="Loading" ?hidden=${() => !props.loading.value}></span>
            <slot name="prefix"></slot>
            <span class="content" part="content"><slot></slot></span>
            <slot name="suffix"></slot>
          </a>`,
      })}
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
