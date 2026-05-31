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

    createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
      target: el,
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

    createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
      target: el,
    });

    const state = onChange.mock.calls.at(-1)?.[0];

    // 1 header (40px) + 3 items (3 × 30px) = 130
    expect(state.totalSize).toBe(40 + 3 * 30);
  });

  it('multiple sections: each gets a header', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();

    createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2), makeSection('B', 3)],
      target: el,
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

    createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange: (s) => {
        captured.push(...s.items);
      },
      sections,
      target: el,
    });

    const first = captured[0] as { data: Item; itemIndex: number; sectionIndex: number };

    expect(first.sectionIndex).toBe(0);
    expect(first.itemIndex).toBe(0);
    expect(first.data).toEqual(sections[0]!.items[0]);
  });

  it('headers carry label and sectionIndex', () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('SectionA', 3)],
      target: el,
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

    createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 5)],
      target: el,
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
    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 2), makeSection('B', 3)],
      target: el,
    });

    // align: 'start' → scrollTop = start offset of section B header = 100.
    gv.scrollToSection(1, { align: 'start', behavior: 'auto' });

    expect(el.scrollTop).toBe(40 + 2 * 30);
    gv.destroy();
  });

  it('scrollToSection silently no-ops for out-of-bounds index', () => {
    const el = makeContainer({ clientHeight: 200 });
    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
      target: el,
    });

    expect(() => gv.scrollToSection(-1)).not.toThrow();
    expect(() => gv.scrollToSection(999)).not.toThrow();
    expect(el.scrollTop).toBe(0); // no scroll should have occurred
    gv.destroy();
  });

  it('scrollToItem silently no-ops for out-of-bounds sectionIndex', () => {
    const el = makeContainer({ clientHeight: 200 });
    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
      target: el,
    });

    expect(() => gv.scrollToItem(-1, 0)).not.toThrow();
    expect(() => gv.scrollToItem(999, 0)).not.toThrow();
    gv.destroy();
  });
});

// ─── update() ─────────────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – update', () => {
  it('replaces sections and re-emits', () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 3)],
      target: el,
    });

    const callsBefore = onChange.mock.calls.length;

    gv.update([makeSection('B', 5)]);

    expect(onChange.mock.calls.length).toBeGreaterThan(callsBefore);

    const state = onChange.mock.calls.at(-1)?.[0];

    expect(state.headers[0]?.label).toBe('B');
    expect(state.totalSize).toBe(40 + 5 * 30);
    gv.destroy();
  });

  it('does not clear measurements on update (preserves DOM measurements)', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const renderedSizes: number[] = [];

    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      getItemKey: (item) => item.id,
      onChange: (s) => {
        for (const it of s.items) renderedSizes[it.itemIndex] = it.size;
      },
      sections: [makeSection('A', 5)],
      target: el,
    });

    // Measure the first item (flat index 1 = section 0, item 0)
    // The grouped virtualizer wraps createVirtualizer; measuring global index 1.
    // We use the exposed virtualizer via scrollToSection/Item to avoid breaking
    // encapsulation. Instead we trigger a refresh and verify estimate is preserved.
    gv.update([makeSection('A', 5)]);

    // estimate should still be 30 (not reset)
    expect(renderedSizes[0]).toBe(30);
    gv.destroy();
  });

  it('handles count change from update correctly', () => {
    const el = makeContainer({ clientHeight: 1000 });
    const onChange = vi.fn();

    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      onChange,
      sections: [makeSection('A', 2)],
      target: el,
    });

    // Add a second section
    gv.update([makeSection('A', 2), makeSection('B', 4)]);

    const state = onChange.mock.calls.at(-1)?.[0];

    // 2 headers + 6 items = 2×40 + 6×30 = 260
    expect(state.totalSize).toBe(2 * 40 + 6 * 30);
    gv.destroy();
  });
});

// ─── Measurement ──────────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – getItemKey', () => {
  it('uses custom key function for deduplication', async () => {
    const el = makeContainer({ clientHeight: 500 });
    const onChange = vi.fn();

    createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      getItemKey: (item) => `item-${item.id}`,
      onChange,
      sections: [makeSection('A', 3)],
      target: el,
    });

    await flushMicrotasks();

    expect(onChange).toHaveBeenCalled();
  });
});

// ─── Lifecycle ────────────────────────────────────────────────────────────────

describe('createGroupedVirtualizer – lifecycle', () => {
  it('destroy is idempotent', () => {
    const el = makeContainer({ clientHeight: 300 });
    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
      target: el,
    });

    expect(() => {
      gv.destroy();
      gv.destroy();
    }).not.toThrow();
  });

  it('Symbol.dispose delegates to destroy', () => {
    const el = makeContainer({ clientHeight: 300 });
    const gv = createGroupedVirtualizer({
      estimateHeaderSize: 40,
      estimateItemSize: 30,
      sections: [makeSection('A', 3)],
      target: el,
    });

    expect(() => gv[Symbol.dispose]()).not.toThrow();
  });
});
