const isDev = !(globalThis as { __REFINE_PROD__?: boolean }).__REFINE_PROD__;

/**
 * Emits a `console.warn` in development builds only.
 * @internal
 * @security Messages may include user-supplied attribute values or element content.
 * Never pass PII or secrets as component attributes.
 */
export function warn(msg: string): void {
  if (isDev) console.warn(`[@vielzeug/refine] ${msg}`);
}

/**
 * Warns (dev only) when an action row contains more than one
 * `<ore-button emphasis="primary">`. A primary action is the one choice a
 * view asks for; two of them cancel each other out. Called from the slot
 * handlers of the components that host action rows (`ore-dialog`'s footer,
 * `ore-alert`'s actions).
 * @internal
 */
export function warnMultiplePrimaryActions(assigned: Element[], context: string): void {
  if (!isDev) return;

  let primaries = 0;

  for (const node of assigned) {
    if (node.matches('ore-button[emphasis="primary"]')) primaries += 1;

    primaries += node.querySelectorAll('ore-button[emphasis="primary"]').length;
  }

  if (primaries > 1) {
    warn(
      `${context} contains ${primaries} buttons with emphasis="primary". Keep one primary action per view: ` +
        'the rest should use emphasis="normal", "cancel", or "destructive".',
    );
  }
}
