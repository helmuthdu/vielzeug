// ─── Error helpers ────────────────────────────────────────────────────────────

export function fail(message: string): never {
  throw new TypeError(`[tempo] ${message}`);
}
