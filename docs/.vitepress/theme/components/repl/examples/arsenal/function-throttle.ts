export const functionThrottleExample = {
  code: `import { throttle } from '@vielzeug/arsenal'

let scrollCount = 0
const handleScroll = () => {
  scrollCount++
  console.log(\`Scroll event #\${scrollCount}\`)
}

const throttledScroll = throttle(handleScroll, 200)

// Simulate rapid scroll events
for (let i = 0; i < 10; i++) {
  setTimeout(() => throttledScroll(), i * 50)
}

setTimeout(() => {
  console.log('Total throttled calls:', scrollCount)
}, 1000)`,
  name: 'throttle - Throttle function calls',
};
