import { describe, expect, it, vi } from 'vitest';

import { createAxis1D } from '../_axis1d';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUniform(count: number, size: number, gap = 0) {
  return createAxis1D(count, () => size, gap);
}

// ─── rebuild ──────────────────────────────────────────────────────────────────

describe('createAxis1D – rebuild', () => {
  it('computes correct totalSize for uniform sizes', () => {
    const ax = makeUniform(5, 20);

    ax.rebuild();

    expect(ax.totalSize).toBe(5 * 20);
  });

  it('applies gap between items (not after last)', () => {
    const ax = makeUniform(4, 10, 5);

    ax.rebuild();

    expect(ax.totalSize).toBe(4 * 10 + 3 * 5);
  });

  it('totalSize is 0 for count 0', () => {
    const ax = makeUniform(0, 20);

    ax.rebuild();

    expect(ax.totalSize).toBe(0);
  });

  it('forceEmit resets dedup guards', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();
    ax.commitDedup(0, 2);

    ax.rebuild(true);

    expect(ax.prevStart).toBe(-1);
    expect(ax.prevEnd).toBe(-1);
    expect(ax.prevTotalSize).toBe(-1);
  });

  it('rebuild without forceEmit preserves dedup state', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();
    ax.commitDedup(0, 2);
    ax.rebuild(false);

    expect(ax.prevStart).toBe(0);
    expect(ax.prevEnd).toBe(2);
  });
});

// ─── startAt / endAt / sizeAt ─────────────────────────────────────────────────

describe('createAxis1D – offset helpers', () => {
  it('startAt returns correct offsets', () => {
    const ax = makeUniform(5, 20);

    ax.rebuild();

    expect(ax.startAt(0)).toBe(0);
    expect(ax.startAt(1)).toBe(20);
    expect(ax.startAt(2)).toBe(40);
    expect(ax.startAt(4)).toBe(80);
  });

  it('startAt with gap returns correct offsets', () => {
    const ax = makeUniform(3, 10, 5);

    ax.rebuild();

    expect(ax.startAt(0)).toBe(0);
    expect(ax.startAt(1)).toBe(15);
    expect(ax.startAt(2)).toBe(30);
  });

  it('startAt out-of-bounds returns 0', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    expect(ax.startAt(99)).toBe(0);
  });

  it('endAt returns start + size', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    expect(ax.endAt(0)).toBe(20);
    expect(ax.endAt(1)).toBe(40);
  });

  it('sizeAt returns the size function result', () => {
    const ax = createAxis1D(3, (i) => (i + 1) * 10, 0);

    ax.rebuild();

    expect(ax.sizeAt(0)).toBe(10);
    expect(ax.sizeAt(1)).toBe(20);
    expect(ax.sizeAt(2)).toBe(30);
  });
});

// ─── rebuildFrom ──────────────────────────────────────────────────────────────

describe('createAxis1D – rebuildFrom', () => {
  it('rebuilds from a given index forward', () => {
    const sizes = [20, 20, 20, 20, 20];
    const ax = createAxis1D(5, (i) => sizes[i]!, 0);

    ax.rebuild();

    sizes[2] = 40;
    ax.rebuildFrom(2);

    expect(ax.startAt(0)).toBe(0);
    expect(ax.startAt(1)).toBe(20);
    expect(ax.startAt(2)).toBe(40);
    expect(ax.startAt(3)).toBe(80);
    expect(ax.startAt(4)).toBe(100);
    expect(ax.totalSize).toBe(120);
  });

  it('rebuildFrom always resets dedup guards', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();
    ax.commitDedup(0, 2);
    ax.rebuildFrom(0);

    expect(ax.prevStart).toBe(-1);
    expect(ax.prevEnd).toBe(-1);
  });

  it('is a no-op for fromIndex >= count', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    const before = ax.totalSize;

    ax.rebuildFrom(3);

    expect(ax.totalSize).toBe(before);
  });

  it('is a no-op for Infinity', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    const before = ax.totalSize;

    ax.rebuildFrom(Infinity);

    expect(ax.totalSize).toBe(before);
  });
});

// ─── findFirst / findLast ─────────────────────────────────────────────────────

describe('createAxis1D – findFirst / findLast', () => {
  it('findFirst returns the first item whose end exceeds viewportStart', () => {
    const ax = makeUniform(10, 20);

    ax.rebuild();

    expect(ax.findFirst(0)).toBe(0);
    expect(ax.findFirst(20)).toBe(1);
    expect(ax.findFirst(39)).toBe(1);
    expect(ax.findFirst(40)).toBe(2);
  });

  it('findLast returns the last item whose start is below viewportEnd', () => {
    const ax = makeUniform(10, 20);

    ax.rebuild();

    expect(ax.findLast(20, 0)).toBe(0);
    expect(ax.findLast(40, 0)).toBe(1);
    expect(ax.findLast(60, 0)).toBe(2);
  });

  it('findFirst clamps to 0 for viewportStart <= 0', () => {
    const ax = makeUniform(5, 20);

    ax.rebuild();

    expect(ax.findFirst(-50)).toBe(0);
  });
});

// ─── computeRange ─────────────────────────────────────────────────────────────

describe('createAxis1D – computeRange', () => {
  it('returns correct renderStart/renderEnd with overscan', () => {
    const ax = makeUniform(20, 20);

    ax.rebuild();

    // viewport [40, 120] on 20px items: first visible = 2 (start=40), last visible = 5 (end=100)
    // with overscan 1 each: renderStart = 1, renderEnd = 6
    const { renderEnd, renderStart } = ax.computeRange(40, 120, 1, 1);

    expect(renderStart).toBe(1);
    expect(renderEnd).toBe(6);
  });

  it('clamps renderStart to 0', () => {
    const ax = makeUniform(10, 20);

    ax.rebuild();

    const { renderStart } = ax.computeRange(0, 60, 5, 5);

    expect(renderStart).toBe(0);
  });

  it('clamps renderEnd to count - 1', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    const { renderEnd } = ax.computeRange(0, 100, 0, 99);

    expect(renderEnd).toBe(2);
  });
});

// ─── dedup helpers ────────────────────────────────────────────────────────────

describe('createAxis1D – dedup helpers', () => {
  it('isDedupSame returns true when start/end/totalSize unchanged', () => {
    const ax = makeUniform(5, 20);

    ax.rebuild();
    ax.commitDedup(1, 4);

    expect(ax.isDedupSame(1, 4)).toBe(true);
  });

  it('isDedupSame returns false when start differs', () => {
    const ax = makeUniform(5, 20);

    ax.rebuild();
    ax.commitDedup(1, 4);

    expect(ax.isDedupSame(0, 4)).toBe(false);
  });

  it('isDedupSame returns false when totalSize differs', () => {
    const sizes = [20, 20, 20];
    const ax = createAxis1D(3, (i) => sizes[i]!, 0);

    ax.rebuild();
    ax.commitDedup(0, 2);

    sizes[0] = 50;
    ax.rebuild();

    expect(ax.isDedupSame(0, 2)).toBe(false);
  });

  it('resetDedup sets all guard values to -1', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();
    ax.commitDedup(0, 2);
    ax.resetDedup();

    expect(ax.prevStart).toBe(-1);
    expect(ax.prevEnd).toBe(-1);
    expect(ax.prevTotalSize).toBe(-1);
  });
});

// ─── scheduleBuild ────────────────────────────────────────────────────────────

describe('createAxis1D – scheduleBuild', () => {
  it('coalesces multiple markChanged calls into one rebuild', async () => {
    const sizes = [20, 20, 20, 20, 20];
    const ax = createAxis1D(5, (i) => sizes[i]!, 0);

    ax.rebuild();

    sizes[1] = 40;
    sizes[3] = 60;
    ax.markChanged(1);
    ax.markChanged(3);

    const onFlush = vi.fn();

    ax.scheduleBuild(onFlush);

    await Promise.resolve();

    expect(onFlush).toHaveBeenCalledOnce();
    expect(ax.startAt(2)).toBe(60);
    expect(ax.totalSize).toBe(20 + 40 + 20 + 60 + 20);
  });

  it('does not schedule a second build when one is already pending', async () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    const onFlush = vi.fn();

    ax.markChanged(0);
    ax.scheduleBuild(onFlush);

    ax.markChanged(1);
    ax.scheduleBuild(onFlush);

    await Promise.resolve();

    expect(onFlush).toHaveBeenCalledOnce();
  });

  it('pendingBuild is true while a build is queued', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();
    ax.markChanged(0);
    ax.scheduleBuild(() => {});

    expect(ax.pendingBuild).toBe(true);
  });
});

// ─── consumeMinChangedIndex ────────────────────────────────────────────────────

describe('createAxis1D – consumeMinChangedIndex', () => {
  it('returns and resets minChangedIndex atomically', () => {
    const ax = makeUniform(5, 20);

    ax.rebuild();
    ax.markChanged(3);
    ax.markChanged(1);

    const idx = ax.consumeMinChangedIndex();

    expect(idx).toBe(1);
    expect(ax.minChangedIndex).toBe(Infinity);
  });

  it('returns Infinity when no change is pending', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    expect(ax.consumeMinChangedIndex()).toBe(Infinity);
  });
});

// ─── itemAt ───────────────────────────────────────────────────────────────────

describe('createAxis1D – itemAt', () => {
  it('returns correct start/end/size/index', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();

    expect(ax.itemAt(0)).toEqual({ end: 20, index: 0, size: 20, start: 0 });
    expect(ax.itemAt(1)).toEqual({ end: 40, index: 1, size: 20, start: 20 });
    expect(ax.itemAt(2)).toEqual({ end: 60, index: 2, size: 20, start: 40 });
  });

  it('end equals start + size', () => {
    const sizes = [10, 30, 20];
    const ax = createAxis1D(3, (i) => sizes[i]!, 5);

    ax.rebuild();

    const item = ax.itemAt(1);

    expect(item.end).toBe(item.start + item.size);
  });
});

// ─── setCount / setGap ────────────────────────────────────────────────────────

describe('createAxis1D – setCount / setGap', () => {
  it('setCount updates the count used in rebuild', () => {
    const ax = makeUniform(3, 20);

    ax.rebuild();
    ax.setCount(5);
    ax.rebuild();

    expect(ax.count).toBe(5);
    expect(ax.totalSize).toBe(5 * 20);
  });

  it('setGap updates the gap used in rebuild', () => {
    const ax = makeUniform(3, 10);

    ax.rebuild();
    ax.setGap(5);
    ax.rebuild();

    expect(ax.gap).toBe(5);
    expect(ax.totalSize).toBe(3 * 10 + 2 * 5);
  });
});
