export const middlewareGuardExample = {
  code: `// Framework-agnostic guard with guardRequest and guardRequestWith
import { createWard, guardRequest, guardRequestWith } from '@vielzeug/ward'

const ward = createWard([
  { role: 'editor', resource: 'posts:*', action: 'update', effect: 'allow' },
  { role: 'viewer', resource: 'posts:*', action: 'read',   effect: 'allow' },
  { role: 'blocked', resource: '*',      action: '*',       effect: 'deny', priority: 100 },
])

// guardRequest — principal already resolved (e.g. from session)
const editor = { id: 'u1', roles: ['editor'] }
const viewer = { id: 'u2', roles: ['viewer'] }
const blocked = { id: 'u3', roles: ['blocked', 'editor'] }

for (const [label, principal, action] of [
  ['editor  update', editor,  'update'],
  ['viewer  update', viewer,  'update'],
  ['viewer  read',   viewer,  'read'],
  ['blocked update', blocked, 'update'],
] as const) {
  const result = guardRequest(ward, principal, 'posts:42', action)
  const status = result.granted ? '✅ granted' : \`❌ denied (\${result.reason})\`
  console.log(label.padEnd(15), status)
}

// guardRequestWith — principal extracted from request (sync or async extractor)
const fakeReq = { headers: { authorization: 'Bearer editor-token' } }

async function getPrincipal(req: typeof fakeReq) {
  return req.headers.authorization.includes('editor') ? editor : null
}

const asyncResult = await guardRequestWith(ward, fakeReq, getPrincipal, 'posts:42', 'update')
console.log('\\nasync guard:', asyncResult.granted ? '✅ granted' : \`❌ \${asyncResult.reason}\`)`,
  name: 'Framework-Agnostic Guard',
};
