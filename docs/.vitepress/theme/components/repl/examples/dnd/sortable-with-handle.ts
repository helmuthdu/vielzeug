export const sortableWithHandleExample = {
  code: `import { createSortable } from '@vielzeug/dnd'

const listEl = document.createElement('ul')
listEl.style.cssText = 'list-style:none;padding:0;width:250px;'
document.body.appendChild(listEl)

const tasks = [
  { id: 'task-a', title: 'Design UI' },
  { id: 'task-b', title: 'Write tests' },
  { id: 'task-c', title: 'Deploy to prod' },
]

tasks.forEach(task => {
  const li = document.createElement('li')
  li.dataset.id = task.id
  li.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px;margin:4px 0;background:#fff;border:1px solid #e5e5e5;border-radius:4px;'

  const handle = document.createElement('span')
  handle.className = 'drag-handle'
  handle.textContent = '⬣'
  handle.style.cssText = 'cursor:grab;color:#888;font-size:18px;'

  const label = document.createElement('span')
  label.textContent = task.title

  li.appendChild(handle)
  li.appendChild(label)
  listEl.appendChild(li)
})

const sortable = createSortable({
  element: listEl,
  getKey: (el) => el.dataset.id ?? '',
  handle: '.drag-handle',
  onReorder: ({ ids }) => console.log('Reordered:', ids),
})

console.log('Handle-based sortable created. isDragging:', sortable.isDragging)`,
  name: 'createSortable - Drag Handle',
};
