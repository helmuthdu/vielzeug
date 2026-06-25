import { warn } from './_warn.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Unified options for createSandbox, buildCsp, and buildDocument.
 *
 * All `allowed*Origins` fields whitelist CDN/external origins for their respective
 * CSP directives. Origins from `scripts` URLs are extracted automatically and merged
 * with `allowedScriptOrigins` — there is no need to list them twice.
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
  /** CSS injected as a <style> block in the sandbox document <head>. */
  styles?: string;
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
  /**
   * Emit a custom event to the host.
   * Received via sandbox.onMessage() as { type: 'custom', event, detail }.
   */
  emit(event: string, detail?: unknown): void;
}

/**
 * Application-level messages the sandbox sends to the host via onMessage().
 *
 * The 'ready' lifecycle signal is intentionally excluded — it resolves sandbox.ready
 * and sandbox.nextReady() internally and is not forwarded to onMessage() subscribers.
 *
 * @security All SandboxMessage data is untrusted — sandboxed code controls the payload.
 * Never evaluate or execute message content on the host.
 */
export type SandboxMessage =
  // eslint-disable-next-line perfectionist/sort-object-types
  | { type: 'error'; message: string; stack?: string }
  // eslint-disable-next-line perfectionist/sort-object-types
  | { type: 'custom'; event: string; detail: unknown };

/** Handle for a running sandbox instance returned by createSandbox(). */
export interface SandboxHandle {
  /** True once dispose() has been called. */
  readonly disposed: boolean;
  /**
   * True once the current sandbox document has signalled it is ready.
   * Resets to `false` on each new render() call and returns to `true` after the
   * next ready message. Use this to drive loading spinners or disable setState().
   */
  readonly loaded: boolean;
  /**
   * Resolves when the first sandbox document signals it has loaded.
   * Also resolves if the sandbox is disposed before the first render — unblocking
   * any waiters without leaving dangling Promise chains.
   * Does NOT reset on subsequent render() calls — use nextReady() for that.
   */
  readonly ready: Promise<void>;
  /** Tear down the sandbox — removes the iframe from the DOM and clears all listeners. */
  dispose(): void;
  /**
   * Returns a Promise that resolves after the next render() completes (next ready message).
   * Supports multiple simultaneous callers — each receives its own Promise.
   * Resolves immediately if the sandbox is already disposed.
   *
   * **Ordering:** call nextReady() BEFORE render() to ensure the resolver is registered
   * before the document begins loading. Calling after render() introduces a race.
   *
   * **Liveness:** if the rendered document does not include the bridge script, this
   * Promise will not resolve until dispose() is called.
   */
  nextReady(): Promise<void>;
  /**
   * Subscribe to application-level messages from the sandboxed document.
   * Receives 'error' and 'custom' messages only. The 'ready' lifecycle signal is not
   * forwarded — use sandbox.ready or nextReady() for load synchronisation.
   * Returns an unsubscribe function. Returns a no-op if the sandbox is already disposed.
   */
  onMessage(handler: (msg: SandboxMessage) => void): () => void;
  /**
   * Replace the entire sandbox document (full page reset). Creates the iframe lazily
   * on the first call — no DOM is created until render() is invoked.
   * Warns in dev if html is empty. Pass a signal to skip the render if already aborted.
   *
   * **Ordering with nextReady():** call nextReady() before this method so the resolver
   * is registered before the document begins loading.
   */
  render(html: string, options?: { signal?: AbortSignal }): void;
  /**
   * Push a state value into the sandbox.
   * Dispatches a `sandbox:state-update` CustomEvent on `document` inside the sandbox:
   * `document.addEventListener('sandbox:state-update', e => { e.detail.key; e.detail.value; })`
   * Warns in dev if called before the first render() or before ready fires.
   */
  setState(key: string, value: unknown): void;
  [Symbol.dispose](): void;
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

// Validates that event.data is a typed object before dispatching to subscribers.
// Prevents malformed sandbox output (null, primitives, objects without `type`) from
// propagating as SandboxMessage and crashing subscriber code.
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
// Design notes:
// - ES6+ syntax is safe: 'unsafe-inline' + allow-scripts enables the full JS engine.
// - window.__sandbox__.emit() lets sandboxed code fire typed custom events to the host.
// - 'ready' is fired LAST so it arrives after all preceding parser-blocking scripts.
// - 'ready' is handled internally by the host and NOT forwarded to onMessage() subscribers.
const BRIDGE_SCRIPT = `
if ('ontouchstart' in window) document.addEventListener('touchstart', function() {}, { passive: true });
window.addEventListener('message', (e) => {
  const msg = e.data;
  if (msg && msg.type === 'state-update') {
    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: msg.key, value: msg.value } }));
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
 * Includes the CSP meta tag, injected scripts/styles, user content, and the bridge
 * script. Suitable as an iframe srcdoc value or for server-side sandbox document
 * generation (e.g., via @vielzeug/codex).
 *
 * External scripts carry `crossorigin="anonymous"` so the bridge's error handler
 * receives full error details for cross-origin scripts. Without it, CORS masks
 * errors as "Script error." even on CORS-enabled CDNs.
 */
export function buildDocument(html: string, options: SandboxOptions = {}): string {
  const csp = buildCsp(options);
  const styleTag = options.styles ? `<style>${options.styles}</style>` : '';

  // crossorigin="anonymous" enables full error details for cross-origin script errors.
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
${styleTag}
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
  // The iframe is created lazily on the first render() call. This makes createSandbox()
  // a cheap synchronous factory — no DOM work is performed until there is content to show.
  let iframe: HTMLIFrameElement | null = null;
  const listeners = new Set<(msg: SandboxMessage) => void>();
  let disposed = false;
  // loaded: true once the bridge posts 'ready' for the current document; false until then.
  // Reset to false on each render() call. Used both as the public loaded property and as
  // the guard in setState() to warn when called before the bridge is initialized.
  let loaded = false;

  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  // Set of resolvers from concurrent nextReady() callers — all resolved together on the
  // next 'ready' message. A Set (vs single slot) supports multiple simultaneous callers.
  const pendingReadyResolvers = new Set<() => void>();

  function handleMessage(event: MessageEvent): void {
    if (!iframe || event.source !== iframe.contentWindow) return;

    if (!isMsgObject(event.data)) return;

    const msg = event.data;

    if (msg.type === 'ready') {
      // Resolve the first-load gate and all pending nextReady() callers.
      // 'ready' is an internal lifecycle signal — not forwarded to onMessage() subscribers.
      resolveReady();
      loaded = true;

      for (const resolve of pendingReadyResolvers) resolve();

      pendingReadyResolvers.clear();

      return;
    }

    // Allow-list: only forward known application message types to subscribers.
    // Any other type (e.g. malformed sandbox output) is silently dropped to preserve
    // the SandboxMessage type contract and prevent type-unsafe values reaching handlers.
    if (msg.type !== 'error' && msg.type !== 'custom') return;

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

    // Resolve ready and all pending nextReady() callers to unblock any awaiting code.
    // render() guards against post-dispose calls so callers won't accidentally re-render.
    resolveReady();

    for (const resolve of pendingReadyResolvers) resolve();

    pendingReadyResolvers.clear();

    if (iframe) {
      window.removeEventListener('message', handleMessage);
      iframe.remove();
      iframe = null;
    }

    listeners.clear();
  }

  function nextReady(): Promise<void> {
    if (disposed) return Promise.resolve();

    return new Promise<void>((resolve) => {
      pendingReadyResolvers.add(resolve);
    });
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

  function render(html: string, renderOptions?: { signal?: AbortSignal }): void {
    if (disposed) {
      warn('render() called on a disposed sandbox.');

      return;
    }

    if (renderOptions?.signal?.aborted) return;

    if (!html.trim()) {
      warn('render() called with empty HTML.');
    }

    loaded = false;
    ensureIframe().srcdoc = buildDocument(html, options);
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
        'setState() called before ready — state update may be lost if bridge is not yet initialized. Await sandbox.ready first.',
      );
    }

    // srcdoc iframes have a null origin — '*' is required; a specific origin would silently fail
    iframe.contentWindow.postMessage({ key, type: 'state-update', value }, '*');
  }

  return {
    dispose,
    get disposed() {
      return disposed;
    },
    get loaded() {
      return loaded;
    },
    nextReady,
    onMessage,
    ready,
    render,
    setState,
    [Symbol.dispose]() {
      dispose();
    },
  };
}
