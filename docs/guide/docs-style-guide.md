---
title: Documentation Style Guide
description: Shared writing and structure rules for consistent, professional Vielzeug package docs.
---

# Documentation Style Guide

Use this guide for all package docs under `docs/*`.

## Tone and Voice

- Use direct, technical language with short sentences.
- Prefer active voice and concrete verbs.
- Explain intent before implementation details.
- Avoid marketing phrasing and unverified performance claims.

## Heading and Section Order

Use one consistent order for root package pages:

| File          | Required section order                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `index.md`    | `Installation` -> `Quick Start` -> `Start Here` -> entry-point section (optional) -> `Why <Package>?` -> `Features` |
| `usage.md`    | optional `<Package> Usage Guide` -> `Basic Usage` (or equivalent) -> advanced workflows                             |
| `api.md`      | `API At a Glance` -> `Most Used First` -> exhaustive API reference                                                  |
| `examples.md` | `<Package> Examples` -> `How to Use These Examples` -> `Examples Overview`                                          |

## Heading Casing

- Use sentence case for section bodies and list labels.
- Use title case for navigation labels and page titles.
- Keep acronym style consistent (`API`, `HTTP`, `SSR`, `DI`).

## Tables

- Use compact Markdown tables with clear column names.
- Keep comparable columns in the same order across packages.
- For API summaries, use: `Symbol`, `Purpose`, `Execution mode`, `Common gotcha`.
- Avoid unexplained shorthand in headers (for example, prefer `Execution mode` over abbreviated labels).

## Accessibility and Readability

- Use consistent image alt text in package docs: `<PackageName> logo`.
- Keep sentence length short and remove stacked clauses where possible.
- Define jargon on first use (for example, spell out "dependency injection (DI)").
- Keep headings descriptive and avoid ambiguous labels.

## Code Examples

- Keep examples copy-paste runnable.
- Include imports and minimal surrounding context.
- Prefer one focused outcome per code block.
- Add comments only when behavior is non-obvious.

## Code-Comment Density

- Use comments sparingly (roughly 1 comment per meaningful block).
- Avoid comments that restate obvious syntax.
- Explain trade-offs, lifecycle requirements, or gotchas.

## Recipe Page Template

Each `docs/<pkg>/examples/*.md` file should include:

1. `Problem`
2. `Runnable Example`
3. `Expected Output`
4. `Common Pitfalls`
5. `Related Recipes`

## Linking Rules

- Use relative links for pages in the same package.
- Add at least two related recipe links when available.
- Prefer stable anchors and avoid deep-linking to temporary headings.

## Discoverability

- Add a short `Search keywords:` sentence in package introductions.
- Add a `See Also` section on package overview pages that links related packages.
- Link scenario guides from `docs/guide/index.md` to help users discover cross-package workflows.
