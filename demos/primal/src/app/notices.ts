import { PrimalDomainError } from '../domain/errors';
import { notify as emitNotice, type MessageKey, type Notice, type PluralMessageKey } from './events';
import { t } from './i18n';

// ---------------------------------------------------------------------------
// Notices: commands return them as data (catalog keys plus values, never finished
// prose); runCommand emits. The toast pipeline and the session relay stay outside
// the command table, and guests translate at their own edge.
// ---------------------------------------------------------------------------

/** Builds the notice a command wants shown: a catalog key plus its values. */
export function notice(
  key: MessageKey | PluralMessageKey,
  variant: Notice['variant'] = 'info',
  options: { count?: number; values?: Record<string, unknown> } = {},
): Notice {
  return { key, variant, ...options };
}

/**
 * Reports a failed action. Domain errors translate into the active locale by their code;
 * anything else with a message shows it verbatim (English fallback), and the rest falls
 * back to a catalog key. Views call this instead of branching on error types themselves.
 */
export function notifyError(fallback: MessageKey, error: unknown): void {
  const message =
    error instanceof PrimalDomainError
      ? t(`errors.${error.code}`)
      : error instanceof Error && error.message
        ? error.message
        : undefined;
  if (message) {
    emitNotice('toasts.error', 'error', { values: { message } });
  } else {
    emitNotice(fallback, 'error');
  }
}

/** Runs a player action, reporting a domain refusal as a localized toast instead of throwing. */
export function guarded<T>(action: () => T): T | undefined {
  try {
    return action();
  } catch (error) {
    if (error instanceof PrimalDomainError) {
      notifyError('toasts.actionNotPossible', error);
      return undefined;
    }
    throw error;
  }
}
