---
title: Vielzeug Documentation Template
description: Canonical structure, language, and formatting rules for all Vielzeug library documentation pages.
---

# Vielzeug Documentation Template

How every `docs/<name>/` page set is structured and why. The structural contract below is included verbatim from `.ai/reference/docs-template.md`, the same file maintainers and AI agents follow, so there is one source for these rules. `pnpm validate:docs -- --package=<name>` enforces the objective parts.

## Documentation Philosophy

Vielzeug docs follow the **[Diátaxis](https://diataxis.fr/)** framework, which organises documentation by the reader's need, not the author's convenience. The four Diátaxis quadrants are:

| Quadrant          | Reader need     | Orientation                                                   |
| ----------------- | --------------- | ------------------------------------------------------------- |
| **Tutorials**     | Learning        | Practical steps that guide a newcomer to a successful outcome |
| **How-to Guides** | Problem-solving | Steps to accomplish a specific goal the reader already has    |
| **Reference**     | Information     | Accurate, complete technical data to consult while working    |
| **Explanation**   | Understanding   | Background, context, and the "why" behind decisions           |

These quadrants have hard boundaries. Mixing them degrades usability: a reader consulting `api.md` does not want a tutorial, and a reader following `usage.md` does not want exhaustive option tables. When content belongs to more than one quadrant, split it.

Each standard doc page maps to one primary quadrant:

| File            | Diátaxis type                                                 | Reader's question                                          |
| --------------- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| `index.md`      | **Explanation**                                               | "What is this, why does it exist, and is it right for me?" |
| `usage.md`      | **How-to Guide**                                              | "How do I accomplish this specific task?"                  |
| `api.md`        | **Reference**                                                 | "What is the exact signature, behaviour, and contract?"    |
| `examples.md`   | Navigation (not a Diátaxis quadrant — an organisational tool) | "Which recipe do I need?"                                  |
| `examples/*.md` | **How-to Guide**                                              | "How do I solve this concrete problem end-to-end?"         |

Understanding this mapping is more important than memorising the structural rules. When in doubt about where content belongs, ask: _which reader need does this serve?_

**Common anti-patterns to avoid:**

- Putting step-by-step learning walkthroughs in `index.md` — that is a tutorial, not an explanation.
- Putting exhaustive option tables in `usage.md` — that belongs in `api.md`.
- Putting opinionated guidance or "Best Practices" in `api.md` — that belongs in `usage.md`.
- Putting conceptual background (the "why") in `api.md` or `usage.md` — that belongs in `index.md`.

**Tutorials:** Vielzeug does not currently have a dedicated tutorial file per package. If a library's complexity warrants one (e.g., a ground-up walkthrough for a first-time user), add a `tutorial.md` at `docs/<pkg>/tutorial.md` and link it from `index.md`. A tutorial is learning-oriented: it takes the reader through a fixed, complete scenario step by step, prioritising the learning experience over real-world flexibility.

<!--@include: ../../.ai/reference/docs-template.md{5,}-->
