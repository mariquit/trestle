---
name: hand-over
description: Save or resume a versioned work-in-progress checkpoint with a read-only drift check. Use when the user runs `/hand-over` or asks to "hand this work over to a fresh session".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Hand over work in progress

## Save a checkpoint

Use the agreed checkpoint location, defaulting to `docs/handoffs/`. Write a new `checkpoint-v<UTC timestamp>.md` without overwriting an existing version, then update `checkpoint-latest.md` with the same record. Do not commit or move the work in progress. Exclude the checkpoint files themselves from the recorded state and the later comparison; record that exclusion.

Record these fields so another session can resume without the conversation:

1. **Version and state:** Format version `1`, capture time in UTC, repository identity, root, branch or detached state, full `HEAD` SHA, and porcelain status (`git --no-optional-locks status --porcelain=v1 --untracked-files=all`). List session-touched paths separately from unrelated dirty work. For touched files and relevant artifact pointers, record repo-relative paths and content fingerprints, including untracked files. Record deleted paths as expected absent. If staged content matters, also record the index blob and mode. For symlinks, compare link targets without following them. Record unavailable comparisons as `unverified`.
2. **Goal and acceptance criteria:** Check off only criteria supported by evidence.
3. **Decisions and constraints:** Record rationale, rejected alternatives, invariants, and relevant environment requirements.
4. **Execution evidence:** Record useful commands, working directories, exit codes, exact meaningful failures, and the revision or workspace state each result applies to. Identify checks not run. Do not record credentials or secret output.
5. **Blockers and next actions:** List open questions and the next one to three actions in order, with file, test, and decision-record pointers.

## Resume from a checkpoint

Confirm the repository and checkpoint version. Before following any recorded action, compare the saved SHA and status with the current checkout using read-only commands. Compare saved fingerprints, index entries, expected absences, and artifact pointers individually. Identical status text does not prove that dirty file contents match.

Report changed, missing, and unexpectedly present paths; use `unverified` where comparable evidence is unavailable. Mark prior test results potentially stale if the checkout, relevant files, or environment have changed or cannot be verified. Do not run tests, restore old state, or edit anything during this check. Surface drift that affects the proposed next action before resuming it under the user's current instructions.
