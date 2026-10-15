import { RefineError } from '../../errors';
import type { IconDefinition } from '../definition';
import { iconifyIcon, iconifyIcons } from '../iconify';
import { lucideIcons } from '../lucide';
import { registerDefaultIcons, registerIcons, resolveIcon } from '../registry';
import { createIconChildren } from '../svg';
import fixtures from './fixtures/iconify.json';

const square: IconDefinition = {
  children: [{ attrs: { d: 'M0 0h16v20H0z' }, tag: 'path' }],
  presentation: { fill: 'currentColor' },
  viewBox: [0, 0, 16, 20],
};

describe('icon data', () => {
  it('never overwrites app registrations with defaults, in either import order', () => {
    registerIcons({ BeforeDefault: square });
    registerDefaultIcons({ AfterDefault: square, BeforeDefault: { ...square, viewBox: [0, 0, 24, 24] } });
    registerIcons({ AfterDefault: { ...square, viewBox: [0, 0, 32, 32] } });
    expect(resolveIcon('before-default')?.viewBox).toEqual([0, 0, 16, 20]);
    expect(resolveIcon('after-default')?.viewBox).toEqual([0, 0, 32, 32]);
  });

  it('validates a batch atomically and snapshots caller-owned data', () => {
    expect(() => registerIcons({ AtomicIcon: square, InvalidIcon: [] as unknown as IconDefinition })).toThrow(
      RefineError,
    );
    expect(resolveIcon('atomic-icon')).toBeUndefined();
    const copy = structuredClone(square);
    registerIcons({ SnapshotIcon: copy });
    Object.assign(copy, { viewBox: [0, 0, 99, 99] });
    expect(resolveIcon('snapshot-icon')?.viewBox).toEqual([0, 0, 16, 20]);
  });

  it.each(Object.entries(fixtures))(
    'converts licensed %s Iconify data without changing shape presentation',
    (prefix, data) => {
      const icon = iconifyIcons(data, ['home'])[`${prefix}:home`];
      expect(icon.viewBox).toEqual([0, 0, 24, 24]);
      expect(icon.children[0].attrs?.fill).toBe(prefix === 'mdi' ? 'currentColor' : 'none');
      registerIcons({ [`${prefix}:home`]: icon });
      expect(resolveIcon(`${prefix}:home`)?.children).toEqual(icon.children);
    },
  );

  it('converts individual data and nested shapes with a non-24 viewBox', () => {
    const icon = iconifyIcon({
      body: '<g fill="none"><path stroke="currentColor" d="M0 0h8"/><circle fill="currentColor" r="2"/></g>',
      height: 12,
      left: -2,
      width: 20,
    });
    expect(icon.viewBox).toEqual([-2, 0, 20, 12]);
    expect(icon.children[0].children).toHaveLength(2);
  });

  it.each(['pause', 'skip-back', 'skip-forward'] as const)(
    'converts upstream Tabler %s individually, selected, and in the whole fixture collection',
    (name) => {
      const data = fixtures.tabler.icons[name];
      expect(data.body).toContain('class="icon-tabler"');
      const individual = iconifyIcon({ ...data, height: 24, width: 24 });
      expect(iconifyIcons(fixtures.tabler, [name])[`tabler:${name}`]).toEqual(individual);
      expect(iconifyIcons(fixtures.tabler)[`tabler:${name}`]).toEqual(individual);
      const [group] = createIconChildren(individual, `${name}-`);
      expect(group.hasAttribute('class')).toBe(false);
      expect(group.getAttribute('stroke')).toBe('currentColor');
      expect(group.children).toHaveLength(2);
    },
  );

  it('drops provider classes recursively without relaxing neutral definition validation', () => {
    const icon = iconifyIcon({ body: '<g class="provider"><path class="shape" d="M0 0h8"/></g>' });
    expect(createIconChildren(icon, 'classes-')[0].querySelector('[class]')).toBeNull();
    expect(() =>
      registerIcons({ Classed: { ...square, children: [{ attrs: { class: 'provider' }, tag: 'path' }] } }),
    ).toThrow(RefineError);
  });

  describe.each([
    { hFlip: false, vFlip: false },
    { hFlip: true, vFlip: false },
    { hFlip: false, vFlip: true },
    { hFlip: true, vFlip: true },
  ])('validates raw geometry before flips $hFlip/$vFlip', (flips) => {
    it.each(
      (['left', 'top', 'width', 'height'] as const).flatMap((field) =>
        [
          Number.NaN,
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          null,
          '16',
          ...(field === 'width' || field === 'height' ? [0, -1] : []),
        ].map((value) => ({ field, value })),
      ),
    )('rejects $field=$value for individual, collection, and alias geometry', ({ field, value }) => {
      const geometry = { [field]: value as number };
      const base = { body: '<path d="M0 0h8"/>' };
      expect(() => iconifyIcon({ ...base, ...geometry, ...flips })).toThrow(RefineError);
      expect(() => iconifyIcons({ ...geometry, icons: { base: { ...base, ...flips } } })).toThrow(RefineError);
      expect(() => iconifyIcons({ icons: { base: { ...base, ...geometry, ...flips } } }, ['base'])).toThrow(
        RefineError,
      );
      expect(() =>
        iconifyIcons({ aliases: { alias: { parent: 'base', ...geometry, ...flips } }, icons: { base } }, ['alias']),
      ).toThrow(RefineError);
      expect(() =>
        iconifyIcons({ ...geometry, aliases: { alias: { parent: 'base', ...flips } }, icons: { base } }, ['alias']),
      ).toThrow(RefineError);
    });
  });

  it('validates resolved geometry before parsing and permits valid per-icon overrides', () => {
    expect(() => iconifyIcon({ body: '<path', hFlip: true, left: Number.NaN })).toThrow(/geometry/);
    expect(
      iconifyIcons({
        icons: { base: { body: '<path/>', hFlip: true, left: 0 } },
        left: Number.NaN,
      }).base.viewBox,
    ).toEqual([0, 0, 16, 16]);
  });

  it('resolves aliases, inherited dimensions, flips and quarter-turn rotations', () => {
    const icons = iconifyIcons(
      {
        aliases: { flip: { hFlip: true, parent: 'shape' }, turn: { parent: 'flip', rotate: 1 } },
        height: 10,
        icons: { shape: { body: '<path d="M0 0h20v10z"/>', hFlip: true } },
        prefix: 'test',
        width: 20,
      },
      ['turn'],
    );
    expect(Object.keys(icons)).toEqual(['test:turn']);
    expect(icons['test:turn'].viewBox).toEqual([0, 0, 10, 20]);
    expect(icons['test:turn'].children[0].attrs?.transform).toBe('rotate(90 5 5)');
  });

  it.each([
    { box: [3, 2, 10, 20], hFlip: false, rotate: 1, transform: 'rotate(90 8 8)', vFlip: false },
    {
      box: [0, 0, 10, 20],
      hFlip: true,
      rotate: 1,
      transform: 'rotate(90 5 5) translate(22 -3) scale(-1 1)',
      vFlip: false,
    },
    {
      box: [0, 0, 10, 20],
      hFlip: false,
      rotate: -1,
      transform: 'rotate(-90 10 10) translate(-2 13) scale(1 -1)',
      vFlip: true,
    },
    { box: [3, 2, 10, 20], hFlip: true, rotate: 1, transform: 'rotate(-90 12 12)', vFlip: true },
  ])('matches Iconify flip-before-rotation coordinates: $transform', ({ rotate, hFlip, vFlip, box, transform }) => {
    const icon = iconifyIcons(
      {
        aliases: { result: { hFlip: !hFlip, parent: 'base', rotate: rotate - 2, vFlip } },
        height: 10,
        icons: { base: { body: '<path d="M2 3h20v10z"/>', hFlip: true, rotate: 2 } },
        left: 2,
        top: 3,
        width: 20,
      },
      ['result'],
    ).result;
    expect(icon.viewBox).toEqual(box);
    expect(icon.children[0].attrs?.transform).toBe(transform);
  });

  it('reports missing and cyclic aliases instead of silently dropping them', () => {
    expect(() => iconifyIcons({ icons: {} }, ['missing'])).toThrow(RefineError);
    expect(() => iconifyIcons({ aliases: { a: { parent: 'b' }, b: { parent: 'a' } }, icons: {} })).toThrow(/Cyclic/);
  });

  it('rejects invalid dimensions, transforms, duplicate ids and malformed neutral nodes with typed errors', () => {
    for (const data of [
      { body: '<path/>', width: 0 },
      { body: '<path/>', height: Number.NaN },
      { body: '<path/>', rotate: 0.5 },
      { body: '<path id="same"/><path id="same"/>' },
    ])
      expect(() => iconifyIcon(data)).toThrow(RefineError);
    expect(() =>
      iconifyIcons({
        aliases: { bad: { hFlip: 'yes' as unknown as boolean, parent: 'base' } },
        icons: { base: { body: '<path/>' } },
      }),
    ).toThrow(RefineError);
    expect(() =>
      registerIcons({
        bad: { ...square, children: [null as unknown as IconDefinition['children'][number]] },
      }),
    ).toThrow(RefineError);
  });

  it.each([
    '<script>alert(1)</script>',
    '<path onclick="alert(1)"/>',
    '<use href="https://example.org/a.svg"/>',
    '<path fill="url(https://example.org/a.svg)"/>',
    '<foreignObject/>',
    '<path style="fill:red"/>',
    '<g class="provider"><script>alert(1)</script></g>',
    '<path class="provider" onclick="alert(1)"/>',
    '<path class="provider" style="fill:red"/>',
    '<use class="provider" href="https://example.org/a.svg"/>',
    '<path class="provider" fill="url(https://example.org/a.svg)"/>',
    '<path',
    '<!DOCTYPE svg>',
    'text',
  ])('rejects unsupported SVG: %s', (body) => {
    expect(() => iconifyIcon({ body })).toThrow(RefineError);
  });

  it('rewrites all nested ids and local references for repeated instances', () => {
    const icon = iconifyIcon({
      body: '<defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient><path id="shape" d="M0 0"/></defs><use href="#shape" fill="url(#paint)"/>',
    });
    const first = createIconChildren(icon, 'first-');
    const second = createIconChildren(icon, 'second-');
    expect(first[0].querySelector('linearGradient')?.id).toBe('first-paint');
    expect(first[1].getAttribute('href')).toBe('#first-shape');
    expect(second[1].getAttribute('fill')).toBe('url(#second-paint)');
  });

  it('adapts selected structural Lucide data without importing the library', () => {
    const icons = lucideIcons({ Custom: [['circle', { cx: 12, cy: 12, r: 4 }]] });
    expect(icons.Custom.presentation?.stroke).toBe('currentColor');
    expect(icons.Custom.children[0].tag).toBe('circle');
  });
});
