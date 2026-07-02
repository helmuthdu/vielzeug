import type { SandboxHandle, SandboxMessage, SandboxOptions, Unsubscribe } from './types.js';

import { devOnly, warn } from './_warn.js';

// Re-export types so that _sandbox.ts still exposes them via its original named exports.
// index.ts now imports types from ./types.js directly — these re-exports are kept only
// to avoid breaking any direct imports of _sandbox.js in tests.
export type { SandboxBridge, SandboxHandle, SandboxMessage, SandboxOptions, Unsubscribe } from './types.js';

// ---------------------------------------------------------------------------
// Protocol constants
//
// String values for the postMessage type field crossing the host↔sandbox
// boundary. Inlined here (not a shared module) because the bridge script is
// a plain-JS string that cannot import TypeScript modules.
// ---------------------------------------------------------------------------

const MSG_READY = 'ready';
const MSG_STATE_UPDATE = 'state-update';
const MSG_STATE_UPDATE_ALL = 'state-update-all';
const MSG_STYLE_PATCH = 'style-patch';
const MSG_HTML_PATCH = 'html-patch';
const MSG_ERROR = 'error';
const MSG_CUSTOM = 'custom';
const MSG_RESIZE = 'resize';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isMsgObject(data: unknown): data is Record<string, unknown> & { type: string } {
  return typeof data === 'object' && data !== null && typeof (data as { type?: unknown }).type === 'string';
}

function extractOrigin(url: string): string | null {
  try {
    const o = new URL(url).origin;

    return o !== 'null' ? o : null;
  } catch {
    return null;
  }
}

// Prevent CSS breakout: the HTML spec treats <style> as a raw-text element —
// it ends at the first `</style` token and the sequence cannot be escaped in
// HTML. The correct fix is to escape `<` in CSS using its CSS unicode escape
// `\3C ` (trailing space terminates the escape sequence). This produces valid
// CSS that the browser parses correctly, but breaks the HTML tokenizer's
// `</style` match. The backslash itself is safe because CSS ignores unknown
// escape sequences.
function escapeCss(css: string): string {
  return css.replace(/<\/style/gi, '\\3C /style');
}

// Escape a string for safe interpolation into an HTML double-quoted attribute
// value (e.g. lang="…", id="…", nonce="…"). Encodes the four characters that
// can break out of an attribute or inject new attributes.
function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Escape a string for safe interpolation into HTML text content (e.g. <title>).
// Encodes & and < to prevent tag/entity injection; > is included for symmetry.
function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// CSP builder
// ---------------------------------------------------------------------------

// Strip characters that are illegal inside CSP source-list tokens and would
// allow directive injection or HTML attribute breakout. Specifically:
//   ';'  — CSP directive separator (would inject a new directive)
//   '"'  — breaks out of the HTML content="..." attribute
//   '\n' / '\r' — CSP header line folding / response-splitting
// Origins must be scheme+host(+port) form; none of these chars belong there.
function sanitizeCspOrigin(origin: string): string {
  return origin.replace(/[;"'\n\r]/g, '');
}

/**
 * Builds a strict Content-Security-Policy string for sandboxed iframe documents.
 *
 * Accepts SandboxOptions directly — origins from `scripts` URLs are extracted and
 * merged with `allowedScriptOrigins` automatically.
 */
export function buildCsp(options: SandboxOptions = {}): string {
  // Sanitize the nonce: CSP nonces must be base64 characters only. Stripping
  // single-quotes prevents early token termination inside 'nonce-{value}'.
  const safeNonce = options.nonce ? options.nonce.replace(/['";\n\r]/g, '') : null;

  const scriptOrigins = [
    "'unsafe-inline'",
    ...(safeNonce ? [`'nonce-${safeNonce}'`] : []),
    ...(options.allowedScriptOrigins ?? []).map(sanitizeCspOrigin),
    ...(options.scripts ?? []).map(extractOrigin).filter((o): o is string => o !== null),
  ].join(' ');

  const styleOrigins = ["'unsafe-inline'", ...(options.allowedStyleOrigins ?? []).map(sanitizeCspOrigin)].join(' ');
  const imgOrigins = ['data:', ...(options.allowedImageOrigins ?? []).map(sanitizeCspOrigin)].join(' ');
  const fontOrigins = (options.allowedFontOrigins ?? []).map(sanitizeCspOrigin).join(' ') || "'none'";

  return [
    "default-src 'none'",
    `script-src ${scriptOrigins}`,
    `style-src ${styleOrigins}`,
    `img-src ${imgOrigins}`,
    `font-src ${fontOrigins}`,
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');
}

// ---------------------------------------------------------------------------
// Document builder
// ---------------------------------------------------------------------------

// Bridge script embedded in every sandbox document.
//
// Plain JS — cannot import TypeScript modules. Message type strings must
// match the MSG_* constants above.
//
// Auto-resize: ResizeObserver on document.body emits 'resize' messages
// automatically — consumers don't need to wire ResizeObserver in their
// sandbox content. The observer is set up AFTER the 'ready' postMessage so
// that the first resize callback (which fires synchronously on observe()) does
// not arrive at the host before bridgeReady is set.
//
// style-patch is scoped to <style> elements (tagName guard) to prevent
// accidental content injection into non-style elements with a matching id.
const BRIDGE_SCRIPT = `
if ('ontouchstart' in window) document.addEventListener('touchstart', function() {}, { passive: true });
window.addEventListener('message', function(e) {
  var msg = e.data;
  if (msg && msg.type === 'state-update') {
    document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: msg.key, value: msg.value } }));
  }
  if (msg && msg.type === 'state-update-all' && msg.record && typeof msg.record === 'object') {
    var keys = Object.keys(msg.record);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      document.dispatchEvent(new CustomEvent('sandbox:state-update', { detail: { key: k, value: msg.record[k] } }));
    }
  }
  if (msg && msg.type === 'style-patch' && msg.id && typeof msg.css === 'string') {
    var el = document.getElementById(msg.id);
    if (el && el.tagName === 'STYLE') el.textContent = msg.css;
  }
  if (msg && msg.type === 'html-patch' && typeof msg.html === 'string') {
    document.body.innerHTML = msg.html;
  }
});
window.onerror = function(message, _src, _line, _col, err) {
  parent.postMessage({ type: 'error', message: String(message), stack: err && err.stack }, '*');
  return true;
};
window.addEventListener('unhandledrejection', function(e) {
  var reason = e.reason;
  parent.postMessage({ type: 'error', message: String(reason), stack: reason && reason.stack }, '*');
});
window.__sandbox__ = {
  emit: function(event, detail) {
    // srcdoc iframes have origin 'null' — '*' is required because no specific origin can be targeted.
    parent.postMessage({ type: 'custom', event: event, detail: detail }, '*');
  }
};
// srcdoc iframes have origin 'null' — '*' is required because no specific origin can be targeted.
parent.postMessage({ type: 'ready' }, '*');
if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(function(entries) {
    var entry = entries[0];
    if (!entry) return;
    var h = entry.borderBoxSize && entry.borderBoxSize[0]
      ? entry.borderBoxSize[0].blockSize
      : entry.contentRect.height;
    // srcdoc iframes have origin 'null' — '*' is required because no specific origin can be targeted.
    parent.postMessage({ type: 'resize', height: h }, '*');
  }).observe(document.body);
}
`.trim();

/**
 * Builds a complete, standalone sandbox HTML document.
 *
 * `namedStyles` entries are rendered as `<style id="key">` elements in the
 * document `<head>`. External scripts carry `crossorigin="anonymous"` so the
 * bridge's error handler receives full error details for cross-origin scripts.
 * The bridge script auto-emits `resize` messages via `ResizeObserver`.
 */
export function buildDocument(html: string, options: SandboxOptions = {}): string {
  // escapeAttr is applied to the whole CSP string when embedding it in content="..."
  // because buildCsp() does not know the embedding context. Any user-supplied origin
  // values that survived sanitizeCspOrigin() but still contain & or < (very unusual)
  // would otherwise break the HTML attribute.
  const csp = escapeAttr(buildCsp(options));
  const named = options.namedStyles ?? {};
  const lang = escapeAttr(options.lang ?? 'en');
  const title = escapeText(options.title ?? '');

  const styleTags = Object.entries(named)
    .map(([id, css]) => `<style id="${escapeAttr(id)}">${escapeCss(css)}</style>`)
    .join('\n');

  const scriptTags = (options.scripts ?? [])
    .map((src) => `<script crossorigin="anonymous" src="${escapeAttr(src)}"></script>`)
    .join('\n');

  const nonceAttr = options.nonce ? ` nonce="${escapeAttr(options.nonce)}"` : '';

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
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

// Dev-only timeout: if the bridge never fires 'ready' after a render(), warn
// so the developer knows the bridge script is missing or broken.
const READY_TIMEOUT_MS = 5000;

export function createSandbox(container: HTMLElement, options: SandboxOptions = {}): SandboxHandle {
  // Iframe is created lazily on the first render() call — no DOM work until
  // there is content to show.
  let iframe: HTMLIFrameElement | null = null;
  const listeners = new Set<(msg: SandboxMessage) => void>();
  let disposed = false;
  const ac = new AbortController();

  // Mutable namedStyles baseline — updateStyle() patches this so re-renders
  // automatically use the latest CSS without the caller re-passing options.
  const namedStyles: Record<string, string> = { ...(options.namedStyles ?? {}) };

  // bridgeReady: true once the bridge inside the current document has fired MSG_READY.
  // Reset to false on each render() so setState/updateStyle guards work correctly.
  let bridgeReady = false;

  // First-render gate — resolves on first ready signal or on dispose().
  // Always resolves (never rejects) so callers can safely fire-and-forget it.
  // Check sandbox.disposed afterward to distinguish a dispose-resolution.
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  // Per-render resolver — replaced on each render(), resolved on the next
  // 'ready' message, when the render is superseded, or when disposed.
  let resolveCurrentRender: (() => void) | null = null;
  let readyTimeoutId: ReturnType<typeof setTimeout> | null = null;

  function clearReadyTimeout(): void {
    if (readyTimeoutId !== null) {
      clearTimeout(readyTimeoutId);
      readyTimeoutId = null;
    }
  }

  // Supersede the in-flight render: resolve its promise, clear the timeout,
  // and reset bridgeReady. All three must change together — keep them here.
  function supersedePendingRender(): void {
    clearReadyTimeout();
    resolveCurrentRender?.();
    resolveCurrentRender = null;
    bridgeReady = false;
  }

  // Dispatch table for incoming sandbox→host messages.
  // Adding a new message type means adding one entry here — no separate allowlist.
  // Each handler constructs a typed SandboxMessage rather than casting, so the
  // compiler verifies the shape and malformed payloads are silently dropped.
  const msgHandlers: Record<string, (msg: Record<string, unknown>) => void> = {
    [MSG_CUSTOM]: (msg) => {
      if (typeof msg.event === 'string') {
        broadcast({ detail: msg.detail, event: msg.event, type: MSG_CUSTOM });
      }
    },
    [MSG_ERROR]: (msg) => {
      if (typeof msg.message === 'string') {
        broadcast({
          message: msg.message,
          ...(typeof msg.stack === 'string' ? { stack: msg.stack } : {}),
          type: MSG_ERROR,
        });
      }
    },
    [MSG_READY]: () => {
      // supersedePendingRender clears the timeout and resolves the render promise.
      // bridgeReady is re-set to true immediately after because the bridge IS ready.
      supersedePendingRender();
      resolveReady();
      bridgeReady = true;
    },
    [MSG_RESIZE]: (msg) => {
      if (typeof msg.height === 'number') broadcast({ height: msg.height, type: MSG_RESIZE });
    },
  };

  function broadcast(msg: SandboxMessage): void {
    for (const listener of listeners) listener(msg);
  }

  function handleMessage(event: MessageEvent): void {
    if (!iframe || event.source !== iframe.contentWindow) return;

    if (!isMsgObject(event.data)) return;

    // Guard against prototype-inherited properties on msgHandlers (e.g. '__proto__',
    // '__defineGetter__') — these are not functions and calling them via ?.() throws.
    // Object.hasOwn ensures only keys explicitly defined in the dispatch table are invoked.
    if (Object.hasOwn(msgHandlers, event.data.type)) {
      msgHandlers[event.data.type]!(event.data);
    }
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
    supersedePendingRender();
    ac.abort();
    resolveReady();

    if (iframe) {
      window.removeEventListener('message', handleMessage);
      iframe.remove();
      iframe = null;
    }

    listeners.clear();
  }

  function onMessage(handler: (msg: SandboxMessage) => void): Unsubscribe {
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
    supersedePendingRender();

    const docOptions = Object.keys(namedStyles).length > 0 ? { ...options, namedStyles: { ...namedStyles } } : options;

    ensureIframe().srcdoc = buildDocument(html, docOptions);

    const p = new Promise<void>((resolve) => {
      resolveCurrentRender = resolve;
    });

    // Dev-only guard: if the bridge never fires 'ready', warn after timeout so
    // the developer knows the bridge script is missing rather than waiting forever.
    devOnly(() => {
      readyTimeoutId = setTimeout(() => {
        if (resolveCurrentRender) {
          warn(
            `render() Promise has not resolved after ${READY_TIMEOUT_MS}ms. ` +
              'The sandbox document may be missing the bridge script. ' +
              'Use buildDocument() to generate documents that include the bridge.',
          );
        }
      }, READY_TIMEOUT_MS);
    });

    return p;
  }

  function patch(html: string): void {
    if (disposed) {
      warn('patch() called on a disposed sandbox.');

      return;
    }

    if (!bridgeReady || !iframe?.contentWindow) {
      warn(
        'patch() called before render() has resolved — bridge is not yet initialized. Await the Promise returned by render() first.',
      );

      return;
    }

    // srcdoc iframes have origin 'null' — '*' is required because no specific origin can be targeted.
    iframe.contentWindow.postMessage({ html, type: MSG_HTML_PATCH }, '*');
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

    if (!bridgeReady) {
      warn(
        'setState() called before ready — state update may be lost if bridge is not yet initialized. Await the Promise returned by render() first.',
      );
    }

    // srcdoc iframes have origin 'null' — '*' is required because no specific origin can be targeted.
    iframe.contentWindow.postMessage({ key, type: MSG_STATE_UPDATE, value }, '*');
  }

  function setStateAll(record: Record<string, unknown>): void {
    if (disposed) {
      warn('setStateAll() called on a disposed sandbox.');

      return;
    }

    if (!iframe?.contentWindow) {
      warn('setStateAll() called before render() — sandbox has no document yet.');

      return;
    }

    if (!bridgeReady) {
      warn(
        'setStateAll() called before ready — state updates may be lost. Await the Promise returned by render() first.',
      );
    }

    // srcdoc iframes have origin 'null' — '*' is required because no specific origin can be targeted.
    iframe.contentWindow.postMessage({ record, type: MSG_STATE_UPDATE_ALL }, '*');
  }

  function updateStyle(id: string, css: string): void {
    if (disposed) return;

    devOnly(() => {
      if (!(id in namedStyles)) {
        warn(
          `updateStyle('${id}', …) — '${id}' is not a known namedStyles key. ` +
            'The live patch will have no effect. Pass the id as a key in namedStyles when calling createSandbox().',
        );
      }
    });

    namedStyles[id] = css;

    if (bridgeReady && iframe?.contentWindow) {
      // srcdoc iframes have origin 'null' — '*' is required because no specific origin can be targeted.
      iframe.contentWindow.postMessage({ css, id, type: MSG_STYLE_PATCH }, '*');
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
    patch,
    ready,
    render,
    setState,
    setStateAll,
    [Symbol.dispose]() {
      dispose();
    },
    updateStyle,
  };
}
