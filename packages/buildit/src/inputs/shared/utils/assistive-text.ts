export type CounterState = {
  atLimit: boolean;
  hidden: boolean;
  nearLimit: boolean;
  text: string;
};

export type SplitAssistiveState = {
  errorHidden: boolean;
  errorText: string;
  helperHidden: boolean;
  helperText: string;
};

export type MergedAssistiveState = {
  hidden: boolean;
  isError: boolean;
  text: string;
};

/** Shared counter-state thresholds for text controls with maxlength support. */
export function resolveCounterState(length: number, max: number | null): CounterState {
  if (max == null) {
    return { atLimit: false, hidden: true, nearLimit: false, text: '' };
  }

  const ratio = length / max;

  return {
    atLimit: ratio >= 1,
    hidden: false,
    nearLimit: ratio >= 0.9 && ratio < 1,
    text: `${length} / ${max}`,
  };
}

/** Split helper/error state for controls that render separate helper and error elements (input). */
export function resolveSplitAssistiveText(error: string | undefined, helper: string | undefined): SplitAssistiveState {
  const hasError = Boolean(error);
  const hasHelper = Boolean(helper);

  return {
    errorHidden: !hasError,
    errorText: error ?? '',
    helperHidden: hasError || !hasHelper,
    helperText: helper ?? '',
  };
}

/** Merged helper/error state for controls that render one assistive text element (textarea). */
export function resolveMergedAssistiveText(
  error: string | undefined,
  helper: string | undefined,
): MergedAssistiveState {
  const isError = Boolean(error);
  const text = error || helper || '';

  return {
    hidden: !text,
    isError,
    text,
  };
}
