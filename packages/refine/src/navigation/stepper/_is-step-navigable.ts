/**
 * Pure navigability rule shared by `ore-stepper` (building its own roving-tabindex
 * candidate list) and `ore-step` (reflecting its own `navigable` attribute for CSS/
 * testing). Kept in one place instead of duplicated inline so the two derivations
 * can't drift out of sync.
 */
export function isStepNavigable(options: {
  disabled: boolean;
  index: number;
  linear: boolean;
  stepperClickable: boolean;
  stepperCurrentIndex: number;
}): boolean {
  if (!options.stepperClickable || options.disabled) return false;

  if (options.linear && options.stepperCurrentIndex >= 0 && options.index > options.stepperCurrentIndex) return false;

  return true;
}
