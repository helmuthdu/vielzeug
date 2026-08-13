// ─── Disposable ──────────────────────────────────────────────────────────────

export interface Disposable {
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
  [Symbol.dispose](): void;
}
