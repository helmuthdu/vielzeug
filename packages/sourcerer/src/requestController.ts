export type RequestHandle = Readonly<{
  finish(): void;
  isCurrent(): boolean;
  signal: AbortSignal;
}>;

export type RequestController = Readonly<{
  begin(): RequestHandle;
  dispose(): void;
}>;

/** A source owns one active request: newer query state always supersedes older work. */
export function createRequestController(): RequestController {
  let active: AbortController | undefined;
  let sequence = 0;

  return {
    begin() {
      active?.abort();

      const controller = new AbortController();
      const requestSequence = ++sequence;

      active = controller;

      return {
        finish() {
          if (requestSequence === sequence) active = undefined;
        },

        isCurrent() {
          return requestSequence === sequence;
        },

        signal: controller.signal,
      };
    },

    dispose() {
      active?.abort();
      active = undefined;
      sequence++;
    },
  };
}

export function toError(reason: unknown): Error {
  if (reason instanceof Error) return reason;

  return new Error(typeof reason === 'string' && reason.length > 0 ? reason : 'Source request failed');
}
