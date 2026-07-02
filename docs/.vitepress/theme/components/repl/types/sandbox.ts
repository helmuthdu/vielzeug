export const sandboxTypes = `
declare module '@vielzeug/sandbox' {
  /**
   * Options for createSandbox, buildCsp, and buildDocument.
   * Use namedStyles to inject named <style id="key"> blocks — each is individually
   * hot-patchable via sandbox.updateStyle(id, css) without a full re-render.
   */
  export interface SandboxOptions {
    /** Origins added to font-src. Default: 'none'. */
    allowedFontOrigins?: string[];
    /** Origins appended to img-src. data: is always included. */
    allowedImageOrigins?: string[];
    /** Origins appended to script-src alongside 'unsafe-inline'. Merged with origins from scripts. */
    allowedScriptOrigins?: string[];
    /** Origins appended to style-src alongside 'unsafe-inline'. */
    allowedStyleOrigins?: string[];
    /** BCP 47 language tag for the <html lang="…"> attribute of the generated document. Defaults to 'en'. */
    lang?: string;
    /** Named CSS blocks injected as <style id="key"> elements in the document head. */
    namedStyles?: Record<string, string>;
    /** Cryptographic nonce added to the bridge <script> tag and to script-src in the CSP. */
    nonce?: string;
    /** External script URLs injected before user content. Origins are auto-added to script-src. */
    scripts?: string[];
    /** Title for the generated document, placed in <title> in <head>. Defaults to an empty string. */
    title?: string;
  }

  /** Named unsubscribe function returned by onMessage. */
  export type Unsubscribe = () => void;

  /** The bridge API available as window.__sandbox__ inside sandbox documents. */
  export interface SandboxBridge {
    /** Emit a custom event to the host. Received via sandbox.onMessage() as { type: 'custom', event, detail }. */
    emit(event: string, detail?: unknown): void;
  }

  /**
   * Application-level messages the sandbox sends to the host via onMessage().
   * 'ready' is an internal lifecycle signal and is never forwarded to onMessage() subscribers.
   */
  export type SandboxMessage =
    | { type: 'error'; message: string; stack?: string }
    | { type: 'custom'; event: string; detail: unknown }
    | { height: number; type: 'resize' };

  /** Handle for a running sandbox instance returned by createSandbox(). */
  export interface SandboxHandle {
    /** AbortSignal aborted when dispose() is called. */
    readonly disposalSignal: AbortSignal;
    /** True once dispose() has been called. */
    readonly disposed: boolean;
    /** Resolves when the first sandbox document signals it is ready. Does not reset on re-renders. */
    readonly ready: Promise<void>;
    /** Tear down the sandbox — removes the iframe from the DOM and clears all listeners. */
    dispose(): void;
    /** Subscribe to 'error', 'custom', and 'resize' messages. Returns an Unsubscribe function. */
    onMessage(handler: (msg: SandboxMessage) => void): Unsubscribe;
    /** Incrementally update document.body.innerHTML via postMessage. Call after render() resolves. */
    patch(html: string): void;
    /** Replace the entire sandbox document (full page reset). Resolves when the new document is ready. */
    render(html: string, options?: { signal?: AbortSignal }): Promise<void>;
    /** Push a state value into the sandbox — dispatches a sandbox:state-update CustomEvent. */
    setState(key: string, value: unknown): void;
    /** Push multiple state values in a single postMessage — more efficient than repeated setState(). */
    setStateAll(record: Record<string, unknown>): void;
    /** Replace the CSS for a named style block (a namedStyles key) without a full re-render. */
    updateStyle(id: string, css: string): void;
    [Symbol.dispose](): void;
  }

  /** Base class for all sandbox errors. */
  export class SandboxError extends Error {
    static is(err: unknown): err is SandboxError;
  }

  /** Create a sandboxed iframe runtime. The iframe is created lazily on the first render() call. */
  export function createSandbox(container: HTMLElement, options?: SandboxOptions): SandboxHandle;

  /**
   * Builds a strict Content-Security-Policy string for sandboxed iframe documents.
   * Accepts SandboxOptions — origins from scripts are extracted and merged automatically.
   */
  export function buildCsp(options?: SandboxOptions): string;

  /**
   * Builds a complete, standalone sandbox HTML document including CSP, bridge script,
   * injected scripts, namedStyles, and user content.
   */
  export function buildDocument(html: string, options?: SandboxOptions): string;
}
`;
