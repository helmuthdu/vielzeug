import { define, html, prop } from '@vielzeug/ore';
import { watch } from '@vielzeug/ripple';

import type { ComponentSize, ThemeColor } from '../../types';

import { announce } from '../../headless';
import { sizableBundle, themableBundle } from '../../shared';
import { colorThemeMixin, reducedMotionMixin, sizeVariantMixin } from '../../styles';
import componentStyles from './typing-indicator.css?inline';

/** Typing indicator component properties */
export type OreTypingIndicatorProps = {
  /** Theme color for the dots */
  color?: ThemeColor;
  /** Accessible label announced once via a polite live region (default: `"Typing…"`) */
  label?: string;
  /** Dot size preset */
  size?: ComponentSize;
};

/**
 * Three bouncing dots signaling that the other side of a conversation is composing a reply —
 * the moment before any content exists. For a message whose content is already streaming in,
 * use `ore-chat-message`'s `streaming` attribute (a blinking cursor) instead.
 *
 * The dots are decorative (`aria-hidden`) — `label` is the entire accessibility contract,
 * announced through the shared singleton live region (`headless/announcer.ts`) rather than a
 * static `aria-live` element in the template. A live region populated in the same paint as
 * its own insertion is unreliable across browsers/screen readers; routing through the shared
 * announcer (pre-existing region, clear-then-set) is the same pattern already used for other
 * transient status messages across this package.
 *
 * @element ore-typing-indicator
 *
 * @attr {string} label - Accessible label announced once via a polite live region (default: "Typing…")
 * @attr {string} color - Theme color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error'
 * @attr {string} size - 'sm' | 'md' | 'lg'
 *
 * @cssprop --typing-indicator-color - Dot color
 * @cssprop --typing-indicator-size - Dot diameter
 * @cssprop --typing-indicator-gap - Gap between dots
 *
 * @part dots - Dots container.
 * @part dot - Individual dot element.
 * @example
 * ```html
 * <ore-typing-indicator></ore-typing-indicator>
 * <ore-typing-indicator label="Assistant is typing…" color="primary"></ore-typing-indicator>
 * ```
 */
export const TYPING_INDICATOR_TAG = 'ore-typing-indicator' as const;
define<OreTypingIndicatorProps>(TYPING_INDICATOR_TAG, {
  props: {
    ...themableBundle,
    ...sizableBundle,
    label: prop.string('Typing…'),
  },
  setup(props) {
    watch(
      () => props.label.value,
      (label) => announce(label ?? ''),
      { immediate: true },
    );

    return html`
      <span class="dots" part="dots" aria-hidden="true">
        <span class="dot" part="dot"></span>
        <span class="dot" part="dot"></span>
        <span class="dot" part="dot"></span>
      </span>
    `;
  },
  styles: [
    colorThemeMixin,
    reducedMotionMixin,
    sizeVariantMixin({
      lg: {
        gap: 'var(--typing-indicator-gap, var(--size-1-5))',
        size: 'var(--typing-indicator-size, var(--size-2-5))',
      },
      md: { gap: 'var(--typing-indicator-gap, var(--size-1))', size: 'var(--typing-indicator-size, var(--size-2))' },
      sm: {
        gap: 'var(--typing-indicator-gap, var(--size-1))',
        size: 'var(--typing-indicator-size, var(--size-1-5))',
      },
    }),
    componentStyles,
  ],
});
