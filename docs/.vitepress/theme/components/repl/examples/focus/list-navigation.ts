export const listNavigationExample = {
  code: `import { createListNavigation } from '@vielzeug/focus'

const labels = ['Apple', 'Banana', 'Cherry']
const list = document.createElement('div')
list.setAttribute('role', 'listbox')

const items = labels.map((label, index) => {
  const item = document.createElement('button')
  item.textContent = label
  item.setAttribute('role', 'option')
  item.setAttribute('aria-selected', String(index === 0))
  item.disabled = index === 1
  item.setAttribute('aria-disabled', String(item.disabled))
  item.tabIndex = index === 0 ? 0 : -1
  list.appendChild(item)
  return item
})

document.body.appendChild(list)

const navigation = createListNavigation({
  getItems: () => items,
  isItemDisabled: (item) => item.disabled,
  loop: true,
})

const onKeydown = (event) => {
  const change = navigation.handleKeydown(event)?.change
  if (!change) return
  items.forEach((candidate) => {
    const active = candidate === change.item
    candidate.tabIndex = active ? 0 : -1
    candidate.setAttribute('aria-selected', String(active))
  })
  change.item.focus()
}

navigation.set(0)
list.addEventListener('keydown', onKeydown)
items[0].focus()
items[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))

console.log(document.activeElement?.textContent) // 'Cherry'`,
  name: 'List Navigation',
};
