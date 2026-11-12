export const safeRenderExample = {
  code: `import { parseProse, renderProseHtml } from '@vielzeug/scribe'

// Hostile content from a user or model. Everything below stays inert.
const hostile = [
  '<script>alert(1)<\\/script>',            // raw HTML is not in the profile
  '[click](javascript:alert(1))',           // policy: degrades to label text
  '[sneaky](&#58;javascript:alert(1))',     // entity trick decoded before the check
  '[docs](/scribe/)',                       // relative links always pass
].join('\\n\\n')

const doc = parseProse(hostile)
console.log(renderProseHtml(doc))
// No <script>, no javascript: anchors — only <p> text and the /scribe/ link.`,
  name: 'Safe render of hostile input',
};
