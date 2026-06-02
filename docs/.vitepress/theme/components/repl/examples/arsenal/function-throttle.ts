export const functionThrottleExample = {
  code: "import { throttle } from '@vielzeug/arsenal'\n\nlet scrollCount = 0\nconst handleScroll = () => {\n  scrollCount++\n  console.log(`Scroll event #${scrollCount}`)\n}\n\nconst throttledScroll = throttle(handleScroll, 200)\n\n// Simulate rapid scroll events\nfor (let i = 0; i < 10; i++) {\n  setTimeout(() => throttledScroll(), i * 50)\n}\n\nsetTimeout(() => {\n  console.log('Total throttled calls:', scrollCount)\n}, 1000)",
  name: 'throttle - Throttle function calls',
};
