---
name: release-size
description: Reduce one shipped artifact with exact-byte comparisons and release-path behavior checks. Use when the user runs `/release-size` or asks to "reduce this release artifact size".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Reduce one shipped artifact

1. Name one deliverable and target (OS, architecture, runtime as applicable). Identify the existing release pipeline, test gate, toolchain, features, and packaging settings. Build the baseline with that pipeline. Measure exact file bytes, for example `wc -c < "$artifact"`. If users download an archive, measure that archive, not its extracted binary. Keep inputs and packaging comparable and note baseline variability if builds are not reproducible.
2. Inspect diagnostic output for leads. If the deliverable is an archive, distinguish changes to the contents from changes to packaging, such as compression settings. Match the recipe to the actual deliverable:
   - **Rust executable:** Read the Cargo release profile and enabled features. Inspect sections or use `cargo bloat` if available. Test one candidate, such as narrowing an unused dependency feature or tuning size optimization. Rebuild with the actual release profile; the diagnostic build is not the size baseline or result.
   - **Go executable:** Read the release build flags, build tags, and CGO settings. Inspect symbols with `go tool nm -size` on a suitable diagnostic build. Test one dependency or build-flag hypothesis. Check platform linkage and debugging or crash-report behavior if affected.
   - **PyInstaller bundle:** Read the spec, hooks, bundle mode, and release packaging step. Inspect collected modules, native libraries, and data. Test removing one proven duplicate or unnecessary collection. Run the delivered executable in a clean target environment with no development checkout, extra imports, or local assets masking omissions. Exercise dynamic imports and bundled assets on affected paths.
3. Change one variable at a time. Rebuild through the release pipeline, run the project's test gate, and exercise the affected success and failure behavior from the packaged deliverable on the target. Check any relevant throughput, latency, portability, or diagnostics constraints. Treat skipped or failing checks as gaps, not verified savings.
4. Report `before → after` in bytes, signed delta (`after - before`), and percentage (`100 × delta / before`, or not applicable if baseline is zero). Include the target, build and verification commands and outcomes, accepted changes, and rejected tradeoffs. Do not accept reduced diagnostics, dropped features, or a toolchain change without user approval. Do not publish or deploy.
