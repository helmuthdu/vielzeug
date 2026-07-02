export const scrollToIndexExample = {
  code: `import { createVirtualizer } from '@vielzeug/scroll'

const ITEM_COUNT = 1_000

const container = document.createElement('div')
container.style.cssText = 'height:300px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = createVirtualizer(container, {
  count: ITEM_COUNT,
  estimateSize: 48,
  onChange: ({ items, totalSize }) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    items.forEach(({ index, start, size }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;height:\${size}px;line-height:\${size}px;padding:0 16px;border-bottom:1px solid #f5f5f5;\`
      row.textContent = \`Item \${index}\`
      content.appendChild(row)
    })
  },
})

// Scroll to specific indexes
setTimeout(() => {
  console.log('Scrolling to index 500 (start align)')
  virtualizer.scrollToIndex(500, { align: 'start', behavior: 'smooth' })
}, 200)

setTimeout(() => {
  console.log('Scrolling to index 999 (end align)')
  virtualizer.scrollToIndex(999, { align: 'end', behavior: 'smooth' })
}, 800)

setTimeout(() => {
  console.log('Scrolling to index 250 (center align)')
  virtualizer.scrollToIndex(250, { align: 'center', behavior: 'smooth' })
}, 1400)`,
  name: 'Virtualizer - scrollToIndex',
};
