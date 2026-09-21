import { define, html, onElement, prop, ref, useEmit, watchEffect, when } from '@vielzeug/ore';
import { signal, watch } from '@vielzeug/ripple';
import {
  createQrScanner,
  isQrScanSupported,
  type QrScanner,
  type QrScannerOptions,
  type QrScanResult,
  SigilError,
  SigilPermissionError,
  SigilUnsupportedError,
} from '@vielzeug/sigil';
import { roundableBundle } from '../../shared';
import { roundedVariantMixin } from '../../styles';
import type { ComponentSize, RoundedSize } from '../../types';
import '../../content/icon/icon';
import '../button/button';
import componentStyles from './qr-scanner.css?inline';

/** Testing hook — inject a fake `createQrScanner` without touching globals. */
export type QrScannerFactory = (options: QrScannerOptions) => QrScanner;

/** Component-level view states; sigil's transport states are mapped onto these. */
export type OreQrScannerStatus = 'idle' | 'starting' | 'scanning' | 'result' | 'unsupported' | 'denied' | 'error';

/** QR scanner component properties */
export type OreQrScannerProps = {
  /** Start/stop the camera externally; mirrors into internal intent on change */
  active?: boolean;
  /** Preferred camera: 'environment' (rear) or 'user' (front) */
  'facing-mode'?: 'environment' | 'user';
  /** Minimum ms between detection passes */
  interval?: number;
  /** Accessible label for the scanner region */
  label?: string;
  /** Stop after the first successful scan (default true) */
  once?: boolean;
  /** Border radius size */
  rounded?: RoundedSize;
  /** JS-only testing hook: custom scanner factory (defaults to `createQrScanner`) */
  scannerFactory?: QrScannerFactory;
  /** Preview size: named scale or pixel number */
  size?: ComponentSize | number;
};

/** QR scanner component events */
export type OreQrScannerEvents = {
  /** Emitted on every successful decode. detail: `{ value }` */
  scan: { value: string };
  /** Emitted on permission, support, or detection failure. detail: `{ error }` */
  error: { error: SigilError };
  /** Emitted on every view-state transition. detail: `{ status }` */
  status: { status: OreQrScannerStatus };
};

const SIZES: Record<ComponentSize, number> = { lg: 360, md: 280, sm: 200 };

const cssSize = (size: ComponentSize | number): number => (typeof size === 'number' ? size : (SIZES[size] ?? SIZES.md));

const STATUS_TEXT: Record<OreQrScannerStatus, string> = {
  denied: 'Camera access denied. Allow camera permission and retry.',
  error: 'Scanning failed.',
  idle: 'Camera is off.',
  result: 'Code scanned.',
  scanning: 'Point the camera at a QR code.',
  starting: 'Starting camera…',
  unsupported: 'QR scanning is not supported in this browser.',
};

/**
 * Camera QR scanner built on `createQrScanner` (native `BarcodeDetector`).
 * `active` starts/stops the camera externally; internal Start/Stop controls
 * drive the same intent. Unsupported browsers render the `unsupported` slot
 * so apps can substitute a paste fallback.
 *
 * @element ore-qr-scanner
 *
 * @attr {boolean} active - Start/stop the camera
 * @attr {string} facing-mode - 'environment' | 'user' (default 'environment')
 * @attr {number} interval - Ms between detection passes (default 200)
 * @attr {boolean} once - Stop after first scan (default true)
 * @attr {string} size - 'sm' | 'md' | 'lg', or a pixel value
 * @attr {string} label - Region label (default "QR code scanner")
 * @attr {string} rounded - Border radius
 *
 * @fires scan - detail: `{ value }` on each decode
 * @fires error - detail: `{ error }` on permission/support/detection failure
 * @fires status - detail: `{ status }` on view-state transitions
 *
 * @slot overlay - Content layered over the camera preview
 * @slot unsupported - Fallback UI when scanning is unsupported (e.g. paste input)
 * @slot footer - Extra content below the status row
 *
 * @cssprop --qr-scanner-size - Preview edge length in px (overrides `size`)
 * @cssprop --qr-scanner-radius - Border radius
 * @cssprop --qr-scanner-bg - Preview background while idle
 * @cssprop --qr-scanner-viewfinder-color - Viewfinder frame color
 * @cssprop --qr-scanner-status-color - Status text color
 *
 * @part wrapper - Outer container
 * @part stage - Square preview area (video + overlays)
 * @part video - The `<video>` preview element
 * @part viewfinder - Decorative scan frame over the preview
 * @part state - Idle/error/denied/unsupported/result panel
 * @part status - Live status line
 * @part controls - Button row
 *
 * @example
 * ```html
 * <ore-qr-scanner active @scan=${(e) => pair(e.detail.value)}></ore-qr-scanner>
 * ```
 */
export const QR_SCANNER_TAG = 'ore-qr-scanner' as const;

define<OreQrScannerProps>(QR_SCANNER_TAG, {
  props: {
    active: prop.bool(false),
    'facing-mode': prop.oneOf(['environment', 'user'] as const, 'environment'),
    interval: prop.number(200),
    label: prop.string('QR code scanner'),
    once: prop.bool(true),
    ...roundableBundle,
    scannerFactory: prop.data<QrScannerFactory>(),
    size: {
      default: 'md' as ComponentSize | number,
      parse: (v) => (v !== null && /^\d+$/.test(v) ? Number(v) : ((v ?? 'md') as ComponentSize)),
    },
  },

  setup(props) {
    const emit = useEmit<OreQrScannerEvents>();
    const videoRef = ref<HTMLVideoElement>();

    const status = signal<OreQrScannerStatus>('idle');
    const failure = signal('');
    const lastValue = signal('');

    // `active` is an imperative hint mirrored into internal intent; the
    // internal Start/Stop buttons drive the same signal.
    const requested = signal(false);
    watch(
      props.active,
      (active) => {
        requested.value = active === true;
      },
      { immediate: true },
    );

    const setStatus = (next: OreQrScannerStatus, message = ''): void => {
      failure.value = message;
      if (status.value === next) return;
      status.value = next;
      emit('status', { status: next });
    };

    const statusText = (): string =>
      status.value === 'result' && lastValue.value ? `Code scanned: ${lastValue.value}` : STATUS_TEXT[status.value];

    // Eager support check so VitePress/jsdom (no BarcodeDetector) land on the
    // unsupported state immediately; an injected factory skips the gate.
    if (!props.scannerFactory.value && !isQrScanSupported()) {
      setStatus('unsupported', STATUS_TEXT.unsupported);
    }

    const startScanner = async (scanner: QrScanner): Promise<void> => {
      try {
        await scanner.start();
        // Intent may have been withdrawn while getUserMedia was pending.
        if (!requested.value) scanner.stop();
      } catch (error) {
        requested.value = false;
        const sigilError =
          error instanceof SigilError ? error : new SigilError('QR scanner failed to start', { cause: error });
        if (sigilError instanceof SigilUnsupportedError) setStatus('unsupported', sigilError.message);
        else if (sigilError instanceof SigilPermissionError) setStatus('denied', sigilError.message);
        else setStatus('error', sigilError.message);
        emit('error', { error: sigilError });
      }
    };

    const wire = (scanner: QrScanner): void => {
      scanner.onResult((result: QrScanResult) => {
        lastValue.value = result.value;
        emit('scan', { value: result.value });
        if (props.once.value) setStatus('result');
      });
      scanner.tap((event) => {
        if (event.type === 'status-change') {
          if (event.status === 'starting') setStatus('starting');
          else if (event.status === 'scanning') setStatus('scanning');
          // 'stopped' after a once-result must not clobber the result view.
          else if (event.status === 'stopped' && status.value !== 'result') setStatus('idle');
          else if (event.status === 'idle') setStatus('idle');
        } else if (event.type === 'error') {
          emit('error', { error: event.error });
          if (status.value === 'scanning' || status.value === 'starting') setStatus('error', event.error.message);
        }
      });
    };

    onElement(videoRef, (video) => {
      const current = signal<QrScanner | null>(null);

      // Rebuild when scan-affecting props change; cleanup disposes the previous scanner.
      watchEffect(() => {
        const factory = props.scannerFactory.value ?? createQrScanner;
        const scanner = factory({
          constraints: { facingMode: props['facing-mode'].value ?? 'environment' },
          intervalMs: props.interval.value ?? 200,
          once: props.once.value ?? true,
          video,
        });
        current.value = scanner;
        wire(scanner);
        return () => scanner.dispose();
      });

      // Drive start/stop from intent + the current scanner instance. `watch`
      // (untracked callback) is required over `watchEffect`: `scanner.stop()`
      // synchronously re-enters the tap handler, and tracking its `status`
      // reads would retrigger this effect on every transition — an infinite loop.
      watch(
        () => [requested.value, current.value] as const,
        ([want, scanner]) => {
          if (!scanner || scanner.disposed) return;
          if (want) void startScanner(scanner);
          else scanner.stop();
        },
        { immediate: true },
      );
    });

    const resume = (): void => {
      requested.value = true;
    };
    const pause = (): void => {
      requested.value = false;
    };

    const showVideo = (): boolean => status.value === 'starting' || status.value === 'scanning';
    const showControls = (): boolean => status.value !== 'unsupported';

    return html`
      <div
        class="wrapper"
        part="wrapper"
        role="region"
        aria-label=${() => props.label.value}
        style=${() => `--_size-px: ${cssSize(props.size.value ?? 'md')}px`}>
        <div class="stage" part="stage">
          <video
            ref=${videoRef}
            part="video"
            autoplay
            playsinline
            muted
            aria-hidden="true"
            ?hidden=${() => !showVideo()}></video>
          <div class="viewfinder" part="viewfinder" aria-hidden="true" ?hidden=${() => status.value !== 'scanning'}></div>
          <div class="overlay"><slot name="overlay"></slot></div>
          ${when(
            () => !showVideo(),
            () => html`
              <div class="state" part="state" data-state=${() => status.value}>
                ${when(
                  () => status.value === 'unsupported',
                  () => html`<slot name="unsupported"></slot>`,
                  () => html`
                    ${when(
                      () => status.value === 'result',
                      () => html`<ore-icon name="check" size="24" aria-hidden="true"></ore-icon>`,
                      () => html`<ore-icon name="camera" size="24" aria-hidden="true"></ore-icon>`,
                    )}
                    <span class="state-text">${() => failure.value || STATUS_TEXT[status.value]}</span>
                  `,
                )}
              </div>
            `,
          )}
        </div>
        <div class="status" part="status" role="status">${statusText}</div>
        ${when(
          showControls,
          () => html`
            <div class="controls" part="controls">
              ${when(
                () => status.value === 'starting' || status.value === 'scanning',
                () => html`
                  <ore-button variant="ghost" size="sm" @click=${pause}>Stop</ore-button>
                `,
                () => html`
                  <ore-button
                    variant="ghost"
                    size="sm"
                    @click=${resume}>
                    ${() =>
                      status.value === 'result'
                        ? 'Scan again'
                        : status.value === 'denied' || status.value === 'error'
                          ? 'Retry'
                          : 'Start camera'}
                  </ore-button>
                `,
              )}
            </div>
          `,
        )}
        <slot name="footer"></slot>
      </div>
    `;
  },
  styles: [roundedVariantMixin, componentStyles],
});
