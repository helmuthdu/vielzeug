import type { ComboboxOptionItem, ComboboxSelectionItem } from './combobox.types';

export function selectedValuesToCsv(selectedValues: ComboboxSelectionItem[]): string {
  return selectedValues.map((item) => item.value).join(',');
}

export function selectedValueList(selectedValues: ComboboxSelectionItem[]): string[] {
  return selectedValues.map((item) => item.value);
}

export function toggleMultiSelection(
  selectedValues: ComboboxSelectionItem[],
  option: ComboboxOptionItem,
): ComboboxSelectionItem[] {
  const exists = selectedValues.some((entry) => entry.value === option.value);

  if (exists) return selectedValues.filter((entry) => entry.value !== option.value);

  return [...selectedValues, { label: option.label, value: option.value }];
}

export function removeSelectionByValue(
  selectedValues: ComboboxSelectionItem[],
  value: string,
): ComboboxSelectionItem[] {
  return selectedValues.filter((item) => item.value !== value);
}
