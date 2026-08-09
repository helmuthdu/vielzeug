import type { VaultStore } from '@vielzeug/vault';

import { effect } from '@vielzeug/ripple';
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';

import type { ThemePreference } from './theme';
import type { Board } from './types';

import { boardSignal } from './board-store';
import { setThemePreference, themePreference } from './theme';

// The schema carries each row's real record and portable string-key types into the store.
type BoardRow = { board: Board; id: 'current' };
type ThemeRow = { id: 'appearance'; preference: ThemePreference };

const schema = {
  board: table<BoardRow>('id'),
  theme: table<ThemeRow>('id'),
};
const store: VaultStore<typeof schema> = createLocalStorage({ name: 'kanban', schema });

async function loadBoard(): Promise<Board | null> {
  return (await store.get('board', 'current'))?.board ?? null;
}

async function saveBoard(board: Board): Promise<void> {
  await store.put('board', { board, id: 'current' });
}

async function loadThemePreference(): Promise<ThemePreference | null> {
  return (await store.get('theme', 'appearance'))?.preference ?? null;
}

async function saveThemePreference(preference: ThemePreference): Promise<void> {
  await store.put('theme', { id: 'appearance', preference });
}

/** Hydrates local state once, then persists each later reactive update. */
export async function setupPersistence(): Promise<void> {
  const saved = await loadBoard();
  const savedThemePreference = await loadThemePreference();

  if (saved) boardSignal.value = saved;
  else await saveBoard(boardSignal.value);

  if (savedThemePreference) setThemePreference(savedThemePreference);
  else await saveThemePreference(themePreference.value);

  effect(() => {
    void saveBoard(boardSignal.value);
  });

  effect(() => {
    void saveThemePreference(themePreference.value);
  });
}
