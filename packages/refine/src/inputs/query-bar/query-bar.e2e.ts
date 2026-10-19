import { axeCheck, expect, test } from '../../testing/fixtures';

/** Mounts a bar with the two-key test vocabulary. */
async function mountBar(
  page: import('@playwright/test').Page,
  refinePage: { mountComponent(html: string): Promise<void> },
) {
  await refinePage.mountComponent(
    '<ore-query-bar id="bar" label="Search issues" placeholder="Title, author or label…"></ore-query-bar>',
  );
  await page.evaluate(() => {
    const bar = document.getElementById('bar') as HTMLElement & { vocabulary: unknown };
    bar.vocabulary = [
      {
        key: 'author',
        label: 'Author',
        options: [
          { label: 'Alice', value: 'alice' },
          { label: 'Bob', value: 'bob' },
        ],
      },
      {
        key: 'label',
        label: 'Label',
        options: [
          { label: 'Bug', value: 'bug' },
          { label: 'Enhancement', value: 'enhancement' },
        ],
      },
    ];
  });
}

const input = (page: import('@playwright/test').Page) =>
  page.locator('ore-query-bar').locator('ore-input').getByRole('combobox');

async function clickInput(page: import('@playwright/test').Page): Promise<void> {
  const field = input(page);
  await field.scrollIntoViewIfNeeded();
  const bounds = await field.boundingBox();
  if (!bounds) throw new Error('Expected the query input to be visible');
  // WebKit's locator hit-test retargets nested delegatesFocus roots to the host.
  // Use real pointer coordinates and verify the actual input receives focus.
  await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await expect(field).toBeFocused();
}

test.describe('Touch targets', () => {
  test.use({ hasTouch: true });

  test('keeps secondary controls and inline removals at least 44px on coarse pointers', async ({
    page,
    refinePage,
  }) => {
    await page.setViewportSize({ height: 812, width: 375 });
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.style.width = '100%';
      el.setAttribute('clearable', '');
      el['quick-filters'] = [{ key: 'author', label: 'Assigned to Alice', value: 'alice' }];
    });
    await input(page).fill('label:bug');
    await input(page).press('Escape');
    await input(page).fill('bug');
    await input(page).press('Escape');

    for (const control of [
      page.getByRole('button', { exact: true, name: 'Filters (1)' }),
      page.getByRole('button', { exact: true, name: 'Remove Label: Bug' }),
      // The clear button is in the bar's shadow root; pierce it explicitly.
      page.locator('ore-query-bar').locator('css=button[aria-label="Clear search text"]'),
    ]) {
      const bounds = await control.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
    // The applied pill stays a compact badge: the 44px remove target overflows
    // it rather than inflating the whole pill.
    const pill = await page.locator('ore-query-bar ore-chip').first().boundingBox();
    expect(pill).not.toBeNull();
    expect(pill!.height).toBeLessThan(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
  });

  test('hides quick filters on phones but shows them on tablets', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 812, width: 375 });
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.style.width = '100%';
      el['quick-filters'] = [
        { key: 'author', label: 'Alice', value: 'alice' },
        { key: 'author', label: 'Bob', value: 'bob' },
        { key: 'label', label: 'Bug', value: 'bug' },
      ];
    });

    const state = async (viewportWidth: number) => {
      await page.setViewportSize({ height: 1024, width: viewportWidth });
      return page.locator('ore-query-bar').evaluate(() => {
        const bar = document.querySelector('ore-query-bar')!;
        const filters = bar.shadowRoot!.querySelector('.quick-filters') as HTMLElement;
        const toolbar = bar.shadowRoot!.querySelector('.toolbar') as HTMLElement;
        return {
          filterButtonVisible: Boolean(bar.shadowRoot!.querySelector('.filter-button')?.getClientRects().length),
          quickFiltersVisible: getComputedStyle(filters).display !== 'none',
          toolbarFits: toolbar.getBoundingClientRect().width <= window.innerWidth,
        };
      });
    };

    const phone = await state(375);
    expect(phone.quickFiltersVisible).toBe(false);
    expect(phone.filterButtonVisible).toBe(true);
    expect(phone.toolbarFits).toBe(true);

    // Tablets have room for the row, so the quick filters stay.
    const tablet = await state(768);
    expect(tablet.quickFiltersVisible).toBe(true);
    expect(tablet.toolbarFits).toBe(true);

    // The same filters remain reachable through the drawer at every size.
    await state(375);
    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByRole('radio', { name: 'Alice' })).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('passes the full axe scan closed, open, and with pills', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const bar = page.locator('ore-query-bar');

    expect((await axeCheck(page)).violations).toEqual([]);

    await clickInput(page);
    await expect(bar.locator('[role="option"]')).toHaveCount(2);
    expect((await axeCheck(page)).violations).toEqual([]);

    await input(page).fill('author:alice label:bug');
    await expect(bar.locator('ore-chip')).toHaveCount(2);
    expect((await axeCheck(page)).violations).toEqual([]);

    // The dead-draft row is part of the surface too.
    await input(page).pressSequentially(' author:zzz');
    await expect(bar.locator('.no-match')).toBeVisible();
    expect((await axeCheck(page)).violations).toEqual([]);
  });

  test('carries combobox semantics on the focused input', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const field = input(page);

    await expect(field).toHaveAttribute('role', 'combobox');
    await expect(field).toHaveAttribute('aria-haspopup', 'listbox');
    await expect(field).toHaveAttribute('aria-expanded', 'false');
    await expect(
      field.evaluate((input) => {
        const controls = (input as HTMLInputElement & { ariaControlsElements?: Element[] }).ariaControlsElements;
        const listbox = document.querySelector('ore-query-bar')?.shadowRoot?.querySelector('[role="listbox"]');

        return Boolean(listbox && controls?.includes(listbox));
      }),
    ).resolves.toBe(true);

    await clickInput(page);
    await expect(field).toHaveAttribute('aria-expanded', 'true');

    await field.press('ArrowDown');
    await expect
      .poll(() =>
        field.evaluate((input) => {
          const active = (input as HTMLInputElement & { ariaActiveDescendantElement?: Element | null })
            .ariaActiveDescendantElement;
          const focused = document.querySelector('ore-query-bar')?.shadowRoot?.querySelector('[data-focused]');

          return active === focused;
        }),
      )
      .toBe(true);
  });
});

test.describe('Interaction', () => {
  test('a typed complete token commits to a pill and rewrites out of the field', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await input(page).fill('bug author:alice');
    await expect(page.locator('ore-query-bar ore-chip')).toHaveCount(1);
    await expect(input(page)).toHaveValue('bug');
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: 'bug',
      tokens: [{ key: 'author', value: 'alice' }],
    });
  });

  test('picking a key starts composing and picking a value commits', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const fieldHeight = () =>
      page.evaluate(() => {
        const bar = document.querySelector('ore-query-bar')!;
        const field = bar.shadowRoot!.querySelector('ore-input')!.shadowRoot!.querySelector('.field')!;
        return field.getBoundingClientRect().height;
      });
    // The clear button appears as soon as there is text; it must not grow the
    // field either, so test with clearable enabled like real consumers do.
    await page.locator('ore-query-bar').evaluate((el) => el.setAttribute('clearable', ''));
    await clickInput(page);
    const empty = await fieldHeight();
    await page.locator('.option', { hasText: 'Author' }).first().click();
    await expect(input(page)).toHaveValue('author:');
    await expect.poll(fieldHeight).toBe(empty);

    await page.locator('.option', { hasText: 'Alice' }).first().click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [{ key: 'author', value: 'alice' }],
    });
    await expect(input(page)).toBeFocused();
    // The committed pill must not grow the field: it hugs the text line.
    await expect.poll(fieldHeight).toBe(empty);
  });

  test('pill removal and backspace both update the state', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await input(page).fill('author:alice label:bug');
    await expect(page.locator('ore-query-bar ore-chip')).toHaveCount(2);

    await page.locator('ore-chip', { hasText: 'Label' }).locator('[part="remove-btn"]').click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [{ key: 'author', value: 'alice' }],
    });

    await clickInput(page);
    await input(page).press('Backspace');
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [],
    });
  });

  test('typing after Escape reopens the dropdown', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const field = input(page);
    await clickInput(page);
    await expect(page.locator('[role="option"]')).toHaveCount(2);

    await field.press('Escape');
    await expect(page.locator('[role="option"]')).toHaveCount(0);

    await field.pressSequentially('al');
    await expect(page.locator('[role="option"]')).toHaveCount(1);
    await expect(field).toHaveAttribute('aria-expanded', 'true');
  });

  test('an unresolvable draft shows a dead-draft row instead of closing', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    const field = input(page);
    await clickInput(page);
    await field.pressSequentially('author:zzz');
    await expect(page.locator('.no-match')).toContainText('No matching options');
    await expect(field).toHaveAttribute('aria-expanded', 'true');
  });

  test('Escape dismisses the dropdown and keeps the query', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await clickInput(page);
    await expect(page.locator('[role="option"]')).toHaveCount(2);

    await input(page).press('Escape');
    await expect(page.locator('[role="option"]')).toHaveCount(0);
    await expect(input(page)).toHaveAttribute('aria-expanded', 'false');
  });
});

test.describe('Layout', () => {
  test('applied filters wrap inside the unified search field', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-query-bar id="bar" label="Search" style="width: 320px"></ore-query-bar>');
    await page.evaluate(() => {
      const bar = document.getElementById('bar') as HTMLElement & { vocabulary: unknown };
      bar.vocabulary = [
        { key: 'author', label: 'Author', options: [{ label: 'Alice', value: 'alice' }] },
        { key: 'label', label: 'Label', options: [{ label: 'Bug', value: 'bug' }] },
        { key: 'milestone', label: 'Milestone', options: [{ label: 'October Release', value: 'october' }] },
      ];
    });

    const field = page.locator('ore-query-bar ore-input [part="field"]');
    const before = await field.boundingBox();

    await input(page).fill('author:alice label:bug milestone:october');
    await expect(page.locator('ore-query-bar ore-chip')).toHaveCount(3);

    const after = await field.boundingBox();
    expect(after!.height).toBeGreaterThan(before!.height);

    const host = await page.locator('ore-query-bar').evaluate((el) => el.getBoundingClientRect());
    const chips = await page
      .locator('ore-query-bar ore-chip')
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(chips.length).toBe(3);
    for (const chip of chips) {
      expect(chip.bottom).toBeLessThanOrEqual(host.bottom + 1);
      expect(chip.top).toBeGreaterThanOrEqual(after!.y);
      expect(chip.bottom).toBeLessThanOrEqual(after!.y + after!.height);
    }
  });

  test('suggestion rows provide a minimum 44px target', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);

    await clickInput(page);
    const rows = await page.locator('.option').evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('keeps quick-filter badges slim inside their taller hit area', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 800, width: 768 });
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el['quick-filters'] = [{ key: 'author', label: 'Mine', value: 'alice' }];
    });
    const sizes = await page.evaluate(() => {
      const bar = document.querySelector('ore-query-bar')!.shadowRoot!;
      const chip = bar.querySelector('.quick-filters ore-chip')!.shadowRoot!;
      const badge = chip.querySelector('[part="chip"]')!.getBoundingClientRect();
      const target = chip.querySelector('[part="chip-btn"]')!.getBoundingClientRect();
      return { badge: badge.height, target: target.height };
    });
    // The visible badge hugs its text; the button keeps the roomy hit area.
    expect(sizes.badge).toBeGreaterThan(0);
    expect(sizes.badge).toBeLessThan(sizes.target);
  });

  test('places toolbar-end content at the end of the toolbar row', async ({ page, refinePage }) => {
    await page.setViewportSize({ height: 800, width: 768 });
    await refinePage.mountComponent(
      '<ore-query-bar id="bar" label="Search issues" style="width: 100%"><span slot="toolbar-end">12 results</span></ore-query-bar>',
    );
    await page.evaluate(() => {
      const bar = document.getElementById('bar') as HTMLElement & { vocabulary: unknown };
      bar.vocabulary = [{ key: 'author', label: 'Author', options: [{ label: 'Alice', value: 'alice' }] }];
    });
    const count = page.getByText('12 results');
    await expect(count).toBeVisible();
    const [countBox, toolbarBox] = await Promise.all([
      count.boundingBox(),
      page.locator('ore-query-bar').locator('.toolbar').boundingBox(),
    ]);
    expect(countBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    // Same row, flush with the toolbar's end.
    expect(countBox!.y).toBeGreaterThanOrEqual(toolbarBox!.y);
    expect(countBox!.y + countBox!.height).toBeLessThanOrEqual(toolbarBox!.y + toolbarBox!.height + 1);
    expect(toolbarBox!.x + toolbarBox!.width - (countBox!.x + countBox!.width)).toBeLessThanOrEqual(1);
  });
});

test.describe('Multiple selection', () => {
  test('renders registered icons beside accessible option labels in both selection modes', async ({
    page,
    refinePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = [
        {
          key: 'fruit',
          label: 'Fruit',
          options: [
            { icon: 'search', label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
          ],
          selection: 'multiple',
        },
        // A text-only option keeps both tokens list rows: an icon-complete token
        // would render as the card gallery instead (covered by its own describe).
        {
          key: 'sort',
          label: 'Sort',
          options: [
            { icon: 'filter', label: 'Recent', value: 'recent' },
            { label: 'Oldest', value: 'oldest' },
          ],
        },
      ];
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    const apple = page.getByRole('checkbox', { exact: true, name: 'Apple' });
    const recent = page.getByRole('radio', { exact: true, name: 'Recent' });
    const checkboxBox = apple.locator('.box');
    const radioCircle = recent.locator('.circle');
    const checkboxRadius = await checkboxBox.evaluate((el) => parseFloat(getComputedStyle(el).borderRadius));
    const checkboxBounds = (await checkboxBox.boundingBox())!;
    expect(checkboxRadius).toBeLessThan(checkboxBounds.width / 2);
    await expect(radioCircle).toHaveCSS('border-radius', '50%');
    for (const option of [apple, recent]) {
      expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(48);
      await expect(option).toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
      await expect(option.locator('.choice-label ore-icon svg')).toBeVisible();
      await expect(option.locator('.choice-label ore-icon')).toHaveAttribute('aria-hidden', 'true');
    }
    await expect(
      page.getByRole('checkbox', { exact: true, name: 'Banana' }).locator('.choice-label ore-icon'),
    ).toHaveCount(0);
    await apple.locator('.choice-label ore-icon').click();
    await expect(apple).toBeChecked();
    await recent.click();
    await recent.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(recent).toBeFocused();
    await expect(recent).toHaveCSS('outline-style', 'solid');
    await expect(recent).toHaveCSS('outline-width', '2px');
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.emulateMedia({ forcedColors: 'active' });
    await expect(apple).not.toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
    await expect(recent).not.toHaveCSS('border-color', 'rgba(0, 0, 0, 0)');
    await page.emulateMedia({ forcedColors: 'none' });
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [
        { key: 'fruit', value: 'apple' },
        { key: 'sort', value: 'recent' },
      ],
    });
  });

  async function mountFruits(
    page: import('@playwright/test').Page,
    refinePage: { mountComponent(html: string): Promise<void> },
  ) {
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.style.width = '100%';
      el.vocabulary = [
        {
          key: 'fruit',
          label: 'Fruit',
          options: [
            { label: 'Apple', value: 'apple' },
            { label: 'Banana', value: 'banana' },
            { label: 'Mixed fruit', value: 'apple, pear' },
            ...Array.from({ length: 9 }, (_, index) => ({ label: `Fruit ${index + 1}`, value: String(index) })),
          ],
          selection: 'multiple',
        },
        {
          key: 'sort',
          label: 'Sort',
          options: [
            { label: 'Name', value: 'name' },
            { label: 'Recent', value: 'recent' },
          ],
        },
      ];
      el['quick-filters'] = [
        { key: 'fruit', label: 'Apples', value: 'apple' },
        { key: 'fruit', label: 'Bananas', value: 'banana' },
      ];
      el.addEventListener('change', () => {
        el.dataset.changes = String(Number(el.dataset.changes ?? '0') + 1);
      });
    });
  }

  test('adds typed and quick values, counts active groups, and removes exact pills', async ({ page, refinePage }) => {
    await mountFruits(page, refinePage);
    const bar = page.locator('ore-query-bar');
    await input(page).fill('fruit:apple fruit:banana fruit:apple sort:name sort:recent');
    await input(page).press('Escape');
    await expect(bar).toHaveJSProperty('state', {
      text: '',
      tokens: [
        { key: 'fruit', value: 'apple' },
        { key: 'fruit', value: 'banana' },
        { key: 'sort', value: 'recent' },
      ],
    });
    await expect(bar).toHaveAttribute('data-changes', '1');
    await expect(page.getByRole('button', { exact: true, name: 'Filters (2)' })).toBeVisible();
    await page.getByRole('checkbox', { exact: true, name: 'Apples' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Remove Fruit: Banana' })).toBeVisible();
    await page.getByRole('checkbox', { exact: true, name: 'Apples' }).click();
    await page.getByRole('button', { exact: true, name: 'Remove Fruit: Banana' }).click();
    await expect(bar.locator('.applied ore-chip')).toHaveCount(2);
    await input(page).press('Backspace');
    await expect(bar).toHaveJSProperty('state', { text: '', tokens: [{ key: 'sort', value: 'recent' }] });
  });

  test('retains hidden selections during search and stages checkbox keyboard edits until Apply', async ({
    page,
    refinePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountFruits(page, refinePage);
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    await expect(page.getByRole('radio', { exact: true, name: 'Any' })).toHaveCount(1);
    const search = page.getByRole('textbox', { exact: true, name: 'Find Fruit' });
    await search.fill('Apple');
    const apple = page.getByRole('checkbox', { exact: true, name: 'Apple' });
    await apple.focus();
    await apple.press('Space');
    await expect(apple).toBeChecked();
    await search.fill('Mixed');
    await page.getByRole('checkbox', { exact: true, name: 'Mixed fruit' }).click();
    await expect(page.locator('.filter-group-heading .filter-count')).toHaveText('2');
    await expect(page.locator('ore-query-bar')).not.toHaveAttribute('data-changes');
    await search.fill('no matches');
    await expect(page.getByRole('status').filter({ hasText: 'No matching options.' })).toHaveText(
      'No matching options.',
    );
    await search.fill('');
    await expect(apple).toBeChecked();
    await expect(page.getByRole('checkbox', { exact: true, name: 'Mixed fruit' })).toBeChecked();
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [
        { key: 'fruit', value: 'apple' },
        { key: 'fruit', value: 'apple, pear' },
      ],
    });
    await expect(page.locator('ore-query-bar')).toHaveAttribute('data-changes', '1');
    await expect(page.getByRole('button', { exact: true, name: 'Filters (1)' })).toBeFocused();
  });

  test('cancels draft clearing, applies group clearing, and fits mobile enlarged text', async ({
    page,
    refinePage,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ height: 900, width: 375 });
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%';
    });
    await mountFruits(page, refinePage);
    await input(page).fill('fresh fruit:apple fruit:banana sort:name');
    await input(page).press('Escape');
    await page.getByRole('button', { exact: true, name: 'Filters (2)' }).click();
    await page.getByRole('button', { exact: true, name: 'Clear Fruit' }).click();
    await expect(page.getByRole('checkbox', { exact: true, name: 'Apple' })).not.toBeChecked();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { exact: true, name: 'Filters (2)' }).click();
    await expect(page.getByRole('checkbox', { exact: true, name: 'Apple' })).toBeChecked();
    await page.getByRole('button', { exact: true, name: 'Clear Fruit' }).click();
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: 'fresh',
      tokens: [{ key: 'sort', value: 'name' }],
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
    expect((await axeCheck(page)).violations).toEqual([]);
  });
});

test.describe('Filter drawer', () => {
  test('stages selections without emitting query changes and applies them once', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);
    await input(page).fill('regression');
    await page.locator('ore-query-bar').evaluate((el) => {
      el.dataset.changes = '0';
      el.addEventListener('change', () => {
        el.dataset.changes = String(Number(el.dataset.changes) + 1);
      });
    });
    const filters = page.getByRole('button', { exact: true, name: 'Filters' });
    await filters.click();
    const dialog = page.getByRole('dialog', { exact: true, name: 'Filters' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('.drawer-heading')).toBeFocused();
    await expect(input(page)).not.toBeFocused();
    await expect(page.locator('.dropdown')).toBeHidden();
    await page.getByRole('radio', { exact: true, name: 'Alice' }).click();
    await page.getByRole('radio', { exact: true, name: 'Bug' }).click();
    await expect(page.locator('ore-query-bar')).toHaveAttribute('data-changes', '0');
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: 'regression',
      tokens: [
        { key: 'author', value: 'alice' },
        { key: 'label', value: 'bug' },
      ],
    });
    await expect(page.locator('ore-query-bar')).toHaveAttribute('data-changes', '1');
    const appliedFilters = page.getByRole('button', { exact: true, name: 'Filters (2)' });
    await expect(appliedFilters).toBeFocused();
  });

  test('explicit dismissals discard drafts while backdrop and swipe protect pending edits', async ({
    page,
    refinePage,
  }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await mountBar(page, refinePage);
    const filters = page.getByRole('button', { exact: true, name: 'Filters' });
    const dialog = page.getByRole('dialog', { exact: true, name: 'Filters' });
    for (const method of ['escape', 'cancel', 'backdrop', 'swipe']) {
      await filters.click();
      await page.getByRole('radio', { exact: true, name: 'Alice' }).click();
      if (method === 'escape') await page.keyboard.press('Escape');
      else if (method === 'cancel') await page.getByRole('button', { exact: true, name: 'Cancel' }).click();
      else if (method === 'backdrop') await page.mouse.click(4, 4);
      else {
        const handle = page.locator('ore-query-bar ore-drawer [part="drag-handle"]');
        const box = (await handle.boundingBox())!;
        await handle.dispatchEvent('pointerdown', {
          bubbles: true,
          clientX: box.x + 10,
          clientY: box.y + 10,
          isPrimary: true,
          pointerId: 1,
          pointerType: 'touch',
        });
        await handle.dispatchEvent('pointermove', {
          bubbles: true,
          clientX: box.x + 10,
          clientY: box.y + 180,
          isPrimary: true,
          pointerId: 1,
          pointerType: 'touch',
        });
        await handle.dispatchEvent('pointerup', {
          bubbles: true,
          clientX: box.x + 10,
          clientY: box.y + 180,
          isPrimary: true,
          pointerId: 1,
          pointerType: 'touch',
        });
      }
      if (method === 'backdrop' || method === 'swipe') {
        await expect(dialog).toBeVisible();
        await expect(page.getByRole('radio', { exact: true, name: 'Alice' })).toBeChecked();
        await expect(page.getByRole('status').filter({ hasText: 'Changes not applied' })).toBeVisible();
        await page.getByRole('button', { exact: true, name: 'Cancel' }).click();
      }
      await expect(dialog).toBeHidden();
      await expect(filters).toBeFocused();
      await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', { text: '', tokens: [] });
    }
  });

  test('sizes mobile sheets to content and uses taller space for longer filter sets', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ height: 844, width: 390 });
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = [{ key: 'author', label: 'Author', options: [{ label: 'Alice', value: 'alice' }] }];
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    const panel = page.locator('ore-query-bar ore-drawer [part="panel"]');
    const short = (await panel.boundingBox())!;
    expect(844 - short.y).toBeLessThan(500);
    await page.getByRole('button', { exact: true, name: 'Cancel' }).click();
    await expect(page.getByRole('dialog', { exact: true, name: 'Filters' })).toBeHidden();
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = Array.from({ length: 4 }, (_, i) => ({
        key: `group${i}`,
        label: `Group ${i}`,
        options: Array.from({ length: 6 }, (_, j) => ({ label: `Choice ${j}`, value: String(j) })),
      }));
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    const long = (await panel.boundingBox())!;
    expect(844 - long.y).toBeGreaterThan(844 * 0.8);
    expect(844 - long.y).toBeLessThanOrEqual(844 * 0.9);
    await expect(page.getByRole('button', { exact: true, name: 'Apply filters' })).toBeInViewport();
  });

  test('quick filters reflect typed and drawer selections without duplicate applied pills', async ({
    page,
    refinePage,
  }) => {
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el['quick-filters'] = [
        { key: 'author', label: 'Mine', value: 'alice' },
        { key: 'label', label: 'Bugs', value: 'bug' },
      ];
    });
    const mine = page.getByRole('checkbox', { exact: true, name: 'Mine' });
    await mine.click();
    await expect(mine).toBeChecked();
    await input(page).fill('author:bob');
    await expect(mine).not.toBeChecked();
    await mine.click();
    await expect(page.locator('.applied ore-chip')).toHaveCount(1);
    await page.getByRole('button', { exact: true, name: 'Filters (1)' }).click();
    await expect(page.getByRole('radio', { exact: true, name: 'Alice' })).toBeChecked();
    await page.getByRole('radio', { exact: true, name: 'Bob' }).click();
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    await expect(mine).not.toBeChecked();
    await page.getByRole('button', { exact: true, name: 'Remove Author: Bob' }).click();
    await expect(page.locator('.applied ore-chip')).toHaveCount(0);
    await expect(page.getByRole('button', { exact: true, name: 'Filters' })).toBeFocused();
  });

  test('searches long option lists while retaining selection, Any and keyboard navigation', async ({
    page,
    refinePage,
  }) => {
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = [
        {
          key: 'owner',
          label: 'Owner',
          options: Array.from({ length: 30 }, (_, i) => ({ label: `Person ${i + 1}`, value: String(i) })),
        },
      ];
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    const search = page.getByRole('textbox', { exact: true, name: 'Find Owner' });
    await search.fill('Person 29');
    await expect(page.getByRole('radio')).toHaveCount(2);
    await page.getByRole('radio', { exact: true, name: 'Person 29' }).click();
    await expect(search).toHaveValue('Person 29');
    await search.fill('no results');
    await expect(page.getByText('No matching options.', { exact: true })).toBeVisible();
    await expect(page.getByRole('radio', { exact: true, name: 'Any' })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Selected: Person 29' })).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Show all options' }).click();
    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
    await expect(page.getByRole('radio', { exact: true, name: 'Person 29' })).toBeChecked();
    await page.getByRole('radio', { exact: true, name: 'Person 29' }).focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('radio', { exact: true, name: 'Person 28' })).toBeChecked();
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    await expect(page.locator('ore-query-bar')).toHaveJSProperty('state', {
      text: '',
      tokens: [{ key: 'owner', value: '27' }],
    });
  });

  test('fits narrow, enlarged-text and RTL layouts with reachable drawer actions', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [320, 768, 1280]) {
      await page.setViewportSize({ height: 900, width });
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });
      await mountBar(page, refinePage);
      await page.locator('ore-query-bar').evaluate((el) => {
        el.style.width = '100%';
        el.dir = 'rtl';
        el['quick-filters'] = [{ key: 'author', label: 'Meine zugewiesenen Aufgaben', value: 'alice' }];
      });
      await input(page).fill('author:alice label:enhancement');
      await input(page).press('Escape');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await page.getByRole('button', { exact: true, name: 'Filters (2)' }).click();
      const dialog = page.getByRole('dialog', { exact: true, name: 'Filters' });
      await expect(dialog).toBeVisible();
      const boxes = [];
      for (const name of ['Reset filters', 'Cancel', 'Apply filters']) {
        const box = (await page.getByRole('button', { exact: true, name }).boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        expect(box.y + box.height).toBeLessThanOrEqual(900);
        expect(box.height).toBeGreaterThanOrEqual(44);
        boxes.push(box);
      }
      // One footer row height: variants must not render at different sizes...
      expect(new Set(boxes.map((box) => Math.round(box.height))).size).toBe(1);
      // ...and same-row actions must stay visually separate, not attached.
      // Distance is direction-agnostic: RTL mirrors the visual order.
      for (const [one, two] of [
        [boxes[0], boxes[1]],
        [boxes[1], boxes[2]],
        [boxes[0], boxes[2]],
      ]) {
        if (Math.abs(one.y - two.y) < 1) {
          const gap = Math.max(one.x, two.x) - Math.min(one.x + one.width, two.x + two.width);
          expect(gap).toBeGreaterThanOrEqual(6);
        }
      }
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
    }
  });

  test('passes full accessibility checks with quick filters and with the drawer open', async ({ page, refinePage }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mountBar(page, refinePage);
    await page.locator('ore-query-bar').evaluate((el) => {
      el['quick-filters'] = [{ key: 'author', label: 'Mine', value: 'alice' }];
    });
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    expect((await axeCheck(page)).violations).toEqual([]);
    await page.getByRole('radio', { exact: true, name: 'Alice' }).click();
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    await expect(page.getByRole('dialog', { exact: true, name: 'Filters' })).toBeHidden();
    expect((await axeCheck(page)).violations).toEqual([]);
  });
});

/** Registers two tiny trusted icons on the IIFE global so card-gallery tests need no app art. */
async function registerCardIcons(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const refine = (
      window as unknown as {
        Refine: { components: { content: { registerIcons(icons: Record<string, unknown>): void } } };
      }
    ).Refine;
    const dot = {
      children: [{ attrs: { cx: '12', cy: '12', fill: 'currentColor', r: '10' }, tag: 'circle' }],
      viewBox: [0, 0, 24, 24],
    };
    refine.components.content.registerIcons({ 'card-a': dot, 'card-b': dot });
  });
}

test.describe('Icon card gallery', () => {
  test('renders icon-complete tokens as a multi-column card grid and toggles by click', async ({
    page,
    refinePage,
  }) => {
    await mountBar(page, refinePage);
    await registerCardIcons(page);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = [
        {
          key: 'element',
          label: 'Element',
          options: [
            { icon: 'card-a', label: 'Fire', value: 'fire' },
            { icon: 'card-b', label: 'Ice', value: 'ice' },
          ],
          selection: 'multiple',
        },
      ];
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    const choices = page.locator('.filter-choices');
    await expect(choices).toHaveAttribute('data-cards', '');
    // The gallery is a real grid, not the single-column list.
    await expect(choices).toHaveCSS('grid-template-columns', /repeat|px/);
    const columns = await choices.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBeGreaterThanOrEqual(2);
    // Cards carry the art: each checkbox renders its ore-icon inside the choice label.
    await expect(choices.locator('ore-checkbox .choice-label ore-icon svg').first()).toBeVisible();
    // The card is the real control: clicking toggles the token, Apply commits it.
    await choices.getByRole('checkbox', { name: 'Fire' }).click();
    await expect(choices.getByRole('checkbox', { name: 'Fire' })).toBeChecked();
    await page.getByRole('button', { exact: true, name: 'Apply filters' }).click();
    const state = await page.locator('ore-query-bar').evaluate((el) => (el as { state: unknown }).state);
    expect(state).toEqual({ text: '', tokens: [{ key: 'element', value: 'fire' }] });
  });

  test('keeps the Any row full-width above a single-select card gallery', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);
    await registerCardIcons(page);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = [
        {
          key: 'sort',
          label: 'Sort',
          options: [
            { icon: 'card-a', label: 'Recent', value: 'recent' },
            { icon: 'card-b', label: 'Name', value: 'name' },
          ],
        },
      ];
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    const group = page.locator('ore-radio-group[data-cards]');
    await expect(group).toBeVisible();
    const [anyBox, cardBox] = await Promise.all([
      page.getByRole('radio', { exact: true, name: 'Any' }).boundingBox(),
      page.getByRole('radio', { exact: true, name: 'Recent' }).boundingBox(),
    ]);
    expect(anyBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    // The Any row spans the grid: wider than one card and above the gallery.
    expect(anyBox!.width).toBeGreaterThan(cardBox!.width * 1.5);
    expect(anyBox!.y).toBeLessThan(cardBox!.y);
    // Keyboard selection still works on the card radios.
    await page.getByRole('radio', { exact: true, name: 'Recent' }).focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('radio', { exact: true, name: 'Recent' })).toBeChecked();
  });

  test('hides the tick on unchecked cards and reveals it as the checked badge', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);
    await registerCardIcons(page);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = [
        {
          key: 'element',
          label: 'Element',
          options: [
            { icon: 'card-a', label: 'Fire', value: 'fire' },
            { icon: 'card-b', label: 'Ice', value: 'ice' },
          ],
          selection: 'multiple',
        },
        {
          key: 'sort',
          label: 'Sort',
          options: [
            { icon: 'card-a', label: 'Recent', value: 'recent' },
            { icon: 'card-b', label: 'Name', value: 'name' },
          ],
        },
      ];
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    const tick = (name: string, role: 'checkbox' | 'radio') =>
      page
        .locator('ore-query-bar')
        .locator(role === 'checkbox' ? '.filter-choices' : 'ore-radio-group[data-cards]')
        .evaluate(
          (root, { n, r }) => {
            const host = [...root.querySelectorAll(r === 'checkbox' ? 'ore-checkbox' : 'ore-radio')].find(
              (c) => (c.textContent || '').trim() === n,
            );
            const part = host?.shadowRoot?.querySelector(r === 'checkbox' ? '[part="checkbox"]' : '[part="radio"]');
            return part ? getComputedStyle(part).display : 'missing';
          },
          { n: name, r: role },
        );
    // Unchecked cards are clean: no tick on either choice type.
    expect(await tick('Fire', 'checkbox')).toBe('none');
    expect(await tick('Recent', 'radio')).toBe('none');
    // Checking reveals the corner badge; the Any row keeps its radio dot.
    await page.getByRole('checkbox', { name: 'Fire' }).click();
    expect(await tick('Fire', 'checkbox')).not.toBe('none');
    const anyVisible = await page.locator('ore-radio-group[data-cards]').evaluate((group) => {
      const any = group.querySelector('ore-radio[value="any"]');
      const part = any?.shadowRoot?.querySelector('[part="radio"]');
      return part ? getComputedStyle(part).display : 'missing';
    });
    expect(anyVisible).not.toBe('none');
  });

  test('card gallery passes accessibility checks', async ({ page, refinePage }) => {
    await mountBar(page, refinePage);
    await registerCardIcons(page);
    await page.locator('ore-query-bar').evaluate((el) => {
      el.vocabulary = [
        {
          key: 'element',
          label: 'Element',
          options: [
            { icon: 'card-a', label: 'Fire', value: 'fire' },
            { icon: 'card-b', label: 'Ice', value: 'ice' },
          ],
          selection: 'multiple',
        },
      ];
    });
    await page.getByRole('button', { exact: true, name: 'Filters' }).click();
    expect((await axeCheck(page)).violations).toEqual([]);
  });
});
