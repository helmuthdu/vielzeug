import { devOnly, warn } from './_dev.js';
import { buildDocumentFromOptions } from './_document.js';
import { normalizeSandboxOptions } from './_policy.js';
import {
  type BridgeBootstrap,
  createChannel,
  envelope,
  isProtocolMessage,
  MSG_CUSTOM,
  MSG_ERROR,
  MSG_HTML_REPLACE,
  MSG_READY,
  MSG_RESIZE,
  MSG_STATE_UPDATE_ALL,
  MSG_STYLE_PATCH,
} from './_protocol.js';
import { SandboxTimeoutError } from './errors.js';
import type { SandboxHandle, SandboxMessage, SandboxOptions } from './types.js';

export function createSandbox<State extends object = Record<string, unknown>>(
  container: HTMLElement,
  options: SandboxOptions = {},
): SandboxHandle<State> {
  const normalized = normalizeSandboxOptions(options);
  const channel = createChannel();
  const styles: Record<string, string> = { ...normalized.styles };
  const listeners = new Set<(message: SandboxMessage) => void>();
  const controller = new AbortController();
  let iframe: HTMLIFrameElement | null = null;
  let disposed = false;
  let bridgeReady = false;
  let generation = 0;
  let readyTimeout: ReturnType<typeof setTimeout> | null = null;
  let currentRender: { reject: (error: unknown) => void; resolve: () => void } | null = null;

  function currentBootstrap(): BridgeBootstrap {
    return { channel, generation };
  }

  function clearReadyTimeout(): void {
    if (readyTimeout === null) return;

    clearTimeout(readyTimeout);
    readyTimeout = null;
  }

  function supersedePendingRender(): void {
    clearReadyTimeout();
    currentRender?.resolve();
    currentRender = null;
    bridgeReady = false;
  }

  function broadcast(message: SandboxMessage): void {
    for (const listener of listeners) {
      try {
        listener(message);
      } catch {
        warn('onMessage() handler threw — remaining handlers will still run.');
      }
    }
  }

  function handleMessage(event: MessageEvent): void {
    if (!iframe || event.source !== iframe.contentWindow) return;

    const bootstrap = currentBootstrap();

    if (!isProtocolMessage(event.data, bootstrap)) return;

    switch (event.data.type) {
      case MSG_CUSTOM:
        if (typeof event.data.event === 'string') {
          broadcast({ detail: event.data.detail, event: event.data.event, type: MSG_CUSTOM });
        }

        break;
      case MSG_ERROR:
        if (typeof event.data.message === 'string') {
          broadcast({
            message: event.data.message,
            ...(typeof event.data.stack === 'string' ? { stack: event.data.stack } : {}),
            type: MSG_ERROR,
          });
        }

        break;
      case MSG_READY:
        supersedePendingRender();
        bridgeReady = true;
        break;
      case MSG_RESIZE:
        if (typeof event.data.height === 'number' && Number.isFinite(event.data.height) && event.data.height >= 0) {
          broadcast({ height: event.data.height, type: MSG_RESIZE });
        }

        break;
    }
  }

  function ensureIframe(): HTMLIFrameElement {
    if (iframe) return iframe;

    iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.dataset.sandboxChannel = channel;
    container.appendChild(iframe);
    window.addEventListener('message', handleMessage);

    return iframe;
  }

  function dispose(): void {
    if (disposed) return;

    disposed = true;
    supersedePendingRender();
    controller.abort();

    if (iframe) {
      window.removeEventListener('message', handleMessage);
      iframe.remove();
      iframe = null;
    }

    listeners.clear();
  }

  function onMessage(handler: (message: SandboxMessage) => void): () => void {
    if (disposed) {
      warn('onMessage() called on a disposed sandbox — handler will never fire.');

      return () => {};
    }

    listeners.add(handler);

    return () => listeners.delete(handler);
  }

  function render(html: string): Promise<void> {
    if (disposed) {
      warn('render() called on a disposed sandbox.');

      return Promise.resolve();
    }

    if (!html.trim()) warn('render() called with empty HTML.');

    supersedePendingRender();
    generation += 1;

    const current = ensureIframe();
    const bootstrap = currentBootstrap();
    const documentOptions = { ...normalized, styles: { ...styles } };

    current.dataset.sandboxGeneration = String(generation);
    current.srcdoc = buildDocumentFromOptions(html, documentOptions, bootstrap);

    const promise = new Promise<void>((resolve, reject) => {
      currentRender = { reject, resolve };
    });

    readyTimeout = setTimeout(() => {
      if (!currentRender) return;

      currentRender.reject(
        new SandboxTimeoutError(
          `render() did not receive a 'ready' signal within ${normalized.readyTimeout}ms. ` +
            'An injected script may have blocked document initialization.',
        ),
      );
      currentRender = null;
      readyTimeout = null;
    }, normalized.readyTimeout);

    return promise;
  }

  function send(message: Record<string, unknown>): void {
    iframe?.contentWindow?.postMessage(envelope(currentBootstrap(), message), '*');
  }

  function setState(update: Partial<State>): void {
    if (disposed) {
      warn('setState() called on a disposed sandbox.');

      return;
    }

    if (!iframe?.contentWindow) {
      warn('setState() called before render() — sandbox has no document yet.');

      return;
    }

    if (!bridgeReady) warn('setState() called before ready — state updates may be lost. Await render() first.');

    if (Object.keys(update).length > 0) send({ record: update, type: MSG_STATE_UPDATE_ALL });
  }

  function replaceBody(html: string): void {
    if (disposed) {
      warn('replaceBody() called on a disposed sandbox.');

      return;
    }

    if (!bridgeReady || !iframe?.contentWindow) {
      warn('replaceBody() called before render() has resolved — bridge is not ready. Await render() first.');

      return;
    }

    send({ html, type: MSG_HTML_REPLACE });
  }

  function updateStyle(id: string, css: string): void {
    if (disposed) {
      warn('updateStyle() called on a disposed sandbox.');

      return;
    }

    devOnly(() => {
      if (!(id in styles)) {
        warn(`updateStyle('${id}', …) — '${id}' is not a known styles key.`);
      }
    });

    styles[id] = css;

    if (bridgeReady && iframe?.contentWindow) send({ css, id, type: MSG_STYLE_PATCH });
  }

  return {
    get disposalSignal() {
      return controller.signal;
    },
    dispose,
    get disposed() {
      return disposed;
    },
    onMessage,
    render,
    replaceBody,
    setState,
    [Symbol.dispose]() {
      dispose();
    },
    updateStyle,
  };
}
