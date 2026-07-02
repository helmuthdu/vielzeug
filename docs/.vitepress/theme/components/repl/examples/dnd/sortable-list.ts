export const sortableListExample = {
  code: `import { createSortable } from '@vielzeug/dnd'

const listEl = document.createElement('ul')
listEl.id = 'sortable-list'
listEl.style.cssText = 'list-style: none; padding: 0; margin: 0; width: 200px;'
document.body.appendChild(listEl)

const items = [
  { id: 'item-1', label: 'Item One' },
  { id: 'item-2', label: 'Item Two' },
  { id: 'item-3', label: 'Item Three' },
  { id: 'item-4', label: 'Item Four' },
]

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.id ?? '',
  onReorder: ({ ids }) => {
    console.log('Reordered:', ids.join(' → '))
    render(ids)
    sortable.sync()
  },
})

function render(order) {
  listEl.innerHTML = ''
  order.forEach(id => {
    const item = items.find(i => i.id === id)
    const li = document.createElement('li')
    li.dataset.id = item.id
    li.textContent = item.label
    li.style.cssText = 'padding: 10px; margin: 4px 0; background: #f0f0f0; border-radius: 4px; cursor: grab;'
    listEl.appendChild(li)
  })
}

render(items.map(i => i.id))
sortable.sync()

console.log('✓ Sortable list created at #sortable-list')`,
  name: 'createSortable - Drag to Reorder',
};
