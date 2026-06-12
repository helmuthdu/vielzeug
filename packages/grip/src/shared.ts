// ─── Disposable ──────────────────────────────────────────────────────────────

export interface Disposable {
  dispose(): void;
  [Symbol.dispose](): void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveDisabled(disabled: boolean | (() => boolean) | undefined): boolean {
  if (disabled === undefined) return false;

  return typeof disabled === 'function' ? disabled() : disabled;
}
