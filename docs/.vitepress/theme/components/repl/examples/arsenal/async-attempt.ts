export const asyncAttemptExample = {
  code: "import { attempt, retry } from '@vielzeug/arsenal'\n\n// attempt() wraps any async function — never throws\nconst result = await attempt(async () => {\n  const res = await fetch('https://jsonplaceholder.typicode.com/todos/1')\n  return res.json()\n})\n\nif (result.ok) {\n  console.log('Fetched:', result.value)\n} else {\n  console.error('Failed:', result.error)\n}\n\n// Combine with retry() for resilient fetching\nconst retried = await attempt(() =>\n  retry(() => fetch('https://jsonplaceholder.typicode.com/todos/2').then(r => r.json()), {\n    times: 3,\n    delay: 200\n  })\n)\n\nconsole.log('Retried result ok?', retried.ok)",
  name: 'attempt - Safe async execution',
};
