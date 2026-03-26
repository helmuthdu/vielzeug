import { define, html, watch } from '@vielzeug/craftit';

import styles from './text.css?inline';

/** Text component properties */
export type BitTextProps = {
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Semantic HTML element to render as — sets the correct ARIA role/level on the host */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code';
  /** Text color (semantic + theme colors) */
  color?:
    | 'primary'
    | 'secondary'
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'heading'
    | 'body'
    | 'muted'
    | 'tertiary'
    | 'disabled'
    | 'contrast';
  /** Italic text style */
  italic?: boolean;
  /** Clamp text to N lines with an ellipsis (multi-line truncation) */
  lines?: number;
  /** Text size — maps to --text-* tokens for body variants and --heading-* tokens for the heading variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Enable single-line text truncation with ellipsis */
  truncate?: boolean;
  /** Text semantic variant */
  variant?: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code';
  /** Font weight */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
};

/**
 * A typography component with semantic variants and responsive sizing.
 *
 * @element bit-text
 *
 * @attr {string} variant - Text variant: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code'
 * @attr {string} size - Font size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'. Maps to --text-* tokens for body variants and --heading-* tokens for the heading variant.
 * @attr {string} weight - Font weight: 'normal' | 'medium' | 'semibold' | 'bold'
 * @attr {string} color - Text color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'heading' | 'body' | 'muted' | 'tertiary' | 'disabled' | 'contrast'
 * @attr {string} align - Text alignment: 'left' | 'center' | 'right' | 'justify'
 * @attr {boolean} truncate - Truncate text with ellipsis when it overflows (single-line)
 * @attr {number} lines - Clamp to N lines with ellipsis (multi-line truncation)
 * @attr {boolean} italic - Italic text style
 * @attr {string} as - Semantic HTML element: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code'
 *
 * @slot - Text content
 *
 * @cssprop --text-size - Font size
 * @cssprop --text-weight - Font weight
 * @cssprop --text-color - Text color
 * @cssprop --text-line-height - Line height
 * @cssprop --text-letter-spacing - Letter spacing
 *
 * @example
 * ```html
 * <bit-text variant="heading" size="3xl" weight="bold">Welcome</bit-text>
 * <bit-text as="h2" variant="heading" size="xl">Section title</bit-text>
 * <bit-text color="primary" weight="semibold">Important notice</bit-text>
 * <bit-text variant="code">npm install</bit-text>
 * <bit-text lines="2">Long paragraph that clamps at two lines…</bit-text>
 * ```
 */

export const TEXT_TAG = define<BitTextProps>('bit-text', {
  props: {
    align: undefined,
    as: undefined,
    color: undefined,
    italic: false,
    lines: { default: undefined as number | undefined, type: Number },
    size: undefined,
    truncate: false,
    variant: undefined,
    weight: undefined,
  },
  setup({ host, props }) {
    // Single watcher drives both role + aria-level from `as`.
    // h1–h6 → role="heading" + aria-level; everything else → remove both.
    watch(
      props.as,
      (tag) => {
        const match = /^h([1-6])$/.exec((tag as string | undefined) ?? '');

        if (match) {
          host.el.setAttribute('role', 'heading');
          host.el.setAttribute('aria-level', match[1]);
        } else {
          host.el.removeAttribute('role');
          host.el.removeAttribute('aria-level');
        }
      },
      { immediate: true },
    );
    // Drive --_lines on the host so the CSS line-clamp rule works.
    watch(
      props.lines,
      (n) => {
        if (n != null) host.el.style.setProperty('--_lines', String(n));
        else host.el.style.removeProperty('--_lines');
      },
      { immediate: true },
    );

    return html`<slot></slot>`;
  },
  styles: [styles],
});
