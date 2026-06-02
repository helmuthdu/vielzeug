// ─── Disposable ──────────────────────────────────────────────────────────────

export interface Disposable {
  destroy(): void;
  [Symbol.dispose](): void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function resolveDisabled(disabled: boolean | (() => boolean) | undefined): boolean {
  if (disabled === undefined) return false;

  return typeof disabled === 'function' ? disabled() : disabled;
}
