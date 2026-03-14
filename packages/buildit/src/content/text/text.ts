import { css, define, defineProps, html, watch } from '@vielzeug/craftit';

const styles = /* css */ css`
  /* ========================================
     Base Styles & Defaults
     ======================================== */

  :host {
    /* Internal variables with CSS custom property fallbacks */
    --_size: var(--text-size, var(--text-base));
    --_weight: var(--text-weight, var(--font-normal));
    --_color: var(--text-color, inherit);
    --_line-height: var(--text-line-height, var(--leading-normal));
    --_letter-spacing: var(--text-letter-spacing, normal);

    display: block;
    font-size: var(--_size);
    font-weight: var(--_weight);
    color: var(--_color);
    line-height: var(--_line-height);
    letter-spacing: var(--_letter-spacing);
  }

  :host([hidden]) {
    display: none;
  }

  /* ========================================
     Unlayered display overrides
     These must live outside any @layer so they can beat the unlayered
     display: block on :host. Same cascade rule that was fixed for [lines].
     ======================================== */

  /* Multi-line truncation */
  :host([lines]) {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
    -webkit-line-clamp: var(--_lines);
  }

  /* Inline semantic tags — but not when align/truncate force block layout */
  :host(:is([as='span'], [as='label'], [as='code']):not([align]):not([truncate])) {
    display: inline;
  }

  /* ========================================
     Variant Styles
     ======================================== */

  /* Body (default) - uses base defaults */

  /* Heading */
  :host([variant='heading']) {
    --_size: var(--text-size, var(--text-2xl));
    --_weight: var(--text-weight, var(--font-semibold));
    --_color: var(--text-color, var(--text-color-heading));
    --_line-height: var(--text-line-height, var(--leading-tight));
  }

  /* Label */
  :host([variant='label']) {
    --_size: var(--text-size, var(--text-sm));
    --_weight: var(--text-weight, var(--font-medium));
    --_color: var(--text-color, var(--text-color-heading));
  }

  /* Caption */
  :host([variant='caption']) {
    --_size: var(--text-size, var(--text-sm));
    --_color: var(--text-color, var(--text-color-secondary));
  }

  /* Overline */
  :host([variant='overline']) {
    --_size: var(--text-size, var(--text-xs));
    --_weight: var(--text-weight, var(--font-semibold));
    --_line-height: var(--text-line-height, var(--leading-none));
    --_letter-spacing: var(--text-letter-spacing, 0.05em);
    text-transform: uppercase;
  }

  /* Code */
  :host([variant='code']) {
    --_size: var(--text-size, var(--text-sm));
    font-family: var(--font-mono, monospace);
  }

  /* ========================================
     Size Variants
     ======================================== */

  :host([size='xs']) {
    --_size: var(--text-xs);
  }
  :host([size='sm']) {
    --_size: var(--text-sm);
  }
  :host([size='md']) {
    --_size: var(--text-base);
  }
  :host([size='lg']) {
    --_size: var(--text-lg);
  }
  :host([size='xl']) {
    --_size: var(--text-xl);
  }
  :host([size='2xl']) {
    --_size: var(--text-2xl);
  }
  :host([size='3xl']) {
    --_size: var(--text-3xl);
  }
  :host([size='4xl']) {
    --_size: var(--text-4xl);
  }
  :host([size='5xl']) {
    --_size: var(--text-5xl);
  }
  :host([size='6xl']) {
    --_size: var(--text-6xl);
  }
  :host([size='7xl']) {
    --_size: var(--text-7xl);
  }
  :host([size='8xl']) {
    --_size: var(--text-8xl);
  }
  :host([size='9xl']) {
    --_size: var(--text-9xl);
  }

  /* ========================================
     Weight Variants
     ======================================== */

  :host([weight='normal']) {
    --_weight: var(--font-normal);
  }
  :host([weight='medium']) {
    --_weight: var(--font-medium);
  }
  :host([weight='semibold']) {
    --_weight: var(--font-semibold);
  }
  :host([weight='bold']) {
    --_weight: var(--font-bold);
  }

  /* ========================================
     Color Variants
     ======================================== */

  :host([color='primary']) {
    --_color: var(--color-primary);
  }
  :host([color='secondary']) {
    --_color: var(--color-secondary);
  }
  :host([color='info']) {
    --_color: var(--color-info);
  }
  :host([color='success']) {
    --_color: var(--color-success);
  }
  :host([color='warning']) {
    --_color: var(--color-warning);
  }
  :host([color='error']) {
    --_color: var(--color-error);
  }
  :host([color='heading']) {
    --_color: var(--text-color-heading);
  }
  :host([color='body']) {
    --_color: var(--text-color-body);
  }
  :host([color='muted']) {
    --_color: var(--text-color-secondary);
  }
  :host([color='disabled']) {
    --_color: var(--text-color-disabled);
  }
  :host([color='contrast']) {
    --_color: var(--text-color-contrast);
  }

  @layer buildit.utilities {
    /* ========================================
       Alignment
       ======================================== */

    :host([align]) {
      display: block;
    }
    :host([align='left']) {
      text-align: start;
    }
    :host([align='center']) {
      text-align: center;
    }
    :host([align='right']) {
      text-align: end;
    }
    :host([align='justify']) {
      text-align: justify;
    }

    /* ========================================
       Truncate (single-line)
       ======================================== */

    :host([truncate]) {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* ========================================
       Italic
       ======================================== */

    :host([italic]) {
      font-style: italic;
    }

    /* ========================================
       Block Display for Certain Tags
       ======================================== */

    :host([as='p']),
    :host([as='div']),
    :host(:is([as='h1'], [as='h2'], [as='h3'], [as='h4'], [as='h5'], [as='h6'])) {
      display: block;
    }

    /* Note: display: inline for span/label/code is handled outside this @layer
       (above) so it can override the unlayered :host { display: block }. */
  }
`;

/** Text component properties */
export interface TextProps {
  /** Text semantic variant */
  variant?: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code';
  /** Text size (responsive scale) */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl';
  /** Font weight */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
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
    | 'disabled'
    | 'contrast';
  /** Text alignment */
  align?: 'left' | 'center' | 'right' | 'justify';
  /** Enable single-line text truncation with ellipsis */
  truncate?: boolean;
  /** Clamp text to N lines with an ellipsis (multi-line truncation) */
  lines?: number;
  /** Italic text style */
  italic?: boolean;
  /** Semantic HTML element to render as — sets the correct ARIA role/level on the host */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'code';
}

/**
 * A typography component with semantic variants and responsive sizing.
 *
 * @element bit-text
 *
 * @attr {string} variant - Text variant: 'body' | 'heading' | 'label' | 'caption' | 'overline' | 'code'
 * @attr {string} size - Font size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | '8xl' | '9xl'
 * @attr {string} weight - Font weight: 'normal' | 'medium' | 'semibold' | 'bold'
 * @attr {string} color - Text color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' | 'heading' | 'body' | 'muted' | 'disabled' | 'contrast'
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

export const TAG = define('bit-text', ({ host }) => {
  // Only props read by JS need signals. CSS attribute selectors (variant, size,
  // color, weight, align, truncate, italic) are handled entirely by the browser
  // and do not need a MutationObserver per-prop.
  const props = defineProps<Pick<TextProps, 'as' | 'lines'>>({
    as: { default: undefined },
    lines: { default: undefined, type: Number },
  });

  // Single watcher drives both role + aria-level from `as`.
  // h1–h6 → role="heading" + aria-level; everything else → remove both.
  watch(
    props.as,
    (tag) => {
      const match = /^h([1-6])$/.exec(tag ?? '');

      if (match) {
        host.setAttribute('role', 'heading');
        host.setAttribute('aria-level', match[1]);
      } else {
        host.removeAttribute('role');
        host.removeAttribute('aria-level');
      }
    },
    { immediate: true },
  );

  // Drive --_lines on the host so the CSS line-clamp rule works.
  watch(
    props.lines,
    (n) => {
      if (n != null) host.style.setProperty('--_lines', String(n));
      else host.style.removeProperty('--_lines');
    },
    { immediate: true },
  );

  return {
    styles: [styles],
    template: html`<slot></slot>`,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-text': HTMLElement & TextProps;
  }
}
