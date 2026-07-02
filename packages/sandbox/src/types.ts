// ---------------------------------------------------------------------------
// Public types for @vielzeug/sandbox
// ---------------------------------------------------------------------------

/**
 * Options for createSandbox, buildCsp, and buildDocument.
 *
 * All `allowed*Origins` fields whitelist CDN/external origins for their
 * respective CSP directives. Origins from `scripts` URLs are extracted
 * automatically and merged with `allowedScriptOrigins`.
 *
 * Use `namedStyles` to inject named `<style id="key">` blocks. Each block is
 * individually hot-patchable via `sandbox.updateStyle(id, css)` without
 * a full re-render.
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
   * BCP 47 language tag for the `<html lang="…">` attribute of the generated document.
   * Defaults to `'en'`. Pass the primary language of the sandbox content for correct
   * screen-reader behaviour.
   * @example { lang: 'de' }
   */
  lang?: string;
  /**
   * Named CSS blocks injected as `<style id="key">` elements in the document `<head>`.
   * Each entry is individually hot-patchable via `sandbox.updateStyle(id, css)`.
   * Keys must be valid HTML id values.
   */
  namedStyles?: Record<string, string>;
  /**
   * A cryptographic nonce added to the bridge <script> tag and to `script-src` in the CSP.
   * In CSP Level 3 browsers the nonce suppresses `'unsafe-inline'` — only the bridge script
   * (which carries the nonce attribute) executes. `'unsafe-inline'` is retained for CSP Level 2
   * fallback only.
   * @example { nonce: crypto.randomUUID() }
   */
  nonce?: string;
  /** External script URLs injected before user content. Origins are auto-added to script-src. */
  scripts?: string[];
  /**
   * Title for the generated document, placed in `<title>` in `<head>`.
   * Defaults to an empty string. Providing a title improves screen reader compatibility.
   */
  title?: string;
}

/** Named unsubscribe function returned by `onMessage`. */
export type Unsubscribe = () => void;

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
  /**
   * Subscribe to state pushed via sandbox.setState()/setStateAll() for a specific key.
   * The handler receives only the value for the matching key — filtering the raw
   * `sandbox:state-update` CustomEvent is handled for you. Returns an unsubscribe function.
   * @example
   * ```ts
   * const off = window.__sandbox__.onState('theme', (value) => {
   *   document.body.dataset.theme = String(value);
   * });
   * ```
   */
  onState(key: string, handler: (value: unknown) => void): Unsubscribe;
}

/**
 * Detail payload of the `sandbox:state-update` CustomEvent dispatched inside sandbox
 * documents whenever the host calls setState() or setStateAll(). Sandbox-side code can
 * listen to this event directly — `window.__sandbox__.onState(key, handler)` wraps it
 * for the common case of listening to a single key.
 *
 * @example Sandbox-side listener:
 * ```ts
 * document.addEventListener('sandbox:state-update', (e: CustomEvent<SandboxStateUpdateDetail>) => {
 *   console.log(e.detail.key, e.detail.value);
 * });
 * ```
 */
export interface SandboxStateUpdateDetail {
  key: string;
  value: unknown;
}

/**
 * Application-level messages the sandbox sends to the host via onMessage().
 *
 * 'ready' is an internal lifecycle signal — it resolves render() Promises and
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
   * Also resolves if the sandbox is disposed before the first render — check
   * `sandbox.disposed` afterward if you need to distinguish the two cases.
   * Does not reset on re-renders; use the Promise returned by render() for
   * subsequent renders.
   */
  readonly ready: Promise<void>;
  /** Tear down the sandbox — removes the iframe from the DOM and clears all listeners. */
  dispose(): void;
  /**
   * Subscribe to application-level messages from the sandboxed document.
   * Receives 'error', 'custom', and 'resize' messages. The 'ready' lifecycle
   * signal is not forwarded — await the Promise returned by render() instead.
   * Returns an Unsubscribe function. Returns a no-op if the sandbox is already disposed.
   */
  onMessage(handler: (msg: SandboxMessage) => void): Unsubscribe;
  /**
   * Incrementally update the body of the live sandbox document without a full page reset.
   * Replaces `document.body.innerHTML` inside the iframe via postMessage — scripts,
   * event listeners, and CSS state are preserved. The `ResizeObserver` fires automatically
   * after the DOM update.
   *
   * Call after the first `render()` has resolved — warns in dev if the bridge is not yet ready.
   * No-ops if disposed. Does NOT accept an AbortSignal — patches are instantaneous once sent.
   */
  patch(html: string): void;
  /**
   * Replace the entire sandbox document (full page reset). Creates the iframe lazily
   * on the first call — no DOM is created until render() is invoked.
   * Returns a Promise that resolves when the new document signals it is ready, or
   * rejects with a SandboxTimeoutError if no 'ready' signal arrives within 5s — the
   * document is likely missing the bridge script; use buildDocument() to generate
   * documents that include it.
   * If a second render() starts before the first resolves, the first Promise resolves
   * (not rejects) immediately — the document simply navigated away.
   * Warns in dev if html is empty. Pass a signal to skip the render if already aborted.
   */
  render(html: string, options?: { signal?: AbortSignal }): Promise<void>;
  /**
   * Push multiple state values into the sandbox in a single postMessage.
   * More efficient than calling setState() repeatedly for initial state setup.
   * Warns in dev if called before render() resolves.
   */
  setStateAll(record: Record<string, unknown>): void;
  /**
   * Push a state value into the sandbox without re-rendering.
   * Dispatches a `sandbox:state-update` CustomEvent on `document` inside the sandbox.
   * Warns in dev if called before render() resolves.
   */
  setState(key: string, value: unknown): void;
  /**
   * Replace the CSS for a named style block without a full re-render.
   * `id` must match a key in the `namedStyles` option passed to `createSandbox`.
   * Updates both the live iframe and the baseline so the next render() uses the new CSS.
   * No-ops if the sandbox is disposed. Safe to call before the first render —
   * only the baseline is updated; the iframe patch is skipped until ready.
   * Warns in dev if `id` is not a known namedStyles key.
   */
  updateStyle(id: string, css: string): void;
  [Symbol.dispose](): void;
}
