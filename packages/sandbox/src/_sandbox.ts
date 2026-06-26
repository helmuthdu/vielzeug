import { MSG } from './_protocol.js';
import { warn } from './_warn.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Options for createSandbox and buildDocument.
 *
 * All `allowed*Origins` fields whitelist CDN/external origins for their
 * respective CSP directives. Origins from `scripts` URLs are extracted
 * automatically and merged with `allowedScriptOrigins`.
 */
export interface SandboxOptions {
  /** Origins added to font-src. Default: 'none'. */
  allowedFontOrigins?: string[];
  /** Origins appended to img-src. data: is always included. */
  allowedImageOrigins?: string[];
  /** Origins appended to script-src alongside 'unsafe-inline'. Merged with origins from `scripts`. */
  allowedScriptOrigins?: string[];
  /** Origins appended to style-src alongside 'unsafe-inline'. */
  allowedStyleOrigins?: string[];
  /**
   * A cryptographic nonce added to the bridge <script> tag and to `script-src` in the CSP.
   * In CSP Level 3 browsers (all modern browsers), the nonce suppresses `'unsafe-inline'` —
   * only the bridge script (which carries the nonce attribute) executes. `'unsafe-inline'`
   * is retained in the CSP for CSP Level 2 fallback only.
   * @example { nonce: crypto.randomUUID() }
   */
  nonce?: string;
  /** External script URLs injected before user content. Origins are auto-added to script-src. */
  scripts?: string[];
  /** CSS injected as a single anonymous `<style>` block in the document `<head>`. Not hot-patchable. */
  styles?: string;
  /**
   * Named CSS blocks injected as `<style id="key">` elements in the document `<head>`.
   * Each entry is individually hot-patchable via `sandbox.updateStyle(id, css)` without
   * a full re-render. Keys must be valid HTML id values.
   */
  namedStyles?: Record<string, string>;
}

/**
 * The bridge API available as `window.__sandbox__` inside sandbox documents.
 *
 * @example Ambient declaration for sandbox-side TypeScript:
 * ```ts
 * declare interface Window {
 *   __sandbox__: import('@vielzeug/sandbox').SandboxBridge;
 * }
 * ```
 */
export interface SandboxBridge {
  /** Emit a custom event to the host. Received via sandbox.onMessage() as { type: 'custom', event, detail }. */
  emit(event: string, detail?: unknown): void;
}

/**
 * Application-level messages the sandbox sends to the host via onMessage().
 *
 * 'ready' is an internal lifecycle signal — it resolves render() promises and
 * is never forwarded to onMessage() subscribers.
 *
 * @security All SandboxMessage data is untrusted — sandboxed code controls the payload.
 * Never evaluate or execute message content on the host.
 */
export type SandboxMessage =
  // eslint-disable-next-line perfectionist/sort-object-types
  | { type: 'error'; message: string; stack?: string }
  // eslint-disable-next-line perfectionist/sort-object-types
  | { type: 'custom'; event: string; detail: unknown }
  | { height: number; type: 'resize' };

/** Handle for a running sandbox instance returned by createSandbox(). */
export interface SandboxHandle {
  /** `AbortSignal` aborted when `dispose()` is called. Use to tie async operations to this sandbox's lifetime. */
  readonly disposalSignal: AbortSignal;
  /** True once dispose() has been called. */
  readonly disposed: boolean;
  /**
   * Resolves when the first sandbox document signals it is ready.
   * Also resolves if the sandbox is disposed before the first render — unblocking
   * any waiters without leaving dangling Promise chains.
   */
  readonly ready: Promise<void>;
  /** Tear down the sandbox — removes the iframe from the DOM and clears all listeners. */
  dispose(): void;
  /**
   * Subscribe to application-level messages from the sandboxed document.
   * Receives 'error', 'custom', and 'resize' messages. The 'ready' lifecycle
   * signal is not forwarded — await the Promise returned by render() instead.
   * Returns an unsubscribe function. Returns a no-op if the sandbox is already disposed.
   */
  onMessage(handler: (msg: SandboxMessage) => void): () => void;
  /**
   * Replace the entire sandbox document (full page reset). Creates the iframe lazily
   * on the first call — no DOM is created until render() is invoked.
   * Returns a Promise that resolves when the new document signals it is ready.
   * If a second render() is called before the first resolves, the first Promise
   * resolves immediately (the document navigated away).
   * Warns in dev if html is empty. Pass a signal to skip the render if already aborted.
   */
  render(html: string, options?: { signal?: AbortSignal }): Promise<void>;
  /**
   * Push a state value into the sandbox.
   * Dispatches a `sandbox:state-update` CustomEvent on `document` inside the sandbox:
   * `document.addEventListener('sandbox:state-update', e => { e.detail.key; e.detail.value; })`
   * Warns in dev if called before the first render() or before ready fires.
   */
  setState(key: string, value: unknown): void;
  /**
   * Replace the CSS for a named style block without a full re-render.
   * `id` must match a key in the `namedStyles` option passed to `createSandbox`.
   * Updates both the live iframe (via postMessage) and the baseline so the next
   * render() call uses the new CSS automatically.
   * No-ops if the sandbox is disposed. Safe to call before the first render —
   * only the baseline is updated; the iframe patch is skipped until ready.
   */
  updateStyle(id: string, css: string): void;
  [Symbol.dispose](): void;
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isMsgObject(data: unknown): data is Record<string, unknown> & { type: string } {
  return typeof data === 'object' && data !== null && typeof (data as { type?: unknown }).type === 'string';
}

// ---------------------------------------------------------------------------
// CSP builder
// ---------------------------------------------------------------------------

function extractOrigin(url: string): string | null {
  try {
    const o = new URL(url).origin;

    return o !== 'null' ? o : null;
  } catch {
    return null;
  }
}

/**
 * Builds a strict Content-Security-Policy string for sandboxed iframe documents.
 *
 * Accepts SandboxOptions directly — origins from `scripts` URLs are extracted and
 * merged with `allowedScriptOrigins` automatically. Suitable for use in a
 * `<meta http-equiv="Content-Security-Policy">` tag or in server-generated documents.
 */
export function buildCsp(options: SandboxOptions = {}): string {
  const scriptOrigins = [
    "'unsafe-inline'",
    ...(options.nonce ? [`'nonce-${options.nonce}'`] : []),
    ...(options.allowedScriptOrigins ?? []),
    ...(options.scripts ?? []).map(extractOrigin).filter((o): o is string => o !== null),
  ].join(' ');

  const styleOrigins = ["'unsafe-inline'", ...(options.allowedStyleOrigins ?? [])].join(' ');
  const imgOrigins = ['data:', ...(options.allowedImageOrigins ?? [])].join(' ');
  const fontOrigins = (options.allowedFontOrigins ?? []).join(' ') || "'none'";

  return [
    "default-src 'none'",
    `script-src ${scriptOrigins}`,
    `style-src ${styleOrigins}`,
    `img-src ${imgOrigins}`,
    `font-src ${fontOrigins}`,
    "connect-src 'none'",
    "form-action 'none'",
  ].join('; ');
}

// ---------------------------------------------------------------------------
// Document builder
// ---------------------------------------------------------------------------

// Bridge script embedded in every sandbox document.
// Uses string literals matching MSG constants — the bridge runs as plain JS
// and cannot import _protocol.ts, so the values must stay in sync manually.
// If a MSG constant value changes, update the bridge string too.
const BRIDGE_SCRIPT = `
if ('ontouchstart' in window) document.addEventListener('touchstart', function() {}, { passive: true });
window.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg && msg.type === 'state-update') {
    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: msg.key, value: msg.value } }));
  }
  if (msg && msg.type === 'style-patch' && msg.id && typeof msg.css === 'string') {
    var el = document.getElementById(msg.id);
    if (el) el.textContent = msg.css;
  }
});
window.onerror = (message, _src, _line, _col, err) => {
  parent.postMessage({ type: 'error', message: String(message), stack: err?.stack }, '*');
  return true;
};
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  parent.postMessage({ type: 'error', message: String(reason), stack: reason?.stack }, '*');
});
window.__sandbox__ = {
  emit: (event, detail) => {
    parent.postMessage({ type: 'custom', event, detail }, '*');
  },
};
parent.postMessage({ type: 'ready' }, '*');
`.trim();

/**
 * Builds a complete, standalone sandbox HTML document.
 *
 * Includes the CSP meta tag, injected scripts/styles, user content, and the
 * bridge script. Suitable as an iframe srcdoc value or for server-side sandbox
 * document generation (e.g., via @vielzeug/codex).
 *
 * External scripts carry `crossorigin="anonymous"` so the bridge's error
 * handler receives full error details for cross-origin scripts.
 */
export function buildDocument(html: string, options: SandboxOptions = {}): string {
  const csp = buildCsp(options);

  const styleTags = [
    options.styles ? `<style>${options.styles}</style>` : '',
    ...(options.namedStyles
      ? Object.entries(options.namedStyles).map(([id, css]) => `<style id="${id}">${css}</style>`)
      : []),
  ]
    .filter(Boolean)
    .join('\n');

  const scriptTags = (options.scripts ?? [])
    .map((src) => `<script crossorigin="anonymous" src="${src}"></script>`)
    .join('\n');

  const nonceAttr = options.nonce ? ` nonce="${options.nonce}"` : '';

  return `<!doctype html>
<html>
<head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${styleTags}
</head>
<body>
${scriptTags}
${html}
<script${nonceAttr}>
${BRIDGE_SCRIPT}
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Sandbox factory
// ---------------------------------------------------------------------------

export function createSandbox(container: HTMLElement, options: SandboxOptions = {}): SandboxHandle {
  // Iframe is created lazily on the first render() call — no DOM work until
  // there is content to show.
  let iframe: HTMLIFrameElement | null = null;
  const listeners = new Set<(msg: SandboxMessage) => void>();
  let disposed = false;
  const ac = new AbortController();

  // Mutable copy of namedStyles — updateStyle() patches this so re-renders
  // automatically use the latest CSS without the caller re-passing it.
  const namedStyles: Record<string, string> = options.namedStyles ? { ...options.namedStyles } : {};

  // Internal only — guards setState() warning. Not part of the public API.
  let loaded = false;

  // First-render gate — resolves once (the very first ready signal).
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  // Per-render resolver — replaced on each render(), resolved on the next
  // 'ready' message or when the render is superseded/disposed.
  let resolveCurrentRender: (() => void) | null = null;

  function handleMessage(event: MessageEvent): void {
    if (!iframe || event.source !== iframe.contentWindow) return;

    if (!isMsgObject(event.data)) return;

    const msg = event.data;

    if (msg.type === MSG.READY) {
      // Resolve first-load gate and the current render's promise.
      resolveReady();
      loaded = true;
      resolveCurrentRender?.();
      resolveCurrentRender = null;

      return;
    }

    // Allow-list: only forward known application message types.
    if (msg.type !== MSG.ERROR && msg.type !== MSG.CUSTOM && msg.type !== MSG.RESIZE) return;

    // Type-narrow resize to ensure height is a number before forwarding.
    if (msg.type === MSG.RESIZE && typeof msg.height !== 'number') return;

    for (const listener of listeners) listener(msg as SandboxMessage);
  }

  function ensureIframe(): HTMLIFrameElement {
    if (iframe) return iframe;

    iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    container.appendChild(iframe);
    window.addEventListener('message', handleMessage);

    return iframe;
  }

  function dispose(): void {
    if (disposed) return;

    disposed = true;
    ac.abort();
    resolveReady();
    resolveCurrentRender?.();
    resolveCurrentRender = null;

    if (iframe) {
      window.removeEventListener('message', handleMessage);
      iframe.remove();
      iframe = null;
    }

    listeners.clear();
  }

  function onMessage(handler: (msg: SandboxMessage) => void): () => void {
    if (disposed) {
      warn('onMessage() called on a disposed sandbox — handler will never fire.');

      return () => {};
    }

    listeners.add(handler);

    return () => {
      listeners.delete(handler);
    };
  }

  function render(html: string, renderOptions?: { signal?: AbortSignal }): Promise<void> {
    if (disposed) {
      warn('render() called on a disposed sandbox.');

      return Promise.resolve();
    }

    if (renderOptions?.signal?.aborted) return Promise.resolve();

    if (!html.trim()) {
      warn('render() called with empty HTML.');
    }

    // Supersede any in-flight render — its document navigated away.
    resolveCurrentRender?.();

    loaded = false;

    const docOptions = Object.keys(namedStyles).length > 0 ? { ...options, namedStyles: { ...namedStyles } } : options;

    ensureIframe().srcdoc = buildDocument(html, docOptions);

    return new Promise<void>((resolve) => {
      resolveCurrentRender = resolve;
    });
  }

  function setState(key: string, value: unknown): void {
    if (disposed) {
      warn('setState() called on a disposed sandbox.');

      return;
    }

    if (!iframe?.contentWindow) {
      warn('setState() called before render() — sandbox has no document yet.');

      return;
    }

    if (!loaded) {
      warn(
        'setState() called before ready — state update may be lost if bridge is not yet initialized. Await the Promise returned by render() first.',
      );
    }

    // srcdoc iframes have a null origin — '*' is required.
    iframe.contentWindow.postMessage({ key, type: MSG.STATE_UPDATE, value }, '*');
  }

  function updateStyle(id: string, css: string): void {
    if (disposed) return;

    namedStyles[id] = css;

    if (loaded && iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ css, id, type: MSG.STYLE_PATCH }, '*');
    }
  }

  return {
    get disposalSignal() {
      return ac.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    onMessage,
    ready,
    render,
    setState,
    [Symbol.dispose]() {
      dispose();
    },
    updateStyle,
  };
}
