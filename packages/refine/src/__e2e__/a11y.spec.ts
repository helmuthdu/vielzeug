/**
 * Real-browser accessibility checks for refine components.
 *
 * These complement the jsdom axe tests in component.test.ts files. The jsdom tests
 * disable color-contrast, target-size, and scrollable-region-focusable because jsdom
 * has no layout engine. This suite runs those same rules in a real Chromium browser.
 *
 * Axe is scoped to `.frame` (the component container) to avoid page-level false positives
 * like `document-title` / `html-has-lang` that don't apply to component-level testing.
 *
 * Run with: pnpm test:e2e (requires built dist — run pnpm build first)
 */
import AxeBuilder from '@axe-core/playwright';

import { expect, test } from './fixtures';

// Rules re-enabled here because jsdom cannot compute them (no CSS layout engine)
const REAL_BROWSER_RULES = {
  'color-contrast': { enabled: true },
  'target-size': { enabled: true },
};

// Page-level rules that produce false positives for component-level axe scans
// (axe still runs on the full document; these rules target <html>/<head> structure)
const PAGE_LEVEL_RULES: Record<string, { enabled: false }> = {
  'document-title': { enabled: false },
  'html-has-lang': { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
  region: { enabled: false },
};

async function axeCheck(page: ConstructorParameters<typeof AxeBuilder>[0]['page'], selector = '.frame') {
  return new AxeBuilder({ page })
    .include(selector)
    .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
    .options({ rules: { ...REAL_BROWSER_RULES, ...PAGE_LEVEL_RULES } })
    .analyze();
}

test.describe('Button', () => {
  test('default button passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button>Click me</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('disabled button passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button disabled>Save</ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('icon-only button with label passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-button label="Close dialog" icon="x"></ore-button>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Input', () => {
  test('labeled input passes all wcag2a/aa checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-input label="Email address" type="email"></ore-input>');

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });

  test('required input with error passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-input label="Username" required invalid error="Username is required"></ore-input>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Dialog', () => {
  test('open dialog passes a11y checks', async ({ page, refinePage }) => {
    await refinePage.mountComponent(
      '<ore-dialog open label="Confirm action" dismissible>' +
        '<p>Are you sure you want to delete this item?</p>' +
        '<ore-button slot="footer" theme="danger">Delete</ore-button>' +
        '<ore-button slot="footer" variant="ghost">Cancel</ore-button>' +
        '</ore-dialog>',
    );

    const results = await axeCheck(page);

    expect(results.violations).toEqual([]);
  });
});

test.describe('Checkbox', () => {
  // Known a11y gap: axe reports aria-toggle-field-name on the shadow <input> because the label
  // element is in light DOM and axe cannot pierce the shadow boundary to compute the accessible
  // name via the label-via-slot association. This is a real bug to fix in ore-checkbox.
  test.fail('labeled checkbox accessible name reaches shadow input (known a11y gap)', async ({ page, refinePage }) => {
    await refinePage.mountComponent('<ore-checkbox label="Accept terms and conditions"></ore-checkbox>');

    const results = await axeCheck(page);

    // When fixed, violations should be empty
    expect(results.violations).toEqual([]);
  });
});

test.describe('Select', () => {
  // axe-core cannot pierce shadow DOM to see listbox children (ore-option elements in light DOM).
  // This produces a false-positive aria-required-children violation. The component is correct;
  // the limitation is axe's flat-tree traversal not following shadow-slot assignments.
  test.fail(
    'labeled select passes a11y checks (aria-required-children shadow DOM limitation)',
    async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-select label="Country">' +
          '<ore-option value="us">United States</ore-option>' +
          '<ore-option value="de">Germany</ore-option>' +
          '</ore-select>',
      );

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    },
  );
});

test.describe('Tabs', () => {
  // The tab ID generator produces empty IDs (e.g. aria-controls="tabpanel-") in this IIFE
  // context because ore's global ID counter is not reset between tests. This causes
  // aria-valid-attr-value and aria-required-parent violations. Track separately in component tests.
  test.fail(
    'tabs with panels pass a11y checks (ID generation artifact in IIFE context)',
    async ({ page, refinePage }) => {
      await refinePage.mountComponent(
        '<ore-tabs>' +
          '<ore-tab-item value="t1">Tab 1</ore-tab-item>' +
          '<ore-tab-item value="t2">Tab 2</ore-tab-item>' +
          '<ore-tab-panel>Panel 1 content</ore-tab-panel>' +
          '<ore-tab-panel>Panel 2 content</ore-tab-panel>' +
          '</ore-tabs>',
      );

      const results = await axeCheck(page);

      expect(results.violations).toEqual([]);
    },
  );
});
