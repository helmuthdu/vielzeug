# Prose

Renders Markdown as themed, semantic DOM through [`@vielzeug/scribe`](/scribe/): the source is parsed to a frozen AST and built with `createTextNode`/`createElement` only, so markup- or script-looking content renders as visible characters — no sanitizer step to forget.

## Basic Usage

<ComponentPreview center vertical>

```html
<ore-prose
  markdown="# Release notes

Ships **today**, with ~~yesterday's~~ bugs fixed. Inline `code` stays crisp.
"
></ore-prose>
```

</ComponentPreview>

Every Refine token drives the typography: headings use the shared heading scale, body text the body scale, and colors the semantic theme. The rendered tree is fully styled inside the component's shadow DOM, so it looks identical wherever it is placed.

## Safe by Construction

The component inherits scribe's fixed security posture:

- Raw HTML (`<script>`, `<img onerror=…>`) is **not** part of the Markdown profile: it renders as escaped, inert text.
- Link and image destinations are policy-checked at parse time — relative URLs, `http(s)`, and `mailto` pass; `javascript:` and `data:` degrade to plain label/alt text.
- Oversized or pathologically nested sources never crash the view: the component emits `error` and shows the raw source as plain text.

<ComponentPreview center vertical>

```html
<ore-prose markdown="Try it: <script>alert(1)</script> and [click](javascript:alert(1))"></ore-prose>
```

</ComponentPreview>

## Streaming Responses

Re-rendering replaces the whole tree, so token streaming is just re-assigning the property as chunks arrive:

```js
let buffer = '';
for await (const chunk of llmStream) {
  buffer += chunk;
  prose.markdown = buffer; // replaceChildren under the hood; chat-sized documents are cheap
}
```

Pair with [`ore-chat-message`](./chat-message.md) (`streaming` attribute) when the prose lives inside a chat bubble: `ore-chat-message` accepts any content through its default slot, and `ore-prose` renders it safely.

## Tables of Contents

Set `heading-ids` to emit stable slug `id`s on headings. They match `proseOutline` from `@vielzeug/scribe` exactly, so a TOC built from the outline always anchors to the rendered document:

<ComponentPreview center vertical>

```html
<ore-prose
  heading-ids
  markdown="## Install

Run the installer.

## Configure

Edit the config."
></ore-prose>
```

</ComponentPreview>

## API Reference

### Attributes

| Attribute     | Type    | Default | Description                                       |
| ------------- | ------- | ------- | ------------------------------------------------- |
| `markdown`    | `string` | `''`    | Markdown source rendered through scribe           |
| `heading-ids` | `boolean` | `false` | Emit unique slug `id` attributes on headings      |

### Events

| Event   | Detail                       | Description                                                             |
| ------- | ---------------------------- | ----------------------------------------------------------------------- |
| `error` | `{ error: ScribeError }` | Fired when the source exceeds a parser limit; raw source shows as text |

### CSS Custom Properties

| Property               | Description                          | Default                        |
| ---------------------- | ------------------------------------ | ------------------------------ |
| `--prose-color`        | Body text color                      | `var(--text-color-body)`       |
| `--prose-link-color`   | Link color                           | `var(--color-primary)`         |
| `--prose-code-bg`      | Inline code and code block background | `var(--color-neutral-backdrop)` |
| `--prose-border-color` | Table, rule, and quote border color  | `var(--color-divider)`         |
| `--prose-radius`       | Code block and inline code radius    | `var(--rounded-md)`            |

### Parts

| Part      | Description                  |
| --------- | ---------------------------- |
| `content` | The rendered prose container |

## Accessibility

The rendered tree uses native semantics (`h1`–`h6`, `ul`/`ol`/`li`, `table`, `blockquote`, `a`) inside the shadow DOM, which assistive technology traverses like regular light DOM content. Heading levels come from the document itself — keep `heading-ids` on when a TOC links into the prose so keyboard users can jump. The Markdown profile rejects raw HTML, so an author cannot smuggle ARIA or interactive markup into the document: the only interactive elements a document can produce are links and images.
