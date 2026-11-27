---
name: github-pr-review
description: Review GitHub pull requests or local branch diffs for correctness, security, edge cases, test coverage, and maintainability. Use when the user runs `/github-pr-review` or asks to "review this GitHub PR".
author: John Anthony Mariquit <john@mariquit.com>
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# github-pr-review

Perform structured, high-signal reviews of GitHub pull requests using local git history or the GitHub CLI (`gh`).

## When to Use

Use this skill when:
- Reviewing a GitHub PR by number, URL, or current branch diff
- Checking whether a PR has regressions, security flaws, or missing tests before merge
- Triaging changes across multiple files to give actionable engineering feedback

## Steps

1. **Gather PR context and diff.** Run `gh pr view <number> --json title,body,baseRefName,headRefName,files,additions,deletions` and `gh pr diff <number>` when a PR number or URL is available. Fall back to `git status` and `git diff <base>...HEAD` when reviewing a local branch without `gh`.
2. **Map scope and architecture.** Identify the goal of the change, entry points touched, and any cross-cutting impacts (database migrations, public APIs, auth, config, or background jobs). Read surrounding context in modified files rather than judging isolated hunks.
3. **Audit for high-impact issues first.** Prioritize:
   - **Correctness and logic:** Off-by-one errors, nil/null handling, race conditions, broken state transitions, or silent error swallowing.
   - **Security and data safety:** Injection risks, auth/permission bypasses, leaked secrets, unsafe deserialization, or unvalidated untrusted input.
   - **Performance and scale:** N+1 queries, unbounded loops/allocations, or blocking I/O on hot paths.
   - **Tests and edge cases:** Missing unit/integration tests for new branches, boundary inputs, or failure modes.
4. **Separate blockers from polish.** Classify findings by severity (`Blocker`, `Should Fix`, `Nit`) so the author knows what must change before merge versus optional style or naming cleanup. Reference exact file paths, symbol names, and line context.
5. **Deliver a concise, actionable review.** Start with a clear verdict (`Approve`, `Request Changes`, or `Comment` with rationale), list concrete findings with why each matters and how to fix it, and note any unverified areas (such as skipped test runs or missing environment access).

## Gotchas

- Do not post comments, approvals, or request changes directly on GitHub via `gh pr review` unless the user explicitly asks you to publish the review.
- Avoid nitpicking formatting or style rules that linters and formatters already enforce in CI.
- Report inspected test coverage separately from test results. Do not claim tests passed unless you ran them and observed the result.
