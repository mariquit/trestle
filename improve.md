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

1. **Diagnose only consequential gaps.** Identify omissions that affect the requested outcome: a missing constraint, primary source, method, or observable check. Skip categories that add nothing. Keep useful but optional ideas outside the rewritten prompt, labeled as optional rather than as execution instructions.
2. **Rewrite the prompt for a fresh agent.** Preserve the deliverable, constraints, exclusions, and acceptance criteria. Do not invent requirements or turn uncertain choices into defaults. Put the scope, verification, and stop rules below inside the rewritten prompt, tailored to the task. Do not assume the receiving agent can see this skill or the diagnosis.
3. **Separate decisions only when needed.** Prefer inspection or an existing check over a prototype. Include a small experiment only if a material in-scope choice cannot be resolved that way. Leave consequential product or taste choices to the user rather than deciding them silently.

Stop here in Mode A unless the user explicitly asks to execute the sharpened prompt.

### Mode B: Execute with Rigor
Use when the user asks to implement, run, fix, or analyze a task directly, or asks to run a sharpened prompt.

1. **Pre-Execution Self-Check (Internal — Keep Brief):** Answer only lines that materially affect correctness (1 short line each, 5 lines max total; no scope expansion):
   - **Smallest deliverable & exclusions:** Minimum required output and what extra features/abstractions are excluded.
   - **Assumptions & risks:** Key assumptions and where they could fail.
   - **Failure modes & invariants:** Bad inputs, edge cases, or silent bugs to guard against, and invariants that must hold.
   - **Evidence vs. guess:** Facts or APIs assumed from memory vs. verified in the workspace/docs.
   - **Proof & pass/fail signal:** How the result will be checked and the exact pass/fail condition.
2. **Scoped Execution:** Apply the scope, verification, and stop rules below. Inspect first. Prototype only if a material in-scope choice cannot be resolved by inspection or an existing check. Surface consequential product or taste choices rather than guessing.
3. **Post-Execution Verification Audit:** Before the final conclusion, report:
   - **Verdict:** Report `PASS` or `FAIL` against observed checks. Report `UNVERIFIED` if required evidence is unavailable and no observed result establishes a failure.
   - **Observed Evidence:** Exact commands, tests, inspections, or dry runs performed and what they showed (or note clearly if execution tools were unavailable).
   - **Unverified Gaps & Residual Risks:** What was not tested or still relies on assumptions.
   - **Scope Drift Check:** Compare the result with the request, including changed files when applicable. Report any deviation.

## Scope, verification, and stop rules

Deliver only the requested outcome. Preserve stated constraints and existing behavior outside the requested scope. Prefer the simplest complete approach that fits the project and reuse existing patterns. Do not add unrequested features, abstractions, dependencies, or unrelated cleanup. Report unrelated issues without fixing them.

If meeting the request requires expanding its scope, explain why and ask before doing that work. Complete any independent in-scope work. Use the smallest meaningful verification that checks the requested outcome. Report what you observed and what remains unverified. Stop once the deliverable and relevant checks are complete, or report what is blocked and why.

## Guardrails
- Never claim a check passed unless it was actually run and observed.
- Do not ask clarifying questions unless a genuine blocker prevents safe progress.
- Keep outputs tight and practical rather than turning checks into long monologues.
