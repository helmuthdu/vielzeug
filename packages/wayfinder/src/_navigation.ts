export type NavigationAttempt = {
  isCurrent(): boolean;
  readonly signal: AbortSignal;
};

/** Coordinates navigation ownership so stale work cannot commit router state. */
export function createNavigationCoordinator() {
  let active: AbortController | undefined;

  return {
    begin(): NavigationAttempt {
      active?.abort();

      const controller = new AbortController();

      active = controller;

      return {
        isCurrent: () => active === controller && !controller.signal.aborted,
        signal: controller.signal,
      };
    },

    invalidate(reason?: unknown): void {
      active?.abort(reason);
      active = undefined;
    },
  };
}
