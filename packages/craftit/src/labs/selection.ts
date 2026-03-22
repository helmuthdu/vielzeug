/**
 * Selection mode: single or multiple.
 */
export type SelectionMode = 'multiple' | 'single';

/**
 * Key-driven selection controller.
 *
 * Works with arbitrary data structures via constructor options.
 * Manages selection state, deduplication, and serialization independently of item shape.
 */
export type SelectionController = {
  /** Clear all selections. */
  clear: () => void;
  /** Check if a key is currently selected. */
  isSelected: (key: string) => boolean;
  /** Remove a key from selection. */
  remove: (key: string) => void;
  /** Select a key (single or add to multiple). */
  select: (key: string) => void;
  /** Serialize all selected keys to a string (comma-separated by default). */
  serialize: (separator?: string) => string;
  /** Toggle a key's selection state. */
  toggle: (key: string) => void;
};

/**
 * Key extractor function: given an item, extract its unique key.
 */
export type SelectionKeyExtractor<T> = (item: T) => string;

/**
 * Selection controller options.
 *
 * @typeParam T - Item type (any data structure)
 */
export type SelectionControllerOptions<T> = {
  /** Lookup function: given a key, find or reconstruct the item */
  findByKey: (key: string) => T | undefined;
  /** Getter: current selection mode */
  getMode: () => SelectionMode;
  /** Getter: currently selected items */
  getSelected: () => T[];
  /** Extractor: derive the unique key from an item */
  keyExtractor: SelectionKeyExtractor<T>;
  /** Setter: update selection to a new array of items */
  setSelected: (next: T[]) => void;
};

/**
 * Creates a key-driven selection controller.
 *
 * Decouples selection logic from item shape by working exclusively with extracted keys.
 * Manages deduplication and mode-aware selection (single vs. multiple).
 *
 * @example
 * ```typescript
 * const controller = createSelectionControl({
 *   getMode: () => 'multiple',
 *   getSelected: () => selected.value,
 *   setSelected: (next) => { selected.value = next; },
 *   keyExtractor: (item) => item.id,
 *   findByKey: (id) => allItems.find((i) => i.id === id),
 * });
 *
 * controller.select('item-1');
 * controller.toggle('item-2');
 * if (controller.isSelected('item-1')) { ... }
 * ```
 */
export const createSelectionControl = <T>(options: SelectionControllerOptions<T>): SelectionController => {
  const getSelectedKeys = (): string[] => options.getSelected().map(options.keyExtractor);

  const isSelected = (key: string): boolean => getSelectedKeys().includes(key);

  const clear = (): void => {
    options.setSelected([]);
  };

  const select = (key: string): void => {
    const item = options.findByKey(key);

    if (!item) return;

    if (options.getMode() === 'single') {
      options.setSelected([item]);

      return;
    }

    if (isSelected(key)) return;

    options.setSelected([...options.getSelected(), item]);
  };

  const toggle = (key: string): void => {
    const item = options.findByKey(key);

    if (!item) return;

    if (options.getMode() === 'single') {
      options.setSelected([item]);

      return;
    }

    if (isSelected(key)) {
      options.setSelected(options.getSelected().filter((entry) => options.keyExtractor(entry) !== key));

      return;
    }

    options.setSelected([...options.getSelected(), item]);
  };

  const remove = (key: string): void => {
    options.setSelected(options.getSelected().filter((entry) => options.keyExtractor(entry) !== key));
  };

  const serialize = (separator = ','): string => getSelectedKeys().join(separator);

  return {
    clear,
    isSelected,
    remove,
    select,
    serialize,
    toggle,
  };
};
