export const scopeExample = {
  code: `import { signal, effect, scope, onCleanup } from '/ripple'

// scope() groups teardown without tying it to an effect
const s = scope()

let timer = 0
s.run(() => {
  const id = setInterval(() => {
    timer++
    console.log('tick', timer)
  }, 100)
  onCleanup(() => {
    clearInterval(id)
    console.log('interval cleared')
  })

  const count = signal(0)
  const sub = effect(() => console.log('count via scope:', count.value))
  onCleanup(() => sub.dispose())

  count.value = 1
  count.value = 2
})

// scope.run() can be called multiple times to add more cleanups
s.run(() => {
  onCleanup(() => console.log('second cleanup registered'))
})

// All cleanups run in LIFO order on dispose()
setTimeout(() => {
  console.log('disposing scope...')
  s.dispose()
}, 350)`,
  name: 'Scope & onCleanup',
};
