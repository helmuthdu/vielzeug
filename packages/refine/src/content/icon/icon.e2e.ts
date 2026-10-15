import fixtures from '../../icons/__tests__/fixtures/iconify.json' with { type: 'json' };
import type { IconDefinition } from '../../icons/definition';
import type { IconifyCollection, IconifyIcon } from '../../icons/iconify';
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Icon rendering', () => {
  test('renders caller-named individual family adapters and an internal-name override', async ({
    page,
    refinePage,
  }) => {
    await page.evaluate((collections) => {
      type Adapter = (icons: Record<string, IconifyIcon>) => Record<string, IconDefinition>;
      const { registerIcons, heroiconsIcons, tablerIcons, mdiIcons } = (
        window as unknown as {
          Refine: {
            components: {
              content: {
                registerIcons: (icons: Record<string, IconDefinition>) => void;
                heroiconsIcons: Adapter;
                tablerIcons: Adapter;
                mdiIcons: Adapter;
              };
            };
          };
        }
      ).Refine.components.content;
      const home = (collection: IconifyCollection) => ({
        ...collection.icons.home,
        height: collection.height,
        width: collection.width,
      });
      registerIcons({
        ...heroiconsIcons({ HeroHome: home(collections.heroicons) }),
        ...tablerIcons({ TablerHome: home(collections.tabler) }),
        ...mdiIcons({ Check: home(collections.mdi), MaterialHome: home(collections.mdi) }),
      });
    }, fixtures);
    await refinePage.mountComponent(
      ['hero-home', 'tabler-home', 'material-home', 'check']
        .map((name) => `<ore-icon name="${name}" label="${name}" size="24"></ore-icon>`)
        .join(''),
    );
    for (const name of ['hero-home', 'tabler-home', 'material-home', 'check']) {
      await expect(page.locator(`ore-icon[name="${name}"] svg`)).toHaveAttribute('viewBox', '0 0 24 24');
      await expect(page.locator(`ore-icon[name="${name}"] path`).first()).toBeVisible();
    }
    expect(await page.locator('ore-icon[name="check"] path').getAttribute('d')).toBe(
      await page.locator('ore-icon[name="material-home"] path').getAttribute('d'),
    );
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('converts and renders local Heroicons, Tabler and MDI data with an internal-name override', async ({
    page,
    refinePage,
  }) => {
    await page.evaluate((collections) => {
      const { registerIcons, iconifyIcons } = (
        window as unknown as {
          Refine: {
            components: {
              content: {
                registerIcons: (icons: Record<string, IconDefinition>) => void;
                iconifyIcons: (collection: IconifyCollection, names: string[]) => Record<string, IconDefinition>;
              };
            };
          };
        }
      ).Refine.components.content;
      const icons = Object.assign(
        {},
        ...Object.values(collections).map((collection) => iconifyIcons(collection, ['home'])),
      );
      registerIcons({ ...icons, check: icons['mdi:home'] });
    }, fixtures);
    await refinePage.mountComponent(
      '<ore-icon name="heroicons:home" label="Heroicons home" size="24"></ore-icon>' +
        '<ore-icon name="tabler:home" label="Tabler home" size="24"></ore-icon>' +
        '<ore-icon name="mdi:home" label="Material Design Icons home" size="24"></ore-icon>' +
        '<ore-icon name="check"></ore-icon>',
    );
    for (const [prefix, collection] of Object.entries(fixtures)) {
      const icon = page.locator(`ore-icon[name="${prefix}:home"]`);
      await expect(icon).toHaveAttribute('role', 'img');
      await expect(icon.locator('svg')).toHaveAttribute('viewBox', '0 0 24 24');
      const expectedPath = await page.evaluate(
        (body) =>
          new DOMParser()
            .parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`, 'image/svg+xml')
            .querySelector('path')!
            .getAttribute('d'),
        collection.icons.home.body,
      );
      await expect(icon.locator('path').first()).toHaveAttribute('d', expectedPath!);
      const presentation = await icon
        .locator('path')
        .first()
        .evaluate((path) => ({
          fill: getComputedStyle(path).fill,
          stroke: getComputedStyle(path).stroke,
        }));
      if (prefix === 'mdi') expect(presentation.fill).not.toBe('none');
      else {
        expect(presentation.fill).toBe('none');
        expect(presentation.stroke).not.toBe('none');
      }
      expect(await icon.locator('svg').evaluate((svg) => svg.getBoundingClientRect().width)).toBe(24);
    }
    await expect(page.locator('ore-icon[name="check"]')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('ore-icon[name="check"] path')).toHaveAttribute('fill', 'currentColor');
    expect(await page.locator('ore-icon[name="check"] path').getAttribute('d')).toBe(
      await page.locator('ore-icon[name="mdi:home"] path').getAttribute('d'),
    );
    expect((await axeCheck(page)).violations).toEqual([]);
  });
  test('renders defaults without a Lucide global and preserves accessible labels', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-icon name="search" label="Search" size="24"></ore-icon>');
    await expect(page.locator('ore-icon')).toHaveAttribute('role', 'img');
    await expect(page.locator('ore-icon svg')).toHaveAttribute('viewBox', '0 0 24 24');
    await expect(page.locator('ore-icon circle')).toHaveCount(1);
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('renders upstream Tabler class metadata as portable SVG', async ({ page, refinePage }) => {
    await page.evaluate((collection) => {
      const { registerIcons, iconifyIcons } = (
        window as unknown as {
          Refine: {
            components: {
              content: {
                registerIcons: (icons: Record<string, IconDefinition>) => void;
                iconifyIcons: (collection: IconifyCollection) => Record<string, IconDefinition>;
              };
            };
          };
        }
      ).Refine.components.content;
      registerIcons(iconifyIcons(collection));
    }, fixtures.tabler);
    await refinePage.mountComponent(
      ['pause', 'skip-back', 'skip-forward']
        .map((name) => `<ore-icon name="tabler:${name}" label="${name}" size="24"></ore-icon>`)
        .join(''),
    );
    for (const name of ['pause', 'skip-back', 'skip-forward']) {
      const icon = page.locator(`ore-icon[name="tabler:${name}"]`);
      await expect(icon.locator('svg')).toHaveAttribute('viewBox', '0 0 24 24');
      await expect(icon.locator('svg [class]')).toHaveCount(0);
      await expect(icon.locator('g')).toHaveAttribute('stroke', 'currentColor');
      await expect(icon.locator('g > *')).toHaveCount(2);
    }
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('isolates repeated gradient references and preserves mixed fills', async ({ page, refinePage }) => {
    await page.evaluate(() => {
      const runtime = window as unknown as {
        Refine: { components: { content: { registerIcons: (icons: unknown) => void } } };
      };
      runtime.Refine.components.content.registerIcons({
        BrowserMixed: {
          children: [
            {
              children: [
                {
                  attrs: { id: 'paint' },
                  children: [
                    { attrs: { offset: 0, 'stop-color': 'red' }, tag: 'stop' },
                    { attrs: { offset: 1, 'stop-color': 'blue' }, tag: 'stop' },
                  ],
                  tag: 'linearGradient',
                },
              ],
              tag: 'defs',
            },
            { attrs: { fill: 'url(#paint)', height: 16, width: 32 }, tag: 'rect' },
            { attrs: { d: 'M0 0h32', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.5 }, tag: 'path' },
          ],
          viewBox: [0, 0, 32, 16],
        },
      });
    });
    await refinePage.mountComponent(
      '<ore-icon name="browser-mixed"></ore-icon><ore-icon name="browser-mixed"></ore-icon>',
    );
    const icons = page.locator('ore-icon');
    const first = await icons.nth(0).locator('linearGradient').getAttribute('id');
    const second = await icons.nth(1).locator('linearGradient').getAttribute('id');
    expect(first).not.toBe(second);
    await expect(icons.nth(0).locator('rect')).toHaveAttribute('fill', `url(#${first})`);
    await expect(icons.nth(1).locator('rect')).toHaveAttribute('fill', `url(#${second})`);
    await expect(icons.nth(0).locator('path')).toHaveAttribute('fill', 'none');
  });
});
