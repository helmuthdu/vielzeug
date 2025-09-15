<template>
  <div id="repl-container" class="repl-container">
    <div class="repl-layout">
      <!-- Code Editor -->
      <div class="editor-section">
        <div class="editor-header">
          <h3>Code Editor</h3>
          <div class="controls">
            <button @click="runCode" class="btn-primary">Run Code</button>
            <button @click="clearEditor" class="btn-secondary">Clear</button>
            <select v-model="selectedExample" @change="loadExample" id="example-selector">
              <option value="">Choose an example...</option>
              <optgroup label="Array">
                <option value="array-chunk">chunk - Split array into chunks</option>
                <option value="array-filter">filter - Filter array elements</option>
                <option value="array-map">map - Transform array elements</option>
                <option value="array-group">group - Group array by key</option>
                <option value="array-sort">sort - Sort array</option>
              </optgroup>
              <optgroup label="Object">
                <option value="object-merge">merge - Deep merge objects</option>
                <option value="object-clone">clone - Deep clone object</option>
                <option value="object-path">path - Get nested value</option>
                <option value="object-diff">diff - Compare objects</option>
              </optgroup>
              <optgroup label="String">
                <option value="string-camelcase">camelCase - Convert to camelCase</option>
                <option value="string-kebabcase">kebabCase - Convert to kebab-case</option>
                <option value="string-truncate">truncate - Truncate string</option>
              </optgroup>
              <optgroup label="Math">
                <option value="math-average">average - Calculate average</option>
                <option value="math-clamp">clamp - Clamp number</option>
                <option value="math-range">range - Generate number range</option>
              </optgroup>
              <optgroup label="Date">
                <option value="date-expires">expires - Check if date expired</option>
                <option value="date-timediff">timeDiff - Calculate time difference</option>
              </optgroup>
              <optgroup label="Function">
                <option value="function-debounce">debounce - Debounce function</option>
                <option value="function-throttle">throttle - Throttle function</option>
                <option value="function-pipe">pipe - Compose functions</option>
              </optgroup>
              <optgroup label="Typed">
                <option value="typed-isarray">isArray - Check if array</option>
                <option value="typed-isempty">isEmpty - Check if empty</option>
                <option value="typed-isequal">isEqual - Deep equality check</option>
              </optgroup>
            </select>
          </div>
        </div>
        <div ref="editorContainer" class="code-editor"></div>
      </div>

      <!-- Output -->
      <div class="output-section">
        <div class="output-header">
          <h3>Output</h3>
          <button @click="clearOutput" class="btn-secondary">Clear Output</button>
        </div>
        <div ref="outputContainer" class="output-area"></div>
      </div>
    </div>

    <!-- Function Reference -->
    <div class="reference-section">
      <details open>
        <summary><h3>Available Functions</h3></summary>
        <div class="function-categories">
          <div class="category">
            <h4>Array (24 functions)</h4>
            <div class="function-list">
              <code>aggregate</code>, <code>chunk</code>, <code>compact</code>, <code>contains</code>,
              <code>every</code>, <code>filter</code>, <code>find</code>, <code>findIndex</code>, <code>findLast</code>,
              <code>flatten</code>, <code>group</code>, <code>list</code>, <code>map</code>, <code>pick</code>,
              <code>reduce</code>, <code>search</code>, <code>select</code>, <code>shift</code>, <code>some</code>,
              <code>sort</code>, <code>sortBy</code>, <code>substitute</code>, <code>uniq</code>
            </div>
          </div>

          <div class="category">
            <h4>Object (9 functions)</h4>
            <div class="function-list">
              <code>clone</code>, <code>diff</code>, <code>entries</code>, <code>keys</code>, <code>merge</code>,
              <code>parseJSON</code>, <code>path</code>, <code>seek</code>,
              <code>values</code>
            </div>
          </div>

          <div class="category">
            <h4>String (6 functions)</h4>
            <div class="function-list">
              <code>camelCase</code>, <code>kebabCase</code>, <code>pascalCase</code>, <code>similarity</code>,
              <code>snakeCase</code>, <code>truncate</code>
            </div>
          </div>

          <div class="category">
            <h4>Math (10 functions)</h4>
            <div class="function-list">
              <code>average</code>, <code>boil</code>, <code>clamp</code>, <code>max</code>, <code>median</code>,
              <code>min</code>, <code>range</code>, <code>rate</code>, <code>round</code>, <code>sum</code>
            </div>
          </div>

          <div class="category">
            <h4>Date (3 functions)</h4>
            <div class="function-list"><code>expires</code>, <code>interval</code>, <code>timeDiff</code></div>
          </div>

          <div class="category">
            <h4>Function (18 functions)</h4>
            <div class="function-list">
              <code>assert</code>, <code>attempt</code>, <code>compare</code>, <code>compareBy</code>,
              <code>compose</code>, <code>curry</code>, <code>debounce</code>, <code>delay</code>, <code>fp</code>,
              <code>memo</code>, <code>once</code>, <code>pipe</code>, <code>predict</code>, <code>proxy</code>,
              <code>retry</code>, <code>sleep</code>, <code>throttle</code>, <code>worker</code>
            </div>
          </div>

          <div class="category">
            <h4>Typed (24 functions)</h4>
            <div class="function-list">
              <code>ge</code>, <code>gt</code>, <code>isArray</code>, <code>isBoolean</code>, <code>isDate</code>,
              <code>isDefined</code>, <code>isEmpty</code>, <code>isEqual</code>, <code>isEven</code>,
              <code>isFunction</code>, <code>isNegative</code>, <code>isNil</code>, <code>isNumber</code>,
              <code>isObject</code>, <code>isOdd</code>, <code>isPositive</code>, <code>isPrimitive</code>,
              <code>isPromise</code>, <code>isRegex</code>, <code>isString</code>, <code>isWithin</code>,
              <code>isZero</code>, <code>le</code>, <code>lt</code>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as toolkit from '../../../../packages/toolkit/src/index';


const editorContainer = ref(null);
const outputContainer = ref(null);
const selectedExample = ref('');

let editor = null;

const examples = {
  'array-chunk': `import { chunk } from '@vielzeug/toolkit'

const array = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const chunks = chunk(array, 3)
console.log('Original:', array)
console.log('Chunks of 3:', chunks)`,

  'array-filter': `import { filter } from '@vielzeug/toolkit'

const users = [
  { name: 'Alice', age: 25, active: true },
  { name: 'Bob', age: 30, active: false },
  { name: 'Charlie', age: 35, active: true }
]

const activeUsers = filter(users, user => user.active)
console.log('Active users:', activeUsers)`,

  'array-map': `import { map } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5]
const squared = map(numbers, n => n * n)
const withIndex = map(numbers, (n, i) => \`\${i}: \${n}\`)

console.log('Original:', numbers)
console.log('Squared:', squared)
console.log('With index:', withIndex)`,

  'array-group': `import { group } from '@vielzeug/toolkit'

const items = [
  { category: 'fruit', name: 'apple' },
  { category: 'vegetable', name: 'carrot' },
  { category: 'fruit', name: 'banana' },
  { category: 'vegetable', name: 'broccoli' }
]

const grouped = group(items, item => item.category)
console.log('Grouped by category:', grouped)`,

  'object-merge': `import { merge } from '@vielzeug/toolkit'

const obj1 = { a: 1, b: { x: 1, y: 2 } }
const obj2 = { b: { y: 3, z: 4 }, c: 3 }

const merged = merge('deep', obj1, obj2)
console.log('Object 1:', obj1)
console.log('Object 2:', obj2)
console.log('Merged:', merged)`,

  'object-clone': `import { clone } from '@vielzeug/toolkit'

const original = {
  name: 'John',
  address: { city: 'New York', country: 'USA' },
  hobbies: ['reading', 'coding']
}

const cloned = clone(original)
cloned.address.city = 'Boston'
cloned.hobbies.push('gaming')

console.log('Original:', original)
console.log('Cloned:', cloned)`,

  'string-camelcase': `import { camelCase, kebabCase, pascalCase, snakeCase } from '@vielzeug/toolkit'

const text = 'hello world example'

console.log('Original:', text)
console.log('camelCase:', camelCase(text))
console.log('kebab-case:', kebabCase(text))
console.log('PascalCase:', pascalCase(text))
console.log('snake_case:', snakeCase(text))`,

  'math-average': `import { average, median, sum, max, min } from '@vielzeug/toolkit'

const scores = [85, 92, 78, 96, 88, 91, 83]

console.log('Scores:', scores)
console.log('Average:', average(scores))
console.log('Median:', median(scores))
console.log('Sum:', sum(scores))
console.log('Max:', max(scores))
console.log('Min:', min(scores))`,

  'date-expires': `import { expires } from '@vielzeug/toolkit'

const now = new Date()
const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago

console.log('Current time:', now)
console.log('Future date expires?', expires(future))
console.log('Past date expires?', expires(past))`,

  'date-timediff': `import { timeDiff } from '@vielzeug/toolkit'

const now = new Date()
const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago

// Test timeDiff function
console.log('Time difference (future):', timeDiff(future))
console.log('Time difference (past):', timeDiff(past))
console.log('Custom time units:', timeDiff(future, now, ['DAY', 'HOUR']))`,

  'function-debounce': `import { debounce } from '@vielzeug/toolkit'

// Simulate a search function
const search = debounce((query) => {
  console.log('Searching for:', query)
}, 300)

// These calls will be debounced
search('a')
search('ap')
search('app')
search('apple') // Only this will execute after 300ms

console.log('Debounced search function created')
console.log('Try calling search() multiple times quickly')`,

  'typed-isarray': `import { isArray, isObject, isString, isNumber } from '@vielzeug/toolkit'

const values = [
  [1, 2, 3],
  { key: 'value' },
  'hello',
  42,
  null,
  undefined
]

values.forEach((value, index) => {
  console.log(\`Value \${index}: \${JSON.stringify(value)}\`)
  console.log(\`isArray: \${isArray(value)}\`)
  console.log(\`isObject: \${isObject(value)}\`)
  console.log(\`isString: \${isString(value)}\`)
  console.log(\`isNumber: \${isNumber(value)}\`)
  console.log('---')
})`,

  'typed-isequal': `import { isEqual } from '@vielzeug/toolkit'

  console.log(\`isEqual([1, 2, 3], [1, 2, 3]) // \${isEqual([1, 2, 3], [1, 2, 3])}\`)
  console.log(\`isEqual([1, 2, 4], [1, 2, 3]) // \${isEqual([1, 2, 4], [1, 2, 3])}\`)
  console.log(\`isEqual({ a: 1, b: 2 }, { a: 1, b: 2 }) // \${isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })}\`)
  console.log(\`isEqual({ a: 1, b: 2 }, { a: 1, b: 3 }) // \${isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })}\`)
  console.log(\`isEqual('hello', 'hello') // \${isEqual('hello', 'hello')}\`)
  console.log(\`isEqual('hello', 'world') // \${isEqual('hello', 'world')}\`)
  console.log(\`isEqual(42, 42) // \${isEqual(42, 42)}\`)`,
};

onMounted(() => {
  initializeREPL();
});

const initializeREPL = () => {
  // Load Monaco Editor
  window.toolkit = toolkit;
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/monaco-editor@0.44.0/min/vs/loader.js';
  script.onload = () => {
    require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.44.0/min/vs' } });

    require(['vs/editor/editor.main'], function () {
      // Define TypeScript types for autocomplete
      const toolkitTypes = `
type MergeStrategy =
  | 'deep'
  | 'shallow'
  | 'lastWins'
  | 'arrayConcat'
  | 'arrayReplace'
  // biome-ignore lint/suspicious/noExplicitAny: -
  | ((target: any, source: any) => any);

type DeepMerge<T, U> = T extends Obj
  ? U extends Obj
    ? {
        [K in keyof T | keyof U]: K extends keyof T
          ? K extends keyof U
            ? DeepMerge<T[K], U[K]>
            : T[K]
          : K extends keyof U
            ? U[K]
            : never;
      }
    : U
  : U;

type Merge<T extends Obj[]> = T extends [infer First, ...infer Rest]
  ? First extends Obj
    ? Rest extends Obj[]
      ? DeepMerge<First, Merge<Rest>>
      : First
    : Obj
  : Obj;

declare module '@vielzeug/toolkit' {
  // Array utilities
  export function chunk<T>(array: T[], size: number): T[][]
  export function filter<T>(array: T[], predicate: (item: T, index: number, array: T[]) => boolean): T[]
  export function map<T, R>(array: T[], mapper: (item: T, index: number, array: T[]) => R): R[]
  export function group<T, K extends PropertyKey>(array: T[], getKey: (item: T) => K): Record<K, T[]>
  export function sort<T>(array: T[], compare?: (a: T, b: T) => number): T[]
  export function uniq<T>(array: T[]): T[]
  export function flatten<T>(array: (T | T[])[]): T[]
  export function compact<T>(array: (T | null | undefined)[]): T[]
  export function find<T>(array: T[], predicate: (item: T) => boolean): T | undefined
  export function some<T>(array: T[], predicate: (item: T) => boolean): boolean
  export function every<T>(array: T[], predicate: (item: T) => boolean): boolean

  // Object utilities
  export function merge<T extends Obj[]>(strategy: MergeStrategy = 'deep', ...items: [...T]): Merge<T>
  export function clone<T>(obj: T): T
  export function path<T>(obj: any, path: string): T | undefined
  export function diff<T>(obj1: T, obj2: T): Partial<T>
  export function keys<T extends Record<string, any>>(obj: T): (keyof T)[]
  export function values<T extends Record<string, any>>(obj: T): T[keyof T][]
  export function entries<T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][]

  // String utilities
  export function camelCase(str: string): string
  export function kebabCase(str: string): string
  export function pascalCase(str: string): string
  export function snakeCase(str: string): string
  export function truncate(str: string, length: number, suffix?: string): string
  export function similarity(str1: string, str2: string): number

  // Math utilities
  export function average(numbers: number[]): number
  export function clamp(value: number, min: number, max: number): number
  export function range(start: number, end: number, step?: number): number[]
  export function sum(numbers: number[]): number
  export function max(numbers: number[]): number
  export function min(numbers: number[]): number
  export function median(numbers: number[]): number
  export function round(value: number, precision?: number): number

  // Date utilities
  export function expires(date: Date | string | number): boolean
  export function timeDiff(date1: Date, date2: Date): number
  export function interval(date1: Date, date2: Date): { days: number, hours: number, minutes: number, seconds: number }

  // Function utilities
  export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T
  export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): T
  export function pipe<T, R>(...fns: Array<(arg: any) => any>): (input: T) => R
  export function compose<T, R>(...fns: Array<(arg: any) => any>): (input: T) => R
  export function memo<T extends (...args: any[]) => any>(fn: T): T
  export function once<T extends (...args: any[]) => any>(fn: T): T
  export function delay(ms: number): Promise<void>
  export function sleep(ms: number): Promise<void>
  export function retry<T>(fn: () => T | Promise<T>, options?: { retries?: number, delay?: number }): Promise<T>

  // Type utilities
  export function isArray(value: any): value is any[]
  export function isObject(value: any): value is object
  export function isString(value: any): value is string
  export function isNumber(value: any): value is number
  export function isBoolean(value: any): value is boolean
  export function isDate(value: any): value is Date
  export function isFunction(value: any): value is Function
  export function isPromise(value: any): value is Promise<any>
  export function isRegex(value: any): value is RegExp
  export function isEmpty(value: any): boolean
  export function isEqual(a: any, b: any): boolean
  export function isDefined<T>(value: T | undefined | null): value is T
  export function isNil(value: any): value is null | undefined
  export function isPrimitive(value: any): boolean
  export function isEven(value: number): boolean
  export function isOdd(value: number): boolean
  export function isPositive(value: number): boolean
  export function isNegative(value: number): boolean
  export function isZero(value: number): boolean
  export function isWithin(value: number, min: number, max: number): boolean
  export function gt(a: any, b: any): boolean
  export function ge(a: any, b: any): boolean
  export function lt(a: any, b: any): boolean
  export function le(a: any, b: any): boolean

  // Random utilities
  export function random(min?: number, max?: number): number
  export function shuffle<T>(array: T[]): T[]
  export function uuid(): string
}
`;

      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        toolkitTypes,
        'file:///node_modules/@vielzeug/toolkit/index.d.ts',
      );

      // Create editor
      editor = monaco.editor.create(editorContainer.value, {
        value: `// Welcome to the Vielzeug REPL!
// All toolkit functions are available globally.
// Try some examples:

import { chunk, map, filter } from '@vielzeug/toolkit'

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

// Split into chunks of 3
const chunks = chunk(numbers, 3)
console.log('Chunks:', chunks)

// Filter even numbers and double them
const evenDoubled = map(filter(numbers, n => n % 2 === 0), n => n * 2)
console.log('Even numbers doubled:', evenDoubled)

// Try more functions!
`,
        language: 'typescript',
        theme: 'vs-dark',
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
      });

      // Auto-run on Ctrl+Enter
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        runCode();
      });
    });
  };
  document.head.appendChild(script);

  // Load toolkit library dynamically
  const toolkitScript = document.createElement('script');
  toolkitScript.type = 'module';
  toolkitScript.textContent = `
    import * as toolkit from 'https://unpkg.com/@vielzeug/toolkit@latest/dist/index.js'
    window.toolkit = toolkit
    // Make all functions globally available
    Object.assign(window, toolkit)
  `;
  document.head.appendChild(toolkitScript);
};

const runCode = () => {
  if (!editor) return;

  const code = editor.getValue();
  const output = outputContainer.value;

  // Clear previous output
  output.innerHTML = '';

  // Capture console output
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const addOutput = (content, type = 'log') => {
    const line = document.createElement('div');
    line.className = `output-line output-${type}`;

    content.forEach((item) => {
      if (typeof item === 'object') {
        line.textContent += JSON.stringify(item, null, 2);
      } else {
        line.textContent += String(item);
      }
      line.textContent += ' ';
    });

    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  console.log = (...args) => {
    addOutput(args, 'log');
  };

  console.error = (...args) => {
    addOutput(args, 'error');
  };

  console.warn = (...args) => {
    addOutput(args, 'warn');
  };

  try {
    // Transform import statements to use global toolkit
    const transformedCode = code
      .replace(/import\s*{([^}]+)}\s*from\s*['"]@vielzeug\/toolkit['"]/g, (match, imports) => {
        const importList = imports.split(',').map((i) => i.trim());
        return `const { ${importList.join(', ')} } = window.toolkit || {}`;
      })
      .replace(/import\s*\*\s*as\s+(\w+)\s*from\s*['"]@vielzeug\/toolkit['"]/g, 'const $1 = window.toolkit || {}');

    // Execute the code
    const result = eval(transformedCode);

    // Show result if it's not undefined
    if (result !== undefined) {
      addOutput('→ ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : result), 'result');
    }
  } catch (error) {
    addOutput('Error: ' + error.message, 'error');
  } finally {
    // Restore console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
};

const clearEditor = () => {
  if (editor) {
    editor.setValue('');
  }
};

const clearOutput = () => {
  if (outputContainer.value) {
    outputContainer.value.innerHTML = '';
  }
};

const loadExample = () => {
  if (selectedExample.value && examples[selectedExample.value] && editor) {
    editor.setValue(examples[selectedExample.value]);
  }
};
</script>

<style scoped>
.repl-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin: 1rem 0;
  min-height: 500px;
}

.editor-section,
.output-section {
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  overflow: hidden;
}

.editor-header,
.output-header {
  background: var(--vp-c-bg-soft);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--vp-c-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h3,
.output-header h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
}

.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn-primary,
.btn-secondary {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--vp-c-brand);
  color: white;
}

.btn-primary:hover {
  background: var(--vp-c-brand-dark);
}

.btn-secondary {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-border);
}

.btn-secondary:hover {
  background: var(--vp-c-bg-soft);
}

#example-selector {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.8rem;
}

.code-editor {
  height: 400px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: var(--vp-code-bg);
}

.output-area {
  height: 400px;
  padding: 1rem;
  background: var(--vp-c-bg-alt);
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
}

.reference-section {
  margin-top: 2rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 8px;
  padding: 1rem;
}

.reference-section summary {
  cursor: pointer;
  margin-bottom: 1rem;
}

.reference-section h3 {
  margin: 0;
}

.function-categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.category h4 {
  margin: 0 0 0.5rem 0;
  color: var(--vp-c-brand);
  font-size: 0.9rem;
}

.function-list {
  font-size: 0.8rem;
  line-height: 1.6;
}

.function-list code {
  background: var(--vp-code-bg);
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
  font-size: 0.8rem;
}

:deep(.output-line) {
  margin: 0.5rem 0;
  padding: 0.25rem 0;
}

:deep(.output-error) {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 0.5rem;
  border-radius: 4px;
  border-left: 3px solid #ff6b6b;
}

:deep(.output-result) {
  color: var(--vp-c-text-1);
}

:deep(.output-log) {
  color: #74c0fc;
}

@media (max-width: 768px) {
  .repl-layout {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-wrap: wrap;
  }

  #example-selector {
    width: 100%;
    margin-top: 0.5rem;
  }
}
</style>
