/** Identifiers and timestamps shared by the store's write paths. */
export const now = (): string => new Date().toISOString();
export const uid = (prefix: string): string =>
  `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
