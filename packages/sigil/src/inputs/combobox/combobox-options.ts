import type { ComboboxOptionItem } from './combobox.types';

export function parseSlottedOptions(elements: Element[]): ComboboxOptionItem[] {
  return elements
    .filter((el) => el.localName === 'sg-combobox-option')
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

export function filterOptions(options: ComboboxOptionItem[], query: string, noFilter: boolean): ComboboxOptionItem[] {
  if (noFilter) return options;

  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return options;

  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(normalizedQuery) || option.value.toLowerCase().includes(normalizedQuery),
  );
}

export function getCreatableLabel(query: string, creatable: boolean, filteredOptions: ComboboxOptionItem[]): string {
  if (!creatable) return '';

  const trimmedQuery = query.trim();

  if (!trimmedQuery) return '';

  const exactMatch = filteredOptions.some((option) => option.label.toLowerCase() === trimmedQuery.toLowerCase());

  return exactMatch ? '' : `Create "${trimmedQuery}"`;
}

export function makeCreatableValue(query: string): string {
  return `__new__:${query.trim()}`;
}
