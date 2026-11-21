---
name: integration-seam
description: Justify an integration boundary and verify success and failure through its real caller. Use when the user runs `/integration-seam` or asks to "prove this integration through its caller".
license: Apache-2.0
metadata:
  copyright: Copyright (c) 2026 John Anthony Mariquit <john@mariquit.com>
---

# Justify and verify an integration seam

1. Find the capability's current owner, actual caller, applicable architecture decisions, and build and packaging conventions. Keep the capability in-process unless a concrete constraint, such as a required runtime or isolation guarantee, rules that out. Explain why the current owner cannot satisfy that constraint before introducing a new boundary. Surface conflicts with recorded decisions rather than silently replacing them.
2. Define the contract before wiring: inputs and outputs, validation, ownership, and caller-visible failures. For a new boundary, include representation or protocol compatibility and lifecycle behavior. Specify timeouts and cancellation where they apply. Retry only eligible transient errors and only when the operation is idempotent or protected against duplicate effects; bound retries by the caller's deadline.
3. Wire the smallest implementation into the actual caller. Follow the repository's build, packaging, and deployment conventions without adding a new service, language, or scaffold by default.
4. Run the relevant build and use the real caller to verify a successful request and one meaningful failure. Observe the returned result, error mapping, and relevant side effects. Use actual integration wiring; a mocked seam alone does not prove it. If performance justifies the boundary, load-test the caller path against a stated budget under representative conditions.

Report the owner, in-process or boundary decision and rationale, contract, build and caller commands with outcomes, and any unverified checks. Do not call the integration verified if either caller-level check was skipped or failed.
