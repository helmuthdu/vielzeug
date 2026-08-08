import type { ShortcutStep } from './parser';

export type BindingEntry = {
  readonly shortcut: readonly ShortcutStep[];
  readonly trigger: 'keydown' | 'keyup';
};

export type Handler = (event: KeyboardEvent) => void;
export type When = (event: KeyboardEvent) => boolean;

export type BindingOptions = {
  handler: Handler;
  trigger?: 'keydown' | 'keyup';
  when?: When;
};

export type BindingValue = Handler | BindingOptions;

export interface KeymapOptions {
  chordTimeout?: number;
  modKey?: 'ctrl' | 'meta';
  preventDefault?: boolean;
  stopPropagation?: boolean;
  when?: When;
}

export interface Keymap {
  [Symbol.dispose](): void;
  bind(shortcut: string, value: BindingValue): () => void;
  dispose(): void;
  readonly disposalSignal: AbortSignal;
  readonly disposed: boolean;
  listBindings(): readonly BindingEntry[];
  mount(target: EventTarget): () => void;
  unbind(shortcut: string): void;
}
