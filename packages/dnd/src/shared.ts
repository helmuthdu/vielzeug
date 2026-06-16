// ─── Disposable ──────────────────────────────────────────────────────────────

export interface Disposable {
  readonly disposed: boolean;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  [Symbol.dispose](): void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveDisabled(disabled: boolean | undefined): boolean {
  return disabled === true;
}
