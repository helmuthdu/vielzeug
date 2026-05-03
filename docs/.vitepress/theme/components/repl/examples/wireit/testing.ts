export const testingExample = {
  code: `import { createContainer, createToken, createTestContainer } from '@vielzeug/wireit'

const Repo = createToken('Repo')
const Svc = createToken('Svc')

const app = createContainer()
app.value(Repo, { list: () => ['prod'] })
app.factory(Svc, (repo) => ({ list: () => repo.list() }), { deps: [Repo] })

const { container, dispose } = createTestContainer(app)
container.value(Repo, { list: () => ['test'] }, { overwrite: true })

const svc = await container.resolve(Svc)
console.log('Test result:', svc.list())
await dispose()`,
  name: 'Testing Helpers',
};
