import { createContext } from '@vielzeug/ore';
import type { Readable } from '@vielzeug/ripple';

export type CardPickerContext = {
  disabled: Readable<boolean>;
  selectedValues: Readable<string[]>;
  toggle: (value: string, originalEvent?: Event) => void;
};

export const CARD_PICKER_CTX = createContext<CardPickerContext>('CardPickerContext');
