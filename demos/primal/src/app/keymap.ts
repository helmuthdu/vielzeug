import { createKeymap } from '@vielzeug/keymap';
import { redoLastSubjectCommand, undoLastSubjectCommand } from './store';
import { navigate } from './vue-bridge';

const typing = (event: KeyboardEvent): boolean => {
  const target = event.target;
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
      target.closest('ore-input, ore-textarea, ore-select') !== null)
  );
};

/** Chords stay silent while a modal dialog holds the top layer: a stray `g e` must not
 *  navigate away from (and discard) an open worksheet or confirm. The host's `open`
 *  property is the visible state; the native dialog itself lives in its shadow root,
 *  beyond a plain `querySelector('dialog[open]')`. */
const modalOpen = (): boolean =>
  Array.from(document.querySelectorAll<HTMLElement & { open?: boolean }>('ore-dialog')).some(
    (dialog) => dialog.open === true,
  );

/** Table-side navigation chords: `g` then a letter, so the companion can be driven without a mouse. */
export const shortcuts = [
  { id: 'home', label: 'Main menu', shortcut: 'g h', to: 'home' },
  { id: 'campaigns', label: 'Campaigns', shortcut: 'g c', to: 'campaigns' },
  { id: 'expeditions', label: 'Expeditions', shortcut: 'g e', to: 'expeditions' },
  { id: 'forge', label: 'Crafting', shortcut: 'g f', to: 'forge' },
  { id: 'manual', label: 'Manual', shortcut: 'g m', to: 'manual' },
  { id: 'new-game', label: 'New game', shortcut: 'g n', to: 'newGame' },
  { id: 'settings', label: 'Settings', shortcut: 'g s', to: 'settings' },
] as const;

/** In-place shortcuts bound by mountShortcuts itself, described for the shortcuts help. */
export const boundActions = [
  { id: 'undo', label: 'Undo the last action', shortcut: 'mod+z' },
  { id: 'redo', label: 'Redo the last action', shortcut: 'mod+shift+z' },
] as const;

/** An in-place shortcut registered by the composition root: for actions that live in the UI layer. */
export interface ShortcutAction {
  handler: () => void;
  id: string;
  shortcut: string;
}

export function mountShortcuts(target: Document = document, actions: readonly ShortcutAction[] = []): () => void {
  const keymap = createKeymap(
    [
      ...shortcuts.map((entry) => ({
        handler: () => void navigate(entry.to),
        id: entry.id,
        shortcut: entry.shortcut,
      })),
      ...actions,
      // Undo and redo reach the command ledger from anywhere text is not being typed;
      // the boards' counter taps keep their own five-second toast undo.
      { handler: undoLastSubjectCommand, id: 'undo', shortcut: 'mod+z' },
      { handler: redoLastSubjectCommand, id: 'redo', shortcut: 'mod+shift+z' },
    ],
    { when: (event) => !typing(event) && !modalOpen() },
  );
  const unmount = keymap.mount(target);
  return () => {
    unmount();
    keymap.dispose();
  };
}
