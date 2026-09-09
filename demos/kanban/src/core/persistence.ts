import { effect } from '@vielzeug/ripple';
import { s } from '@vielzeug/spell';
import type { KeyValueVaultStore } from '@vielzeug/vault';
import { table } from '@vielzeug/vault';
import { createLocalStorage } from '@vielzeug/vault/local-storage';
import { boardSignal } from './board-store';
import type { ThemePreference } from './theme';
import { setThemePreference, themePreference } from './theme';
import type { Board } from './types';

// The schema carries each row's real record and portable string-key types into the store.
type BoardRow = { board: Board; id: 'current' };
type ThemeRow = { id: 'appearance'; preference: ThemePreference };

// Codecs validate values crossing the localStorage trust boundary on read (and re-check on
// write). `@vielzeug/spell` schemas satisfy vault's `RecordParser` shape directly — vault wraps
// them with an identity encode — so a corrupt or schema-drifted persisted board is rejected at
// the decode boundary instead of silently hydrating the app with malformed state.
const TaskStatusSchema = s.enum(['todo', 'in-progress', 'review', 'done']);
const TaskPrioritySchema = s.enum(['low', 'medium', 'high', 'urgent']);
const BudgetSchema = s.object({ amount: s.string(), currency: s.string() });
const TaskSchema = s.object({
  assigneeId: s.union(s.string(), s.null()),
  budget: s.union(BudgetSchema, s.null()),
  completedAt: s.union(s.string(), s.null()),
  description: s.string(),
  dueDate: s.union(s.string(), s.null()),
  id: s.string(),
  ownerId: s.string(),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  title: s.string(),
});
const ColumnSchema = s.object({
  id: TaskStatusSchema,
  title: s.string(),
  wipLimit: s.number().optional(),
});
const BoardSchema = s.object({ columns: s.array(ColumnSchema), tasks: s.array(TaskSchema) });
const BoardRowSchema = s.object({ board: BoardSchema, id: s.literal('current') });
const ThemeRowSchema = s.object({ id: s.literal('appearance'), preference: s.enum(['dark', 'light', 'system']) });

const schema = {
  board: table<BoardRow>('id'),
  theme: table<ThemeRow>('id'),
};
const store: KeyValueVaultStore<typeof schema> = createLocalStorage({
  codecs: {
    board: BoardRowSchema,
    theme: ThemeRowSchema,
  },
  name: 'kanban',
  schema,
});

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
