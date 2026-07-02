export const functionDebounceExample = {
  code: `import { debounce } from '@vielzeug/arsenal'

// --- Trailing (default) ---
let trailingCount = 0
const onSearch = debounce((q) => {
  trailingCount++
  console.log(\`Trailing #\${trailingCount}: "\${q}"\`)
}, 200)

onSearch('c')
onSearch('ca')
onSearch('cat') // only this fires after 200ms

// --- Leading-only ---
let leadingCount = 0
const onSubmit = debounce((q) => {
  leadingCount++
  console.log(\`Leading #\${leadingCount}: "\${q}"\`)
}, 200, { leading: true, trailing: false })

onSubmit('first') // fires immediately
onSubmit('second') // silenced (within 200ms window)
onSubmit('third')  // silenced

// --- Leading + Trailing: fires on both edges ---
let bothCount = 0
const onBoth = debounce(() => {
  bothCount++
  console.log(\`Both edge #\${bothCount}\`)
}, 200, { leading: true, trailing: true })

onBoth() // fires immediately (leading)
// trailing edge fires after 200ms (bothCount becomes 2)

setTimeout(() => {
  console.log('Trailing fires:', trailingCount, '| Leading fires:', leadingCount, '| Both fires:', bothCount)
  // trailing: 1 | leading: 1 | both: 2
}, 400)`,
  name: 'debounce - Trailing (default) and leading-edge options',
};
