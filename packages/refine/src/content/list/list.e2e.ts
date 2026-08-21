/**
 * Real-browser tests for `ore-list`/`ore-list-item` — a11y checks, swipe-gesture interaction,
 * and CSS layout regressions that jsdom can't evaluate (no CSS box model, no real pointer
 * gestures, `@layer` blocks silently dropped). Complements `list.test.ts`/`list-item.test.ts`'s
 * jsdom coverage.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import { axeCheck, expect, test } from '../../testing/fixtures';

test.describe('Accessibility', () => {
  test('plain list passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list><ore-list-item>Inbox</ore-list-item><ore-list-item>Drafts</ore-list-item></ore-list>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('plain (non-selectable) list with a swipe-revealed action panel passes a11y checks', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<ore-list>' +
        '<ore-list-item revealed="right">Drafts<button slot="actions-right">Delete</button></ore-list-item>' +
        '</ore-list>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  // Known a11y gap: axe's nested-interactive rule flags role="option" items that contain a real
  // focusable descendant (the slotted action button) — combining `selectable` (which puts
  // role="option" on the item) with swipe actions on the *same* item is the one combination that
  // triggers it; each feature alone (see the previous test's plain swipe actions, or a selectable
  // list without actions) is clean. This is an inherent WAI-ARIA tension for this exact combo
  // (real apps with row actions in a listbox, e.g. Gmail's list view, accept the same trade-off),
  // not something to route around with a different ARIA role.
  test.fail(
    'selectable listbox with a swipe-revealed action panel on the same item (known nested-interactive gap)',
    async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-list selectable value="a" aria-label="Folders">' +
          '<ore-list-item value="a">Inbox</ore-list-item>' +
          '<ore-list-item value="b" revealed="right">Drafts' +
          '<button slot="actions-right">Delete</button></ore-list-item>' +
          '</ore-list>',
      );

      const results = await axeCheck(page);

      // When fixed, violations should be empty
      expect(results.violations).toEqual([]);
    },
  );
});

test.describe('Selection', () => {
  test('clicking an item selects it and deselects its sibling', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list selectable value="a" aria-label="Folders">' +
        '<ore-list-item id="a" value="a">Inbox</ore-list-item>' +
        '<ore-list-item id="b" value="b">Drafts</ore-list-item>' +
        '</ore-list>',
    );

    await page.locator('#b').evaluate((el) => {
      (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector<HTMLElement>('.row')?.click();
    });
    await page.waitForTimeout(50);

    const state = await page.evaluate(() => ({
      aSelected: document.getElementById('a')?.hasAttribute('selected'),
      bSelected: document.getElementById('b')?.hasAttribute('selected'),
    }));

    expect(state).toEqual({ aSelected: false, bSelected: true });
  });

  // Manual-activation listbox: arrow keys only move focus (WAI-ARIA APG's "selection does not
  // follow focus" variant) — Enter/Space on the newly-focused row commits the selection.
  test('ArrowDown moves focus to the next item, then Enter selects it', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list selectable aria-label="Folders">' +
        '<ore-list-item id="a" value="a">Inbox</ore-list-item>' +
        '<ore-list-item id="b" value="b">Drafts</ore-list-item>' +
        '</ore-list>',
    );

    await page.locator('#a').evaluate((el) => {
      (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector<HTMLElement>('.row')?.focus();
    });
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);

    const bSelected = await page.evaluate(() => document.getElementById('b')?.hasAttribute('selected'));

    expect(bSelected).toBe(true);
  });
});

test.describe('Swipe actions', () => {
  // `.actions-right` is clipped by `:host { overflow: hidden }` and translated fully off to the
  // right of the row when closed — `getBoundingClientRect()` still reports the button's own box
  // size regardless of clipping, so these assert its *position* relative to the item instead.
  test('a slotted action button sits outside the item bounds until revealed', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list style="width:300px">' +
        '<ore-list-item id="item">Newsletter<button slot="actions-right" id="del">Delete</button></ore-list-item>' +
        '</ore-list>',
    );
    await page.waitForSelector('ore-list-item');

    const { buttonLeft, itemRight } = await page.evaluate(() => ({
      buttonLeft: document.getElementById('del')?.getBoundingClientRect().left ?? 0,
      itemRight: document.getElementById('item')?.getBoundingClientRect().right ?? 0,
    }));

    expect(buttonLeft).toBeGreaterThanOrEqual(itemRight);
  });

  test('setting revealed="right" brings the action button inside the item bounds', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list style="width:300px">' +
        '<ore-list-item id="item" revealed="right">Newsletter' +
        '<button slot="actions-right" id="del">Delete</button></ore-list-item>' +
        '</ore-list>',
    );
    await page.waitForSelector('ore-list-item[revealed="right"]');

    const { buttonLeft, itemRight } = await page.evaluate(() => ({
      buttonLeft: document.getElementById('del')?.getBoundingClientRect().left ?? 0,
      itemRight: document.getElementById('item')?.getBoundingClientRect().right ?? 0,
    }));

    expect(buttonLeft).toBeLessThan(itemRight);
  });

  test('tabbing into a slotted action button reveals it via :focus-within, with no attribute change', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<ore-list style="width:300px">' +
        '<ore-list-item id="item">Newsletter<button slot="actions-right" id="del">Delete</button></ore-list-item>' +
        '</ore-list>',
    );
    await page.waitForSelector('ore-list-item');

    await page.locator('#item').evaluate((el) => {
      (el as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot.querySelector<HTMLElement>('.row')?.focus();
    });
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);

    const { buttonLeft, itemRight, revealedAttr } = await page.evaluate(() => ({
      buttonLeft: document.getElementById('del')?.getBoundingClientRect().left ?? 0,
      itemRight: document.getElementById('item')?.getBoundingClientRect().right ?? 0,
      revealedAttr: document.getElementById('item')?.getAttribute('revealed'),
    }));

    // Reveal-on-focus is CSS-only (`:host(:has(.actions-right:focus-within))`) — the `revealed`
    // attribute (gesture/programmatic state) is deliberately left untouched.
    expect(revealedAttr).toBeNull();
    expect(buttonLeft).toBeLessThan(itemRight);
  });

  // Asserts the *visible* `[part="button"]` surface, not `ore-button`'s own light-DOM host box —
  // stretching the host alone (a plain `::slotted(*) { height: 100% }`, which this suite's own
  // earlier revision relied on) leaves the size preset's fixed-height inner surface floating,
  // centered, inside the now-taller invisible host: the real regression the `fullheight` prop
  // (and pairing it with `::slotted(*) { height: 100% }` above) exists to fix.
  test('an ore-button with fullheight fills the full height of the row', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list style="width:300px">' +
        '<ore-list-item id="item" revealed="right">Newsletter' +
        '<ore-button slot="actions-right" id="del" fullheight>Delete</ore-button></ore-list-item>' +
        '</ore-list>',
    );
    await page.waitForSelector('ore-list-item[revealed="right"]');

    const { buttonHeight, rowHeight } = await page.evaluate(() => {
      const item = document.getElementById('item') as HTMLElement & { shadowRoot: ShadowRoot };
      const row = item.shadowRoot.querySelector('.row') as HTMLElement;
      const del = document.getElementById('del') as HTMLElement & { shadowRoot: ShadowRoot };
      const button = del.shadowRoot.querySelector('[part="button"]') as HTMLElement;

      return { buttonHeight: button.getBoundingClientRect().height, rowHeight: row.getBoundingClientRect().height };
    });

    expect(Math.abs(buttonHeight - rowHeight)).toBeLessThan(1);
  });

  test('an ore-button without fullheight stays at its own fixed size-preset height', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list style="width:300px">' +
        '<ore-list-item id="item" revealed="right">Newsletter' +
        '<ore-button slot="actions-right" id="del">Delete</ore-button></ore-list-item>' +
        '</ore-list>',
    );
    await page.waitForSelector('ore-list-item[revealed="right"]');

    const { buttonHeight, rowHeight } = await page.evaluate(() => {
      const item = document.getElementById('item') as HTMLElement & { shadowRoot: ShadowRoot };
      const row = item.shadowRoot.querySelector('.row') as HTMLElement;
      const del = document.getElementById('del') as HTMLElement & { shadowRoot: ShadowRoot };
      const button = del.shadowRoot.querySelector('[part="button"]') as HTMLElement;

      return { buttonHeight: button.getBoundingClientRect().height, rowHeight: row.getBoundingClientRect().height };
    });

    expect(buttonHeight).toBeLessThan(rowHeight);
  });

  test('swiping a row all the way through clicks the slotted action and closes without leaving it revealed', async ({
    page,
    refinePage,
  }) => {
    await refinePage.mountComponent(
      '<ore-list style="width:300px">' +
        '<ore-list-item id="item">Newsletter<button slot="actions-right" id="del">Delete</button></ore-list-item>' +
        '</ore-list>',
    );
    await page.waitForSelector('ore-list-item');

    await page.evaluate(() => {
      const del = document.getElementById('del') as HTMLElement;
      (window as unknown as { __deleteClicked: boolean }).__deleteClicked = false;
      del.addEventListener('click', () => {
        (window as unknown as { __deleteClicked: boolean }).__deleteClicked = true;
      });
    });

    const row = page.locator('#item').locator('.row');
    const box = await row.boundingBox();

    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width - 10, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + 10, box!.y + box!.height / 2, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(50);

    const { deleteClicked, revealedAttr } = await page.evaluate(() => ({
      deleteClicked: (window as unknown as { __deleteClicked: boolean }).__deleteClicked,
      revealedAttr: document.getElementById('item')?.getAttribute('revealed'),
    }));

    expect(deleteClicked).toBe(true);
    expect(revealedAttr).toBeNull();
  });

  test('vertical movement does not activate a horizontal list-item pan', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-list style="width:300px"><ore-list-item id="item">Newsletter<button slot="actions-right">Delete</button></ore-list-item></ore-list>',
    );

    const row = page.locator('#item').locator('.row');
    const box = await row.boundingBox();

    expect(box).not.toBeNull();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + 4);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 2, box!.y + box!.height + 80, { steps: 4 });
    await page.mouse.up();

    expect(await page.locator('#item').getAttribute('revealed')).toBeNull();
  });
});
