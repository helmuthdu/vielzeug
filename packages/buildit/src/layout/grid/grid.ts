import { css, defineElement, html } from '@vielzeug/craftit';

/**
 * bit-grid - A flexible grid layout component with intuitive responsive controls
 *
 * @element bit-grid
 *
 * @attr {string} cols - Number of columns: '1'-'12' | 'auto'
 * @attr {string} cols-sm - Columns at sm breakpoint (≥640px)
 * @attr {string} cols-md - Columns at md breakpoint (≥768px)
 * @attr {string} cols-lg - Columns at lg breakpoint (≥1024px)
 * @attr {string} cols-xl - Columns at xl breakpoint (≥1280px)
 * @attr {string} rows - Number of rows: '1'-'12' | 'auto'
 * @attr {string} gap - Gap size: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' (or 'md lg' for row-gap col-gap)
 * @attr {string} align - Align items vertically: 'start' | 'center' | 'end' | 'stretch' | 'baseline'
 * @attr {string} justify - Justify items horizontally: 'start' | 'center' | 'end' | 'stretch'
 * @attr {string} flow - Grid auto flow: 'row' | 'column' | 'row-dense' | 'column-dense'
 * @attr {boolean} responsive - Enable auto-fit responsive columns
 * @attr {string} layout - Preset layouts: 'sidebar' | 'sidebar-right' | 'app-shell' | 'nav-content' | 'bento'
 *
 * @slot - Grid items
 *
 * @cssprop --grid-cols - Custom column template
 * @cssprop --grid-rows - Custom row template
 * @cssprop --grid-gap - Gap between items
 * @cssprop --grid-row-gap - Row gap
 * @cssprop --grid-col-gap - Column gap
 * @cssprop --grid-min-col-width - Minimum column width for responsive mode (default: 250px)
 * @cssprop --grid-max-col-width - Maximum column width for responsive mode (default: 1fr)
 *
 * @example
 * <!-- Simple 3-column grid -->
 * <bit-grid cols="3" gap="md">
 *   <bit-card>Item 1</bit-card>
 *   <bit-card>Item 2</bit-card>
 *   <bit-card>Item 3</bit-card>
 * </bit-grid>
 *
 * @example
 * <!-- Responsive grid with breakpoints -->
 * <bit-grid cols="1" cols-sm="2" cols-md="3" cols-lg="4" gap="lg">
 *   <bit-card>Item 1</bit-card>
 *   <bit-card>Item 2</bit-card>
 *   <bit-card>Item 3</bit-card>
 * </bit-grid>
 *
 * @example
 * <!-- Sidebar layout -->
 * <bit-grid layout="sidebar" gap="lg">
 *   <aside>Sidebar</aside>
 *   <main>Content</main>
 * </bit-grid>
 *
 * @example
 * <!-- Material Design 3 App Shell (navigation rail) -->
 * <bit-grid layout="app-shell" gap="none">
 *   <nav>Navigation Rail (80px compact, 256px expanded)</nav>
 *   <header>Top App Bar</header>
 *   <main>Content Area</main>
 * </bit-grid>
 *
 * @example
 * <!-- M3 Navigation Drawer Pattern -->
 * <bit-grid layout="nav-content" gap="none">
 *   <header>Top App Bar</header>
 *   <nav>Navigation Drawer (256px)</nav>
 *   <main>Content Area</main>
 * </bit-grid>
 *
 * @example
 * <!-- Bento grid (magazine-style asymmetric layout) -->
 * <bit-grid layout="bento" gap="md">
 *   <bit-card>Hero (large)</bit-card>
 *   <bit-card>Featured</bit-card>
 *   <bit-card>Card 1</bit-card>
 *   <bit-card>Card 2</bit-card>
 *   <bit-card>Card 3</bit-card>
 *   <bit-card>Card 4</bit-card>
 *   <bit-card>Card 5 (wide)</bit-card>
 * </bit-grid>
 */

// -------------------- Styles --------------------
const styles = css`
  @layer buildit.base {
    /* ========================================
       Base Styles
       ======================================== */

    :host {
      --_cols: var(--grid-cols, repeat(auto-fit, minmax(250px, 1fr)));
      --_rows: var(--grid-rows, auto);
      --_gap: var(--grid-gap, var(--size-4));
      --_row-gap: var(--grid-row-gap, var(--_gap));
      --_col-gap: var(--grid-col-gap, var(--_gap));
      --_min-col-width: var(--grid-min-col-width, 250px);
      --_max-col-width: var(--grid-max-col-width, 1fr);

      display: grid;
      grid-template-columns: var(--_cols);
      grid-template-rows: var(--_rows);
      row-gap: var(--_row-gap);
      column-gap: var(--_col-gap);
      grid-auto-flow: row;
    }

    /* ========================================
       Responsive Mode
       ======================================== */

    :host([responsive]) {
      --_cols: repeat(auto-fit, minmax(var(--_min-col-width), var(--_max-col-width)));
    }

    /* ========================================
       Gap Sizes (single value sets both row and column gap)
       ======================================== */

    :host([gap='none']) {
      --_row-gap: 0;
      --_col-gap: 0;
    }

    :host([gap='xs']) {
      --_row-gap: var(--size-1);
      --_col-gap: var(--size-1);
    }

    :host([gap='sm']) {
      --_row-gap: var(--size-2);
      --_col-gap: var(--size-2);
    }

    :host([gap='md']) {
      --_row-gap: var(--size-4);
      --_col-gap: var(--size-4);
    }

    :host([gap='lg']) {
      --_row-gap: var(--size-6);
      --_col-gap: var(--size-6);
    }

    :host([gap='xl']) {
      --_row-gap: var(--size-8);
      --_col-gap: var(--size-8);
    }

    :host([gap='2xl']) {
      --_row-gap: var(--size-12);
      --_col-gap: var(--size-12);
    }

    /* ========================================
       Grid Auto Flow
       ======================================== */

    :host([flow='row']) {
      grid-auto-flow: row;
    }

    :host([flow='column']) {
      grid-auto-flow: column;
    }

    :host([flow='row-dense']) {
      grid-auto-flow: row dense;
    }

    :host([flow='column-dense']) {
      grid-auto-flow: column dense;
    }

    /* Backward compatibility with old dense attribute */
    :host([dense]) {
      grid-auto-flow: row dense;
    }

    /* ========================================
       Alignment
       ======================================== */

    :host([align='start']) {
      align-items: start;
    }

    :host([align='center']) {
      align-items: center;
    }

    :host([align='end']) {
      align-items: end;
    }

    :host([align='stretch']) {
      align-items: stretch;
    }

    :host([align='baseline']) {
      align-items: baseline;
    }

    /* ========================================
       Justify Items
       ======================================== */

    :host([justify='start']) {
      justify-items: start;
    }

    :host([justify='center']) {
      justify-items: center;
    }

    :host([justify='end']) {
      justify-items: end;
    }

    :host([justify='stretch']) {
      justify-items: stretch;
    }

    /* ========================================
       Layout Presets
       ======================================== */

    /* Sidebar layout: 250px sidebar + flexible main */
    :host([layout='sidebar']) {
      --_cols: 250px 1fr;
    }

    /* Right sidebar layout: flexible main + 250px sidebar */
    :host([layout='sidebar-right']) {
      --_cols: 1fr 250px;
    }

    /* App Shell: Modern app layout with navigation rail */
    :host([layout='app-shell']) {
      --_cols: 80px 1fr;
      --_rows: auto 1fr;
      grid-template-areas:
        'rail header'
        'rail main';
    }

    :host([layout='app-shell']) ::slotted(:nth-child(1)) {
      grid-area: rail;
    }

    :host([layout='app-shell']) ::slotted(:nth-child(2)) {
      grid-area: header;
    }

    :host([layout='app-shell']) ::slotted(:nth-child(3)) {
      grid-area: main;
    }

    /* Responsive: expand rail on larger screens */
    @container (min-width: 1024px) {
      :host([layout='app-shell']) {
        --_cols: 256px 1fr;
      }
    }

    /* Mobile: hide rail (assumes you'll use a drawer/modal navigation) */
    @container (max-width: 639px) {
      :host([layout='app-shell']) {
        --_cols: 1fr;
        --_rows: auto 1fr;
        grid-template-areas:
          'header'
          'main';
      }

      /* Hide the rail element */
      :host([layout='app-shell']) ::slotted(:nth-child(1)) {
        display: none;
        grid-area: unset;
      }

      /* Reassign header to new grid area */
      :host([layout='app-shell']) ::slotted(:nth-child(2)) {
        grid-area: header;
      }

      /* Reassign main to new grid area */
      :host([layout='app-shell']) ::slotted(:nth-child(3)) {
        grid-area: main;
      }
    }

    /* Navigation Layout: Full-width header + side navigation + content
       For standard navigation drawer pattern */
    :host([layout='nav-content']) {
      --_cols: 256px 1fr;
      --_rows: auto 1fr;
      grid-template-areas:
        'header header'
        'nav main';
    }

    :host([layout='nav-content']) ::slotted(:nth-child(1)) {
      grid-area: nav;
    }

    :host([layout='nav-content']) ::slotted(:nth-child(2)) {
      grid-area: header;
    }

    :host([layout='nav-content']) ::slotted(:nth-child(3)) {
      grid-area: main;
    }

    /* Responsive: hide nav on mobile (use modal drawer instead) */
    @container (max-width: 639px) {
      :host([layout='nav-content']) {
        --_cols: 1fr;
        --_rows: auto 1fr;
        grid-template-areas:
          'header'
          'main';
      }

      /* Hide the nav drawer element (M3: use modal drawer on mobile) */
      :host([layout='nav-content']) ::slotted(:nth-child(1)) {
        display: none;
        grid-area: unset;
      }

      /* Reassign header to new grid area */
      :host([layout='nav-content']) ::slotted(:nth-child(2)) {
        grid-area: header;
      }

      /* Reassign main to new grid area */
      :host([layout='nav-content']) ::slotted(:nth-child(3)) {
        grid-area: main;
      }
    }

    /* Bento grid layout: asymmetric magazine-style grid */
    :host([layout='bento']) {
      --_cols: repeat(4, 1fr);
      --_rows: repeat(3, minmax(150px, 1fr));
      grid-template-areas:
        'hero hero featured featured'
        'hero hero card1 card2'
        'card3 card4 card5 card5';
    }

    :host([layout='bento']) ::slotted(:nth-child(1)) {
      grid-area: hero;
    }

    :host([layout='bento']) ::slotted(:nth-child(2)) {
      grid-area: featured;
    }

    :host([layout='bento']) ::slotted(:nth-child(3)) {
      grid-area: card1;
    }

    :host([layout='bento']) ::slotted(:nth-child(4)) {
      grid-area: card2;
    }

    :host([layout='bento']) ::slotted(:nth-child(5)) {
      grid-area: card3;
    }

    :host([layout='bento']) ::slotted(:nth-child(6)) {
      grid-area: card4;
    }

    :host([layout='bento']) ::slotted(:nth-child(7)) {
      grid-area: card5;
    }

    /* Responsive bento - simpler on smaller screens */
    @container (max-width: 767px) {
      :host([layout='bento']) {
        --_cols: 1fr;
        --_rows: auto;
        grid-template-areas:
          'hero'
          'featured'
          'card1'
          'card2'
          'card3'
          'card4'
          'card5';
      }
    }
  }

  @layer buildit.utilities {
    /* ========================================
       Columns
       ======================================== */

    :host([cols='1']) {
      --_cols: repeat(1, 1fr);
    }

    :host([cols='2']) {
      --_cols: repeat(2, 1fr);
    }

    :host([cols='3']) {
      --_cols: repeat(3, 1fr);
    }

    :host([cols='4']) {
      --_cols: repeat(4, 1fr);
    }

    :host([cols='5']) {
      --_cols: repeat(5, 1fr);
    }

    :host([cols='6']) {
      --_cols: repeat(6, 1fr);
    }

    :host([cols='7']) {
      --_cols: repeat(7, 1fr);
    }

    :host([cols='8']) {
      --_cols: repeat(8, 1fr);
    }

    :host([cols='9']) {
      --_cols: repeat(9, 1fr);
    }

    :host([cols='10']) {
      --_cols: repeat(10, 1fr);
    }

    :host([cols='11']) {
      --_cols: repeat(11, 1fr);
    }

    :host([cols='12']) {
      --_cols: repeat(12, 1fr);
    }

    :host([cols='auto']) {
      --_cols: repeat(auto-fit, minmax(0, 1fr));
    }

    /* ========================================
       Rows
       ======================================== */

    :host([rows='1']) {
      --_rows: repeat(1, 1fr);
    }

    :host([rows='2']) {
      --_rows: repeat(2, 1fr);
    }

    :host([rows='3']) {
      --_rows: repeat(3, 1fr);
    }

    :host([rows='4']) {
      --_rows: repeat(4, 1fr);
    }

    :host([rows='5']) {
      --_rows: repeat(5, 1fr);
    }

    :host([rows='6']) {
      --_rows: repeat(6, 1fr);
    }

    :host([rows='auto']) {
      --_rows: auto;
    }

    /* ========================================
       Responsive Breakpoints (Container Queries)
       ======================================== */

    /* Small (sm): ≥640px */
    @container (min-width: 640px) {
      :host([cols-sm='1']) {
        --_cols: repeat(1, 1fr);
      }
      :host([cols-sm='2']) {
        --_cols: repeat(2, 1fr);
      }
      :host([cols-sm='3']) {
        --_cols: repeat(3, 1fr);
      }
      :host([cols-sm='4']) {
        --_cols: repeat(4, 1fr);
      }
      :host([cols-sm='5']) {
        --_cols: repeat(5, 1fr);
      }
      :host([cols-sm='6']) {
        --_cols: repeat(6, 1fr);
      }
      :host([cols-sm='7']) {
        --_cols: repeat(7, 1fr);
      }
      :host([cols-sm='8']) {
        --_cols: repeat(8, 1fr);
      }
      :host([cols-sm='9']) {
        --_cols: repeat(9, 1fr);
      }
      :host([cols-sm='10']) {
        --_cols: repeat(10, 1fr);
      }
      :host([cols-sm='11']) {
        --_cols: repeat(11, 1fr);
      }
      :host([cols-sm='12']) {
        --_cols: repeat(12, 1fr);
      }
      :host([cols-sm='auto']) {
        --_cols: repeat(auto-fit, minmax(0, 1fr));
      }
    }

    /* Medium (md): ≥768px */
    @container (min-width: 768px) {
      :host([cols-md='1']) {
        --_cols: repeat(1, 1fr);
      }
      :host([cols-md='2']) {
        --_cols: repeat(2, 1fr);
      }
      :host([cols-md='3']) {
        --_cols: repeat(3, 1fr);
      }
      :host([cols-md='4']) {
        --_cols: repeat(4, 1fr);
      }
      :host([cols-md='5']) {
        --_cols: repeat(5, 1fr);
      }
      :host([cols-md='6']) {
        --_cols: repeat(6, 1fr);
      }
      :host([cols-md='7']) {
        --_cols: repeat(7, 1fr);
      }
      :host([cols-md='8']) {
        --_cols: repeat(8, 1fr);
      }
      :host([cols-md='9']) {
        --_cols: repeat(9, 1fr);
      }
      :host([cols-md='10']) {
        --_cols: repeat(10, 1fr);
      }
      :host([cols-md='11']) {
        --_cols: repeat(11, 1fr);
      }
      :host([cols-md='12']) {
        --_cols: repeat(12, 1fr);
      }
      :host([cols-md='auto']) {
        --_cols: repeat(auto-fit, minmax(0, 1fr));
      }
    }

    /* Large (lg): ≥1024px */
    @container (min-width: 1024px) {
      :host([cols-lg='1']) {
        --_cols: repeat(1, 1fr);
      }
      :host([cols-lg='2']) {
        --_cols: repeat(2, 1fr);
      }
      :host([cols-lg='3']) {
        --_cols: repeat(3, 1fr);
      }
      :host([cols-lg='4']) {
        --_cols: repeat(4, 1fr);
      }
      :host([cols-lg='5']) {
        --_cols: repeat(5, 1fr);
      }
      :host([cols-lg='6']) {
        --_cols: repeat(6, 1fr);
      }
      :host([cols-lg='7']) {
        --_cols: repeat(7, 1fr);
      }
      :host([cols-lg='8']) {
        --_cols: repeat(8, 1fr);
      }
      :host([cols-lg='9']) {
        --_cols: repeat(9, 1fr);
      }
      :host([cols-lg='10']) {
        --_cols: repeat(10, 1fr);
      }
      :host([cols-lg='11']) {
        --_cols: repeat(11, 1fr);
      }
      :host([cols-lg='12']) {
        --_cols: repeat(12, 1fr);
      }
      :host([cols-lg='auto']) {
        --_cols: repeat(auto-fit, minmax(0, 1fr));
      }
    }

    /* Extra Large (xl): ≥1280px */
    @container (min-width: 1280px) {
      :host([cols-xl='1']) {
        --_cols: repeat(1, 1fr);
      }
      :host([cols-xl='2']) {
        --_cols: repeat(2, 1fr);
      }
      :host([cols-xl='3']) {
        --_cols: repeat(3, 1fr);
      }
      :host([cols-xl='4']) {
        --_cols: repeat(4, 1fr);
      }
      :host([cols-xl='5']) {
        --_cols: repeat(5, 1fr);
      }
      :host([cols-xl='6']) {
        --_cols: repeat(6, 1fr);
      }
      :host([cols-xl='7']) {
        --_cols: repeat(7, 1fr);
      }
      :host([cols-xl='8']) {
        --_cols: repeat(8, 1fr);
      }
      :host([cols-xl='9']) {
        --_cols: repeat(9, 1fr);
      }
      :host([cols-xl='10']) {
        --_cols: repeat(10, 1fr);
      }
      :host([cols-xl='11']) {
        --_cols: repeat(11, 1fr);
      }
      :host([cols-xl='12']) {
        --_cols: repeat(12, 1fr);
      }
      :host([cols-xl='auto']) {
        --_cols: repeat(auto-fit, minmax(0, 1fr));
      }
    }
  }
`;

// -------------------- Component Definition --------------------
defineElement('bit-grid', {
  observedAttributes: [
    'cols',
    'cols-sm',
    'cols-md',
    'cols-lg',
    'cols-xl',
    'rows',
    'gap',
    'align',
    'justify',
    'flow',
    'responsive',
    'layout',
  ] as const,

  styles: [styles],
  template: html`<slot></slot>`,
});
