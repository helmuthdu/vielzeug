export const testingExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const Repo = token('Repo')
const Svc = token('Svc')

const app = createContainer()
app.value(Repo, { list: () => ['prod'] })
app.factory(Svc, async (r) => {
  const repo = await r.resolve(Repo)
  return { list: () => repo.list() }
})

const testScope = app.createScope()
testScope.value(Repo, { list: () => ['test'] })

const svc = await testScope.resolve(Svc)
console.log('Test result:', svc.list())

await testScope.dispose()`,
  name: 'Testing with Child Containers',
};
