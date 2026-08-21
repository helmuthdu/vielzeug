export const listNavigationExample = {
  code: `import { createListNavigation } from '@vielzeug/focus'

const labels = ['Apple', 'Banana', 'Cherry']
const list = document.createElement('div')
list.setAttribute('role', 'listbox')

const items = labels.map((label, index) => {
  const item = document.createElement('button')
  item.textContent = label
  item.disabled = index === 1
  item.tabIndex = index === 0 ? 0 : -1
  list.appendChild(item)
  return item
})

document.body.appendChild(list)

const navigation = createListNavigation({
  getItems: () => items,
  isItemDisabled: (item) => item.disabled,
  loop: true,
  onNavigate: ({ item }) => {
    items.forEach((candidate) => {
      candidate.tabIndex = candidate === item ? 0 : -1
    })
    item.focus()
  },
})

navigation.set(0)
list.addEventListener('keydown', navigation.handleKeydown)
items[0].focus()
items[0].dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }))

console.log(document.activeElement?.textContent) // 'Cherry'`,
  name: 'List Navigation',
};
