import { createContext } from '@vielzeug/ore';
import type { Readable } from '@vielzeug/ripple';
import type { CardPickerOrientation } from './card-picker';

export type CardPickerContext = {
  activeValue: Readable<string | null>;
  disabled: Readable<boolean>;
  orientation: Readable<CardPickerOrientation>;
  selectedValues: Readable<string[]>;
  toggle: (value: string, originalEvent?: Event) => void;
};

export const CARD_PICKER_CTX = createContext<CardPickerContext>('CardPickerContext');
