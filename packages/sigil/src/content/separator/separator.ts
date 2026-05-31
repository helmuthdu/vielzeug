import { define, html, prop } from '@vielzeug/craft';

import type { ThemeColor } from '../../types';

import { colorThemeMixin } from '../../styles';
import componentStyles from './separator.css?inline';

/** Separator component properties */
export type BitSeparatorProps = {
  /** Theme color tint */
  color?: ThemeColor;
  /** Decorative only (default true) — set to false for semantic separators */
  decorative?: boolean;
  /** Optional label text centered on the separator */
  label?: string;
  /** Orientation of the separator */
  orientation?: 'horizontal' | 'vertical';
};

/**
 * A simple visual divider between sections of content.
 *
 * @element bit-separator
 *
 * @attr {string} orientation - 'horizontal' (default) | 'vertical'
 * @attr {boolean} decorative - When true (default), aria-hidden is applied
 * @attr {string} label - Optional centered label text
 * @attr {string} color - Theme color
 *
 * @cssprop --separator-color - Line color
 * @cssprop --separator-size - Line thickness
 * @cssprop --separator-spacing - Vertical margin
 *
 * @part wrapper - Root wrapper container.
 * @part separator - Separator element.
 * @part label - Label element.
 * @example
 * ```html
 * <bit-separator></bit-separator>
 * <bit-separator label="or"></bit-separator>
 * <bit-separator orientation="vertical"></bit-separator>
 * ```
 */
export const SEPARATOR_TAG = 'bit-separator' as const;
define<BitSeparatorProps>(SEPARATOR_TAG, {
  props: {
    color: prop.string<ThemeColor>(),
    decorative: prop.bool(true),
    label: prop.string(),
    orientation: prop.oneOf(['horizontal', 'vertical'] as const, 'horizontal'),
  },
  setup(props) {
    const roleAttr = () => (props.decorative.value ? 'none' : 'separator');
    const ariaHidden = () => (props.decorative.value ? 'true' : null);

    return html`
      ${() =>
        props.label.value
          ? html`
              <div class="separator-wrapper" part="wrapper">
                <hr
                  class="separator"
                  part="separator"
                  :role="${roleAttr}"
                  :aria-hidden="${ariaHidden}"
                  :aria-orientation="${() => props.orientation.value}" />
                <span class="separator-label" part="label">${() => props.label.value}</span>
                <hr class="separator" part="separator" :role="${roleAttr}" :aria-hidden="${ariaHidden}" />
              </div>
            `
          : html`
              <hr
                class="separator"
                part="separator"
                :role="${roleAttr}"
                :aria-hidden="${ariaHidden}"
                :aria-orientation="${() => props.orientation.value}" />
            `}
    `;
  },
  styles: [colorThemeMixin, componentStyles],
});
