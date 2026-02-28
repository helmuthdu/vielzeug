const styles = /* css */ `
  @layer buildit.base {
    /* ========================================
       Base Styles
       ======================================== */

    :host {
      display: block;
    }
  }

  @layer buildit.utilities {
    /* ========================================
       Column Span
       ======================================== */

    :host([colSpan='1']) {
      grid-column: span 1;
    }

    :host([colSpan='2']) {
      grid-column: span 2;
    }

    :host([colSpan='3']) {
      grid-column: span 3;
    }

    :host([colSpan='4']) {
      grid-column: span 4;
    }

    :host([colSpan='5']) {
      grid-column: span 5;
    }

    :host([colSpan='6']) {
      grid-column: span 6;
    }

    :host([colSpan='7']) {
      grid-column: span 7;
    }

    :host([colSpan='8']) {
      grid-column: span 8;
    }

    :host([colSpan='9']) {
      grid-column: span 9;
    }

    :host([colSpan='10']) {
      grid-column: span 10;
    }

    :host([colSpan='11']) {
      grid-column: span 11;
    }

    :host([colSpan='12']) {
      grid-column: span 12;
    }

    :host([colSpan='full']) {
      grid-column: 1 / -1;
    }

    /* ========================================
       Row Span
       ======================================== */

    :host([rowSpan='1']) {
      grid-row: span 1;
    }

    :host([rowSpan='2']) {
      grid-row: span 2;
    }

    :host([rowSpan='3']) {
      grid-row: span 3;
    }

    :host([rowSpan='4']) {
      grid-row: span 4;
    }

    :host([rowSpan='5']) {
      grid-row: span 5;
    }

    :host([rowSpan='6']) {
      grid-row: span 6;
    }

    :host([rowSpan='full']) {
      grid-row: 1 / -1;
    }

    /* ========================================
       Column Start/End
       ======================================== */

    :host([colStart='1']) {
      grid-column-start: 1;
    }

    :host([colStart='2']) {
      grid-column-start: 2;
    }

    :host([colStart='3']) {
      grid-column-start: 3;
    }

    :host([colStart='4']) {
      grid-column-start: 4;
    }

    :host([colStart='5']) {
      grid-column-start: 5;
    }

    :host([colStart='6']) {
      grid-column-start: 6;
    }

    :host([colStart='7']) {
      grid-column-start: 7;
    }

    :host([colStart='8']) {
      grid-column-start: 8;
    }

    :host([colStart='9']) {
      grid-column-start: 9;
    }

    :host([colStart='10']) {
      grid-column-start: 10;
    }

    :host([colStart='11']) {
      grid-column-start: 11;
    }

    :host([colStart='12']) {
      grid-column-start: 12;
    }

    :host([colStart='13']) {
      grid-column-start: 13;
    }

    :host([colEnd='1']) {
      grid-column-end: 1;
    }

    :host([colEnd='2']) {
      grid-column-end: 2;
    }

    :host([colEnd='3']) {
      grid-column-end: 3;
    }

    :host([colEnd='4']) {
      grid-column-end: 4;
    }

    :host([colEnd='5']) {
      grid-column-end: 5;
    }

    :host([colEnd='6']) {
      grid-column-end: 6;
    }

    :host([colEnd='7']) {
      grid-column-end: 7;
    }

    :host([colEnd='8']) {
      grid-column-end: 8;
    }

    :host([colEnd='9']) {
      grid-column-end: 9;
    }

    :host([colEnd='10']) {
      grid-column-end: 10;
    }

    :host([colEnd='11']) {
      grid-column-end: 11;
    }

    :host([colEnd='12']) {
      grid-column-end: 12;
    }

    :host([colEnd='13']) {
      grid-column-end: 13;
    }

    :host([colEnd='auto']) {
      grid-column-end: auto;
    }

    /* ========================================
       Row Start/End
       ======================================== */

    :host([rowStart='1']) {
      grid-row-start: 1;
    }

    :host([rowStart='2']) {
      grid-row-start: 2;
    }

    :host([rowStart='3']) {
      grid-row-start: 3;
    }

    :host([rowStart='4']) {
      grid-row-start: 4;
    }

    :host([rowStart='5']) {
      grid-row-start: 5;
    }

    :host([rowStart='6']) {
      grid-row-start: 6;
    }

    :host([rowStart='7']) {
      grid-row-start: 7;
    }

    :host([rowStart='auto']) {
      grid-row-start: auto;
    }

    :host([rowEnd='1']) {
      grid-row-end: 1;
    }

    :host([rowEnd='2']) {
      grid-row-end: 2;
    }

    :host([rowEnd='3']) {
      grid-row-end: 3;
    }

    :host([rowEnd='4']) {
      grid-row-end: 4;
    }

    :host([rowEnd='5']) {
      grid-row-end: 5;
    }

    :host([rowEnd='6']) {
      grid-row-end: 6;
    }

    :host([rowEnd='7']) {
      grid-row-end: 7;
    }

    :host([rowEnd='auto']) {
      grid-row-end: auto;
    }

    /* ========================================
       Alignment
       ======================================== */

    :host([align='start']) {
      align-self: start;
    }

    :host([align='center']) {
      align-self: center;
    }

    :host([align='end']) {
      align-self: end;
    }

    :host([align='stretch']) {
      align-self: stretch;
    }

    /* ========================================
       Justify Self
       ======================================== */

    :host([justify='start']) {
      justify-self: start;
    }

    :host([justify='center']) {
      justify-self: center;
    }

    :host([justify='end']) {
      justify-self: end;
    }

    :host([justify='stretch']) {
      justify-self: stretch;
    }
`;

/**
 * bit-grid-item - A grid item with custom placement and span
 *
 * @element bit-grid-item
 *
 * @attr {string} colSpan - Number of columns to span: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | 'full'
 * @attr {string} rowSpan - Number of rows to span: '1' | '2' | '3' | '4' | '5' | '6' | 'full'
 * @attr {string} colStart - Starting column: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13'
 * @attr {string} colEnd - Ending column: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | 'auto'
 * @attr {string} rowStart - Starting row: '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'auto'
 * @attr {string} rowEnd - Ending row: '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'auto'
 * @attr {string} align - Align self vertically: 'start' | 'center' | 'end' | 'stretch'
 * @attr {string} justify - Justify self horizontally: 'start' | 'center' | 'end' | 'stretch'
 *
 * @slot - Grid item content
 *
 * @cssprop --grid-item-col-span - Column span value
 * @cssprop --grid-item-row-span - Row span value
 * @cssprop --grid-item-col-start - Column start value
 * @cssprop --grid-item-col-end - Column end value
 * @cssprop --grid-item-row-start - Row start value
 * @cssprop --grid-item-row-end - Row end value
 *
 * @example
 * <bit-grid cols="4">
 *   <bit-grid-item colSpan="2">Spans 2 columns</bit-grid-item>
 *   <bit-grid-item>Single column</bit-grid-item>
 *   <bit-grid-item>Single column</bit-grid-item>
 * </bit-grid>
 *
 * @example
 * <!-- Custom placement -->
 * <bit-grid cols="3">
 *   <bit-grid-item colStart="1" colEnd="3">Columns 1-2</bit-grid-item>
 *   <bit-grid-item colStart="3">Column 3</bit-grid-item>
 * </bit-grid>
 */

class BitGridItem extends HTMLElement {
  static observedAttributes = ['colSpan', 'rowSpan', 'colStart', 'colEnd', 'rowStart', 'rowEnd', 'align', 'justify'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadowRoot!.innerHTML = /* html */ `
      <style>${styles}</style>
      <div part="item"><slot></slot></div>
    `;
  }
}

if (!customElements.get('bit-grid-item')) {
  customElements.define('bit-grid-item', BitGridItem);
}

export default {};
