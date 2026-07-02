export const objectGetPathExample = {
  code: `import { getPath } from '@vielzeug/arsenal'

const config = {
  server: { host: 'localhost', ports: [3000, 3001] },
  db: { name: 'mydb', pool: { min: 2, max: 10 } }
}

// Standard dot-notation
console.log(getPath(config, 'server.host'))                          // 'localhost'
console.log(getPath(config, 'db.pool.max'))                          // 10
console.log(getPath(config, 'server.ports.0'))                       // 3000
console.log(getPath(config, 'missing', { fallback: 'default' }))     // 'default'

// Bracket notation is auto-converted by default
console.log(getPath(config, 'server.ports[1]'))                      // 3001

// strict:true — throws when a path segment is missing
try {
  getPath(config, 'db.pool.timeout', { strict: true })
} catch (e) {
  console.log('threw:', e.message)
}

// Prototype-pollution segments are blocked — returns fallback
console.log(getPath(config, '__proto__.polluted', { fallback: 'safe' })) // 'safe'`,
  name: 'getPath - Dot-notation access with fallback and strict options',
};
