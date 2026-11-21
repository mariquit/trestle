---
name: what-is-next
description: Recommend one finish-first action from the current goal and checkout evidence without changing the workspace. Use when the user runs `/what-is-next` or asks to "pick the next action".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Pick one next move

Read the stated goal and relevant specs, decision records, or handover notes. Inspect `HEAD`, `git --no-optional-locks status`, staged and unstaged diffs, and relevant untracked files. Read available test records without running builds or tests. Check which commit, dirty state, and environment produced them. Treat missing or unmatched records as missing or stale evidence, not as passing checks.

Choose the action that removes the nearest blocker to the goal. If competing actions exist, prioritize the one the others depend on or the one that resolves the most consequential uncertainty. If missing evidence prevents a confident choice, make obtaining the specific evidence the action.

Route a failure requiring diagnosis to `/triage`, an unproven bug fix to `/regression-test`, a ready diff needing review to `/pre-flight`, or a resolved investigation whose lessons need capturing to `/deconstruct`. If an unproven fix lacks a required input for isolated proof, name that input as the next action rather than assuming it exists. Name the applicable skill only; do not invoke it or force a match when none fits.

Return one **Next action**, its **Evidence** (paths, Git state, or dated checks and their limitations), and the **Skill** if applicable. Do not offer a queue, modify the checkout, or execute the recommendation.
