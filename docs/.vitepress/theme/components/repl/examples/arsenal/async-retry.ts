export const asyncRetryExample = {
  code: "import { retry } from '@vielzeug/arsenal'\n\nlet attempts = 0\nconst unreliableOperation = async () => {\n  attempts++\n  console.log(`Attempt #${attempts}`)\n\n  if (attempts < 3) {\n    throw new Error('Failed!')\n  }\n\n  return 'Success!'\n}\n\ntry {\n  const result = await retry(unreliableOperation, {\n    times: 5,\n    delay: 100\n  })\n  console.log('Result:', result)\n  console.log('Total attempts:', attempts)\n} catch (err) {\n  console.error('All retries failed:', err.message)\n}",
  name: 'retry - Retry failed operations',
};
