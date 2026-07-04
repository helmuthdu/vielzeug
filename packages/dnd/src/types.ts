// ─── Disposable ──────────────────────────────────────────────────────────────

export interface Disposable {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
}
