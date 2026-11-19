import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { EncounterRow } from '../persist.ts';
import {
  advanceIdCounter,
  createBoardPersistence,
  createEncounterPersistence,
  createFlowPersistence,
  createStudioStore,
} from '../persist.ts';

function rect(id: string, x = 0) {
  return { height: 40, id, kind: 'rect' as const, width: 60, x, y: 10 };
}

beforeEach(() => {
  localStorage.clear();
});

describe('studio store', () => {
  it('round-trips board shapes through localStorage', async () => {
    const store = createStudioStore();
    await store.put('boardShapes', rect('shape-1'));
    await store.put('boardShapes', rect('shape-2', 100));
    expect(await store.getAll('boardShapes')).toEqual([rect('shape-1'), rect('shape-2', 100)]);
  });

  it('rejects a malformed shape instead of trusting storage', async () => {
    const store = createStudioStore();
    await expect(
      store.put('boardShapes', { height: 1, id: 'x', kind: 'rect', width: 'wide', x: 0, y: 0 } as never),
    ).rejects.toThrow();
  });

  it('wipe drops every scene table', async () => {
    const store = createStudioStore();
    await store.put('boardShapes', rect('shape-1'));
    await store.put('flowNodes', {
      height: 64,
      id: 'node-1',
      label: 'A',
      ports: [{ id: 'in', offset: 0.5, side: 'left' }],
      width: 160,
      x: 0,
      y: 0,
    });
    await store.wipe();
    expect(await store.getAll('boardShapes')).toEqual([]);
    expect(await store.getAll('flowNodes')).toEqual([]);
  });
});

describe('scene persistence', () => {
  it('load returns stored rows and drops corrupt ones', async () => {
    const store = createStudioStore();
    const persistence = createBoardPersistence(store);
    await persistence.load();
    // Vault keys are NUL-separated: <db>\0<table>\0s:<id>.
    localStorage.setItem('vielzeug-studio\x00boardShapes\x00s:shape-9', JSON.stringify({ value: { nonsense: true } }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await persistence.load()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    expect(localStorage.getItem('vielzeug-studio\x00boardShapes\x00s:shape-9')).toBeNull();
    warn.mockRestore();
  });

  it('flush replaces the stored set so removals do not linger', async () => {
    const store = createStudioStore();
    const persistence = createBoardPersistence(store);
    persistence.flush([rect('shape-1'), rect('shape-2')]);
    await vi.waitFor(async () => expect((await store.getAll('boardShapes')).length).toBe(2));
    persistence.flush([rect('shape-2')]);
    await vi.waitFor(async () => expect(await store.getAll('boardShapes')).toEqual([rect('shape-2')]));
  });

  it('a wipe after a scheduled save leaves storage empty', async () => {
    const store = createStudioStore();
    const persistence = createBoardPersistence(store);
    persistence.schedule(() => [rect('shape-1')]);
    await persistence.wipe();
    // The frame callback that would have run is cancelled by wipe.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await vi.waitFor(async () => expect(await store.getAll('boardShapes')).toEqual([]));
  });

  it('flow persistence keeps nodes and edges in separate tables', async () => {
    const store = createStudioStore();
    const flow = createFlowPersistence(store);
    const node = {
      height: 64,
      id: 'node-1',
      label: 'A',
      ports: [{ id: 'in', offset: 0.5, side: 'left' as const }],
      width: 160,
      x: 0,
      y: 0,
    };
    const edge = { from: { node: 'node-1', port: 'out' }, id: 'edge-1', to: { node: 'node-2', port: 'in' } };
    flow.nodes.flush([node]);
    flow.edges.flush([edge]);
    await vi.waitFor(async () => {
      expect(await flow.nodes.load()).toEqual([node]);
      expect(await flow.edges.load()).toEqual([edge]);
    });
  });
});

function encounterRow(): EncounterRow {
  return {
    fog: { enabled: false, seen: [], visible: [] },
    id: 'encounter',
    state: {
      blocked: ['1:0'],
      grid: 'hex',
      units: [{ id: 'e1', move: 3, name: 'Brute', q: 2, r: 1, range: 1, team: 'enemy' }],
    },
  };
}

describe('encounter persistence', () => {
  it('round-trips the encounter row', async () => {
    const store = createStudioStore();
    const persistence = createEncounterPersistence(store);
    persistence.flush([encounterRow()]);
    await vi.waitFor(async () => expect(await persistence.load()).toEqual([encounterRow()]));
  });

  it('keeps the class and modified flag on a unit across a reload', async () => {
    const store = createStudioStore();
    const persistence = createEncounterPersistence(store);
    const base = encounterRow();
    const row: EncounterRow = {
      ...base,
      state: { ...base.state, units: [{ ...base.state.units[0], catalogId: 'brute', modified: true }] },
    };
    persistence.flush([row]);
    await vi.waitFor(async () => expect(await persistence.load()).toEqual([row]));
  });

  it('rejects a row whose unit team is invalid', async () => {
    const store = createStudioStore();
    await expect(
      store.put('encounter', {
        fog: { enabled: false, seen: [], visible: [] },
        id: 'encounter',
        state: {
          blocked: [],
          grid: 'square',
          units: [{ id: 'x', move: 1, name: 'X', q: 0, r: 0, range: 1, team: 'neutral' }],
        },
      } as never),
    ).rejects.toThrow();
  });

  it('wipe drops the encounter table too', async () => {
    const store = createStudioStore();
    const persistence = createEncounterPersistence(store);
    persistence.flush([encounterRow()]);
    await vi.waitFor(async () => expect((await persistence.load()).length).toBe(1));
    await store.wipe();
    expect(await persistence.load()).toEqual([]);
  });
});

describe('advanceIdCounter', () => {
  it('moves past the highest numbered id of a prefix', () => {
    expect(advanceIdCounter(['shape-2', 'shape-11', 'stroke-3', 'other-99'], 'shape-')).toBe(12);
    expect(advanceIdCounter(['stroke-3'], 'shape-')).toBe(1);
    expect(advanceIdCounter([], 'shape-')).toBe(1);
  });
});
