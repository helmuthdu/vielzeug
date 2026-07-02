export const variableHeightExample = {
  code: `import { createVirtualizer } from '@vielzeug/scroll'

const items = Array.from({ length: 500 }, (_, i) => ({
  id: i,
  text: 'Item ' + i + ': ' + 'lorem ipsum '.repeat(Math.floor(Math.random() * 3) + 1).trim(),
}))

const container = document.createElement('div')
container.style.cssText = 'height:400px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = createVirtualizer(container, {
  count: items.length,
  estimateSize: 60,
  getItemKey: (index) => items[index]?.id ?? index,
  onChange: ({ items: virtualItems, totalSize }) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    virtualItems.forEach(({ index, start }) => {
      const row = document.createElement('div')
      row.dataset.index = String(index)
      row.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;padding:12px 16px;border-bottom:1px solid #f0f0f0;word-wrap:break-word;\`
      row.textContent = items[index].text
      content.appendChild(row)
    })
    // Batch-report all measured heights in a single rebuild
    requestAnimationFrame(() => {
      const measurements = []
      virtualItems.forEach(({ index }) => {
        const row = content.querySelector(\`[data-index="\${index}"]\`)
        if (row) measurements.push({ index, size: row.offsetHeight })
      })
      if (measurements.length) virtualizer.measureBatch(measurements)
    })
  },
})

console.log('Variable height list with', items.length, 'items')
console.log('Initial rendered:', virtualizer.items.length, 'rows (estimates)')`,
  name: 'Virtualizer - Variable Height',
};
