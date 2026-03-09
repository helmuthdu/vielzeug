import { css, define, defineProps, html } from '@vielzeug/craftit';
import { colorThemeMixin } from '../../styles';
import type { ThemeColor } from '../../types';

const componentStyles = /* css */ css`
  @layer buildit.base {
    :host {
      --_color: var(--separator-color, var(--color-contrast-300));
      --_size: var(--separator-size, var(--border));
      --_spacing: var(--separator-spacing, 0);

      display: block;
    }

    .separator {
      all: unset;
      display: block;
      box-sizing: border-box;
      margin: var(--_spacing) 0;
    }

    :host([orientation='horizontal']),
    :host(:not([orientation='vertical'])) {
      width: 100%;
    }

    :host([orientation='horizontal']) .separator,
    :host(:not([orientation='vertical'])) .separator {
      border-top: var(--_size) solid var(--_color);
      width: 100%;
    }

    :host([orientation='vertical']) {
      display: inline-block;
      align-self: stretch;
    }

    :host([orientation='vertical']) .separator {
      border-left: var(--_size) solid var(--_color);
      height: 100%;
    }

    :host([color]) {
      --_color: var(--_theme-base);
    }

    /* Labelled separator */
    .separator-wrapper {
      align-items: center;
      display: flex;
      gap: var(--size-3);
    }

    .separator-wrapper .separator {
      flex: 1;
    }

    .separator-label {
      color: var(--_color);
      font-size: var(--text-xs);
      font-weight: var(--font-medium);
      white-space: nowrap;
    }
  }
`;

/** Separator component properties */
export interface SeparatorProps {
  /** Orientation of the separator */
  orientation?: 'horizontal' | 'vertical';
  /** Decorative only (default true) — set to false for semantic separators */
  decorative?: boolean;
  /** Optional label text centered on the separator */
  label?: string;
  /** Theme color tint */
  color?: ThemeColor;
}

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
 * @example
 * ```html
 * <bit-separator></bit-separator>
 * <bit-separator label="or"></bit-separator>
 * <bit-separator orientation="vertical"></bit-separator>
 * ```
 */
export const TAG = define('bit-separator', () => {
  const props = defineProps<SeparatorProps>({
    color: { default: undefined },
    decorative: { default: true, type: Boolean },
    label: { default: undefined },
    orientation: { default: 'horizontal' },
  });

  return {
    styles: [colorThemeMixin, componentStyles],
    template: html`
      ${() =>
        props.label.value
          ? html`
            <div class="separator-wrapper" part="wrapper">
              <hr
                class="separator"
                part="separator"
                :role="${() => (props.decorative.value ? 'none' : 'separator')}"
                :aria-hidden="${() => (props.decorative.value ? 'true' : null)}"
                :aria-orientation="${() => props.orientation.value}"
              />
              <span class="separator-label" part="label">${() => props.label.value}</span>
              <hr
                class="separator"
                part="separator"
                :role="${() => (props.decorative.value ? 'none' : 'separator')}"
                :aria-hidden="${() => (props.decorative.value ? 'true' : null)}"
              />
            </div>
          `
          : html`
            <hr
              class="separator"
              part="separator"
              :role="${() => (props.decorative.value ? 'none' : 'separator')}"
              :aria-hidden="${() => (props.decorative.value ? 'true' : null)}"
              :aria-orientation="${() => props.orientation.value}"
            />
          `}
    `,
  };
});

declare global {
  interface HTMLElementTagNameMap {
    'bit-separator': HTMLElement & SeparatorProps;
  }
}
