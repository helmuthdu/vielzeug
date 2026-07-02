export const measurementCacheExample = {
  code: `import { createMeasurementCache, createVirtualizer } from '@vielzeug/scroll'

// Shared cache — measurements from listA flow into listB automatically.
const cache = createMeasurementCache()

const makeList = (label, left) => {
  const heading = document.createElement('p')
  heading.textContent = label
  heading.style.cssText = \`position:absolute;top:0;left:\${left}px;width:220px;margin:0;font-weight:600;font-size:13px;\`
  document.body.appendChild(heading)

  const container = document.createElement('div')
  container.style.cssText = \`position:absolute;top:24px;left:\${left}px;width:220px;height:360px;overflow-y:auto;border:1px solid #e5e5e5;border-radius:4px;position:absolute;\`
  document.body.appendChild(container)

  const spacer = document.createElement('div')
  const content = document.createElement('div')
  content.style.cssText = 'position:absolute;top:0;left:0;right:0;'
  container.appendChild(spacer)
  container.appendChild(content)

  return { container, content, spacer }
}

const { container: containerA, content: contentA, spacer: spacerA } = makeList('List A (measures items)', 16)
const { container: containerB, content: contentB, spacer: spacerB } = makeList('List B (reads shared cache)', 260)

const COUNT = 200

const virtA = createVirtualizer(containerA, {
  count: COUNT,
  estimateSize: 40,
  measurementCache: cache,
  onChange: ({ items, totalSize }) => {
    spacerA.style.height = totalSize + 'px'
    contentA.innerHTML = ''
    items.forEach(({ index, start, size }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;min-height:\${size}px;padding:8px 12px;border-bottom:1px solid #f0f0f0;word-wrap:break-word;font-size:13px;\`
      row.textContent = \`Row \${index} — \${'word '.repeat((index % 4) + 1).trim()}\`
      contentA.appendChild(row)
      // Report actual height after paint
      requestAnimationFrame(() => virtA.measure(index, row.offsetHeight))
    })
  },
})

const virtB = createVirtualizer(containerB, {
  count: COUNT,
  estimateSize: 40,
  measurementCache: cache,
  onChange: ({ items, totalSize }) => {
    spacerB.style.height = totalSize + 'px'
    contentB.innerHTML = ''
    items.forEach(({ index, start, size }) => {
      const row = document.createElement('div')
      row.style.cssText = \`position:absolute;top:\${start}px;left:0;right:0;height:\${size}px;display:flex;align-items:center;padding:0 12px;border-bottom:1px solid #f0f0f0;font-size:13px;\`
      row.textContent = \`Row \${index} (size: \${size}px)\`
      contentB.appendChild(row)
    })
  },
})

console.log('✓ Two virtualizers share one MeasurementCache')
console.log('Scroll List A to measure rows — List B reflects the same sizes')`,
  name: 'createMeasurementCache - Shared Cache',
};
