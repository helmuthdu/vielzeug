import { describe, expect, it } from 'vitest';

import { addShapeCommand, createBoardModel, moveShapesCommand, removeShapesCommand } from '../board.ts';

function seed() {
  const model = createBoardModel();
  model.add({ height: 40, id: 'a', width: 60, x: 0, y: 0 });
  model.add({ height: 40, id: 'b', width: 60, x: 100, y: 100 });
  return model;
}

describe('board model', () => {
  it('hit-tests the topmost shape at a point', () => {
    const model = seed();
    model.add({ height: 20, id: 'c', width: 20, x: 5, y: 5 });
    expect(model.hitTest({ x: 10, y: 10 })?.id).toBe('c');
    expect(model.hitTest({ x: 30, y: 30 })?.id).toBe('a');
    expect(model.hitTest({ x: 500, y: 500 })).toBeNull();
  });

  it('marquee selects in z-order', () => {
    const model = seed();
    expect(model.marquee({ height: 200, width: 300, x: -10, y: -10 })).toEqual(['a', 'b']);
    expect(model.marquee({ height: 60, width: 60, x: 90, y: 90 })).toEqual(['b']);
  });

  it('selection is normalised to z-order and drops unknown ids', () => {
    const model = seed();
    model.select(['b', 'ghost', 'a']);
    expect(model.selection).toEqual(['a', 'b']);
  });

  it('moveTo updates the index so hit-tests follow the shape', () => {
    const model = seed();
    expect(model.moveTo('a', { x: 200, y: 200 })).toBe(true);
    expect(model.hitTest({ x: 10, y: 10 })).toBeNull();
    expect(model.hitTest({ x: 210, y: 210 })?.id).toBe('a');
  });

  it('notifies subscribers on mutation', () => {
    const model = seed();
    let notifications = 0;
    model.subscribe(() => {
      notifications += 1;
    });
    model.select(['a']);
    model.moveTo('a', { x: 1, y: 1 });
    expect(notifications).toBe(2);
  });

  it('commands round-trip through apply/revert', () => {
    const model = seed();
    // Contract: the move is applied first, then recorded with the pre-move positions.
    model.moveTo('a', { x: 50, y: 50 });
    const move = moveShapesCommand(model, ['a'], new Map([['a', { x: 0, y: 0 }]]));
    move.revert({ signal: new AbortController().signal });
    expect(model.get('a')).toMatchObject({ x: 0, y: 0 });
    move.apply({ signal: new AbortController().signal });
    expect(model.get('a')).toMatchObject({ x: 50, y: 50 });

    const added = { height: 10, id: 'c', width: 10, x: 0, y: 0 };
    const add = addShapeCommand(model, added);
    add.revert({ signal: new AbortController().signal });
    expect(model.get('c')).toBeUndefined();
    add.apply({ signal: new AbortController().signal });
    expect(model.get('c')).toBeDefined();

    const remove = removeShapesCommand(model, [added]);
    remove.apply({ signal: new AbortController().signal });
    expect(model.get('c')).toBeUndefined();
    remove.revert({ signal: new AbortController().signal });
    expect(model.get('c')).toBeDefined();
  });
});
