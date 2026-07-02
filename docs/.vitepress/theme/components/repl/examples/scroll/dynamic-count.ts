export const dynamicCountExample = {
  code: `import { createVirtualizer } from '@vielzeug/scroll'

let items = ['Alpha', 'Beta', 'Gamma']

const container = document.createElement('div')
container.style.cssText = 'height:200px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:relative;'
document.body.appendChild(container)

const spacer = document.createElement('div')
const content = document.createElement('div')
content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
container.appendChild(spacer)
container.appendChild(content)

const virtualizer = createVirtualizer(container, {
  count: items.length,
  estimateSize: 44,
  onChange: ({ items: virtualItems, totalSize }) => {
    spacer.style.height = totalSize + 'px'
    content.innerHTML = ''
    virtualItems.forEach(({ index, start, size }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${start}px;height:\${size}px;left:0;right:0;line-height:\${size}px;padding:0 16px;border-bottom:1px solid #f5f5f5;\`
      row.textContent = items[index]
      content.appendChild(row)
    })
  },
})

console.log('Initial count:', virtualizer.count)

// Dynamically add more items
setTimeout(() => {
  items = [...items, 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta']
  virtualizer.update({ count: items.length })
  console.log('Updated count:', virtualizer.count)
}, 300)

// Reorder items with stable keys — refresh() forces rebuild while preserving sizes
setTimeout(() => {
  items = [...items].sort(() => Math.random() - 0.5)
  virtualizer.refresh()
  console.log('Items reordered — refresh() called (sizes preserved by key)')
}, 700)`,
  name: 'Virtualizer - Dynamic Count',
};
