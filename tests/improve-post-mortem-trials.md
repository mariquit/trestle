# OpenCode trials for improve and post-mortem

The trials used OpenCode v2.2.5 with `opencode/big-pickle`. Both skills were installed into a temporary project, and a smoke prompt returned `OK`.

| Skill and input | Expected behavior | Observed result |
| --- | --- | --- |
| `@improve` asked to sharpen “make the search results faster” without executing it. | Rewrite the prompt, distinguish testable choices from product decisions, and make no edits. | Returned a rewritten prompt with a baseline, profiling, and a before/after check, and separated measurable choices from product trade-offs. No files were created by this trial. |
| `@improve` asked to count section elements in the installed report template without editing. | Run a read-only command and report `PASS` only if it observes exactly seven sections. | Ran `grep` and `wc`, observed seven sections, and reported the command, result, scope, and limits of the check. |
| `@post-mortem` asked to write `trial.html` from a synthetic stall and rollback timeline with an unverified cause and two supplied references. | Read the bundled template, produce a local report, and qualify claims without fetching sources or publishing. | Created `trial.html`. A separate check found all seven headings in order, matching navigation anchors, both supplied citations, no template placeholders, and an explicit statement that the cause was unproven. No live incident connector was exercised. |

## Scope preservation across agents

In OpenCode v2.2.5 with `opencode/big-pickle`, asked `@improve` to rewrite a request to change the exported label in `label.mjs` from `Submit` to `Save`, with cleanup in `other.mjs` explicitly out of scope. The first attempt could not load the skill and did not count. A fresh run loaded the skill and returned a standalone prompt that limited the edit, required before-and-after inspection, and told the receiver when to stop or report a blocker.

Passed only that prompt to a new session in a separate directory without the trial skill installed. The first receiver attempt timed out. The second changed the label, inspected the result, and reported the unrelated cleanup without doing it. A separate file comparison confirmed the exact label change, an unchanged `other.mjs`, and no additional files. This trial covered one unblocked handoff; it did not test whether the agent asks for approval when expansion is necessary.
