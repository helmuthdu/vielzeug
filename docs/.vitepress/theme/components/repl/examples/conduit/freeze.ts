export const freezeExample = {
  code: `import { createContainer, token, ContainerFrozenError } from '@vielzeug/conduit'

const Config = token('Config')
const Logger = token('Logger')

const container = createContainer({ name: 'app' })
container.value(Config, { apiUrl: 'https://api.example.com' })
container.value(Logger, console)

// Seal the container — no further registrations allowed
container.freeze()

// Existing registrations still resolve normally
const config = await container.resolve(Config)
console.log('resolved after freeze:', config.apiUrl)

// Attempting to register after freeze throws ContainerFrozenError
try {
  container.value(token('Late'), 'oops')
} catch (err) {
  console.log('frozen error:', err instanceof ContainerFrozenError)
  console.log('message:', err.message)
}

// freeze() is local — child containers are not frozen
const child = container.createChild()
const Extra = token('Extra')
child.value(Extra, 'allowed')
console.log('child registration allowed:', child.has(Extra))`,
  name: 'freeze() and ContainerFrozenError',
};
