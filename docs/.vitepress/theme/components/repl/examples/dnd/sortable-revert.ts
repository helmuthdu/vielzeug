export const sortableRevertExample = {
  code: `import { applyReorder, createSortable } from '@vielzeug/dnd'

const app = document.createElement('div')
app.style.cssText = 'display:flex;flex-direction:column;gap:12px;width:220px;'
document.body.appendChild(app)

const listEl = document.createElement('ul')
listEl.style.cssText = 'list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:6px;'
app.appendChild(listEl)

const revertBtn = document.createElement('button')
revertBtn.type = 'button'
revertBtn.textContent = 'Revert last reorder'
revertBtn.style.cssText = 'padding:7px 14px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer;font:inherit;font-size:13px;'
app.appendChild(revertBtn)

let items = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
  { id: 'd', label: 'Delta' },
]

function render() {
  listEl.innerHTML = ''
  items.forEach(item => {
    const li = document.createElement('li')
    li.dataset.id = item.id
    li.style.cssText = 'padding:9px 14px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;cursor:grab;font-size:14px;'
    li.textContent = item.label
    listEl.appendChild(li)
  })
  sortable?.sync()
}

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.id ?? '',
  onReorder: ({ ids, setRevert }) => {
    const prev = items
    items = applyReorder(items, ids, i => i.id)
    render()
    console.log('Reordered:', items.map(i => i.label).join(' → '))
    setRevert(() => {
      items = prev
      render()
      console.log('Reverted to:', items.map(i => i.label).join(' → '))
    })
  },
})

revertBtn.addEventListener('click', () => sortable.revert())

render()
console.log('Drag to reorder, then click Revert to undo the last move')`,
  name: 'createSortable - Optimistic Revert',
};
