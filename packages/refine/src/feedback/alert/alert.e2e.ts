import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('light alert with auto icon passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-alert color="error" heading="Access denied" dismissible>' +
        'You do not have permission to perform this action.' +
        '</ore-alert>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  // Dark axe is intentionally not probed for the translucent flat surface: the
  // harness cannot reproduce the opaque dark page background consumers paint
  // under the 85%-alpha --color-canvas token (it blends to a mid gray on the
  // harness white that no real app shows), and colored-on-canvas contrast is
  // owned by the theme's light-dark tokens, not by ore-alert. [VERIFY] dark
  // contrast in a real demo.

  test('light bordered alert passes axe checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      // Guards the bordered trio (backdrop surface, base ink, theme border).
      // Dark is not scanned: the backdrop token is translucent by design, and
      // the harness's white body blends it to a tint no dark-mode app shows.
      '<ore-alert color="error" variant="bordered" heading="Access denied" dismissible>' +
        'You do not have permission to perform this action.' +
        '</ore-alert>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Horizontal mode', () => {
  test('heading and body stack without overlapping', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-alert id="alert" color="warning" heading="Scheduled maintenance" horizontal>' +
        'The dashboard will be briefly unavailable.' +
        '<div slot="actions"><button>Ok</button></div>' +
        '</ore-alert>',
    );

    const boxes = await page.locator('#alert').evaluate((alert) => {
      const root = alert.shadowRoot!;
      const rect = (sel: string) => root.querySelector<HTMLElement>(sel)!.getBoundingClientRect();
      const center = (sel: string) => {
        const r = rect(sel);

        return (r.top + r.bottom) / 2;
      };

      return {
        actionsCenter: center('.actions'),
        bodyTop: rect('.body').top,
        headerBottom: rect('.header').bottom,
        iconCenter: center('.icon'),
        textCenter: (rect('.header').top + rect('.body').bottom) / 2,
      };
    });

    // The body must sit below the heading, not share its row.
    expect(boxes.bodyTop).toBeGreaterThanOrEqual(boxes.headerBottom - 1);
    // Leading and trailing controls stay centered against the text block.
    expect(Math.abs(boxes.iconCenter - boxes.textCenter)).toBeLessThan(4);
    expect(Math.abs(boxes.actionsCenter - boxes.textCenter)).toBeLessThan(4);
  });
});

test.describe('Toast-consistent surface', () => {
  test('flat alert keeps ink text and tints only the icon', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<span id="ink" style="color: var(--color-contrast-800)"></span>' +
        '<span id="tint" style="color: var(--color-error)"></span>' +
        '<ore-alert id="alert" color="error" heading="Failed">Save failed.</ore-alert>',
    );

    const probe = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('#alert')!.shadowRoot!;
      const rgb = (el: HTMLElement) => getComputedStyle(el).color;
      const marker = (id: string) => rgb(document.getElementById(id)!);

      return {
        iconTinted: rgb(root.querySelector<HTMLElement>('.icon')!) === marker('tint'),
        textNeutral: rgb(root.querySelector<HTMLElement>('.heading')!) === marker('ink'),
      };
    });

    expect(probe.textNeutral).toBe(true);
    expect(probe.iconTinted).toBe(true);
  });
});

test.describe('Auto icon', () => {
  test('color renders the derived glyph at the cssprop size', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-alert color="success" style="--alert-icon-size: 12px">Saved</ore-alert>');

    const probe = await page.locator('ore-alert').evaluate((alert) => {
      const icon = alert.shadowRoot!.querySelector<HTMLElement>('.auto-icon')!;

      return {
        name: icon.getAttribute('name'),
        width: getComputedStyle(icon).width,
      };
    });

    expect(probe.name).toBe('check');
    expect(probe.width).toBe('12px');
  });

  test('labels override the close button name and the announcement', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-alert id="alert" dismissible>Notice</ore-alert>');

    await page.locator('#alert').evaluate((alert) => {
      Object.assign(alert, { labels: { dismiss: 'Melding sluiten', dismissed: 'Melding gesloten' } });
    });

    const close = page.locator('.close').first();

    await expect(close).toHaveAttribute('aria-label', 'Melding sluiten');

    await close.click();
    await expect.poll(() => page.locator('.sr-announce').first().textContent()).toBe('Melding gesloten');
  });
});

test.describe('Docked and slim banner modes', () => {
  test('docked alert pins to the viewport top', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-alert id="alert" docked="top">Scheduled maintenance tonight.</ore-alert>');

    const style = await page.locator('#alert').evaluate((el) => {
      const s = getComputedStyle(el);

      return { position: s.position, top: Number.parseFloat(s.top) };
    });

    expect(style.position).toBe('fixed');
    expect(style.top).toBeLessThanOrEqual(20);
  });

  test('slim alert lays text and actions on one row', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-alert id="alert" slim color="primary" variant="solid" dismissible>' +
        'New: dark mode is live.' +
        '<div slot="actions"><button>Try it</button></div>' +
        '</ore-alert>',
    );

    const row = await page.locator('#alert').evaluate((alert) => {
      const root = alert.shadowRoot!;
      const center = (sel: string) => {
        const r = root.querySelector<HTMLElement>(sel)!.getBoundingClientRect();

        return (r.top + r.bottom) / 2;
      };

      return {
        actionsCenter: center('.actions'),
        bodyCenter: center('.body'),
        display: getComputedStyle(root.querySelector('.alert')!).display,
      };
    });

    expect(row.display).toBe('flex');
    expect(Math.abs(row.bodyCenter - row.actionsCenter)).toBeLessThan(4);
  });
});

test.describe('Solid surface actions', () => {
  test('ghost actions on a solid alert take the contrast ink', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-alert id="alert" slim color="primary" variant="solid">New: dark mode.<div slot="actions"><button id="try">Try it</button></div></ore-alert>',
    );

    const colors = await page.evaluate(() => {
      const alert = document.querySelector('#alert')!;
      const button = alert.querySelector('#try')!;

      return {
        button: getComputedStyle(button).color,
        text: getComputedStyle(alert.shadowRoot!.querySelector('.content')!).color,
      };
    });

    expect(colors.button).toBe(colors.text);
  });
});
