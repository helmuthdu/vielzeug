import type { Adapter } from '@vielzeug/vault';

import { effect } from '@vielzeug/ripple';
import { createLocalStorage, table } from '@vielzeug/vault';

import type { Board } from './types';

import { boardSignal } from './board-store';

// ---------------------------------------------------------------------------
// Vault schema — a single row keyed 'current' holds the whole board. A real backend-per-task
// table isn't warranted here: the board is edited/undone as one unit via history.ts's ledger,
// so persisting it as one unit keeps a reload's restore trivially consistent with that model.
//
// KNOWN ISSUE (published @vielzeug/vault@1.0.3, npm): the phantom `schemaEntryBrand` field that
// `RecordOf<S, K>` needs to recover a table's record type from `S` is present in the package's
// own source but missing from its *published* `.d.ts` — so `table<T>(...)`'s type is erased to
// `{}` by the time it reaches `Adapter<S>.get/put`. This is a packaging bug in the published
// package, not a modeling error here; casting at the two call sites below is the narrowest
// workaround. Safe to drop once a vault release re-includes the brand in its declarations.
// ---------------------------------------------------------------------------

type BoardRow = { board: Board; id: 'current' };

const schema = { board: table<BoardRow>('id') };
const store: Adapter<typeof schema> = createLocalStorage({ name: 'kanban', schema });

async function loadBoard(): Promise<Board | null> {
  const row = (await store.get('board', 'current')) as BoardRow | undefined;

  return row?.board ?? null;
}

async function saveBoard(board: Board): Promise<void> {
  await store.put('board', { board, id: 'current' } as never);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

/**
 * Hydrates `boardSignal` from vault-backed localStorage (if a prior session saved one), then
 * keeps every subsequent change durable by writing the board back on every reactive update.
 * Call once at startup, before anything reads `boardSignal`.
 */
export async function setupPersistence(): Promise<void> {
  const saved = await loadBoard();

  if (saved) boardSignal.value = saved;
  else await saveBoard(boardSignal.value);

  effect(() => {
    void saveBoard(boardSignal.value);
  });
}
