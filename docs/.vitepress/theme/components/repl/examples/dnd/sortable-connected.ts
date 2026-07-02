export const sortableConnectedExample = {
  code: `import { applyReorder, createSortable, createSortableScope } from '@vielzeug/dnd'

const scope = createSortableScope()

const wrapper = document.createElement('div')
wrapper.style.cssText = 'display:flex;gap:24px;align-items:flex-start;'
document.body.appendChild(wrapper)

let todoItems = [
  { id: 'task-a', title: 'Design' },
  { id: 'task-b', title: 'Develop' },
  { id: 'task-c', title: 'Review' },
]
let doneItems = [
  { id: 'task-d', title: 'Planning' },
]

const itemStyle = 'padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;cursor:grab;font-size:14px;'
const listStyle = 'list-style:none;padding:8px;margin:0;min-height:48px;width:160px;background:#f9fafb;border:2px dashed #d1d5db;border-radius:8px;display:flex;flex-direction:column;gap:6px;'

function makeColumn(label) {
  const col = document.createElement('div')
  col.style.cssText = 'display:flex;flex-direction:column;gap:8px;'
  const heading = document.createElement('strong')
  heading.style.cssText = 'font-size:13px;color:#374151;'
  heading.textContent = label
  const ul = document.createElement('ul')
  ul.style.cssText = listStyle
  col.append(heading, ul)
  wrapper.appendChild(col)
  return ul
}

const todoEl = makeColumn('To Do')
const doneEl = makeColumn('Done')

function renderList(ul, items) {
  ul.innerHTML = ''
  items.forEach(item => {
    const li = document.createElement('li')
    li.dataset.id = item.id
    li.style.cssText = itemStyle
    li.textContent = item.title
    ul.appendChild(li)
  })
}

renderList(todoEl, todoItems)
renderList(doneEl, doneItems)

const getKey = (el) => el.dataset.id ?? ''

const todoSortable = createSortable({
  element: todoEl,
  getKey,
  scope,
  onReorder: ({ ids }) => {
    todoItems = applyReorder(todoItems, ids, i => i.id)
    console.log('To Do order:', todoItems.map(i => i.title).join(', '))
  },
})

const doneSortable = createSortable({
  element: doneEl,
  getKey,
  scope,
  onReorder: ({ ids }) => {
    doneItems = applyReorder(doneItems, ids, i => i.id)
    console.log('Done order:', doneItems.map(i => i.title).join(', '))
  },
})

console.log('Connected lists ready — drag items between columns')
console.log('Scope is shared:', typeof scope)`,
  name: 'createSortableScope - Connected Lists',
};
