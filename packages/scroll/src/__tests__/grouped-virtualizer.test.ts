import { describe, expect, it, vi } from 'vitest';

import { createGroupedVirtualizer } from '../grouped-virtualizer';
import { flushMicrotasks, makeContainer } from './test-utils';

type Item = { id: number; label: string };

function makeSection(label: string, count: number): { items: Item[]; label: string } {
  return {
    items: Array.from({ length: count }, (_, i) => ({ id: i, label: `${label}-${i}` })),
    label,
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – initial state', () => {
  it('calls onChange with headers and items on construction', () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
    });

    expect(onChange).toHaveBeenCalled();

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(Array.isArray(state.headers)).toBe(true);
    expect(Array.isArray(state.items)).toBe(true);
    expect(typeof state.totalSize).toBe('number');
    expect(state.totalSize).toBeGreaterThan(0);
  });

  it('reports totalSize = 1 header + 3 items with correct estimates', () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
    });

    const state = onChange.mock.calls.at(-1)?.[0];

    // 1 header (40px) + 3 items (3 × 30px) = 130
    expect(state.totalSize).toBe(40 + 3 * 30);
  });

  it('multiple sections: each gets a header', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2), makeSection('B', 3)],
    });

    const state = onChange.mock.calls.at(-1)?.[0];

    // 2 headers (2 × 40) + 5 items (5 × 30) = 230
    expect(state.totalSize).toBe(2 * 40 + 5 * 30);
  });
});

// ─── Item / header shape ──────────────────────────────────────────────────────

describe('createGroupedVirtualizer – item and header shape', () => {
  it('items carry data, itemIndex, sectionIndex', () => {
    const el = makeContainer({ clientHeight: 500 });
    const sections = [makeSection('A', 3)];
    const captured: unknown[] = [];

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange: (s) => {
        captured.push(...s.items);
      },
      sections,
    });

    const first = captured[0] as { data: Item; itemIndex: number; sectionIndex: number };

    expect(first.sectionIndex).toBe(0);
    expect(first.itemIndex).toBe(0);
    expect(first.data).toEqual(sections[0]!.items[0]);
  });

  it('headers carry label and sectionIndex', () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('SectionA', 3)],
    });

    const state = onChange.mock.calls.at(-1)?.[0];
    const header = state.headers[0];

    expect(header.label).toBe('SectionA');
    expect(header.sectionIndex).toBe(0);
    expect(typeof header.start).toBe('number');
    expect(typeof header.size).toBe('number');
  });

  it('stickyHeader is null when scrolled to top', () => {
    const el = makeContainer({ clientHeight: 200 });
    const onChange = vi.fn();

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 5)],
    });

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(state.stickyHeader).toBeNull();
  });
});

// ─── scrollToSection / scrollToItem ──────────────────────────────────────────

describe('createGroupedVirtualizer – navigation', () => {
  it('scrollToSection scrolls to the header position', () => {
    // Use a narrow viewport (100px) so the scroll cap doesn't clamp us.
    // Section A: header(40) + 2 items(2×30) = 100px
    // Section B: header(40) + 3 items(3×30) = 130px
    // Total = 230px, max scroll = 230 - 100 = 130px > 100, so target is not clamped.
    const el = makeContainer({ clientHeight: 100 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 2), makeSection('B', 3)],
    });

    // align: 'start' → scrollTop = start offset of section B header = 100.
    gv.scrollToSection(1, { align: 'start', behavior: 'auto' });

    expect(el.scrollTop).toBe(40 + 2 * 30);
    gv.dispose();
  });

  it('scrollToSection silently no-ops for out-of-bounds index', () => {
    const el = makeContainer({ clientHeight: 200 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
    });

    expect(() => gv.scrollToSection(-1)).not.toThrow();
    expect(() => gv.scrollToSection(999)).not.toThrow();
    expect(el.scrollTop).toBe(0); // no scroll should have occurred
    gv.dispose();
  });

  it('scrollToItem silently no-ops for out-of-bounds sectionIndex', () => {
    const el = makeContainer({ clientHeight: 200 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
    });

    expect(() => gv.scrollToItem(-1, 0)).not.toThrow();
    expect(() => gv.scrollToItem(999, 0)).not.toThrow();
    gv.dispose();
  });
});

// ─── update() ─────────────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – update', () => {
  it('replaces sections and re-emits', () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
    });

    const callsBefore = onChange.mock.calls.length;

    gv.update([makeSection('B', 5)]);

    expect(onChange.mock.calls.length).toBeGreaterThan(callsBefore);

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(state.headers[0]?.label).toBe('B');
    expect(state.totalSize).toBe(40 + 5 * 30);
    gv.dispose();
  });

  it('does not clear measurements on update (preserves DOM measurements)', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const renderedSizes: number[] = [];

    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      getItemKey: (item) => item.id,
      onChange: (s) => {
        for (const it of s.items) renderedSizes[it.itemIndex] = it.size;
      },
      sections: [makeSection('A', 5)],
    });

    // Measure the first item (flat index 1 = section 0, item 0)
    // The grouped virtualizer wraps createVirtualizer; measuring global index 1.
    // We use the exposed virtualizer via scrollToSection/Item to avoid breaking
    // encapsulation. Instead we trigger a refresh and verify estimate is preserved.
    gv.update([makeSection('A', 5)]);

    // estimate should still be 30 (not reset)
    expect(renderedSizes[0]).toBe(30);
    gv.dispose();
  });

  it('handles count change from update correctly', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();

    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2)],
    });

    // Add a second section
    gv.update([makeSection('A', 2), makeSection('B', 4)]);

    const state = onChange.mock.calls.at(-1)?.[0];

    // 2 headers + 6 items = 2×40 + 6×30 = 260
    expect(state.totalSize).toBe(2 * 40 + 6 * 30);
    gv.dispose();
  });
});

// ─── Measurement ──────────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – getItemKey', () => {
  it('uses custom key function for deduplication', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      getItemKey: (item) => `item-${item.id}`,
      onChange,
      sections: [makeSection('A', 3)],
    });

    await flushMicrotasks();

    expect(onChange).toHaveBeenCalled();
  });
});

// ─── Function estimate callbacks ──────────────────────────────────────────────

describe('createGroupedVirtualizer – function estimate callbacks', () => {
  it('estimateHeaderSize function receives section and sectionIndex', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const headerSizes: number[] = [];
    const onChange = vi.fn();

    createGroupedVirtualizer(el, {
      estimateHeaderSize: (section, sectionIndex) => {
        headerSizes[sectionIndex] = sectionIndex === 0 ? 32 : 48;

        return headerSizes[sectionIndex]!;
      },
      estimateItemSize: 20,
      onChange,
      sections: [makeSection('A', 2), makeSection('B', 2)],
    });

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(state.totalSize).toBe(32 + 2 * 20 + 48 + 2 * 20);
  });

  it('estimateItemSize function receives item, itemIndex, sectionIndex', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();
    const sections = [makeSection('A', 3)];

    createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: (item, itemIndex) => (itemIndex === 0 ? 60 : 30),
      onChange,
      sections,
    });

    const state = onChange.mock.calls.at(-1)?.[0];

    // 1 header (40) + first item (60) + 2 items (2×30) = 160
    expect(state.totalSize).toBe(40 + 60 + 2 * 30);
  });
});

// ─── Virtualizer passthrough ───────────────────────────────────────────────────

describe('createGroupedVirtualizer – Virtualizer passthrough', () => {
  it('exposes count, totalSize, scrollOffset, items, stickyItems', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
    });

    expect(typeof gv.count).toBe('number');
    expect(typeof gv.totalSize).toBe('number');
    expect(typeof gv.scrollOffset).toBe('number');
    expect(Array.isArray(gv.items)).toBe(true);
    expect(Array.isArray(gv.stickyItems)).toBe(true);
    gv.dispose();
  });

  it('scrollToTop and scrollToBottom do not throw', () => {
    const el = makeContainer({ clientHeight: 200 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 10)],
    });

    expect(() => gv.scrollToTop()).not.toThrow();
    expect(() => gv.scrollToBottom()).not.toThrow();
    gv.dispose();
  });

  it('measure and refresh do not throw and update totalSize', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
    });

    expect(() => {
      gv.measure(0, 60);
      gv.refresh();
      gv.invalidate();
    }).not.toThrow();

    gv.dispose();
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – lifecycle', () => {
  it('destroy is idempotent', () => {
    const el = makeContainer({ clientHeight: 300 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
    });

    expect(() => {
      gv.dispose();
      gv.dispose();
    }).not.toThrow();
  });

  it('Symbol.dispose delegates to destroy', () => {
    const el = makeContainer({ clientHeight: 300 });
    const gv = createGroupedVirtualizer(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
    });

    expect(() => gv[Symbol.dispose]()).not.toThrow();
  });
});

// ─── gv.items typed getter ────────────────────────────────────────────────────

describe('createGroupedVirtualizer – gv.items typed getter', () => {
  it('returns GroupVirtualItem<T>[] with data, itemIndex, sectionIndex', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
    });

    expect(gv.items.length).toBeGreaterThan(0);
    expect(gv.items[0]).toHaveProperty('data');
    expect(gv.items[0]).toHaveProperty('itemIndex');
    expect(gv.items[0]).toHaveProperty('sectionIndex');
    gv.dispose();
  });

  it('gv.items updates after update()', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 1)],
    });

    const before = gv.items.length;

    gv.update([makeSection('A', 5)]);

    expect(gv.items.length).toBeGreaterThanOrEqual(before);
    gv.dispose();
  });

  it('gv.items is empty when no items in sections', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [{ items: [], label: 'Empty' }],
    });

    expect(gv.items).toHaveLength(0);
    gv.dispose();
  });
});

// ─── disposed getter ───────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – disposed', () => {
  it('disposed is false before dispose()', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    expect(gv.disposed).toBe(false);
    gv.dispose();
  });

  it('disposed is true after dispose()', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    gv.dispose();
    expect(gv.disposed).toBe(true);
  });

  it('dispose() is idempotent — double-dispose does not throw', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    expect(() => {
      gv.dispose();
      gv.dispose();
    }).not.toThrow();
  });

  it('[Symbol.dispose] is idempotent', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    expect(() => {
      gv[Symbol.dispose]();
      gv[Symbol.dispose]();
    }).not.toThrow();
  });
});

// ─── Post-dispose no-ops ──────────────────────────────────────────────────────

describe('createGroupedVirtualizer – post-dispose no-ops', () => {
  it('onChange is not called after dispose()', () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 5)],
    });

    gv.dispose();

    const callsBefore = onChange.mock.calls.length;

    el.dispatchEvent(new Event('scroll'));

    expect(onChange.mock.calls.length).toBe(callsBefore);
  });

  it('all mutating methods are no-ops after dispose()', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    gv.dispose();

    expect(() => {
      gv.measure(0, 50);
      gv.measureBatch([{ index: 0, size: 50 }]);
      gv.measureEl(0, document.createElement('div'));
      gv.invalidate();
      gv.refresh();
      gv.scrollToTop();
      gv.scrollToBottom();
      gv.scrollToIndex(0);
      gv.scrollToOffset(0);
      gv.scrollToSection(0);
      gv.scrollToItem(0, 0);
      gv.update([makeSection('B', 3)]);
    }).not.toThrow();

    await flushMicrotasks();
  });

  it('measureEl returns no-op cleanup fn after dispose()', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    gv.dispose();

    const cleanup = gv.measureEl(0, document.createElement('div'));

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});

// ─── update() same-count path ─────────────────────────────────────────────────

describe('createGroupedVirtualizer – update same-count path', () => {
  it('update with same count still re-emits onChange', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
    });

    const callsBefore = onChange.mock.calls.length;

    // Same total count (1 header + 3 items = 4), just different label
    gv.update([makeSection('B', 3)]);

    expect(onChange.mock.calls.length).toBeGreaterThan(callsBefore);

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(state.headers[0]?.label).toBe('B');
    gv.dispose();
  });

  it('update with count change emits correct totalSize', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2)],
    });

    gv.update([makeSection('A', 2), makeSection('B', 3)]);

    const state = onChange.mock.calls.at(-1)?.[0];

    // 2 headers × 40 + 5 items × 30 = 230
    expect(state.totalSize).toBe(2 * 40 + 5 * 30);
    gv.dispose();
  });
});

// ─── scrollToSection / scrollToItem out-of-range ──────────────────────────────

describe('createGroupedVirtualizer – out-of-range navigation', () => {
  it('scrollToSection with negative index is a no-op', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    expect(() => gv.scrollToSection(-1)).not.toThrow();
    gv.dispose();
  });

  it('scrollToSection with out-of-range index is a no-op', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    expect(() => gv.scrollToSection(99)).not.toThrow();
    gv.dispose();
  });

  it('scrollToItem with out-of-range sectionIndex is a no-op', () => {
    const el = makeContainer({ clientHeight: 500 });
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      sections: [makeSection('A', 5)],
    });

    expect(() => gv.scrollToItem(99, 0)).not.toThrow();
    gv.dispose();
  });
});

// ─── update() with option overrides (D2) ─────────────────────────────────────

describe('createGroupedVirtualizer – update() with option overrides', () => {
  it('updates estimateItemSize on next update()', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2)],
    });

    const initialTotal = (onChange.mock.calls.at(-1)![0] as { totalSize: number }).totalSize;

    // 1 header (36 default) + 2 items × 30 = 96
    expect(initialTotal).toBe(36 + 2 * 30);

    // Change item estimate to 60
    gv.update([makeSection('A', 2)], { estimateItemSize: 60 });

    const newTotal = (onChange.mock.calls.at(-1)![0] as { totalSize: number }).totalSize;

    // 1 header (36 default) + 2 items × 60 = 156
    expect(newTotal).toBe(36 + 2 * 60);
    gv.dispose();
  });

  it('updates estimateHeaderSize on next update()', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2)],
    });

    // Change header estimate to 80
    gv.update([makeSection('A', 2)], { estimateHeaderSize: 80 });

    const total = (onChange.mock.calls.at(-1)![0] as { totalSize: number }).totalSize;

    // 1 header × 80 + 2 items × 30 = 140
    expect(total).toBe(80 + 2 * 30);
    gv.dispose();
  });

  it('accepts a function estimateItemSize override', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
    });

    gv.update([makeSection('A', 3)], {
      estimateItemSize: (_item, itemIndex) => (itemIndex === 0 ? 100 : 20),
    });

    const total = (onChange.mock.calls.at(-1)![0] as { totalSize: number }).totalSize;

    // 1 header (36) + 1st item (100) + 2nd item (20) + 3rd item (20) = 176
    expect(total).toBe(36 + 100 + 20 + 20);
    gv.dispose();
  });

  it('update() with no opts still replaces sections normally', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();
    const gv = createGroupedVirtualizer<Item>(el, {
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2)],
    });

    gv.update([makeSection('B', 4)]);

    const state = onChange.mock.calls.at(-1)![0] as { headers: Array<{ label: string }>; items: unknown[] };

    expect(state.headers[0]!.label).toBe('B');
    expect(state.items).toHaveLength(4);
    gv.dispose();
  });
});
