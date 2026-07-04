export const gridVirtualizerExample = {
  code: `import { createGridVirtualizer } from '@vielzeug/scroll'

// Two-dimensional grid virtualization — only the visible rows × cols
// cross-product is mounted, independent of total grid size.

const ROW_COUNT = 10_000
const COL_COUNT = 20
const ROW_H = 32
const COL_W = 100

const scrollEl = document.createElement('div')
scrollEl.style.cssText = 'height:320px;overflow:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(scrollEl)

const container = document.createElement('div')
scrollEl.appendChild(container)

const grid = createGridVirtualizer(scrollEl, {
  colCount: COL_COUNT,
  estimateColSize: COL_W,
  estimateRowSize: ROW_H,
  rowCount: ROW_COUNT,
  onChange: ({ cols, rows, totalHeight, totalWidth }) => {
    container.style.cssText = \`position:relative;height:\${totalHeight}px;width:\${totalWidth}px;\`
    container.innerHTML = ''

    for (const row of rows) {
      for (const col of cols) {
        const cell = document.createElement('div')
        cell.style.cssText = \`position:absolute;top:\${row.start}px;left:\${col.start}px;height:\${row.size}px;width:\${col.size}px;box-sizing:border-box;border-right:1px solid #f0f0f0;border-bottom:1px solid #f0f0f0;line-height:\${row.size}px;padding:0 8px;overflow:hidden;white-space:nowrap;font-size:12px;\`
        cell.textContent = 'R' + row.index + 'C' + col.index
        container.appendChild(cell)
      }
    }
  },
})

console.log('Grid:', ROW_COUNT, 'rows x', COL_COUNT, 'cols')
console.log('Visible cells this frame:', grid.rows.length * grid.cols.length)

// Jump to a specific cell
grid.scrollToCell(500, 10, { colAlign: 'start', rowAlign: 'center' })

// Cleanup
window.addEventListener('beforeunload', () => grid.dispose())`,
  name: 'Grid Virtualizer',
};
