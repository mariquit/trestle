---
name: improve
description: Sharpen prompts without executing them, or carry out tasks with scope control and verification. Use when the user runs `/improve` or asks to "sharpen this prompt".
author: John Anthony Mariquit <john@mariquit.com>
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

## Modes

### Mode A: Sharpen Prompt (No Execution Yet)
Use when the user gives a rough request, asks to sharpen/rewrite a prompt, or wants a deeper framing before work starts.

1. **Diagnose (4 brief points):**
   - **Pro gap:** What a top practitioner in this field would do that the request omits.
   - **Raw material:** The rawest primary source or data to start from instead of pre-digested summaries.
   - **Methods & tools:** Specific methods, commands, or tools to use.
   - **External proof:** What outside the user or agent proves the result works.
2. **Rewrite the prompt:** Output a sharper, deeper version of the task without expanding it into a bloated spec.
3. **Separate decisions:** Instruct the execution pass to prototype choices an experiment can settle and recommend an option from observed results, while surfacing product or taste choices that no experiment can settle for the user to decide.

Stop here in Mode A unless the user explicitly asks to execute the sharpened prompt.

### Mode B: Execute with Rigor
Use when the user asks to implement, run, fix, or analyze a task directly, or asks to run a sharpened prompt.

1. **Pre-Execution Self-Check (Internal — Keep Brief):** Answer only lines that materially affect correctness (1 short line each, 5 lines max total; no scope expansion):
   - **Smallest deliverable & exclusions:** Minimum required output and what extra features/abstractions are excluded.
   - **Assumptions & risks:** Key assumptions and where they could fail.
   - **Failure modes & invariants:** Bad inputs, edge cases, or silent bugs to guard against, and invariants that must hold.
   - **Evidence vs. guess:** Facts or APIs assumed from memory vs. verified in the workspace/docs.
   - **Proof & pass/fail signal:** How the result will be checked and the exact pass/fail condition.
2. **Scoped Execution:** Build or execute only the smallest deliverable that satisfies the request. If an empirical choice is unsettled and testable, run a quick prototype/check and recommend the observed winner; surface non-empirical product/taste choices rather than guessing.
3. **Post-Execution Verification Audit:** Before the final conclusion, report:
   - **Pass / Fail Verdict:** Explicit `PASS` or `FAIL` based on observed results.
   - **Observed Evidence:** Exact commands, tests, inspections, or dry runs performed and what they showed (or note clearly if execution tools were unavailable).
   - **Unverified Gaps & Residual Risks:** What was not tested or still relies on assumptions.
   - **Scope Drift Check:** Confirm whether any unrequested edits or abstractions were added.

## Guardrails
- Never claim a check passed unless it was actually run and observed.
- Do not ask clarifying questions unless a genuine blocker prevents safe progress.
- Keep outputs tight and practical rather than turning checks into long monologues.
