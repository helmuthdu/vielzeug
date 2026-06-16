export const conflictDetectionExample = {
  code: `// Detect rule conflicts — duplicate and shadowed rules — at startup
import { createWard } from '@vielzeug/ward'

const ward = createWard(
  [
    // Rule 0: viewer can read posts
    { role: 'viewer', resource: 'posts', action: 'read', effect: 'allow' },
    // Rule 1: duplicate — same (role, resource, action), different effect.
    //         One of these can never fire.
    { role: 'viewer', resource: 'posts', action: 'read', effect: 'deny' },
    // Rule 2+3: shadowed — the wildcard-action allow at higher priority
    //           will always win over this specific deny.
    { role: 'admin', resource: 'posts', action: '*',      effect: 'allow', priority: 10 },
    { role: 'admin', resource: 'posts', action: 'delete', effect: 'deny',  priority: 5 },
  ],
  {
    onConflict: (c) => {
      if (c.kind === 'duplicate') {
        console.log(\`[conflict] duplicate: Rule[\${c.indexA}] always wins over Rule[\${c.indexB}]\`)
      } else {
        console.log(\`[conflict] shadowed:  Rule[\${c.shadowedIndex}] always overridden by Rule[\${c.shadowingIndex}]\`)
      }
    },
  },
)

const conflicts = ward.detectConflicts()
console.log('Total conflicts detected:', conflicts.length)

conflicts.forEach((c) => {
  if (c.kind === 'duplicate') {
    console.log(\`  - duplicate: Rule[\${c.indexA}] (\${c.ruleA.effect}) vs Rule[\${c.indexB}] (\${c.ruleB.effect})\`)
  } else {
    console.log(\`  - shadowed:  Rule[\${c.shadowedIndex}] (\${c.shadowedRule.effect}) by Rule[\${c.shadowingIndex}] (\${c.shadowingRule.effect})\`)
  }
})`,
  name: 'Conflict Detection',
};
