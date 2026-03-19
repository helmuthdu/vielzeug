import type { ComboboxOptionItem, ComboboxSelectionItem } from './combobox.types';

export function parseSlottedOptions(elements: Element[]): ComboboxOptionItem[] {
  return elements
    .filter((el) => el.localName === 'bit-combobox-option')
    .map((el) => ({
      disabled: el.hasAttribute('disabled'),
      iconEl: el.querySelector('[slot="icon"]'),
      label:
        el.getAttribute('label') ||
        [...el.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim())
          .filter(Boolean)
          .join(' ') ||
        '',
      value: el.getAttribute('value') ?? '',
    }));
}

export function backfillSelectionLabels(
  selectedValues: ComboboxSelectionItem[],
  allOptions: ComboboxOptionItem[],
): ComboboxSelectionItem[] {
  return selectedValues.map((selection) => {
    if (selection.label) return selection;

    const match = allOptions.find((option) => option.value === selection.value);

    return match ? { label: match.label, value: selection.value } : selection;
  });
}

export function filterOptions(options: ComboboxOptionItem[], query: string, noFilter: boolean): ComboboxOptionItem[] {
  if (noFilter || !query) return options;

  const normalizedQuery = query.toLowerCase();

  return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
}

export function getCreatableLabel(query: string, creatable: boolean, filteredOptions: ComboboxOptionItem[]): string {
  if (!creatable || !query) return '';

  const trimmedQuery = query.trim();

  if (!trimmedQuery) return '';

  const exactMatch = filteredOptions.find((option) => option.label.toLowerCase() === trimmedQuery.toLowerCase());

  return exactMatch ? '' : trimmedQuery;
}

export function makeCreatableValue(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}
