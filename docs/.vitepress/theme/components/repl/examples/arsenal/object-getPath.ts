export const objectGetPathExample = {
  code: `import { getPath, getPathOr, requirePath } from '@vielzeug/arsenal/object'

const config = {
  server: { host: 'localhost', ports: [3000, 3001] },
  db: { name: 'mydb', pool: { min: 2, max: 10 } }
}

// Standard dot-notation
console.log(getPath(config, 'server.host'))                          // 'localhost'
console.log(getPath(config, 'db.pool.max'))                          // 10
console.log(getPath(config, 'server.ports.0'))                       // 3000
console.log(getPathOr(config, 'missing', 'default'))                 // 'default'
console.log(getPath(config, 'server.ports[1]'))                      // 3001

try {
  requirePath(config, 'db.pool.timeout')
} catch (e) {
  console.log('threw:', e.message)
}

console.log(getPathOr(config, '__proto__.polluted', 'safe'))         // 'safe'`,
  name: 'getPath - Dot-notation access',
};
