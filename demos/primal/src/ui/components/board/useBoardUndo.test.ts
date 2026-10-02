// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { createApp } from 'vue';
import type { BoardChange, TerrainRemoval } from './useBoardUndo';
import { coalesceBoardChanges, describeBoardChange, invertBoardChange, useBoardUndo } from './useBoardUndo';

const removed = (overrides: Partial<TerrainRemoval> = {}): TerrainRemoval => ({
  count: 1,
  kind: 'terrain-remove',
  name: 'Ice',
  sector: 'front',
  terrainId: 'ice',
  ...overrides,
});

describe('coalesceBoardChanges', () => {
  it('stacks consecutive removals of identical chips into one undo', () => {
    expect(coalesceBoardChanges(removed(), removed())).toMatchObject({ count: 2, kind: 'terrain-remove' });
  });

  it('replaces the pending undo when a different chip is removed', () => {
    expect(coalesceBoardChanges(removed(), removed({ sector: 'rear' }))).toMatchObject({
      count: 1,
      kind: 'terrain-remove',
      sector: 'rear',
    });
  });

  it('replaces a pending tally undo instead of merging into its delta', () => {
    const tally: BoardChange = { counter: 'damage', delta: 2, kind: 'monster-counter', name: 'Damage' };
    expect(coalesceBoardChanges(tally, removed())).toMatchObject({ kind: 'terrain-remove' });
    expect(coalesceBoardChanges(removed(), tally)).toMatchObject({ delta: 2, kind: 'monster-counter' });
  });
});

describe('invertBoardChange', () => {
  it('turns a removal into a re-placement of the same chips', () => {
    expect(invertBoardChange(removed({ count: 2 }))).toEqual({
      count: 2,
      kind: 'terrain-restore',
      name: 'Ice',
      sector: 'front',
      terrainId: 'ice',
    });
  });

  it('round-trips a restore back into a removal', () => {
    expect(invertBoardChange(invertBoardChange(removed()))).toEqual(removed());
  });
});

describe('describeBoardChange', () => {
  it('names the removed terrain', () => {
    expect(describeBoardChange(removed())).toBe('Ice removed');
  });

  it('carries the stacked chip count', () => {
    expect(describeBoardChange(removed({ count: 2 }))).toBe('Ice removed ×2');
  });
});

describe('useBoardUndo', () => {
  function setupBoard(): { applied: BoardChange[]; record: (change: BoardChange) => void; undo: () => void } {
    const applied: BoardChange[] = [];
    let api!: ReturnType<typeof useBoardUndo>;
    const app = createApp({
      setup() {
        api = useBoardUndo((change) => applied.push(change));
        return () => null;
      },
    });
    app.mount(document.createElement('div'));
    return {
      applied,
      record: (change: BoardChange) => api.record(change),
      undo: () => api.undo(),
    };
  }

  it('undoes a removal by re-placing the same chip', () => {
    const board = setupBoard();
    board.record(removed());
    board.undo();
    expect(board.applied).toEqual([
      { count: 1, kind: 'terrain-restore', name: 'Ice', sector: 'front', terrainId: 'ice' },
    ]);
  });

  it('undoes stacked removals as one re-placement', () => {
    const board = setupBoard();
    board.record(removed());
    board.record(removed());
    board.undo();
    expect(board.applied).toEqual([
      { count: 2, kind: 'terrain-restore', name: 'Ice', sector: 'front', terrainId: 'ice' },
    ]);
  });
});
