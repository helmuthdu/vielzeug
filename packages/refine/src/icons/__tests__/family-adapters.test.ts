import { RefineError } from '../../errors';
import { heroiconsIcons } from '../heroicons';
import { type IconifyIcon, iconifyIcon } from '../iconify';
import { mdiIcons } from '../mdi';
import { registerIcons, resolveIcon } from '../registry';
import { tablerIcons } from '../tabler';
import fixtures from './fixtures/iconify.json';

describe.each([
  { convert: heroiconsIcons, family: 'heroicons', fixture: fixtures.heroicons },
  { convert: tablerIcons, family: 'tabler', fixture: fixtures.tabler },
  { convert: mdiIcons, family: 'mdi', fixture: fixtures.mdi },
])('$family individual data adapter', ({ convert, family, fixture }) => {
  const home: IconifyIcon = { ...fixture.icons.home, height: fixture.height, width: fixture.width };

  it('preserves caller-chosen keys and licensed SVG presentation without registering anything', () => {
    const name = `${family}NamedAdapterHome`;
    const result = convert({ [name]: home, 'app:home': home });
    expect(Object.keys(result)).toEqual([name, 'app:home']);
    expect(result[name]).toEqual(iconifyIcon(home));
    expect(result[name].viewBox).toEqual([0, 0, 24, 24]);
    expect(resolveIcon(name)).toBeUndefined();
    registerIcons(result);
    expect(resolveIcon(name)).toEqual(result[name]);
  });

  it('uses Iconify geometry, transforms, nested classes and validation without changing the input', () => {
    const transformed = { ...home, height: 12, hFlip: true, left: -2, rotate: 1, top: 3, width: 20 };
    const before = structuredClone(transformed);
    expect(convert({ Home: transformed }).Home).toEqual(iconifyIcon(transformed));
    expect(transformed).toEqual(before);
    expect(convert({})).toEqual({});
    expect(() => convert({ Bad: { ...home, hFlip: true, left: Number.NaN } })).toThrow(RefineError);
    expect(() => convert({ Bad: { ...home, body: '<path class="provider" onclick="alert(1)"/>' } })).toThrow(
      RefineError,
    );
  });
});

it('converts the upstream classed Tabler subset with application keys', () => {
  const result = tablerIcons({
    Pause: { ...fixtures.tabler.icons.pause, height: 24, width: 24 },
    SkipBack: { ...fixtures.tabler.icons['skip-back'], height: 24, width: 24 },
    SkipForward: { ...fixtures.tabler.icons['skip-forward'], height: 24, width: 24 },
  });
  expect(Object.keys(result)).toEqual(['Pause', 'SkipBack', 'SkipForward']);
  for (const icon of Object.values(result)) {
    expect(icon.children[0].attrs?.class).toBeUndefined();
    expect(icon.children[0].attrs?.stroke).toBe('currentColor');
  }
});
