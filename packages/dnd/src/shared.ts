// ─── Disposable ──────────────────────────────────────────────────────────────

export interface Disposable {
  [Symbol.dispose](): void;
  readonly disposalSignal: AbortSignal;
  dispose(): void;
  readonly disposed: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveDisabled(disabled: boolean | undefined): boolean {
  return disabled === true;
}
