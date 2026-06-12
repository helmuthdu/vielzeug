export const asyncWaitForExample = {
  code: "import { waitFor } from '@vielzeug/arsenal'\n\n// Simulate a value that becomes ready after a short delay\nlet ready = false\nsetTimeout(() => { ready = true }, 200)\n\nconsole.log('Waiting for ready...')\nawait waitFor(() => ready, { interval: 50, timeout: 2000 })\nconsole.log('Ready!')\n\n// Abort early with an external signal\nconst ac = new AbortController()\nsetTimeout(() => ac.abort(new Error('user cancelled')), 100)\n\ntry {\n  await waitFor(() => false, {\n    interval: 50,\n    signal: ac.signal,\n    timeout: 5000,\n  })\n} catch (err) {\n  console.log('Aborted:', err.message) // 'user cancelled'\n}",
  name: 'waitFor - Poll until condition is true or timeout/abort fires',
};
