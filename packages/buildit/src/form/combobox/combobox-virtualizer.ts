import { createDomVirtualList, type VirtualItem } from '@vielzeug/virtualit/dom';

import type { ComboboxOptionItem, ComboboxSelectionItem } from './combobox.types';

type ComboboxVirtualizerDeps = {
  checkIconHTML: string;
  comboId: string;
  getDropdownElement: () => HTMLElement | null;
  getFocusedIndex: () => number;
  getIsMultiple: () => boolean;
  getListboxElement: () => HTMLElement | null;
  getSelectedValue: () => string;
  getSelectedValues: () => ComboboxSelectionItem[];
  onSelectOption: (opt: ComboboxOptionItem, event?: Event) => void;
  setFocusedIndex: (index: number) => void;
};

export function createComboboxVirtualizer(deps: ComboboxVirtualizerDeps) {
  let currentOptions: ComboboxOptionItem[] = [];
  let cachedListbox: HTMLElement | null = null;

  function isSelectedOption(option: ComboboxOptionItem): boolean {
    if (deps.getIsMultiple()) return deps.getSelectedValues().some((selected) => selected.value === option.value);

    return option.value === deps.getSelectedValue();
  }

  function renderVirtualItems(virtualItems: VirtualItem[]) {
    if (!cachedListbox) return;

    for (const element of Array.from(cachedListbox.querySelectorAll('.option'))) element.remove();

    const focused = deps.getFocusedIndex();

    for (const item of virtualItems) {
      const option = currentOptions[item.index];

      if (!option) continue;

      const isSelected = isSelectedOption(option);
      const optionElement = document.createElement('div');

      optionElement.className = 'option';
      optionElement.setAttribute('role', 'option');
      optionElement.id = `${deps.comboId}-opt-${item.index}`;
      optionElement.setAttribute('aria-selected', String(isSelected));
      optionElement.setAttribute('aria-disabled', String(!!option.disabled));
      optionElement.style.cssText = `position:absolute;top:0;left:0;right:0;transform:translateY(${item.top}px);`;

      if (focused === item.index) optionElement.setAttribute('data-focused', '');

      if (isSelected) optionElement.setAttribute('data-selected', '');

      if (option.disabled) optionElement.setAttribute('data-disabled', '');

      if (option.iconEl) {
        const iconWrapper = document.createElement('span');

        iconWrapper.className = 'option-icon';
        iconWrapper.setAttribute('aria-hidden', 'true');

        const iconClone = option.iconEl.cloneNode(true) as Element;

        iconClone.removeAttribute('slot');
        iconWrapper.appendChild(iconClone);
        optionElement.appendChild(iconWrapper);
      }

      const labelElement = document.createElement('span');

      labelElement.textContent = option.label;
      optionElement.appendChild(labelElement);

      const checkElement = document.createElement('span');

      checkElement.className = 'option-check';
      checkElement.setAttribute('aria-hidden', 'true');
      checkElement.innerHTML = deps.checkIconHTML;
      optionElement.appendChild(checkElement);
      optionElement.addEventListener('mousedown', (event: MouseEvent) => {
        event.preventDefault();
      });
      optionElement.addEventListener('click', (event: MouseEvent) => {
        event.stopPropagation();
        deps.onSelectOption(option, event);
      });
      optionElement.addEventListener('mouseenter', () => {
        deps.setFocusedIndex(item.index);

        for (const focusedElement of cachedListbox!.querySelectorAll<HTMLElement>('[data-focused]')) {
          focusedElement.removeAttribute('data-focused');
        }
        optionElement.setAttribute('data-focused', '');
      });
      cachedListbox.appendChild(optionElement);
    }
  }

  function updateRenderedItemState() {
    if (!cachedListbox) return;

    const focused = deps.getFocusedIndex();

    for (const element of cachedListbox.querySelectorAll<HTMLElement>('.option')) {
      const idx = Number(element.id.replace(`${deps.comboId}-opt-`, ''));
      const option = currentOptions[idx];

      if (!option) continue;

      const isSelected = isSelectedOption(option);

      element.toggleAttribute('data-focused', idx === focused);
      element.toggleAttribute('data-selected', isSelected);
      element.setAttribute('aria-selected', String(isSelected));
    }
  }

  const domVirtualList = createDomVirtualList<ComboboxOptionItem>({
    clear: (listEl) => {
      for (const element of Array.from(listEl.querySelectorAll('.option'))) element.remove();
    },
    estimateSize: 36,
    getListElement: deps.getListboxElement,
    getScrollElement: deps.getDropdownElement,
    overscan: 4,
    render: ({ items, listEl, virtualItems }) => {
      currentOptions = items;
      cachedListbox = listEl;
      renderVirtualItems(virtualItems);
    },
  });

  function setupVirtualizer(options: ComboboxOptionItem[], isOpen: boolean) {
    currentOptions = options;
    domVirtualList.update(currentOptions, isOpen);
  }

  return { domVirtualList, setupVirtualizer, updateRenderedItemState };
}
