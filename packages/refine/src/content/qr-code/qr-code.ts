import { define, getHost, html, prop, unsafeHtml, useEmit, useSlots, when } from '@vielzeug/ore';
import { computed, watch } from '@vielzeug/ripple';
import { encodeQr, type QrDotStyle, type QrErrorCorrection, SigilError, toSvg } from '@vielzeug/sigil';
import { roundableBundle } from '../../shared';
import { roundedVariantMixin } from '../../styles';
import type { ComponentSize, RoundedSize } from '../../types';
import componentStyles from './qr-code.css?inline';

/** QR code component properties */
export type OreQrCodeProps = {
  /** Data-module shape; finder patterns always stay square */
  'dot-style'?: QrDotStyle;
  /** Error-correction level */
  'error-correction'?: QrErrorCorrection;
  /** Gradient module paint start color (needs `gradient-to`) */
  'gradient-from'?: string;
  /** Gradient module paint end color (needs `gradient-from`) */
  'gradient-to'?: string;
  /** Logo overlay URL; modules under it are skipped */
  image?: string;
  /** Logo size as a fraction of the code side (default 0.22) */
  'image-size'?: number;
  /** Accessible label for the rendered code */
  label?: string;
  /** Show a shimmer placeholder instead of the code */
  loading?: boolean;
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

/** Imperative export surface, installed on the host by `define`. */
export interface OreQrCodeElement extends HTMLElement {
  /** Rasterize the current code to a PNG blob. `scale` is device px per module. */
  toPng(scale?: number): Promise<Blob>;
  /** The rendered SVG string (empty while loading or in an error state). */
  toSvg(): string;
}

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
 * Renders a QR code for `value` as inline SVG: themeable via `currentColor`,
 * crisp at any scale, no canvas. On capacity errors the component shows an
 * error state and emits `error` rather than throwing.
 *
 * @element ore-qr-code
 *
 * @attr {string} value - The payload to encode
 * @attr {('dots'|'rounded'|'square')} [dot-style=square] - Data-module shape (finders stay square)
 * @attr {string} error-correction - 'L' | 'M' | 'Q' | 'H' (default 'M')
 * @attr {string} gradient-from - Gradient module paint start color (needs `gradient-to`)
 * @attr {string} gradient-to - Gradient module paint end color (needs `gradient-from`)
 * @attr {string} image - Logo overlay URL; modules under it are skipped
 * @attr {number} image-size - Logo size as a fraction of the code side (default 0.22)
 * @attr {number} margin - Quiet-zone modules (default 4)
 * @attr {string} size - 'sm' | 'md' | 'lg', or a pixel value
 * @attr {string} label - Accessible label (default "QR code")
 * @attr {boolean} [loading] - Show a shimmer placeholder instead of the code
 * @attr {string} rounded - Border radius for the card variant
 *
 * @method toPng - Export the code as a PNG blob: `toPng(scale = 8)`, scale is device px per module; page theme colors resolve
 * @method toSvg - Get the rendered SVG string (empty while loading or on error)
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
 * @cssprop --qr-code-skeleton-bg - Loading placeholder base color
 * @cssprop --qr-code-skeleton-highlight - Loading placeholder shimmer color
 * @cssprop --qr-code-skeleton-radius - Loading placeholder corner radius
 *
 * @part wrapper - Outer container
 * @part svg - The rendered `<svg>` element
 * @part skeleton - Loading placeholder
 * @part caption - Caption slot container
 * @part error - Error-state container
 *
 * @example
 * ```html
 * <ore-qr-code value="https://example.com"></ore-qr-code>
 * <ore-qr-code value="otpauth://…" error-correction="H" size="256"></ore-qr-code>
 * ```
 */
const QR_ERROR_CORRECTIONS = ['L', 'M', 'Q', 'H'] as const satisfies readonly QrErrorCorrection[];

export const QR_CODE_TAG = 'ore-qr-code' as const;

define<OreQrCodeProps>(QR_CODE_TAG, {
  props: {
    'dot-style': prop.oneOf(['dots', 'rounded', 'square'] as const, 'square'),
    'error-correction': prop.oneOf(QR_ERROR_CORRECTIONS, 'M'),
    'gradient-from': prop.string(''),
    'gradient-to': prop.string(''),
    image: prop.string(''),
    'image-size': prop.number(0.22),
    label: prop.string('QR code'),
    loading: prop.bool(false),
    margin: prop.number(4),
    ...roundableBundle,
    size: {
      default: 'md' as ComponentSize | number,
      parse: (v) => (v !== null && /^\d+$/.test(v) ? Number(v) : ((v ?? 'md') as ComponentSize)),
    },
    value: prop.string(''),
    variant: prop.oneOf(['flat', 'card'] as const, 'flat'),
  },

  setup(props) {
    const emit = useEmit<OreQrCodeEvents>();
    const slots = useSlots();

    // Styling props translated to Sigil options (shared by render and PNG export).
    function svgOptions(scale: number, colors?: { dark: string; light: string }) {
      const from = props['gradient-from'].value;
      const to = props['gradient-to'].value;
      const href = props.image.value;
      return {
        dark: colors?.dark ?? 'var(--_dark)',
        dotStyle: props['dot-style'].value ?? 'square',
        gradient: from && to ? { from, to } : undefined,
        image: href ? { href, size: props['image-size'].value ?? 0.22 } : undefined,
        label: props.label.value ?? 'QR code',
        light: colors?.light ?? 'var(--_light)',
        margin: props.margin.value ?? 4,
        scale,
      };
    }

    // Encode → SVG string in one computed; SigilError flips the error state.
    const encoded = computed<{ svg: string; version: number } | { error: SigilError } | 'loading'>(() => {
      if (props.loading.value) return 'loading';
      const value = props.value.value ?? '';
      if (!value) return { error: new SigilError('No value to encode') };
      try {
        const matrix = encodeQr(value, { errorCorrection: props['error-correction'].value ?? 'M' });
        return { svg: toSvg(matrix, svgOptions(1)), version: matrix.version };
      } catch (error) {
        return { error: error instanceof SigilError ? error : new SigilError('QR encoding failed', { cause: error }) };
      }
    });

    const loading = computed(() => encoded.value === 'loading');
    const failed = computed(() => typeof encoded.value !== 'string' && 'error' in encoded.value);
    const hasCaption = computed(() => slots.has('caption').value);

    // Emit once per encode outcome; flipping `loading` off re-emits the settled state.
    watch(encoded, (result) => {
      if (result === 'loading') return;
      if ('error' in result) emit('error', { error: result.error });
      else emit('render', { size: cssSize(props.size.value ?? 'md'), version: result.version });
    });

    const el = getHost();

    function toSvgString(): string {
      const result = encoded.value;
      return typeof result === 'string' || 'error' in result ? '' : result.svg;
    }

    // A standalone SVG string has no page context: resolve CSS custom properties
    // (and currentColor / relative logo URLs) against the live host first.
    function exportSvg(scale: number): { size: number; svg: string } {
      const value = props.value.value ?? '';
      if (!value) throw new SigilError('No value to encode');
      const cs = getComputedStyle(el);
      const resolve = (raw: string): string => {
        const token = raw.trim();
        return token === 'currentColor' ? cs.color : token || 'transparent';
      };
      const matrix = encodeQr(value, { errorCorrection: props['error-correction'].value ?? 'M' });
      const options = svgOptions(scale, {
        dark: resolve(cs.getPropertyValue('--_dark')),
        light: resolve(cs.getPropertyValue('--_light')),
      });
      if (options.image) options.image.href = new URL(options.image.href, document.baseURI).href;
      return { size: matrix.size, svg: toSvg(matrix, options) };
    }

    async function toPng(scale = 8): Promise<Blob> {
      const pixels = Math.max(1, Math.round(scale));
      const { size, svg } = exportSvg(pixels);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
      try {
        const image = new Image();
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new SigilError('QR PNG rasterization failed'));
          image.src = url;
        });
        const side = (size + 2 * (props.margin.value ?? 4)) * pixels;
        const canvas = document.createElement('canvas');
        canvas.width = side;
        canvas.height = side;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new SigilError('Canvas 2D context unavailable');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, side, side);
        let blob: Blob | null;
        try {
          blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        } catch (cause) {
          // A cross-origin <image> inside the SVG taints the canvas → SecurityError.
          throw new SigilError('QR PNG export blocked: the logo must be same-origin, CORS-enabled, or a data: URI', {
            cause: cause instanceof Error ? cause : undefined,
          });
        }
        if (!blob) throw new SigilError('QR PNG encoding failed');
        return blob;
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    Object.defineProperty(el, 'toSvg', { configurable: true, enumerable: false, value: toSvgString, writable: false });
    Object.defineProperty(el, 'toPng', { configurable: true, enumerable: false, value: toPng, writable: false });

    return html`
      <div class="wrapper" part="wrapper" style=${() => `--_size-px: ${cssSize(props.size.value ?? 'md')}px`}>
        ${when(
          () => loading.value,
          () => html` <span class="skeleton" part="skeleton" role="status" aria-label="Generating QR code"></span> `,
        )}
        ${when(
          () => !loading.value && failed.value,
          () => html`
            <div class="error" part="error" role="alert">
              <span class="error-text">${() => (typeof encoded.value !== 'string' && 'error' in encoded.value ? encoded.value.error.message : '')}</span>
            </div>
          `,
        )}
        ${when(
          () => !loading.value && !failed.value,
          () => html` <span class="svg" part="svg">${unsafeHtml(() => toSvgString())}</span> `,
        )}
        <span class="caption" part="caption" ?hidden=${() => !hasCaption.value}>
          <slot name="caption"></slot>
        </span>
      </div>
    `;
  },
  styles: [roundedVariantMixin, componentStyles],
});
