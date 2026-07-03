# Vielzeug — Review Template

Static reference for `review.md` output format. Consumed by `/pkg-review` — do not duplicate in workflow files, reference here.

## Per-finding format

For each issue found:

```text
[SEVERITY] [LENS] File: src/foo.ts:42
Issue: <concise description>
Impact: <brief impact/risk>
Suggestion: <what to change and why>
```

Where:

- **SEVERITY**: `CRITICAL` | `MAJOR` | `MINOR` | `NIT`
- **LENS**: `A-CORRECTNESS`, `B-ARCH`, or `C-TYPES`

When a CRITICAL or MAJOR finding is fixed during or immediately after a pass, annotate it inline:

```text
[MAJOR] [B-ARCH] File: src/foo.ts:42 ✅ FIXED
Issue: ...
Suggestion: ...
```

## `review.md` format

End the review with a `Summary` section using **exactly this format**:

```md
## Summary

### Finding Counts

| Lens | CRITICAL | MAJOR | MINOR | NIT | Fixed |
|------|----------|-------|-------|-----|-------|
| A — Correctness | N | N | N | N | N |
| B — Architecture | N | N | N | N | N |
| C — TypeScript | N | N | N | N | N |
| **Total** | **N** | **N** | **N** | **N** | **N** |

### Verdict

<✅ Ready | ⚠️ Needs work | ❌ Block>

<One sentence justifying the verdict.>

### Validation Checklist

- [ ] Implementation is correct for its intended purpose: Yes / No / Unclear
- [ ] Tests are relevant, focused, and sufficient for core behaviour: Yes / No / Partial
- [ ] Documentation and types reflect current behaviour: Yes / No / Partial
- [ ] No obsolete, redundant, or transitional code remains: Yes / No / Unsure

### Open Items

<List any unfixed MAJOR/CRITICAL + recommended next step, or "None — all findings resolved.">
```

**Verdict rules:**

| Condition                       | Verdict       |
| -------------------------------- | ------------- |
| 0 unfixed CRITICAL or MAJOR      | ✅ Ready      |
| 1–2 unfixed MAJOR (no CRITICAL)  | ⚠️ Needs work |
| Any unfixed CRITICAL             | ❌ Block      |
