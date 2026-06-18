export const traceDecisionExample = {
  code: `// Inspect all matching rule candidates and why a particular rule won
import { WILDCARD, createWard } from '@vielzeug/ward'

const ward = createWard([
  { role: WILDCARD,   resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'editor',   resource: 'posts', action: 'read', effect: 'allow', priority: 0 },
  { role: 'blocked',  resource: 'posts', action: 'read', effect: 'deny',  priority: 5 },
])

const { decision, candidates } = ward.trace(
  { id: 'u1', roles: ['editor', 'blocked'] },
  'posts',
  'read',
)

candidates.forEach(({ index, rule, priority, score, won }) => {
  console.log(
    won ? '[WINNER]' : '[      ]',
    \`Rule[\${index}]\`,
    \`effect=\${rule.effect}\`,
    \`role=\${rule.role}\`,
    \`priority=\${priority}\`,
    \`score=\${score}\`,
  )
})

console.log('Decision:', decision.allowed ? 'allow' : \`deny (\${decision.reason})\`)`,
  name: 'Trace — Inspect Matching Candidates',
};
