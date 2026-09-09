/** Options for generated sandbox documents and the managed iframe runtime. */
export interface SandboxOptions {
  /** Origins added to font-src. Default: 'none'. */
  allowedFontOrigins?: string[];
  /** Origins appended to img-src. data: is always included. */
  allowedImageOrigins?: string[];
  /** Origins appended to script-src alongside 'unsafe-inline'. Merged with origins from `scripts`. */
  allowedScriptOrigins?: string[];
  /** Origins appended to style-src alongside 'unsafe-inline'. */
  allowedStyleOrigins?: string[];
  /** BCP 47 language tag for the generated `<html>` element. Default: `'en'`. */
  lang?: string;
  /** A cryptographic nonce added to bridge scripts and script-src. */
  nonce?: string;
  /** Milliseconds to wait for the generated document to become ready. Default: `5000`. */
  readyTimeout?: number;
  /** External script URLs injected before user content. Origins are added to script-src. */
  scripts?: string[];
  /** Named CSS blocks injected into the document head and addressable through `updateStyle()`. */
  styles?: Record<string, string>;
  /** Title for the generated document. Default: `''`. */
  title?: string;
}

/**
 * Typed bridge available as `window.__sandbox__` inside sandbox documents.
 * Host-side messages remain untrusted and expose custom event details as `unknown`.
 */
export interface SandboxBridge<
  State extends object = Record<string, unknown>,
  Events extends object = Record<string, unknown>,
> {
  emit<K extends keyof Events & string>(
    event: K,
    ...detail: undefined extends Events[K] ? [detail?: Events[K]] : [detail: Events[K]]
  ): void;
  onState<K extends keyof State & string>(key: K, handler: (value: State[K]) => void): () => void;
}

/** Untrusted application-level message received from the sandbox document. */
export type SandboxMessage =
  | { detail: unknown; event: string; type: 'custom' }
  | { message: string; stack?: string; type: 'error' }
  | { height: number; type: 'resize' };

/** Handle for a managed sandbox iframe. */
export interface SandboxHandle<State extends object = Record<string, unknown>> {
  /** Signal aborted by `dispose()`. */
  readonly disposalSignal: AbortSignal;
  /** Tear down the iframe and listeners. */
  dispose(): void;
  /** True after disposal. */
  readonly disposed: boolean;
  /** Subscribe to untrusted custom, error, and resize messages. */
  onMessage(handler: (message: SandboxMessage) => void): () => void;
  /** Replace the full document and resolve when its bridge reports ready. */
  render(html: string): Promise<void>;
  /** Replace body descendants without navigating the iframe. */
  replaceBody(html: string): void;
  /** Push one or more typed state values into the ready document. */
  setState(update: Partial<State>): void;
  /** Update a named style in the live document and future renders. */
  updateStyle(id: string, css: string): void;
  [Symbol.dispose](): void;
}
