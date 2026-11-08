import type { Page } from '@playwright/test';

import { axeCheck, expect, test } from '../../testing/fixtures';

const cards = `
  <ore-card-picker label="Choose action cards" values="alpha">
    <ore-card-picker-item value="alpha" label="Alpha">
      <img slot="media" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23ddd'/%3E%3C/svg%3E">
      <span slot="header">Alpha</span>
      <p>Alpha card details.</p>
      <div slot="details"><p>Full Alpha rules and clarifications.</p><a href="#reference">Rule reference</a></div>
    </ore-card-picker-item>
    <ore-card-picker-item value="beta" label="Beta">
      <img slot="media" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23bbb'/%3E%3C/svg%3E">
      <span slot="header">Beta</span>
      <p>Beta card details.</p>
      <div slot="details"><p>Full Beta rules.</p></div>
    </ore-card-picker-item>
    <ore-card-picker-item value="gamma" label="Gamma">
      <img slot="media" alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23999'/%3E%3C/svg%3E">
      <span slot="header">Gamma</span>
      <p>Gamma card details.</p>
    </ore-card-picker-item>
  </ore-card-picker>`;

async function swipe(
  page: Page,
  deltaX: number,
  deltaY = 0,
  target = '[part="stage"]',
  beforeRelease?: () => Promise<void>,
): Promise<void> {
  const bounds = await page.locator(target).boundingBox();

  if (!bounds) throw new Error(`${target} must be visible before swiping`);

  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const session = await page.context().newCDPSession(page);

  try {
    await session.send('Input.dispatchTouchEvent', { touchPoints: [{ x, y }], type: 'touchStart' });
    for (let step = 1; step <= 6; step++) {
      await session.send('Input.dispatchTouchEvent', {
        touchPoints: [{ x: x + (deltaX * step) / 6, y: y + (deltaY * step) / 6 }],
        type: 'touchMove',
      });
    }
    await beforeRelease?.();
    await session.send('Input.dispatchTouchEvent', { touchPoints: [], type: 'touchEnd' });
  } finally {
    await session.detach();
  }
}

test.describe('Accessibility', () => {
  test('names the browsing region and selection controls', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);

    await expect(page.getByRole('region', { name: 'Choose action cards' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Selected Alpha' })).toBeVisible();
    await page.getByRole('button', { name: 'Next card' }).click();
    await expect(page.getByRole('checkbox', { name: 'Select Beta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Previous card' })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Next card' })).toBeEnabled();

    const results = await axeCheck(page);
    expect(results.violations).toEqual([]);
  });
});

test.describe('Navigation consistency', () => {
  test('matches the carousel navigation design', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      cards +
        `<ore-carousel label="Navigation comparison" style="height:240px"><ore-carousel-slide>One</ore-carousel-slide><ore-carousel-slide>Two</ore-carousel-slide><ore-carousel-slide>Three</ore-carousel-slide></ore-carousel>`,
    );
    const designs = await page.evaluate(async () => {
      const measure = async (host: Element) => {
        const root = host.shadowRoot!.querySelector('ore-media-navigation')!.shadowRoot!;
        const bar = root.querySelector<HTMLElement>('[part="bar"]')!;
        // Indicator entrances animate on mount; measure only the resting geometry.
        await Promise.allSettled(bar.getAnimations({ subtree: true }).map((animation) => animation.finished));
        const style = getComputedStyle(bar);
        const dimensions = (element: Element) => {
          const bounds = element.getBoundingClientRect();
          return { height: bounds.height, width: bounds.width };
        };
        return {
          active: dimensions(root.querySelector('.indicator-active')!),
          arrows: dimensions(root.querySelector('.controls')!),
          background: style.backgroundColor,
          bar: dimensions(bar),
          blur: style.backdropFilter,
          gap: style.gap,
          icon: dimensions(root.querySelector('.nav-btn ore-icon')!),
          inactive: dimensions(root.querySelector('.indicator:not(.indicator-active)')!),
          padding: style.padding,
          radius: style.borderRadius,
        };
      };
      return {
        carousel: await measure(document.querySelector('ore-carousel')!),
        picker: await measure(document.querySelector('ore-card-picker')!),
      };
    });
    expect(designs.picker).toEqual(designs.carousel);
  });

  test('configures arrows and indicators without changing selection', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);
    const picker = page.locator('ore-card-picker');
    const next = page.getByRole('button', { name: 'Go to card 3: Gamma' });
    await next.click();
    await expect(picker).toHaveAttribute('active-index', '2');
    await expect(picker).toHaveAttribute('values', 'alpha');
    await picker.evaluate((el) => el.setAttribute('show-controls', 'false'));
    await expect(page.getByRole('button', { name: 'Previous card' })).not.toBeVisible();
    await expect(page.getByRole('group', { name: 'Card indicators' })).toBeVisible();
    await picker.evaluate((el) => el.setAttribute('show-indicators', 'false'));
    await expect(picker.locator('[part="navigation"]')).not.toBeVisible();
    await picker.focus();
    await page.keyboard.press('Home');
    await expect(picker).toHaveAttribute('active-index', '0');
  });

  test('browses indicator buttons with arrow and boundary keys', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);
    await page.getByRole('button', { name: 'Go to card 1: Alpha' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Go to card 2: Beta' })).toBeFocused();
    await expect(page.locator('ore-card-picker')).toHaveAttribute('active-index', '1');
    await page.keyboard.press('End');
    await expect(page.getByRole('button', { name: 'Go to card 3: Gamma' })).toBeFocused();
    await expect(page.locator('ore-card-picker')).toHaveAttribute('active-index', '2');
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha');
  });

  test('anchors inset controls to the bottom of the card media', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await refinePage.mountComponent(
      cards.replace('<ore-card-picker label=', '<ore-card-picker controls-placement="inset" label='),
    );
    const navigation = page.locator('ore-card-picker [part="navigation"]');
    const stage = page.locator('ore-card-picker [part="stage"]');
    const media = page.locator('ore-card-picker-item[data-active] [part="media"][slot="media"]');
    await expect(navigation).toBeVisible();
    await expect
      .poll(async () => {
        const nav = await navigation.boundingBox();
        const bounds = await stage.boundingBox();
        const art = await media.boundingBox();
        // Inset floats inside the stage rather than taking a row under it.
        const inside = nav!.y + nav!.height <= bounds!.y + bounds!.height && nav!.y >= bounds!.y;
        // It rides the artwork's bottom edge, not the stage's: the media is the card's image,
        // which in a vertical card ends well above the stage bottom, and the bar floats just
        // inside it (one padding step above the media's own bottom edge).
        const gap = art!.y + art!.height - (nav!.y + nav!.height);
        const onMedia = gap >= 0 && gap <= 32 && art!.y + art!.height < bounds!.y + bounds!.height;
        // And it stays centred on the media's own horizontal centre.
        const centred = Math.abs(nav!.x + nav!.width / 2 - (art!.x + art!.width / 2)) <= 1;
        return inside && onMedia && centred;
      })
      .toBe(true);
  });
});

test.describe('Card orientation', () => {
  test.use({ isMobile: false, viewport: { height: 900, width: 1280 } });

  test('keeps horizontal image and content in separate columns', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      cards.replace('<ore-card-picker label=', '<ore-card-picker orientation="horizontal" label='),
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ height: 900, width });
      const item = page.locator('ore-card-picker-item[data-active]');
      await expect(item).toHaveAttribute('data-orientation', 'horizontal');
      const media = await item.locator('.media').boundingBox();
      const body = await item.locator('ore-card > .content').boundingBox();
      expect(body!.x).toBeGreaterThanOrEqual(media!.x + media!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });

  test('switches auto from horizontal desktop to vertical mobile', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      cards.replace('<ore-card-picker label=', '<ore-card-picker orientation="auto" label='),
    );
    await page.locator('.frame').evaluate((el) => (el.style.maxWidth = 'none'));
    const item = page.locator('ore-card-picker-item[data-active]');
    await expect(item).toHaveAttribute('data-orientation', 'horizontal');
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(item).toHaveAttribute('data-orientation', 'vertical');
    const media = await item.locator('.media').boundingBox();
    const title = await item.locator('.identity').boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(media!.y + media!.height);
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha');
  });
});

test.describe('Responsive layout', () => {
  test.use({ isMobile: false, viewport: { height: 900, width: 1280 } });

  test('shows mobile neighboring peeks with the title between artwork and body text', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await refinePage.mountComponent(cards);
    await page.getByRole('button', { name: 'Next card' }).click();
    const stage = await page.locator('[part="stage"]').boundingBox();
    const item = page.locator('ore-card-picker-item[data-active]');
    const media = await item.locator('ore-card > .media').boundingBox();
    const title = await item.locator('.identity').boundingBox();
    const body = await item.locator('ore-card > .content').boundingBox();
    expect(title!.y).toBeGreaterThanOrEqual(media!.y + media!.height);
    expect(body!.y).toBeGreaterThanOrEqual(title!.y + title!.height);
    for (const attribute of ['data-previous', 'data-next']) {
      const preview = page.locator(`ore-card-picker-item[${attribute}]`);
      await expect(preview).toBeVisible();
      const bounds = await preview.boundingBox();
      const visibleWidth = Math.min(stage!.x + stage!.width, bounds!.x + bounds!.width) - Math.max(stage!.x, bounds!.x);
      expect(visibleWidth).toBeGreaterThan(0);
      expect(visibleWidth).toBeLessThan(stage!.width * 0.2);
    }
  });

  test('hides the neighbour edges while keeping the swipe that brings them in', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await refinePage.mountComponent(
      cards.replace('<ore-card-picker label=', '<ore-card-picker show-neighbors="false" label='),
    );
    const picker = page.locator('ore-card-picker');
    const preview = page.locator('ore-card-picker-item[data-next]');
    // The preview keeps its geometry, so it is laid out but transparent rather than removed: the
    // stage still measures the same card set.
    await expect(preview).toBeAttached();
    await expect
      .poll(async () => {
        const style = await preview.evaluate((item) => getComputedStyle(item).opacity);

        return Number(style);
      })
      .toBe(0);
    // A drag reveals the arriving card, and releasing on it pages to it as usual.
    await swipe(page, -90, 0, '[part="stage"]', async () => {
      await expect(picker).toHaveAttribute('data-dragging', '');
      const dragging = await preview.evaluate((item) => Number(getComputedStyle(item).opacity));

      expect(dragging).toBeGreaterThan(0);
    });
    await expect(picker).toHaveAttribute('active-index', '1');
  });

  test('fills flex preview containers without shrinking to zero', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);
    await page.locator('.frame').evaluate((frame) => {
      frame.style.display = 'flex';
      frame.style.flexWrap = 'wrap';
      frame.style.justifyContent = 'center';
    });

    for (const width of [390, 1280]) {
      await page.setViewportSize({ height: 900, width });
      const geometry = await page.locator('ore-card-picker').evaluate((picker) => ({
        containerWidth: picker.parentElement!.getBoundingClientRect().width,
        documentWidth: document.documentElement.scrollWidth,
        pickerWidth: picker.getBoundingClientRect().width,
        viewportWidth: innerWidth,
      }));
      expect(Math.round(geometry.pickerWidth)).toBe(Math.round(geometry.containerWidth));
      expect(geometry.pickerWidth).toBeGreaterThan(200);
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    }
  });

  test('keeps the active card and controls within narrow and wide viewports', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);

    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ height: 800, width });
      const measurements = await page.evaluate(() => {
        const picker = document.querySelector('ore-card-picker')!;
        const active = picker.querySelector<HTMLElement>('[data-active]')!;
        const box = active.getBoundingClientRect();

        return {
          activeRight: box.right,
          activeWidth: box.width,
          activeX: box.x,
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
        };
      });

      expect(measurements.documentWidth).toBeLessThanOrEqual(measurements.viewportWidth);
      expect(measurements.activeX).toBeGreaterThanOrEqual(0);
      expect(measurements.activeRight).toBeLessThanOrEqual(width);
      expect(measurements.activeWidth).toBeGreaterThan(0);
    }
  });

  test('removes card transition motion when reduced motion is requested', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(cards);

    const durations = await page.locator('ore-card-picker-item[data-active]').evaluate((item) =>
      getComputedStyle(item)
        .transitionDuration.split(',')
        .map((duration) => duration.trim()),
    );
    expect(durations.length).toBeGreaterThan(0);
    expect(durations.every((duration) => duration === '0s')).toBe(true);
  });
});

test.describe('Desktop interaction', () => {
  test.use({ hasTouch: false, isMobile: false, viewport: { height: 900, width: 1280 } });

  test('browses with keyboard without changing selected values', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);
    const picker = page.getByRole('region', { name: 'Choose action cards' });
    await picker.focus();

    await page.keyboard.press('ArrowRight');
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'beta');
    await expect(picker).toHaveAttribute('values', 'alpha');

    await page.keyboard.press('End');
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'gamma');
    await page.keyboard.press('Home');
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'alpha');
  });
});

test.describe('Swipe motion', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('tracks the drag and springs the arriving card into place without selecting it', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(cards);
    const picker = page.locator('ore-card-picker');
    const before = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    await swipe(page, -90, 0, '[part="stage"]', async () => {
      await expect(picker).toHaveAttribute('data-dragging', '');
      const dragged = await page.locator('ore-card-picker-item[data-active]').boundingBox();
      expect(dragged!.x).toBeLessThan(before!.x - 40);
      await expect(picker).toHaveAttribute('active-index', '0');
    });
    await expect(picker).toHaveAttribute('active-index', '1');
    await expect(picker).not.toHaveAttribute('data-dragging');
    const settled = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    expect(settled!.x).toBeCloseTo(before!.x, 1);
    await expect(picker).toHaveAttribute('values', 'alpha');
  });

  test('resists an edge drag and springs back to the same card', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);
    const picker = page.locator('ore-card-picker');
    const before = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    await swipe(page, 90, 0, '[part="stage"]', async () => {
      const dragged = await page.locator('ore-card-picker-item[data-active]').boundingBox();
      expect(dragged!.x).toBeGreaterThan(before!.x + 5);
      expect(dragged!.x).toBeLessThan(before!.x + 45);
    });
    await expect(picker).not.toHaveAttribute('data-dragging');
    await expect(picker).toHaveAttribute('active-index', '0');
    const settled = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    expect(settled!.x).toBeCloseTo(before!.x, 1);
  });

  test('settles immediately after release with reduced motion', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await refinePage.mountComponent(cards);
    const before = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    await swipe(page, -90);
    const picker = page.locator('ore-card-picker');
    await expect(picker).toHaveAttribute('active-index', '1');
    await expect(picker).not.toHaveAttribute('data-dragging');
    const settled = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    expect(settled!.x).toBeCloseTo(before!.x, 1);
  });

  test('springs to the next card in the RTL swipe direction', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards.replace('<ore-card-picker label=', '<ore-card-picker dir="rtl" label='));
    const picker = page.locator('ore-card-picker');
    const before = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    await swipe(page, 90);
    await expect(picker).toHaveAttribute('active-index', '1');
    await expect(picker).not.toHaveAttribute('data-dragging');
    const settled = await page.locator('ore-card-picker-item[data-active]').boundingBox();
    expect(settled!.x).toBeCloseTo(before!.x, 1);
    await expect(picker).toHaveAttribute('values', 'alpha');
  });
});

test.describe('Mobile reading', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('fits short details, focuses their title, and returns focus on dismissal', async ({
    page,
    refinePage,
  }, testInfo) => {
    await refinePage.mountComponent(cards);
    const trigger = page.getByRole('button', { exact: true, name: 'Details' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Alpha' });
    const sheet = page.locator('ore-card-picker-item[data-active] ore-drawer');
    await expect(dialog).toBeVisible();
    await expect(sheet.getByRole('heading', { name: 'Alpha' })).toBeFocused();
    await dialog.locator('[part="panel"]').evaluate(async (panel) => {
      await Promise.all(panel.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    });
    await page.screenshot({ path: testInfo.outputPath('mobile-reading.png') });
    const bounds = await dialog.locator('[part="panel"]').boundingBox();
    expect(bounds!.height).toBeLessThan(300);
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { exact: true, name: 'Close' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Rule reference' })).toBeFocused();
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha');
  });

  test('reads long content in portrait and landscape without hiding selection', async ({ page, refinePage }) => {
    const paragraphs = Array.from(
      { length: 24 },
      (_, index) => `<p>Rule ${index + 1}: Resolve the attack before moving, then apply its printed conditions.</p>`,
    ).join('');
    for (const viewport of [
      { height: 740, width: 320 },
      { height: 375, width: 667 },
    ]) {
      await page.setViewportSize(viewport);
      await refinePage.mountComponent(cards.replace('Full Alpha rules and clarifications.', paragraphs));
      await page.getByRole('button', { exact: true, name: 'Details' }).click();
      const dialog = page.getByRole('dialog', { name: 'Alpha' });
      const sheet = page.locator('ore-card-picker-item[data-active] ore-drawer');
      await expect(dialog).toBeVisible();
      const panel = await dialog.locator('[part="panel"]').boundingBox();
      expect(Math.round(panel!.height)).toBeLessThanOrEqual(viewport.height - 48);
      expect(panel!.width).toBeLessThanOrEqual(viewport.width);
      const body = dialog.locator('.body');
      const geometry = await body.evaluate((el) => ({ height: el.clientHeight, scroll: el.scrollHeight }));
      expect(geometry.scroll).toBeGreaterThan(geometry.height);
      await body.evaluate((el) => (el.scrollTop = el.scrollHeight));
      await expect(page.getByRole('link', { name: 'Rule reference' })).toBeInViewport();
      await expect(sheet.getByRole('checkbox', { name: 'Selected Alpha' })).toBeInViewport();
      await sheet.getByRole('checkbox', { name: 'Selected Alpha' }).click();
      await expect(page.locator('ore-card-picker')).toHaveAttribute('values', '');
      await dialog.getByRole('button', { exact: true, name: 'Close' }).click();
      await expect(dialog).not.toBeVisible();
    }
  });
});

test.describe('Desktop reading', () => {
  test.use({ hasTouch: false, isMobile: false, viewport: { height: 900, width: 1280 } });

  test('opens a readable adjacent pane with a forward keyboard path', async ({ page, refinePage }, testInfo) => {
    await refinePage.mountComponent(cards);
    await page.locator('.frame').evaluate((el) => (el.style.maxWidth = 'none'));
    await expect(page.locator('ore-card-picker-item[data-active] [part="details-trigger"]')).not.toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    const trigger = page.getByRole('button', { exact: true, name: 'Details' });
    await trigger.click();
    const pane = page.getByRole('region', { exact: true, name: 'Alpha' });
    await expect(pane).toBeVisible();
    await expect(pane).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath('desktop-reading.png') });
    await expect(page.getByRole('dialog')).not.toBeVisible();
    const paneBox = await pane.boundingBox();
    const cardBox = await page.locator('ore-card-picker-item[data-active] ore-card').boundingBox();
    expect(paneBox!.width).toBeGreaterThan(320);
    expect(paneBox!.x).toBeGreaterThanOrEqual(cardBox!.x + cardBox!.width);
    await page.keyboard.press('Tab');
    await expect(pane.getByRole('button', { name: 'Close details' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(pane.locator('.reading-content')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Rule reference' })).toBeFocused();
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(pane).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('keeps selected-list presentation outside current-card controls', async ({ page, refinePage }) => {
    await refinePage.mountComponent(cards);
    await page.getByRole('button', { name: 'Next card' }).click();
    await page.getByRole('checkbox', { name: 'Select Beta' }).click();
    await expect(page.getByRole('group', { name: 'Selected cards' })).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.getByRole('button', { name: 'Previous card' }).click();
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'alpha');
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha,beta');
  });

  test('preserves long details and form state across responsive reading surfaces', async ({ page, refinePage }) => {
    const name = 'UninterruptedCounterattackWithAnUnusuallyLongCardName';
    await refinePage.mountComponent(
      `<ore-card-picker label="Long cards"><ore-card-picker-item value="long" label="${name}"><p>Short decision summary.</p><div slot="details"><label>Notes <input value="Original note"></label><p>${'Long rules. '.repeat(400)}</p></div></ore-card-picker-item></ore-card-picker>`,
    );
    await page.locator('.frame').evaluate((el) => {
      el.style.maxWidth = 'none';
      el.style.fontSize = '200%';
    });
    await expect(page.getByRole('button', { exact: true, name: 'Details' })).not.toHaveAttribute(
      'aria-haspopup',
      'dialog',
    );
    await page.getByRole('button', { exact: true, name: 'Details' }).click();
    await page.getByRole('textbox', { name: 'Notes' }).fill('Keep this note');
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(page.getByRole('dialog', { name })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('Keep this note');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ height: 900, width: 1280 });
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.getByRole('region', { exact: true, name })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Notes' })).toHaveValue('Keep this note');
  });
});

test.describe('Touch navigation', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { height: 844, width: 390 } });

  test('swipes browse only, vertical gestures do not browse, and selection stays explicit', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(cards);
    await page.locator('ore-card-picker').evaluate((picker) => {
      picker.addEventListener('change', () => picker.setAttribute('data-selection-changed', 'true'));
    });

    await swipe(page, -100);
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'beta');
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha');
    await expect(page.locator('ore-card-picker')).not.toHaveAttribute('data-selection-changed');

    await swipe(page, 0, -100);
    await expect(page.locator('ore-card-picker-item[data-active]')).toHaveAttribute('value', 'beta');

    await page.getByRole('checkbox', { name: 'Select Beta' }).click();
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha,beta');

    await page.getByRole('button', { exact: true, name: 'Details' }).click();
    await expect(page.getByRole('dialog', { name: 'Beta' })).toBeVisible();
    await page.locator('ore-card-picker-item[data-active] ore-drawer [part="panel"]').evaluate(async (el) => {
      await Promise.all(el.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
    });
    await swipe(page, 0, 120, 'ore-drawer [part="drag-handle"]:visible');
    await expect(page.getByRole('dialog', { name: 'Beta' })).not.toBeVisible();
    await expect(page.locator('ore-card-picker')).toHaveAttribute('values', 'alpha,beta');
  });
});
