import { define, html, prop, unsafeHtml, useEmit, useSlots, when } from '@vielzeug/ore';
import { computed, watch } from '@vielzeug/ripple';
import { encodeQr, type QrErrorCorrection, SigilError, toSvg } from '@vielzeug/sigil';
import { roundableBundle } from '../../shared';
import { roundedVariantMixin } from '../../styles';
import type { ComponentSize, RoundedSize } from '../../types';
import componentStyles from './qr-code.css?inline';

/** QR code component properties */
export type OreQrCodeProps = {
  /** Error-correction level */
  'error-correction'?: QrErrorCorrection;
  /** Accessible label for the rendered code */
  label?: string;
  /** Quiet-zone width in modules */
  margin?: number;
  /** Border radius size */
  rounded?: RoundedSize;
  /** Rendered size: named scale or pixel number */
  size?: ComponentSize | number;
  /** The payload to encode */
  value?: string;
  /** Surface variant: 'flat' (transparent) or 'card' (themed background) */
  variant?: 'flat' | 'card';
};

/** QR code component events */
export type OreQrCodeEvents = {
  /** Emitted whenever the code is (re)rendered. detail: `{ version, size }` */
  render: { version: number; size: number };
  /** Emitted when encoding fails (e.g. payload exceeds capacity). detail: `{ error }` */
  error: { error: SigilError };
};

const SIZES: Record<ComponentSize, number> = { lg: 256, md: 192, sm: 128 };

const cssSize = (size: ComponentSize | number): number => (typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md));

/**
 * Renders a QR code for `value` as inline SVG — themeable via `currentColor`,
 * crisp at any scale, no canvas. On capacity errors the component shows an
 * error state and emits `error` rather than throwing.
 *
 * @element ore-qr-code
 *
 * @attr {string} value - The payload to encode
 * @attr {string} error-correction - 'L' | 'M' | 'Q' | 'H' (default 'M')
 * @attr {number} margin - Quiet-zone modules (default 4)
 * @attr {string} size - 'sm' | 'md' | 'lg', or a pixel value
 * @attr {string} label - Accessible label (default "QR code")
 * @attr {string} rounded - Border radius for the card variant
 *
 * @fires render - detail: `{ version, size }` after each successful render
 * @fires error - detail: `{ error }` when encoding fails
 *
 * @slot caption - Optional caption rendered below the code
 *
 * @cssprop --qr-code-dark - Module color (default `currentColor`)
 * @cssprop --qr-code-light - Background color (default `transparent`)
 * @cssprop --qr-code-size - Rendered size in px (overrides `size`)
 * @cssprop --qr-code-radius - Border radius
 * @cssprop --qr-code-padding - Inner padding
 * @cssprop --qr-code-bg - Card background (variant="card")
 * @cssprop --qr-code-border - Card border width (variant="card")
 * @cssprop --qr-code-border-color - Card border color (variant="card")
 * @cssprop --qr-code-shadow - Card box shadow (variant="card")
 * @cssprop --qr-code-error-color - Error-state text color
 *
 * @part wrapper - Outer container
 * @part svg - The rendered `<svg>` element
 * @part caption - Caption slot container
 * @part error - Error-state container
 *
 * @example
 * ```html
 * <ore-qr-code value="https://example.com"></ore-qr-code>
 * <ore-qr-code value="otpauth://…" error-correction="H" size="256"></ore-qr-code>
 * ```
 */
export const QR_CODE_TAG = 'ore-qr-code' as const;

define<OreQrCodeProps>(QR_CODE_TAG, {
  props: {
    'error-correction': prop.string<QrErrorCorrection>('M'),
    label: prop.string('QR code'),
    margin: prop.number(4),
    ...roundableBundle,
    size: {
      default: 'md' as ComponentSize | number,
      parse: (v) => (v !== null && /^\d+$/.test(v) ? Number(v) : ((v ?? 'md') as ComponentSize)),
    },
    value: prop.string(''),
    variant: prop.string<'flat' | 'card'>('flat'),
  },

  setup(props) {
    const emit = useEmit<OreQrCodeEvents>();
    const slots = useSlots();

    // Encode → SVG string in one computed; SigilError flips the error state.
    const encoded = computed<{ svg: string; version: number } | { error: SigilError }>(() => {
      const value = props.value.value ?? '';
      if (!value) return { error: new SigilError('No value to encode') };
      try {
        const matrix = encodeQr(value, { errorCorrection: props['error-correction'].value ?? 'M' });
        const svg = toSvg(matrix, {
          dark: 'var(--_dark)',
          label: props.label.value ?? 'QR code',
          light: 'var(--_light)',
          margin: props.margin.value ?? 4,
        });
        return { svg, version: matrix.version };
      } catch (error) {
        return { error: error instanceof SigilError ? error : new SigilError('QR encoding failed', { cause: error }) };
      }
    });

    const failed = computed(() => 'error' in encoded.value);
    const hasCaption = computed(() => slots.has('caption').value);

    // Emit once per encode outcome, not per reactive read.
    watch(encoded, (result) => {
      if ('error' in result) emit('error', { error: result.error });
      else emit('render', { size: cssSize(props.size.value ?? 'md'), version: result.version });
    });

    return html`
      <div class="wrapper" part="wrapper" style=${() => `--_size-px: ${cssSize(props.size.value ?? 'md')}px`}>
        ${when(
          () => failed.value,
          () => html`
            <div class="error" part="error" role="alert">
              <span class="error-text">${() => ('error' in encoded.value ? encoded.value.error.message : '')}</span>
            </div>
          `,
          () => html`
            <span class="svg" part="svg">${unsafeHtml(() => ('error' in encoded.value ? '' : encoded.value.svg))}</span>
          `,
        )}
        <span class="caption" part="caption" ?hidden=${() => !hasCaption.value}>
          <slot name="caption"></slot>
        </span>
      </div>
    `;
  },
  styles: [roundedVariantMixin, componentStyles],
});
