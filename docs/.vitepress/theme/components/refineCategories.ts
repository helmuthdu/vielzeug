/**
 * The single source of truth for how Refine's components are categorized.
 *
 * The sidebar groups, the `api.md` component table, the `index.md` element list,
 * and the `accessibility.md` sections are all derived from (or validated against)
 * this map. Before it existed, four hand-maintained copies drifted: `api.md` lost
 * six components that had pages and `index.md` lost four.
 *
 * Keys are docs page slugs (`docs/refine/components/<slug>.md`), which is the
 * unit every one of those surfaces displays. Sub-element tags that share a parent's
 * page (`ore-tab-item`, `ore-avatar-group`, …) belong to their parent's category by
 * construction, so they need no entry here.
 *
 * `refine-categories.test.ts` scans the component pages from the filesystem and
 * fails if a page is uncategorized, categorized twice, or missing from the map —
 * the same guarantee `packageGroups.test.ts` gives the package navbar.
 */

export type RefineCategory = {
  /** Sidebar group heading. */
  name: string;
  /** Docs page slugs, alphabetical. */
  components: string[];
};

/**
 * Six categories, each with a real population. Disclosure was retired: by
 * WAI-ARIA APG, Tabs is its own pattern rather than a disclosure, which left the
 * group with a single resident family. Its members went where readers look for
 * them — Accordion to Content (collapsible content), Tabs to Navigation — and
 * Navigation gathered the wayfinding components previously split across Content
 * (breadcrumb, pagination, stepper), Layout (navbar stays: it is a page frame),
 * and Overlay (navigation-menu).
 */
export const REFINE_CATEGORIES: RefineCategory[] = [
  {
    components: [
      'accordion',
      'avatar',
      'card',
      'carousel',
      'chat-message',
      'chat-panel',
      'code-window',
      'copy-command',
      'icon',
      'keyboard-key',
      'list',
      'marquee',
      'qr-code',
      'rank-list',
      'speech-player',
      'speed-reading',
      'stats',
      'table',
      'text',
    ],
    name: 'Content',
  },
  {
    components: [
      'alert',
      'async',
      'badge',
      'chip',
      'cookie-banner',
      'password-strength',
      'progress',
      'skeleton',
      'toast',
      'typing-indicator',
    ],
    name: 'Feedback',
  },
  {
    components: [
      'button',
      'calendar',
      'checkbox',
      'combobox',
      'counter',
      'datagrid',
      'date-picker',
      'file-input',
      'input',
      'message-composer',
      'number-input',
      'otp-input',
      'qr-scanner',
      'query-bar',
      'radio',
      'rating',
      'select',
      'slider',
      'switch',
      'textarea',
      'time-picker',
    ],
    name: 'Inputs',
  },
  {
    components: ['box', 'grid', 'navbar', 'separator', 'sidebar'],
    name: 'Layout',
  },
  {
    components: ['breadcrumb', 'navigation-menu', 'pagination', 'stepper', 'tabs'],
    name: 'Navigation',
  },
  {
    components: ['command-palette', 'dialog', 'drawer', 'menu', 'popover', 'spotlight', 'tooltip', 'tour'],
    name: 'Overlay',
  },
];

/** Page slug -> category name, for lookups from a sidebar link or a table row. */
export const REFINE_CATEGORY_BY_COMPONENT: ReadonlyMap<string, string> = new Map(
  REFINE_CATEGORIES.flatMap((category) => category.components.map((slug) => [slug, category.name] as const)),
);

/**
 * Display names that title-casing the slug cannot produce: acronyms and one
 * closed compound. Every other slug title-cases correctly (`chat-message` ->
 * "Chat Message"), so this list stays a list of genuine exceptions.
 */
const LABEL_EXCEPTIONS: Readonly<Record<string, string>> = {
  datagrid: 'Data Grid',
  'otp-input': 'OTP Input',
  'qr-code': 'QR Code',
  'qr-scanner': 'QR Scanner',
};

/** Sidebar/display label for a page slug. */
export function refineComponentLabel(slug: string): string {
  return (
    LABEL_EXCEPTIONS[slug] ??
    slug
      .split('-')
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(' ')
  );
}
