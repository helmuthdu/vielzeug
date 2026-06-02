export const testingExample = {
  code: `import { createContainer, token } from '@vielzeug/conduit'

const Repo = token('Repo')
const Svc = token('Svc')

const app = createContainer()
app.value(Repo, { list: () => ['prod'] })
app.factory(Svc, (repo) => ({ list: () => repo.list() }), { deps: [Repo] })

const testScope = app.createChild()
testScope.value(Repo, { list: () => ['test'] })

const svc = await testScope.resolve(Svc)
console.log('Test result:', svc.list())

await testScope.dispose()`,
  name: 'Testing with Child Containers',
};
