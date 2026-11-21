---
name: regression-test
description: Write a targeted regression test and prove it against explicit unfixed and fixed Git refs in isolated worktrees. Use when the user runs `/regression-test` or asks to "write a test that proves this fix".
author: John Anthony Mariquit <john@mariquit.com>
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Prove the test breaks without the fix

## Design the test

Read `GLOSSARY.md` if present. Name the public seam, what the test catches, and what it misses. Assert the exact symptom using an independent expected value. Exercise the real interaction; mock only external boundaries where needed. Avoid private methods, side channels, and assertions that duplicate the implementation.

## Isolated proof

1. Get two explicit Git refs (unfixed and fixed), one test-only patch, and one test command. State the expected unfixed assertion or error and confirm the patch touches only tests or test fixtures. If the fix is uncommitted or a ref is ambiguous, ask for the missing ref; do not stash, commit, or reverse the fix to manufacture it. If authoring a test for the proof, produce the patch in scratch space rather than in the active checkout.
2. Resolve both refs to full commit SHAs. Create two independent detached Git worktrees at those SHAs under a new scratch directory outside the active checkout. Use equivalent test environments with isolated writable outputs. Record the active checkout's status and local changes for comparison after the run.
3. Apply the same patch unchanged in each worktree and run the same test command from the same relative location. Check test output for execution of the intended test; a zero exit code with a skipped, deselected, or undiscovered test does not count as a pass. Record exit codes, exact failure output, and test evidence. An apply, build, import, fixture, startup, or setup failure does not count as red. If the patch or command needs a change, restart both runs with the new inputs rather than comparing different tests.
4. Report `verified` only if the unfixed run fails for the expected assertion or error and the fixed run passes. Report `not reproduced` if the intended test runs and passes on unfixed code. Use `inconclusive` otherwise, including unexpected failures or an expected red without a passing green.
5. Remove only the disposable worktrees and scratch files created for the proof, after retaining the record and any requested patch. Report cleanup failures. Confirm the active checkout, index, and pre-existing changes are unchanged. Do not apply the test patch to the active checkout as part of proof.

## PR-ready record

```markdown
### Regression Test Proof

- **Verdict:** verified | not reproduced | inconclusive
- **Seam:** <public interface; what the test catches and misses>
- **Test-only patch:** <artifact or changed test paths>
- **Expected unfixed symptom:** <specific failing assertion or error>
- **Command:** `<exact command>` (from `<relative working directory>`)

| Run | Commit SHA | Exit code | Observation |
| --- | --- | --- | --- |
| Unfixed | `<full SHA>` | `<code or not run>` | <exact failing assertion/error, pass, or setup blocker> |
| Fixed | `<full SHA>` | `<code or not run>` | <pass, exact failure, or setup blocker> |

**Notes:** <verdict rationale, skipped checks, or cleanup issues>
```
