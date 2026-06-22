import type { ShortcutStep } from './parser';

export type BindingEntry = {
  readonly priority: number;
  readonly shortcut: readonly ShortcutStep[];
  readonly trigger: 'keydown' | 'keyup';
};

export type Handler = (event: KeyboardEvent) => void;

export type BindingOptions = {
  handler: Handler;
  priority?: number;
  trigger?: 'keydown' | 'keyup';
  when?: () => boolean;
};

export type BindingValue = Handler | BindingOptions;

export interface KeymapOptions {
  chordTimeout?: number;
  modKey?: 'ctrl' | 'meta';
  preventDefault?: boolean;
  stopPropagation?: boolean;
  when?: () => boolean;
}

export interface Keymap {
  bind(shortcut: string, value: BindingValue): () => void;
  dispose(): void;
  listBindings(): readonly BindingEntry[];
  mount(target: EventTarget): () => void;
  unbind(shortcut: string): void;
  [Symbol.dispose](): void;
}
