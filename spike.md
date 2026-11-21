---
name: spike
description: Answer one architectural unknown with a timeboxed throwaway experiment. Use when the user runs `/spike` or asks to "prove this with a small experiment".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Run a throwaway experiment

1. Define one falsifiable hypothesis, the observation or threshold that supports it, what would contradict it, and a timebox. Specify the environment and assumptions that bound the result.
2. Record the original checkout's status and staged, unstaged, and relevant untracked state. Build the smallest harness in fresh scratch space outside the active checkout. Copy needed inputs without editing originals. Keep outputs, caches, and fixtures in scratch space. Do not use shared or production state for the experiment.
3. Check that the setup can produce a valid observation, then run the experiment. Record exact commands, inputs, exit codes, and observations. Report `supported` or `negative` only from valid observations; report `inconclusive` for broken setup, missing data, or a timebox that ends before interpretable evidence is obtained.
4. Preserve reproduction instructions and evidence in the report or agreed artifact. Remove only the scratch files and workspaces created for this spike, including the harness; do not promote it to production code. Verify that checkout state and pre-existing work are unchanged. Report any cleanup failure rather than claiming the scratch space is gone.

Return the hypothesis, verdict, observation, reproduction steps, limitations, and implication for the decision. A negative result is evidence, not a reason to change the hypothesis after the run.
